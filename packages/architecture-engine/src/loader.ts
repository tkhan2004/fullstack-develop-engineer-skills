import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { err, ok, type Result } from "@engineering-skills/core";
import { parseManifest, type ArchitectureManifest } from "./manifest.js";
import { validateManifest, type ValidateManifestOptions } from "./validate.js";

/**
 * Discover every `<root>/<name>/manifest.yaml`. Architectures are found by directory, so adding
 * one needs no registration step and no engine change.
 */
export async function loadManifests(
  root: string,
  options: Omit<ValidateManifestOptions, "expectedName"> = {},
): Promise<Result<ArchitectureManifest[], string[]>> {
  let names: string[];
  try {
    const entries = await readdir(root, { withFileTypes: true });
    names = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort();
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return ok([]);
    throw cause;
  }

  const manifests: ArchitectureManifest[] = [];
  const problems: string[] = [];

  for (const name of names) {
    const path = join(root, name, "manifest.yaml");
    let text: string;
    try {
      text = await readFile(path, "utf8");
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw cause;
    }
    const parsed = parseManifest(text, path);
    if (!parsed.ok) {
      problems.push(...parsed.error);
      continue;
    }
    const semantic = validateManifest(parsed.value, { ...options, expectedName: name });
    if (semantic.length > 0) problems.push(...semantic);
    else manifests.push(parsed.value);
  }

  return problems.length > 0 ? err(problems) : ok(manifests);
}

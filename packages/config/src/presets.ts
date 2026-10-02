import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { err, ok, type Result } from "@engineering-skills/core";
import { parse } from "yaml";
import type { Layer } from "./layers.js";
import { suggest } from "./suggest.js";

const PRESET_NAME = /^[a-z0-9][a-z0-9-]*$/;

export async function listPresets(dir: string): Promise<string[]> {
  const entries = await readdir(dir);
  return entries
    .filter((name) => name.endsWith(".yaml"))
    .map((name) => name.slice(0, -".yaml".length))
    .sort();
}

/** A preset is a config fragment: it is merged *under* the user's config, never over it. */
export async function loadPreset(dir: string, name: string): Promise<Result<Layer, string>> {
  const available = await listPresets(dir);
  if (!PRESET_NAME.test(name) || !available.includes(name)) {
    const hint = suggest(name, available);
    return err(
      `Unknown preset "${name}". Available: ${available.join(", ")}.${hint ? ` Did you mean: ${hint}` : ""}`,
    );
  }
  const parsed: unknown = parse(await readFile(join(dir, `${name}.yaml`), "utf8"));
  return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
    ? ok(parsed as Layer)
    : err(`Preset "${name}" must be a YAML mapping`);
}

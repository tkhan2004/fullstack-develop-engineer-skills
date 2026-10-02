import { readFile, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { err, ok, type Result } from "@engineering-skills/core";
import { issue, type SkillIssue } from "./issue.js";
import { parseSkillManifest } from "./manifest.js";
import { createSkill, type Skill, type SkillOrigin } from "./skill.js";

const SKIP = new Set(["node_modules", "examples", "tests", "tree", "dist"]);

export interface LoadOptions {
  readonly origin: SkillOrigin;
  /**
   * Prefix between the root and the directory path in the skill id.
   * skills/quality/clean-code → "quality/clean-code" (prefix ""),
   * architectures/clean → "architecture/clean" (prefix "architecture/").
   */
  readonly idPrefix?: string;
}

async function findSkillDirs(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const found: string[] = [];
  if (entries.some((e) => e.isFile() && e.name === "skill.yaml")) found.push(dir);
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory() && !SKIP.has(entry.name) && !entry.name.startsWith(".")) {
      found.push(...(await findSkillDirs(join(dir, entry.name))));
    }
  }
  return found;
}

/** Load every directory under `root` that contains a skill.yaml. */
export async function loadSkillsFromDir(
  root: string,
  options: LoadOptions,
): Promise<Result<Skill[], SkillIssue[]>> {
  let dirs: string[];
  try {
    dirs = await findSkillDirs(root);
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return ok([]);
    throw cause;
  }

  const skills: Skill[] = [];
  const issues: SkillIssue[] = [];

  for (const dir of dirs) {
    const rel = relative(root, dir).split(sep).join("/");
    const manifestPath = join(dir, "skill.yaml");
    const parsed = parseSkillManifest(await readFile(manifestPath, "utf8"), manifestPath);
    if (!parsed.ok) {
      issues.push(...parsed.error);
      continue;
    }

    const expectedId = `${options.idPrefix ?? ""}${rel}`;
    if (parsed.value.id !== expectedId) {
      issues.push(
        issue(
          "error",
          `${manifestPath}: id "${parsed.value.id}" must match its location ("${expectedId}")`,
          parsed.value.id,
        ),
      );
      continue;
    }

    let body: string;
    try {
      body = await readFile(join(dir, "SKILL.md"), "utf8");
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code !== "ENOENT") throw cause;
      issues.push(issue("error", `${dir}: SKILL.md is missing`, parsed.value.id));
      continue;
    }
    skills.push(createSkill(parsed.value, body, options.origin, dir));
  }

  return issues.length > 0 ? err(issues) : ok(skills);
}

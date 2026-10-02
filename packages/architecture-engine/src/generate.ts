import { mkdir, stat, writeFile } from "node:fs/promises";
import { join, posix } from "node:path";
import { err, ok, type ProjectMode, type Result } from "@engineering-skills/core";
import type { ArchitectureManifest } from "./manifest.js";

export interface StructurePlan {
  /** Directories to ensure exist, parents before children. */
  readonly directories: readonly string[];
  /** Empty leaf directories get a .gitkeep so git tracks them. */
  readonly keepFiles: readonly string[];
}

export interface PlanOptions {
  readonly mode: ProjectMode;
  /** Feature modules to scaffold (module-oriented architectures only). */
  readonly modules?: readonly string[];
}

const MODULE_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const KEEP = ".gitkeep";

const isSafeRelative = (path: string) => {
  const normalized = posix.normalize(path);
  return (
    !posix.isAbsolute(path) &&
    normalized !== ".." &&
    !normalized.startsWith("../") &&
    !path.includes("\\")
  );
};

/**
 * Compute which directories a new project needs. Pure: touches no disk.
 * Existing projects never get generated structure; their architecture is adopted, not imposed.
 */
export function planStructure(
  manifest: ArchitectureManifest,
  options: PlanOptions,
): Result<StructurePlan, string> {
  if (options.mode === "existing") {
    return err(
      "Structure generation is for new projects only. An existing project keeps its own structure; " +
        "use `eng-skills migrate` to plan a change.",
    );
  }

  const modules = [...new Set(options.modules ?? [])].sort();
  for (const name of modules) {
    if (!MODULE_NAME.test(name))
      return err(`Invalid module name "${name}": use lowercase kebab-case.`);
  }
  const moduleSpec = manifest.structure.module;
  if (modules.length > 0 && !moduleSpec) {
    return err(
      `Architecture "${manifest.name}" is not module-oriented, so it has no modules to scaffold.`,
    );
  }

  const wanted = new Set<string>(manifest.structure.directories);
  if (moduleSpec) {
    for (const name of modules) {
      const base = posix.join(moduleSpec.container, name);
      wanted.add(base);
      for (const dir of moduleSpec.directories) wanted.add(posix.join(base, dir));
    }
  }

  const unsafe = [...wanted].find((dir) => !isSafeRelative(dir));
  if (unsafe !== undefined)
    return err(`Unsafe path in architecture "${manifest.name}": "${unsafe}".`);

  const directories = [...wanted].map((d) => posix.normalize(d).replace(/\/$/, "")).sort();
  const leaves = directories.filter(
    (dir) => !directories.some((other) => other.startsWith(`${dir}/`)),
  );
  return ok({ directories, keepFiles: leaves.map((dir) => posix.join(dir, KEEP)) });
}

export interface PlanAction {
  readonly path: string;
  readonly action: "create" | "exists";
}

export interface ApplyResult {
  readonly actions: readonly PlanAction[];
  readonly created: number;
  readonly skipped: number;
}

const exists = async (path: string) => {
  try {
    await stat(path);
    return true;
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw cause;
  }
};

/**
 * Apply a plan under `root`. Never overwrites and never touches an existing directory's
 * contents: existing paths are reported and skipped. `.gitkeep` is only added to
 * directories this call created. With `dryRun`, nothing is written.
 */
export async function applyStructure(
  root: string,
  plan: StructurePlan,
  options: { dryRun?: boolean } = {},
): Promise<ApplyResult> {
  const actions: PlanAction[] = [];
  const createdDirs = new Set<string>();

  for (const dir of plan.directories) {
    const target = join(root, dir);
    if (await exists(target)) {
      actions.push({ path: dir, action: "exists" });
      continue;
    }
    createdDirs.add(dir);
    actions.push({ path: dir, action: "create" });
    if (!options.dryRun) await mkdir(target, { recursive: true });
  }

  for (const keep of plan.keepFiles) {
    const dir = posix.dirname(keep);
    if (!createdDirs.has(dir)) continue;
    actions.push({ path: keep, action: "create" });
    if (!options.dryRun) await writeFile(join(root, keep), "", { flag: "wx" });
  }

  const created = actions.filter((a) => a.action === "create").length;
  return { actions, created, skipped: actions.length - created };
}

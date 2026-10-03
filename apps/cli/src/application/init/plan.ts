import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { applyStructure, type StructurePlan } from "@engineering-skills/architecture-engine";

export type FileAction = "create" | "update" | "unchanged";

export interface PlannedFile {
  readonly path: string;
  readonly content: string;
  readonly action: FileAction;
  readonly note: string;
}

export interface WritePlan {
  readonly files: readonly PlannedFile[];
  readonly structure: StructurePlan | undefined;
  /** Directories the structure step would create / leave alone. */
  readonly structureActions: readonly {
    readonly path: string;
    readonly action: "create" | "exists";
  }[];
}

async function readIfExists(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw cause;
  }
}

export interface PlanInput {
  readonly root: string;
  readonly files: readonly {
    readonly path: string;
    readonly content: string;
    readonly note: string;
  }[];
  readonly structure?: StructurePlan | undefined;
}

/** Work out what would change, without changing anything. */
export async function buildWritePlan(input: PlanInput): Promise<WritePlan> {
  const files: PlannedFile[] = [];
  for (const file of input.files) {
    const current = await readIfExists(join(input.root, file.path));
    files.push({
      ...file,
      action: current === undefined ? "create" : current === file.content ? "unchanged" : "update",
    });
  }
  const structureActions = input.structure
    ? (await applyStructure(input.root, input.structure, { dryRun: true })).actions.filter(
        (a) => !a.path.endsWith(".gitkeep"),
      )
    : [];
  return { files, structure: input.structure, structureActions };
}

export const hasChanges = (plan: WritePlan): boolean =>
  plan.files.some((f) => f.action !== "unchanged") ||
  plan.structureActions.some((a) => a.action === "create");

/** Human-readable plan, shown before the first write. */
export function renderPlan(plan: WritePlan): string {
  const lines = ["Planned changes", ""];
  const symbol = { create: "+", update: "~", unchanged: "·" } as const;
  for (const f of plan.files) {
    lines.push(
      `  ${symbol[f.action]} ${f.action === "unchanged" ? "unchanged" : f.action}  ${f.path}  (${f.note})`,
    );
  }
  const created = plan.structureActions.filter((a) => a.action === "create");
  const existing = plan.structureActions.filter((a) => a.action === "exists");
  if (plan.structureActions.length > 0) {
    lines.push(
      `  + create  ${created.length} director${created.length === 1 ? "y" : "ies"} for the selected architecture`,
    );
    for (const d of created) lines.push(`      ${d.path}/`);
    for (const d of existing) lines.push(`  · exists  ${d.path}/  (left untouched)`);
  }
  lines.push("", "No source file is modified.");
  return `${lines.join("\n")}\n`;
}

/** Write a file via a temporary sibling so a failure never leaves a half-written config. */
async function writeAtomically(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.tmp-${process.pid}`;
  await writeFile(temp, content, "utf8");
  await rename(temp, path);
}

export async function applyWritePlan(
  root: string,
  plan: WritePlan,
): Promise<{ readonly written: readonly string[] }> {
  const written: string[] = [];
  for (const f of plan.files) {
    if (f.action === "unchanged") continue;
    await writeAtomically(join(root, f.path), f.content);
    written.push(f.path);
  }
  if (plan.structure) {
    const result = await applyStructure(root, plan.structure);
    written.push(
      ...result.actions
        .filter((a) => a.action === "create" && !a.path.endsWith(".gitkeep"))
        .map((a) => `${a.path}/`),
    );
  }
  return { written };
}

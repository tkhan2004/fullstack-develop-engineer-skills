import { posix } from "node:path";
import {
  getAdapter,
  inspectGeneratedFile,
  normalize,
  renderAdapter,
  sha256,
  type GeneratedFile,
} from "@engineering-skills/adapters";
import type { ArchitectureManifest } from "@engineering-skills/architecture-engine";
import type { EngineeringConfig } from "@engineering-skills/config";
import { err, ok, type CanonicalOutput, type Result } from "@engineering-skills/core";
import type { Profile } from "@engineering-skills/detection";
import {
  budgetWarnings,
  buildRegistry,
  createSkill,
  formatSkillIssues,
  parseSkillManifest,
  resolveSkills,
  validateSkillContract,
  type ResolvedSkillSet,
  type Skill,
} from "@engineering-skills/skill-engine";
import { stringify } from "yaml";
import { buildCanonicalOutput } from "./canonical.js";
import { planFiles, type PlannedWrite, type Reader } from "./plan.js";
import { PROJECT_SKILL_DIR, renderProjectSkill } from "./project-skill.js";

export interface GenerateInput {
  readonly config: EngineeringConfig;
  /** The exact text of config.yaml, so the lockfile can record what it was generated from. */
  readonly configText: string;
  readonly profile?: Profile | undefined;
  /** Shipped skills (`skills/` and `architectures/`), already loaded. */
  readonly skills: readonly Skill[];
  readonly manifests: readonly ArchitectureManifest[];
  readonly read: Reader;
  readonly version: string;
  /** Project-relative directory holding config.yaml, e.g. `.engineering`. */
  readonly engineeringDir: string;
  /** Limit generation to these adapter ids (default: the configured ones). */
  readonly adapters?: readonly string[] | undefined;
  /** Replace hand-edited generated files instead of stopping. */
  readonly force: boolean;
}

export interface GenerationPlan {
  readonly writes: readonly PlannedWrite[];
  readonly conflicts: readonly PlannedWrite[];
  readonly warnings: readonly string[];
  readonly resolved: ResolvedSkillSet;
  readonly output: CanonicalOutput;
}

const LOCKFILE = "generated/lockfile.yaml";

type ProjectSkillPlan = { skill: Skill | undefined; writes: PlannedWrite[]; warnings: string[] };

function parseProjectSkill(yamlText: string, mdText: string, dir: string): Skill | undefined {
  const manifest = parseSkillManifest(yamlText, `${dir}/skill.yaml`);
  return manifest.ok ? createSkill(manifest.value, mdText, "project", dir) : undefined;
}

/**
 * The project conventions skill is generated once and then belongs to the team: a hand-edited copy
 * is kept and used, never overwritten (unless forced).
 */
async function planProjectSkill(input: GenerateInput): Promise<ProjectSkillPlan> {
  const dir = posix.join(input.engineeringDir, PROJECT_SKILL_DIR);
  const mdPath = `${dir}/SKILL.md`;
  const yamlPath = `${dir}/skill.yaml`;
  const profilePath =
    input.config.adoption?.profile ?? posix.join(input.engineeringDir, "project-profile.yaml");
  const [diskMd, diskYaml] = await Promise.all([input.read(mdPath), input.read(yamlPath)]);

  const generated =
    input.config.project.mode === "existing" && input.profile
      ? renderProjectSkill(input.profile, { version: input.version, source: profilePath })
      : undefined;
  const fromDisk =
    diskMd !== undefined && diskYaml !== undefined
      ? parseProjectSkill(diskYaml, diskMd, dir)
      : undefined;
  const warnings: string[] = [];

  if (!generated) return { skill: fromDisk, writes: [], warnings };

  const state = diskMd === undefined ? "absent" : inspectGeneratedFile(diskMd);
  const keepTheirs =
    (state === "edited" || state === "not-generated") && !input.force && fromDisk !== undefined;
  if (keepTheirs) {
    warnings.push(`Kept your edited ${mdPath}; regenerate it with --force.`);
    return { skill: fromDisk, writes: [], warnings };
  }

  const action = (current: string | undefined, next: string): PlannedWrite["action"] =>
    current === undefined
      ? "create"
      : normalize(current) === normalize(next)
        ? "unchanged"
        : "update";
  const write = (
    path: string,
    current: string | undefined,
    content: string,
    reason: string,
  ): PlannedWrite => ({
    path,
    content,
    action: action(current, content),
    reason: action(current, content) === "unchanged" ? "up to date" : reason,
    hash: sha256(normalize(content)),
  });
  return {
    skill: parseProjectSkill(generated.skillYaml, generated.skillMd, dir),
    writes: [
      write(
        yamlPath,
        diskYaml,
        generated.skillYaml,
        diskYaml === undefined ? "new file" : "regenerated from the profile",
      ),
      write(
        mdPath,
        diskMd,
        generated.skillMd,
        diskMd === undefined
          ? "new file"
          : state === "pristine"
            ? "regenerated from the profile"
            : "replaces your version (--force)",
      ),
    ],
    warnings,
  };
}

const lockfileText = (
  input: GenerateInput,
  output: CanonicalOutput,
  writes: readonly PlannedWrite[],
): string =>
  stringify(
    {
      version: 1,
      generator: `@engineering-skills/cli@${input.version}`,
      config_hash: sha256(normalize(input.configText)),
      skills: output.lockfile.skills.map((s) => ({
        id: s.id,
        version: s.version,
        selected_by: s.selectedBy,
      })),
      files: [...writes]
        .sort((a, b) => a.path.localeCompare(b.path))
        .map((w) => ({ path: w.path, hash: w.hash })),
    },
    { lineWidth: 0, sortMapEntries: false },
  );

/**
 * Work out everything `generate` would write, without writing it: project skill, resolved skill
 * set, canonical output, each adapter's files, and the lockfile. Pure given its inputs, so the same
 * configuration always plans the same bytes.
 */
export async function planGeneration(
  input: GenerateInput,
): Promise<Result<GenerationPlan, string[]>> {
  const project = await planProjectSkill(input);
  const warnings = [...project.warnings];

  const registry = buildRegistry([...input.skills, ...(project.skill ? [project.skill] : [])]);
  if (!registry.ok) return err(registry.error.map((i) => formatSkillIssues([i])));
  const resolved = resolveSkills(registry.value, input.config);
  if (!resolved.ok) return err(resolved.error.map((i) => formatSkillIssues([i])));

  if (input.skills.length === 0) {
    warnings.push(
      "No skills are installed, so only the project facts and the project's own skill are generated.",
    );
  }
  warnings.push(...budgetWarnings(resolved.value).map((w) => w.message));
  if (project.skill) {
    for (const p of validateSkillContract(project.skill))
      warnings.push(`project skill: ${p.message}`);
  }

  const output = buildCanonicalOutput({
    config: input.config,
    resolved: resolved.value,
    manifests: input.manifests,
    profile: input.profile,
  });

  const ids = input.adapters ?? input.config.ai.adapters;
  const files: GeneratedFile[] = [];
  for (const id of ids) {
    const adapter = getAdapter(id);
    if (!adapter) return err([`Unknown adapter "${id}".`]);
    const entry = input.config.ai.output?.[id as keyof NonNullable<typeof input.config.ai.output>];
    files.push(
      ...renderAdapter(adapter, output, {
        mode: input.config.ai.mode ?? adapter.defaultMode,
        version: input.version,
        source: posix.join(input.engineeringDir, "config.yaml"),
        ...(entry ? { outputPath: entry } : {}),
      }),
    );
  }
  const seen = new Set<string>();
  for (const f of files) {
    if (seen.has(`${f.path}:${f.blockId ?? ""}`))
      return err([`Two adapters write to "${f.path}". Give one a different path in ai.output.`]);
    seen.add(`${f.path}:${f.blockId ?? ""}`);
  }

  const planned = await planFiles(files, input.read, { force: input.force });
  const lockPath = posix.join(input.engineeringDir, LOCKFILE);
  const lockContent = lockfileText(input, output, [...planned, ...project.writes]);
  const existingLock = await input.read(lockPath);
  const lock: PlannedWrite = {
    path: lockPath,
    content: lockContent,
    action:
      existingLock === undefined
        ? "create"
        : normalize(existingLock) === normalize(lockContent)
          ? "unchanged"
          : "update",
    reason:
      existingLock === undefined ? "new file" : "records the resolved skills and generated files",
    hash: sha256(normalize(lockContent)),
  };

  const writes = [...planned, ...project.writes, lock].sort((a, b) => a.path.localeCompare(b.path));
  return ok({
    writes,
    conflicts: writes.filter((w) => w.action === "conflict"),
    warnings,
    resolved: resolved.value,
    output,
  });
}

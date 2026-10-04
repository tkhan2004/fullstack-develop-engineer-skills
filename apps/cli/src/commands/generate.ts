import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { loadManifests } from "@engineering-skills/architecture-engine";
import { formatIssues, loadConfigFile, serializeConfig } from "@engineering-skills/config";
import { AI_ADAPTER_IDS } from "@engineering-skills/core";
import { isProfileStale, parseProfile, readGitCommit } from "@engineering-skills/detection";
import { planGeneration, type PlannedWrite } from "@engineering-skills/generator";
import { loadSkillsFromDir, type Skill } from "@engineering-skills/skill-engine";
import { join, posix } from "node:path";
import { VERSION, type Context } from "../context.js";
import { resolveDataDir } from "../infrastructure/data-dir.js";
import { readProjectFile, writeProjectFile } from "../infrastructure/project-fs.js";

export const GENERATE_USAGE = `Usage: eng-skills generate [options]

Generate the instruction files for your AI tools from .engineering/config.yaml: the project
facts and rules, the resolved skills, and a lockfile. Deterministic: running it twice changes nothing.

Files you own (CLAUDE.md, AGENTS.md) only get a managed block; everything else in them is kept.
A generated file that was edited by hand stops generation unless you pass --force.

Options:
  --check              Write nothing; exit 1 if the generated files are out of date (for CI)
  --dry-run            Show what would change and write nothing
  --force              Replace hand-edited generated files and a hand-edited project skill
  --adapters <list>    Only these adapters (claude, codex, generic)
  --out <dir>          Configuration directory (default .engineering)
  --cwd <dir>          Project directory (default: current directory)
  -h, --help           Show this help
`;

const SYMBOL: Record<PlannedWrite["action"], string> = {
  create: "+ create   ",
  update: "~ update   ",
  unchanged: "· unchanged",
  conflict: "! conflict ",
};

async function loadShippedSkills(
  dataDir: string,
): Promise<{ skills: Skill[]; problems: string[] }> {
  const groups = await Promise.all([
    loadSkillsFromDir(resolve(dataDir, "skills"), { origin: "skills" }),
    loadSkillsFromDir(resolve(dataDir, "architectures"), {
      origin: "architectures",
      idPrefix: "architecture/",
    }),
  ]);
  const skills: Skill[] = [];
  const problems: string[] = [];
  for (const g of groups) {
    if (g.ok) skills.push(...g.value);
    else problems.push(...g.error.map((i) => i.message));
  }
  return { skills, problems };
}

export async function runGenerate(argv: readonly string[], ctx: Context): Promise<number> {
  let values;
  try {
    values = parseArgs({
      args: [...argv],
      strict: true,
      options: {
        check: { type: "boolean" },
        "dry-run": { type: "boolean" },
        force: { type: "boolean" },
        adapters: { type: "string" },
        out: { type: "string" },
        cwd: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
    }).values;
  } catch (cause) {
    ctx.err(`${(cause as Error).message}\n\n${GENERATE_USAGE}`);
    return 2;
  }
  if (values.help) {
    ctx.out(GENERATE_USAGE);
    return 0;
  }

  const adapters = values.adapters
    ?.split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  const unknown = adapters?.find((a) => !(AI_ADAPTER_IDS as readonly string[]).includes(a));
  if (unknown) {
    ctx.err(`--adapters: unknown adapter "${unknown}". Expected: ${AI_ADAPTER_IDS.join(", ")}.\n`);
    return 2;
  }

  const root = resolve(ctx.cwd, values.cwd ?? ".");
  const dir = values.out ?? ".engineering";
  const configPath = posix.join(dir, "config.yaml");
  const read = readProjectFile(root);

  const loaded = await loadConfigFile(join(root, configPath));
  if (!loaded.ok) {
    ctx.err(`${formatIssues(loaded.error, configPath)}\n`);
    return 2;
  }
  const config = loaded.value.config;
  const configText = (await read(configPath)) ?? serializeConfig(config);

  // The profile describes an existing project; a missing or stale one is a warning, not a failure.
  const profilePath = config.adoption?.profile ?? posix.join(dir, "project-profile.yaml");
  const profileText = await read(profilePath);
  const parsed = profileText === undefined ? undefined : parseProfile(profileText);
  const notes: string[] = [];
  if (config.project.mode === "existing" && profileText === undefined) {
    notes.push(
      `No project profile at ${profilePath}; run \`eng-skills analyze\` for project-specific rules.`,
    );
  } else if (parsed && !parsed.ok) {
    notes.push(`${profilePath} is not a valid profile (${parsed.error[0]}); ignoring it.`);
  }
  const profile = parsed?.ok ? parsed.value : undefined;
  if (profile && isProfileStale(profile, await readGitCommit(root))) {
    notes.push(
      `${profilePath} was generated at an older commit; run \`eng-skills analyze\` to refresh it.`,
    );
  }

  const dataDir = resolveDataDir(ctx.dataDir);
  const manifests = await loadManifests(resolve(dataDir, "architectures"));
  if (!manifests.ok) {
    ctx.err(`Could not load the architecture definitions:\n${manifests.error.join("\n")}\n`);
    return 3;
  }
  const shipped = await loadShippedSkills(dataDir);
  if (shipped.problems.length > 0) {
    ctx.err(`Could not load the skills:\n${shipped.problems.join("\n")}\n`);
    return 3;
  }

  const planned = await planGeneration({
    config,
    configText,
    profile,
    skills: shipped.skills,
    manifests: manifests.value,
    read,
    version: VERSION,
    engineeringDir: dir,
    adapters,
    force: values.force ?? false,
  });
  if (!planned.ok) {
    ctx.err(`Could not plan the generation:\n${planned.error.join("\n")}\n`);
    return 3;
  }
  const plan = planned.value;

  const arch = config.architecture.backend;
  ctx.out(
    `Generating from ${configPath}${arch ? ` (${arch.style} · ${arch.strictness} · ${config.project.mode}${config.adoption ? `/${config.adoption.strategy}` : ""})` : ""}\n\n`,
  );
  for (const w of plan.writes)
    ctx.out(
      `  ${SYMBOL[w.action]}  ${w.path}${w.action === "unchanged" ? "" : `  (${w.reason})`}\n`,
    );
  ctx.out(
    `\n${plan.resolved.skills.length} skill${plan.resolved.skills.length === 1 ? "" : "s"} · ~${plan.resolved.totalTokens} tokens of skill content\n`,
  );
  for (const message of [...notes, ...plan.warnings]) ctx.out(`⚠ ${message}\n`);

  const pending = plan.writes.filter((w) => w.action === "create" || w.action === "update");

  if (plan.conflicts.length > 0) {
    ctx.err(
      `\n${plan.conflicts.length} file${plan.conflicts.length === 1 ? "" : "s"} would overwrite something you wrote or edited, so nothing was written:\n` +
        plan.conflicts.map((c) => `  ${c.path}: ${c.reason}`).join("\n") +
        "\nReview them, then re-run with --force to replace them.\n",
    );
    return 1;
  }
  if (values.check) {
    if (pending.length > 0) {
      ctx.err(
        `\nOut of date: ${pending.length} file${pending.length === 1 ? "" : "s"} would change. Run \`eng-skills generate\`.\n`,
      );
      return 1;
    }
    ctx.out("\nUp to date.\n");
    return 0;
  }
  if (values["dry-run"]) {
    ctx.out("\nDry run: nothing was written.\n");
    return 0;
  }
  if (pending.length === 0) {
    ctx.out("\nNothing to do: everything is up to date.\n");
    return 0;
  }

  const write = writeProjectFile(root);
  for (const w of pending) await write(w.path, w.content);
  ctx.out(`\n✔ Wrote ${pending.length} file${pending.length === 1 ? "" : "s"}.\n`);
  return 0;
}

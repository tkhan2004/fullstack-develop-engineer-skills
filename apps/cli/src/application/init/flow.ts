import { access } from "node:fs/promises";
import { basename, join, posix, resolve } from "node:path";
import {
  planStructure,
  type ArchitectureManifest,
  type StructurePlan,
} from "@engineering-skills/architecture-engine";
import {
  formatIssues,
  loadConfigFile,
  loadPreset,
  mergeLayers,
  parseConfig,
  resolveLayers,
  serializeConfig,
  defaultStrictness,
  type Layer,
} from "@engineering-skills/config";
import {
  BACKEND_FRAMEWORKS,
  DATABASE_ENGINES,
  ENGINEERING_PRACTICE_DEFAULTS,
  FRONTEND_FRAMEWORKS,
  LANGUAGES,
  ORMS,
  STRICTNESS_LEVELS,
  TEST_FRAMEWORKS,
  type AdoptionStrategy,
  type AiAdapterId,
  type Strictness,
} from "@engineering-skills/core";
import {
  analyzeSnapshot,
  isProfileStale,
  parseProfile,
  readGitCommit,
  readPackage,
  scanDirectory,
  serializeProfile,
  suggestProjectMode,
  type Profile,
  type Snapshot,
} from "@engineering-skills/detection";
import { readFile } from "node:fs/promises";
import { displayName } from "../../presentation/names.js";
import { renderReport } from "../../presentation/report.js";
import { Cancelled, type Option, type Prompter } from "../prompter.js";
import { PRACTICE_LABELS, practicesToEngineering, stackLayerFromProfile } from "./answers.js";
import {
  decideExistingArchitecture,
  styleOptions,
  type ArchitectureDecision,
} from "./architecture.js";
import type { InitOptions } from "./options.js";
import { applyWritePlan, buildWritePlan, hasChanges, renderPlan } from "./plan.js";

export interface InitDeps {
  readonly prompter: Prompter | undefined;
  readonly out: (text: string) => void;
  readonly err: (text: string) => void;
  readonly color: boolean;
  readonly manifests: readonly ArchitectureManifest[];
  readonly presetsDir: string;
  /** Recorded in the profile, e.g. `@engineering-skills/cli@0.1.0`. */
  readonly generator: string;
}

/** What a flow gathered: the config answers, plus anything else that will be written. */
interface Collected {
  readonly answers: Layer;
  readonly profile?: Profile;
  /** Write the profile (it was generated in this run) or leave an existing one alone. */
  readonly writeProfile: boolean;
  readonly structure?: StructurePlan;
}

class Exit extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

const exists = async (path: string) =>
  access(path).then(
    () => true,
    () => false,
  );
const labelled = <T extends string>(values: readonly T[]): Option<T>[] =>
  values.map((value) => ({ value, label: value === "none" ? "None" : displayName(value) }));

const pick = (layer: Layer | undefined, path: string): string | undefined => {
  let current: unknown = layer;
  for (const key of path.split(".")) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : undefined;
};

const STRICTNESS_HINTS: Record<Strictness, string> = {
  observe: "learn the project's conventions; change nothing",
  minimal: "follow existing conventions; no new patterns",
  standard: "follow the architecture and flag inconsistencies",
  strict: "reject implementations that violate boundaries",
};

/** Ask unless a flag already answered; with --yes use the preset or fall back. */
async function choose<T extends string>(
  deps: InitDeps,
  options: InitOptions,
  q: {
    id: string;
    message: string;
    options: readonly Option<T>[];
    flag: T | undefined;
    preset: T | undefined;
    fallback: T | undefined;
  },
): Promise<T | undefined> {
  if (q.flag !== undefined) return q.flag;
  const initial = q.preset ?? q.fallback;
  if (options.yes || !deps.prompter) return initial;
  return deps.prompter.select({
    id: q.id,
    message: q.message,
    options: q.options,
    ...(initial !== undefined ? { initial } : {}),
  });
}

async function askCommon(
  deps: InitDeps,
  options: InitOptions,
  mode: "new" | "existing",
  strategy: AdoptionStrategy | undefined,
): Promise<{
  strictness: Strictness;
  engineering: Record<string, boolean>;
  adapters: AiAdapterId[];
}> {
  const fallback = defaultStrictness(mode, strategy);
  const strictness =
    (await choose(deps, options, {
      id: "strictness",
      message: "How strictly should the rules be applied?",
      options: STRICTNESS_LEVELS.map((value) => ({
        value,
        label: value[0]?.toUpperCase() + value.slice(1),
        hint: STRICTNESS_HINTS[value],
      })),
      flag: options.strictness,
      preset: undefined,
      fallback,
    })) ?? fallback;

  const defaults = Object.entries(ENGINEERING_PRACTICE_DEFAULTS)
    .filter(([, on]) => on)
    .map(([key]) => key);
  const practices =
    options.yes || !deps.prompter
      ? defaults
      : await deps.prompter.multiselect({
          id: "practices",
          message: "Engineering practices",
          options: Object.entries(PRACTICE_LABELS).map(([value, label]) => ({ value, label })),
          initial: defaults,
        });

  const adapters =
    options.adapters !== undefined
      ? [...options.adapters]
      : options.yes || !deps.prompter
        ? (["claude", "generic"] as AiAdapterId[])
        : await deps.prompter.multiselect<AiAdapterId>({
            id: "adapters",
            message: "Which AI coding tools should get instructions?",
            options: [
              { value: "claude", label: "Claude Code" },
              { value: "codex", label: "OpenAI Codex" },
              { value: "generic", label: "Generic (plain Markdown)" },
            ],
            initial: ["claude", "generic"],
          });

  return {
    strictness,
    engineering: practicesToEngineering(practices),
    adapters: adapters.length > 0 ? adapters : ["generic"],
  };
}

function flagStack(options: InitOptions): Layer {
  const stack: Layer = {};
  if (options.language) stack["language"] = options.language;
  if (options.backend && options.backend !== "none")
    stack["backend"] = { runtime: "node", framework: options.backend };
  if (options.frontend && options.frontend !== "none")
    stack["frontend"] = { framework: options.frontend };
  if (options.database && options.database !== "none") {
    stack["database"] = {
      engine: options.database,
      ...(options.orm && options.orm !== "none" ? { orm: options.orm } : {}),
    };
  }
  if (options.testing && options.testing !== "none")
    stack["testing"] = { framework: options.testing };
  return stack;
}

async function collectNew(
  deps: InitDeps,
  options: InitOptions,
  preset: Layer | undefined,
  root: string,
): Promise<Collected> {
  const fail = (message: string, code = 2): never => {
    deps.err(`${message}\n`);
    throw new Exit(code);
  };

  const language = await choose(deps, options, {
    id: "language",
    message: "Language",
    options: labelled(LANGUAGES),
    flag: options.language,
    preset: pick(preset, "stack.language") as (typeof LANGUAGES)[number] | undefined,
    fallback: "typescript",
  });
  const backend = await choose(deps, options, {
    id: "backend",
    message: "Backend",
    options: labelled(BACKEND_FRAMEWORKS),
    flag: options.backend,
    preset: pick(preset, "stack.backend.framework") as
      (typeof BACKEND_FRAMEWORKS)[number] | undefined,
    fallback: "none",
  });
  const frontend = await choose(deps, options, {
    id: "frontend",
    message: "Frontend",
    options: labelled(FRONTEND_FRAMEWORKS),
    flag: options.frontend,
    preset: pick(preset, "stack.frontend.framework") as
      (typeof FRONTEND_FRAMEWORKS)[number] | undefined,
    fallback: "none",
  });
  const database = await choose(deps, options, {
    id: "database",
    message: "Database",
    options: labelled(DATABASE_ENGINES),
    flag: options.database,
    preset: pick(preset, "stack.database.engine") as (typeof DATABASE_ENGINES)[number] | undefined,
    fallback: "none",
  });
  const orm =
    database && database !== "none"
      ? await choose(deps, options, {
          id: "orm",
          message: "ORM",
          options: labelled(ORMS),
          flag: options.orm,
          preset: pick(preset, "stack.database.orm") as (typeof ORMS)[number] | undefined,
          fallback: "none",
        })
      : "none";
  const testing = await choose(deps, options, {
    id: "testing",
    message: "Test framework",
    options: labelled(TEST_FRAMEWORKS),
    flag: options.testing,
    preset: pick(preset, "stack.testing.framework") as (typeof TEST_FRAMEWORKS)[number] | undefined,
    fallback: "none",
  });

  // Architecture only matters when there is a backend to organise.
  let style: string | undefined;
  let manifest: ArchitectureManifest | undefined;
  if (backend && backend !== "none") {
    if (!options.yes && deps.prompter && options.architecture === undefined)
      deps.out(`${architectureOverview(deps.manifests)}\n`);
    style = await choose(deps, options, {
      id: "architecture",
      message: "Backend architecture",
      options: styleOptions(deps.manifests),
      flag: options.architecture,
      preset: pick(preset, "architecture.backend.style"),
      fallback: undefined,
    });
    if (style === undefined) {
      fail(
        `--yes needs an architecture: pass --architecture <${deps.manifests.map((m) => m.name).join(" | ")}> (or --preset).`,
      );
    }
    manifest = deps.manifests.find((m) => m.name === style);
    if (!manifest)
      fail(
        `--architecture: unknown style "${style}". Expected one of: ${deps.manifests.map((m) => m.name).join(", ")}.`,
      );
  }

  const common = await askCommon(deps, options, "new", undefined);

  let structure: StructurePlan | undefined;
  if (manifest && !options.noStructure) {
    let modules = options.modules;
    if (modules === undefined && manifest.structure.module && !options.yes && deps.prompter) {
      const answer = await deps.prompter.text({
        id: "modules",
        message: "Feature modules to scaffold (comma-separated, blank for none)",
        placeholder: "users, orders",
      });
      modules = answer
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);
    }
    const planned = planStructure(manifest, { mode: "new", modules: modules ?? [] });
    if (!planned.ok) fail(planned.error);
    else structure = planned.value;
  }

  const stack = mergeLayers(
    { language },
    backend && backend !== "none" ? { backend: { runtime: "node", framework: backend } } : {},
    frontend && frontend !== "none" ? { frontend: { framework: frontend } } : {},
    database && database !== "none"
      ? { database: { engine: database, ...(orm && orm !== "none" ? { orm } : {}) } }
      : {},
    testing && testing !== "none" ? { testing: { framework: testing } } : {},
  );

  return {
    answers: {
      project: { mode: "new", name: options.name ?? basename(root) },
      stack,
      architecture: style
        ? {
            backend: {
              style,
              source: "selected",
              strictness: common.strictness,
              root: manifest?.structure.root ?? "src",
            },
          }
        : {},
      engineering: common.engineering,
      ai: { adapters: common.adapters },
    },
    writeProfile: false,
    ...(structure ? { structure } : {}),
  };
}

function architectureOverview(manifests: readonly ArchitectureManifest[]): string {
  const lines = [
    "Architecture options (none is better in general; they trade different things):",
    "",
  ];
  for (const m of manifests) {
    lines.push(
      `  ${displayName(m.name)}`,
      `    + ${m.trade_offs.benefits[0]}`,
      `    - ${m.trade_offs.costs[0]}`,
    );
  }
  return lines.join("\n");
}

async function loadFreshProfile(
  path: string,
  commit: string | undefined,
  deps: InitDeps,
  options: InitOptions,
): Promise<Profile | undefined> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch {
    return undefined;
  }
  const parsed = parseProfile(text);
  if (!parsed.ok) return undefined;
  if (isProfileStale(parsed.value, commit)) {
    deps.out(
      `Existing profile is stale (analysed at ${parsed.value.generated.commit}, HEAD is ${commit}); analysing again.\n`,
    );
    return undefined;
  }
  if (options.yes || !deps.prompter) return parsed.value;
  const choice = await deps.prompter.select({
    id: "profile-reuse",
    message: "Existing engineering profile detected. Use the detected project configuration?",
    options: [
      { value: "use", label: "Yes" },
      { value: "reanalyze", label: "No, analyse the repository again" },
    ],
    initial: "use",
  });
  return choice === "use" ? parsed.value : undefined;
}

async function collectExisting(
  deps: InitDeps,
  options: InitOptions,
  root: string,
  snapshot: Snapshot,
  profileRel: string,
): Promise<Collected> {
  const commit = await readGitCommit(root);
  const reused = await loadFreshProfile(join(root, profileRel), commit, deps, options);
  const profile =
    reused ??
    analyzeSnapshot(snapshot, {
      architectures: deps.manifests,
      generator: deps.generator,
      commit,
      deterministic: false,
    }).profile;
  deps.out(renderReport(profile, { color: deps.color, footer: false }));
  deps.out("\n");

  const decided = await decideExistingArchitecture({
    profile,
    options,
    prompter: deps.prompter,
    manifests: deps.manifests,
  });
  if (!decided.ok) {
    deps.err(decided.message);
    throw new Exit(decided.code);
  }
  const decision = decided.decision;

  const strategy: AdoptionStrategy =
    (await choose(deps, options, {
      id: "strategy",
      message: "How should Engineering Skills work with this project?",
      options: [
        {
          value: "adopt",
          label: "Adopt existing architecture",
          hint: "recommended: follow what is there, change nothing",
        },
        { value: "recommend", label: "Recommend improvements without restructuring" },
        {
          value: "migrate",
          label: "Migrate toward another architecture",
          hint: "explicit; plans an incremental migration",
        },
      ],
      flag: options.strategy,
      preset: undefined,
      fallback: "adopt",
    })) ?? "adopt";

  let migration: Layer | undefined;
  if (strategy === "migrate") {
    const targets = deps.manifests.filter((m) => m.name !== decision.style);
    const to = await choose(deps, options, {
      id: "migrate-target",
      message: "Target architecture",
      options: styleOptions(targets),
      flag: options.migrateTo,
      preset: undefined,
      fallback: undefined,
    });
    if (!to || !deps.manifests.some((m) => m.name === to)) {
      deps.err(
        `Migration needs a target architecture: pass --migrate-to <${deps.manifests.map((m) => m.name).join(" | ")}>.\n`,
      );
      throw new Exit(2);
    }
    const how =
      (await choose(deps, options, {
        id: "migrate-strategy",
        message: "Migration strategy",
        options: [
          {
            value: "incremental",
            label: "Incremental",
            hint: "module by module, verified between steps (recommended)",
          },
          {
            value: "full",
            label: "Full migration",
            hint: "one pass; needs --force and a clean working tree when applied",
          },
        ],
        flag: options.migration,
        preset: undefined,
        fallback: "incremental",
      })) ?? "incremental";
    migration = { from: decision.style, to, strategy: how, status: "planned" };
  }

  const common = await askCommon(deps, options, "existing", strategy);
  const stack = mergeLayers(stackLayerFromProfile(profile), flagStack(options));
  if (pick(stack, "language") === undefined) {
    const language = await choose(deps, options, {
      id: "language",
      message: "Language",
      options: labelled(LANGUAGES),
      flag: undefined,
      preset: undefined,
      fallback: undefined,
    });
    if (!language) {
      deps.err("Could not detect the language. Pass --language <typescript | javascript>.\n");
      throw new Exit(3);
    }
    stack["language"] = language;
  }

  const sourceRoot = profile.project.source_roots[0] ?? "src";
  return {
    answers: {
      project: {
        mode: "existing",
        name:
          options.name ??
          (readPackage(snapshot).raw?.["name"] as string | undefined) ??
          basename(root),
      },
      adoption: { strategy, profile: profileRel },
      stack,
      architecture: { backend: backendBlock(decision, common.strictness, sourceRoot) },
      ...(migration ? { migration } : {}),
      engineering: common.engineering,
      ai: { adapters: common.adapters },
    },
    profile,
    writeProfile: reused === undefined,
  };
}

function backendBlock(decision: ArchitectureDecision, strictness: Strictness, root: string): Layer {
  return {
    style: decision.style,
    source: decision.source,
    ...(decision.confidence === undefined ? {} : { confidence: decision.confidence }),
    strictness,
    root,
    ...(decision.custom ? { custom: decision.custom } : {}),
  };
}

export async function runInit(options: InitOptions, deps: InitDeps): Promise<number> {
  try {
    return await execute(options, deps);
  } catch (cause) {
    if (cause instanceof Cancelled) {
      deps.out("\nCancelled. Nothing was written.\n");
      return 130;
    }
    if (cause instanceof Exit) return cause.code;
    throw cause;
  }
}

async function execute(options: InitOptions, deps: InitDeps): Promise<number> {
  const { out, err } = deps;
  if (!options.yes && !deps.prompter) {
    err(
      "`eng-skills init` needs an interactive terminal. Pass --yes (with flags such as --architecture) to run non-interactively.\n",
    );
    return 2;
  }
  const root = resolve(options.cwd);
  const configRel = posix.join(options.out, "config.yaml");
  const profileRel = posix.join(options.out, "project-profile.yaml");

  let preset: Layer | undefined;
  if (options.preset) {
    const loaded = await loadPreset(deps.presetsDir, options.preset);
    if (!loaded.ok) {
      err(`${loaded.error}\n`);
      return 2;
    }
    preset = loaded.value;
  }

  // An existing configuration is the user's: keep, review or deliberately replace it.
  let overwriteConfig = false;
  if (await exists(join(root, configRel))) {
    const loaded = await loadConfigFile(join(root, configRel));
    if (!options.force) {
      if (!loaded.ok) {
        err(
          `${formatIssues(loaded.error, configRel)}\nFix the file, or re-run with --force to replace it.\n`,
        );
        return 2;
      }
      if (options.yes || !deps.prompter) {
        out(`Already configured: ${configRel}. Use --force to reconfigure.\n`);
        return 0;
      }
      const choice = await deps.prompter.select({
        id: "existing-config",
        message: `${configRel} already exists.`,
        options: [
          { value: "keep", label: "Keep it" },
          { value: "review", label: "Review it" },
          {
            value: "reconfigure",
            label: "Reconfigure",
            hint: "replaces the file after you confirm",
          },
        ],
        initial: "keep",
      });
      if (choice === "keep") {
        out("Configuration unchanged.\n");
        return 0;
      }
      if (choice === "review") {
        out(serializeConfig(loaded.value.config));
        return 0;
      }
    }
    overwriteConfig = true;
  }

  const snapshot = await scanDirectory(root);
  const suggestion = suggestProjectMode(snapshot);
  const mode =
    options.mode ??
    (options.yes || !deps.prompter
      ? suggestion.mode
      : await deps.prompter.select({
          id: "mode",
          message: "What are you working with?",
          options: [
            {
              value: "new",
              label: "New project",
              hint: "choose an architecture and generate its structure",
            },
            { value: "existing", label: "Existing project", hint: "analyse what is already here" },
          ],
          initial: suggestion.mode,
        }));

  if (mode === "new" && suggestion.mode === "existing") {
    out(
      `Note: this directory already contains a project (${suggestion.reason}). Existing files are never overwritten.\n`,
    );
    if (!options.yes && deps.prompter) {
      const proceed = await deps.prompter.confirm({
        id: "new-in-nonempty",
        message: "Continue as a new project anyway?",
        initial: false,
      });
      if (!proceed) {
        out("Nothing was written.\n");
        return 0;
      }
    }
  }

  const collected =
    mode === "new"
      ? await collectNew(deps, options, preset, root)
      : await collectExisting(deps, options, root, snapshot, profileRel);

  const parsed = parseConfig(
    resolveLayers({ ...(preset ? { preset } : {}), flags: collected.answers }),
  );
  if (!parsed.ok) {
    err(`${formatIssues(parsed.error, "the answers given")}\n`);
    return 2;
  }
  if (parsed.value.warnings.length > 0)
    out(`${formatIssues(parsed.value.warnings, "the new configuration")}\n\n`);

  const files = [
    {
      path: configRel,
      content: serializeConfig(parsed.value.config),
      note: overwriteConfig
        ? "replaces the existing configuration"
        : "source of truth; edit freely",
    },
    ...(collected.profile && collected.writeProfile
      ? [
          {
            path: profileRel,
            content: serializeProfile(collected.profile),
            note: "generated analysis; regenerate with `eng-skills analyze`",
          },
        ]
      : []),
  ];
  const plan = await buildWritePlan({ root, files, structure: collected.structure });
  out(renderPlan(plan));

  if (!hasChanges(plan)) {
    out("Nothing to do: everything is already up to date.\n");
    return 0;
  }
  if (options.dryRun) {
    out("Dry run: nothing was written.\n");
    return 0;
  }
  if (!options.yes && deps.prompter) {
    const confirmed = await deps.prompter.confirm({
      id: "confirm-write",
      message: "Write these changes?",
      initial: true,
    });
    if (!confirmed) {
      out("Nothing was written.\n");
      return 0;
    }
  }

  const { written } = await applyWritePlan(root, plan);
  out(
    `\n✔ Wrote ${written.length} item${written.length === 1 ? "" : "s"}:\n${written.map((w) => `    ${w}`).join("\n")}\n`,
  );
  out(
    "\nNext: review the configuration, then run `eng-skills generate` to create the instruction files for your AI tools.\n",
  );
  return 0;
}

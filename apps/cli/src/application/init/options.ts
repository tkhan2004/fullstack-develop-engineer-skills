import {
  ADOPTION_STRATEGIES,
  AI_ADAPTER_IDS,
  BACKEND_FRAMEWORKS,
  DATABASE_ENGINES,
  FRONTEND_FRAMEWORKS,
  LANGUAGES,
  MIGRATION_STRATEGIES,
  ORMS,
  PROJECT_MODES,
  STRICTNESS_LEVELS,
  TEST_FRAMEWORKS,
  type AdoptionStrategy,
  type AiAdapterId,
  type MigrationStrategy,
  type ProjectMode,
  type Strictness,
} from "@engineering-skills/core";
import { suggest } from "@engineering-skills/config";

export interface InitOptions {
  readonly cwd: string;
  /** Directory (relative to cwd) holding config.yaml and the profile. */
  readonly out: string;
  readonly yes: boolean;
  readonly dryRun: boolean;
  readonly force: boolean;
  readonly noStructure: boolean;
  readonly preset?: string;
  readonly mode?: ProjectMode;
  readonly strategy?: AdoptionStrategy;
  readonly name?: string;
  readonly language?: (typeof LANGUAGES)[number];
  readonly backend?: (typeof BACKEND_FRAMEWORKS)[number];
  readonly frontend?: (typeof FRONTEND_FRAMEWORKS)[number];
  readonly database?: (typeof DATABASE_ENGINES)[number];
  readonly orm?: (typeof ORMS)[number];
  readonly testing?: (typeof TEST_FRAMEWORKS)[number];
  /** A named architecture style or "custom". Validated against the shipped manifests later. */
  readonly architecture?: string;
  readonly strictness?: Strictness;
  readonly adapters?: readonly AiAdapterId[];
  readonly modules?: readonly string[];
  readonly migrateTo?: string;
  readonly migration?: MigrationStrategy;
}

export class OptionError extends Error {}

function oneOf<T extends string>(
  flag: string,
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (value === undefined) return undefined;
  if ((allowed as readonly string[]).includes(value)) return value as T;
  const hint = suggest(value, allowed);
  throw new OptionError(
    `--${flag}: unknown value "${value}". Expected one of: ${allowed.join(", ")}.${hint ? ` Did you mean: ${hint}` : ""}`,
  );
}

const list = (value: string | undefined): string[] | undefined =>
  value === undefined
    ? undefined
    : value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

export interface RawInitFlags {
  readonly yes?: boolean | undefined;
  readonly "dry-run"?: boolean | undefined;
  readonly force?: boolean | undefined;
  readonly structure?: boolean | undefined;
  readonly preset?: string | undefined;
  readonly mode?: string | undefined;
  readonly strategy?: string | undefined;
  readonly name?: string | undefined;
  readonly language?: string | undefined;
  readonly backend?: string | undefined;
  readonly frontend?: string | undefined;
  readonly database?: string | undefined;
  readonly orm?: string | undefined;
  readonly testing?: string | undefined;
  readonly architecture?: string | undefined;
  readonly strictness?: string | undefined;
  readonly adapters?: string | undefined;
  readonly modules?: string | undefined;
  readonly "migrate-to"?: string | undefined;
  readonly migration?: string | undefined;
  readonly out?: string | undefined;
}

/** Validate raw flag strings. Throws {@link OptionError} with an actionable message. */
export function parseInitOptions(flags: RawInitFlags, cwd: string): InitOptions {
  const adapters = list(flags.adapters)?.map(
    (a) => oneOf("adapters", a, AI_ADAPTER_IDS) as AiAdapterId,
  );
  const entries: [keyof InitOptions, unknown][] = [
    ["preset", flags.preset],
    ["mode", oneOf("mode", flags.mode, PROJECT_MODES)],
    ["strategy", oneOf("strategy", flags.strategy, ADOPTION_STRATEGIES)],
    ["name", flags.name],
    ["language", oneOf("language", flags.language, LANGUAGES)],
    ["backend", oneOf("backend", flags.backend, BACKEND_FRAMEWORKS)],
    ["frontend", oneOf("frontend", flags.frontend, FRONTEND_FRAMEWORKS)],
    ["database", oneOf("database", flags.database, DATABASE_ENGINES)],
    ["orm", oneOf("orm", flags.orm, ORMS)],
    ["testing", oneOf("testing", flags.testing, TEST_FRAMEWORKS)],
    ["architecture", flags.architecture],
    ["strictness", oneOf("strictness", flags.strictness, STRICTNESS_LEVELS)],
    ["adapters", adapters],
    ["modules", list(flags.modules)],
    ["migrateTo", flags["migrate-to"]],
    ["migration", oneOf("migration", flags.migration, MIGRATION_STRATEGIES)],
  ];
  const optional = Object.fromEntries(entries.filter(([, v]) => v !== undefined));
  return {
    cwd,
    out: flags.out ?? ".engineering",
    yes: flags.yes ?? false,
    dryRun: flags["dry-run"] ?? false,
    force: flags.force ?? false,
    noStructure: flags.structure === false,
    ...optional,
  };
}

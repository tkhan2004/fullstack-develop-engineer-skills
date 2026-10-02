import { z } from "zod";
import {
  ADOPTION_STRATEGIES,
  AI_ADAPTER_IDS,
  AI_OUTPUT_MODES,
  ARCHITECTURE_SOURCES,
  ARCHITECTURE_STYLES,
  BACKEND_FRAMEWORKS,
  CONFIG_SCHEMA_VERSION,
  DATABASE_ENGINES,
  ENGINEERING_PRACTICE_DEFAULTS,
  FRONTEND_FRAMEWORKS,
  LANGUAGES,
  MIGRATION_STATUSES,
  MIGRATION_STRATEGIES,
  ORMS,
  PACKAGE_MANAGERS,
  PROJECT_MODES,
  STRICTNESS_LEVELS,
  TEST_FRAMEWORKS,
} from "@engineering-skills/core";
import { suggest } from "./suggest.js";

/** Marker for unknown-key issues so the issue mapper can recover structured data. */
export const UNKNOWN_KEY_PREFIX = "\u0000unknown-key:";

/**
 * Closed object: unknown keys are errors, and the error carries the valid keys
 * ("Unknown keys → error listing valid keys", docs/02-specs/config-schema.md §2).
 */
function closedObject<T extends z.ZodRawShape>(shape: T) {
  const valid = Object.keys(shape);
  return z
    .object(shape, {
      errorMap: (issue, ctx) => {
        if (issue.code === "unrecognized_keys") {
          const [key = ""] = issue.keys;
          return {
            message:
              UNKNOWN_KEY_PREFIX + JSON.stringify({ key, valid, suggestion: suggest(key, valid) }),
          };
        }
        return { message: ctx.defaultError };
      },
    })
    .strict();
}

const nonEmpty = z.string().min(1, "Must not be empty");
const relativePath = nonEmpty;

const stackSchema = closedObject({
  language: z.enum(LANGUAGES),
  package_manager: z.enum(PACKAGE_MANAGERS).optional(),
  backend: closedObject({
    runtime: z.literal("node").optional(),
    framework: z.enum(BACKEND_FRAMEWORKS),
    version: z.string().optional(),
  }).optional(),
  frontend: closedObject({
    framework: z.enum(FRONTEND_FRAMEWORKS),
    version: z.string().optional(),
  }).optional(),
  database: closedObject({
    engine: z.enum(DATABASE_ENGINES),
    orm: z.enum(ORMS).optional(),
  }).optional(),
  testing: closedObject({
    framework: z.enum(TEST_FRAMEWORKS),
    e2e: z.string().optional(),
  }).optional(),
});

const pathRole = closedObject({ path: relativePath, role: z.string().optional() });

/** `style: custom` — a manifest that describes the repository instead of classifying it. */
export const customArchitectureSchema = closedObject({
  root: relativePath,
  modules: z.record(closedObject({ path: relativePath })).optional(),
  shared: z.array(pathRole).optional(),
  infrastructure: z.array(pathRole).optional(),
  rules: closedObject({
    dependency_direction: z.enum(["existing", "declared"]),
    declared: z.record(closedObject({ may_import: z.array(z.string()) })).optional(),
    observed: z.array(z.string()).optional(),
  }).optional(),
});

const architectureTargetSchema = closedObject({
  style: z.enum(ARCHITECTURE_STYLES),
  source: z.enum(ARCHITECTURE_SOURCES),
  confidence: z.number().min(0).max(1).optional(),
  strictness: z.enum(STRICTNESS_LEVELS),
  root: relativePath.optional(),
  custom: customArchitectureSchema.optional(),
});

const migrationSchema = closedObject({
  from: z.enum(ARCHITECTURE_STYLES),
  to: z.enum(ARCHITECTURE_STYLES),
  strategy: z.enum(MIGRATION_STRATEGIES),
  status: z.enum(MIGRATION_STATUSES),
  plan: relativePath.optional(),
  modules: z
    .array(closedObject({ name: nonEmpty, status: z.enum(["pending", "in-progress", "done"]) }))
    .optional(),
});

const P = ENGINEERING_PRACTICE_DEFAULTS;
const engineeringSchema = closedObject({
  clean_code: z.boolean().default(P.clean_code),
  solid: z.boolean().default(P.solid),
  design_patterns: z.boolean().default(P.design_patterns),
  testing: z.boolean().default(P.testing),
  security: z.boolean().default(P.security),
  error_handling: z.boolean().default(P.error_handling),
  performance: z.boolean().default(P.performance),
  observability: z.boolean().default(P.observability),
  caching: z.boolean().default(P.caching),
});

const aiSchema = closedObject({
  adapters: z
    .array(z.enum(AI_ADAPTER_IDS))
    .min(1, "Select at least one adapter")
    .default(["generic"]),
  output: z.record(z.enum(AI_ADAPTER_IDS), relativePath).optional(),
  mode: z.enum(AI_OUTPUT_MODES).optional(),
});

const overridesSchema = closedObject({
  skills: closedObject({
    include: z.array(nonEmpty).optional(),
    exclude: z.array(nonEmpty).optional(),
  }).optional(),
  rules: z
    .array(
      closedObject({
        id: nonEmpty,
        enabled: z.boolean(),
        reason: nonEmpty,
      }),
    )
    .optional(),
});

export const configSchema = closedObject({
  version: z.literal(CONFIG_SCHEMA_VERSION),
  project: closedObject({
    mode: z.enum(PROJECT_MODES),
    name: z.string().optional(),
    root: relativePath.optional(),
  }),
  adoption: closedObject({
    strategy: z.enum(ADOPTION_STRATEGIES),
    profile: relativePath.optional(),
  }).optional(),
  stack: stackSchema,
  architecture: closedObject({
    backend: architectureTargetSchema.optional(),
    frontend: architectureTargetSchema.optional(),
  }),
  migration: migrationSchema.optional(),
  engineering: engineeringSchema.default({}),
  ai: aiSchema.default({}),
  overrides: overridesSchema.optional(),
}).superRefine((config, ctx) => {
  const fail = (path: (string | number)[], message: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

  if (config.project.mode === "existing" && !config.adoption) {
    fail(["adoption"], 'Required when project.mode is "existing"');
  }
  if (config.project.mode === "new" && config.adoption) {
    fail(["adoption"], 'Only valid when project.mode is "existing"');
  }

  for (const target of ["backend", "frontend"] as const) {
    const arch = config.architecture[target];
    if (!arch) continue;
    const base = ["architecture", target];

    if (arch.style === "custom" && !arch.custom) {
      fail([...base, "custom"], 'Required when style is "custom": describe the project structure');
    }
    if (arch.style !== "custom" && arch.custom) {
      fail([...base, "custom"], 'Only valid when style is "custom"');
    }
    if (arch.source === "detected" && arch.confidence === undefined) {
      fail([...base, "confidence"], 'Required when source is "detected"');
    }
    if (
      arch.confidence !== undefined &&
      arch.source !== "detected" &&
      arch.source !== "confirmed"
    ) {
      fail([...base, "confidence"], 'Only valid when source is "detected" or "confirmed"');
    }
  }

  const migrating = config.adoption?.strategy === "migrate";
  if (migrating && !config.migration) {
    fail(["migration"], 'Required when adoption.strategy is "migrate"');
  }
  if (!migrating && config.migration) {
    fail(["migration"], 'Only valid when adoption.strategy is "migrate"');
  }
  if (config.migration && config.migration.from === config.migration.to) {
    fail(["migration", "to"], `Must differ from migration.from ("${config.migration.from}")`);
  }

  const database = config.stack.database;
  if (
    database &&
    database.engine === "none" &&
    database.orm !== undefined &&
    database.orm !== "none"
  ) {
    fail(
      ["stack", "database", "orm"],
      `ORM "${database.orm}" requires a database engine, but engine is "none"`,
    );
  }
});

export type EngineeringConfig = z.output<typeof configSchema>;
/** Shape accepted before defaults are applied. */
export type EngineeringConfigInput = z.input<typeof configSchema>;

/**
 * The approved vocabulary (docs/00-foundation/glossary.md).
 * Every enumerated concept lives here once; other packages derive their types from it.
 */

export const PROJECT_MODES = ["new", "existing"] as const;
export type ProjectMode = (typeof PROJECT_MODES)[number];

export const ADOPTION_STRATEGIES = ["adopt", "recommend", "migrate"] as const;
export type AdoptionStrategy = (typeof ADOPTION_STRATEGIES)[number];

export const ARCHITECTURE_STYLES = [
  "layered",
  "feature",
  "clean",
  "feature-clean",
  "hexagonal",
  "custom",
] as const;
export type ArchitectureStyle = (typeof ARCHITECTURE_STYLES)[number];

/** How the architecture value in a config came to be. */
export const ARCHITECTURE_SOURCES = ["selected", "detected", "confirmed", "manual"] as const;
export type ArchitectureSource = (typeof ARCHITECTURE_SOURCES)[number];

export const STRICTNESS_LEVELS = ["observe", "minimal", "standard", "strict"] as const;
export type Strictness = (typeof STRICTNESS_LEVELS)[number];

export const ARCHITECTURE_TARGETS = ["backend", "frontend"] as const;
export type ArchitectureTarget = (typeof ARCHITECTURE_TARGETS)[number];

export const MIGRATION_STRATEGIES = ["incremental", "full"] as const;
export type MigrationStrategy = (typeof MIGRATION_STRATEGIES)[number];

export const MIGRATION_STATUSES = ["planned", "in-progress", "complete"] as const;
export type MigrationStatus = (typeof MIGRATION_STATUSES)[number];

export const LANGUAGES = ["typescript", "javascript"] as const;
export const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun"] as const;
export const BACKEND_FRAMEWORKS = ["express", "nestjs", "fastify", "none"] as const;
export const FRONTEND_FRAMEWORKS = ["nextjs", "react", "none"] as const;
export const DATABASE_ENGINES = ["postgresql", "mysql", "sqlite", "mongodb", "none"] as const;
export const ORMS = ["prisma", "drizzle", "typeorm", "none"] as const;
export const TEST_FRAMEWORKS = ["vitest", "jest", "node:test", "none"] as const;

export const AI_ADAPTER_IDS = ["claude", "codex", "cursor", "generic"] as const;
export type AiAdapterId = (typeof AI_ADAPTER_IDS)[number];
export const AI_OUTPUT_MODES = ["reference", "inline"] as const;

/** Engineering practices and their defaults (docs/02-specs/config-schema.md). */
export const ENGINEERING_PRACTICE_DEFAULTS = {
  clean_code: true,
  solid: true,
  design_patterns: false,
  testing: true,
  security: true,
  error_handling: true,
  performance: false,
  observability: false,
  caching: false,
} as const;

/** Current `.engineering/config.yaml` schema version. */
export const CONFIG_SCHEMA_VERSION = 1;

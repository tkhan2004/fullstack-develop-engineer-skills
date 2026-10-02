import { ARCHITECTURE_TARGETS, err, ok, type Result } from "@engineering-skills/core";
import { parse } from "yaml";
import { z } from "zod";

const kebab = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, "Must be kebab-case");
const relPath = z.string().min(1);
const nonEmptyList = <T extends z.ZodTypeAny>(item: T, what: string) =>
  z.array(item).min(1, `${what} must not be empty`);

const strictnessRule = z
  .object({
    enforce_dependency_rules: z.boolean(),
    report: z.boolean(),
    block: z.boolean().default(false),
  })
  .strict();

export const manifestSchema = z
  .object({
    name: kebab,
    version: z.number().int().positive(),
    title: z.string().min(1),
    description: z.string().min(1),
    targets: z.array(z.enum(ARCHITECTURE_TARGETS)).min(1),

    layers: z
      .array(
        z
          .object({
            id: kebab,
            description: z.string().min(1),
            /** Directory relative to the root (global scope) or module (module scope). Defaults to the id. */
            path: relPath.optional(),
          })
          .strict(),
      )
      .default([]),

    dependency_rules: z
      .object({
        scope: z.enum(["global", "module"]),
        cross_module: z
          .object({
            allowed: z.boolean(),
            via: z.array(z.enum(["shared", "module-public-api"])).default([]),
          })
          .strict()
          .optional(),
      })
      // Every other key is a layer id mapped to { may_import: [...] }; normalised in parseManifest.
      .catchall(z.unknown()),

    forbidden_imports: z
      .record(
        z
          .object({ external: z.array(z.string().min(1)).min(1), reason: z.string().min(1) })
          .strict(),
      )
      .default({}),

    structure: z
      .object({
        root: relPath,
        directories: z.array(relPath).default([]),
        module: z
          .object({ container: relPath, directories: z.array(relPath) })
          .strict()
          .optional(),
      })
      .strict(),

    naming: z.record(z.string()).optional(),

    strictness: z
      .object({ minimal: strictnessRule, standard: strictnessRule, strict: strictnessRule })
      .strict()
      .default({
        minimal: { enforce_dependency_rules: false, report: false, block: false },
        standard: { enforce_dependency_rules: false, report: true, block: false },
        strict: { enforce_dependency_rules: true, report: true, block: true },
      }),

    compatible_stacks: z.record(z.array(z.string())).default({}),
    skills: z.array(z.string()).default([]),

    trade_offs: z
      .object({
        benefits: nonEmptyList(z.string().min(1), "benefits"),
        costs: nonEmptyList(z.string().min(1), "costs"),
        not_recommended_when: z.array(z.string()).default([]),
      })
      .strict(),

    detection: z
      .object({
        /** Each entry is one marker; an array entry means "any of these" (modules/ or features/). */
        marker_directories: z.array(z.union([z.string(), z.array(z.string()).min(1)])).default([]),
        marker_files: z.array(z.string()).default([]),
        min_confidence_markers: z.number().int().positive().default(1),
        /** Styles this one specialises (feature-clean refines feature): compatible, not competing. */
        refines: z.array(kebab).default([]),
      })
      .strict()
      .optional(),
  })
  .strict();

type RawManifest = z.output<typeof manifestSchema>;

export interface ArchitectureManifest extends Omit<RawManifest, "dependency_rules"> {
  readonly dependency_rules: {
    readonly scope: "global" | "module";
    readonly cross_module:
      | { readonly allowed: boolean; readonly via: readonly ("shared" | "module-public-api")[] }
      | undefined;
  };
  /** layer id → layers it may import (normalised from dependency_rules). */
  readonly mayImport: Readonly<Record<string, readonly string[]>>;
}

const layerRule = z.object({ may_import: z.array(z.string()) }).strict();

/** Parse manifest YAML. Returns every schema problem; semantic checks live in validateManifest. */
export function parseManifest(text: string, where: string): Result<ArchitectureManifest, string[]> {
  let raw: unknown;
  try {
    raw = parse(text);
  } catch (cause) {
    return err([`${where}: invalid YAML (${(cause as Error).message.split("\n")[0]})`]);
  }

  const result = manifestSchema.safeParse(raw);
  if (!result.success) {
    return err(
      result.error.issues.map((i) => `${where}: ${i.path.join(".") || "(root)"} — ${i.message}`),
    );
  }

  const { scope, cross_module: crossModule, ...rest } = result.data.dependency_rules;
  const problems: string[] = [];
  const mayImport: Record<string, string[]> = {};
  for (const [layer, rule] of Object.entries(rest)) {
    const parsed = layerRule.safeParse(rule);
    if (parsed.success) mayImport[layer] = parsed.data.may_import;
    else
      problems.push(`${where}: dependency_rules.${layer} — expected { may_import: [layer ids] }`);
  }
  if (problems.length > 0) return err(problems);

  return ok({ ...result.data, dependency_rules: { scope, cross_module: crossModule }, mayImport });
}

/** Directory (relative to root/module) a layer lives in. */
export const layerPath = (layer: { id: string; path?: string | undefined }): string =>
  layer.path ?? layer.id;

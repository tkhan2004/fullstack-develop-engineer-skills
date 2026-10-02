import { STRICTNESS_LEVELS, err, ok, type Result } from "@engineering-skills/core";
import { parse } from "yaml";
import { z } from "zod";
import { issue, type SkillIssue } from "./issue.js";

export const SKILL_CATEGORIES = [
  "core",
  "architecture",
  "quality",
  "backend",
  "frontend",
  "database",
  "engineering",
] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

const SEGMENT = "[a-z0-9]+(?:-[a-z0-9]+)*";
const SKILL_ID = new RegExp(`^${SEGMENT}(?:/${SEGMENT})+$`);
const SEMVER = /^\d+\.\d+\.\d+$/;

const skillId = z
  .string()
  .regex(SKILL_ID, 'Must look like "category/name" (lowercase, kebab-case)');
const patternValue = z.union([z.string(), z.number(), z.boolean()]);

const strictnessOverrides = z
  .object(
    Object.fromEntries(
      STRICTNESS_LEVELS.map((level) => [level, z.string().min(1).optional()]),
    ) as Record<(typeof STRICTNESS_LEVELS)[number], z.ZodOptional<z.ZodString>>,
  )
  .strict();

export const skillManifestSchema = z
  .object({
    id: skillId,
    version: z.string().regex(SEMVER, "Must be a semantic version like 1.0.0"),
    title: z.string().min(1),
    summary: z.string().min(1),
    category: z.enum(SKILL_CATEGORIES),
    priority: z.number().int().default(50),
    /** Dotted config path → accepted values. Omitted = always on. */
    applies_to: z.record(z.array(patternValue).min(1)).optional(),
    requires: z.array(skillId).default([]),
    conflicts_with: z.array(skillId).default([]),
    touches_structure: z.boolean().default(false),
    strictness_overrides: strictnessOverrides.optional(),
    sources: z
      .array(z.object({ sot: z.string().min(1), topics: z.array(z.string()).default([]) }).strict())
      .default([]),
    tokens_estimate: z.number().int().positive().optional(),
  })
  .strict();

export type SkillManifest = z.output<typeof skillManifestSchema>;

/** Parse and validate `skill.yaml` text. `where` names the file in error messages. */
export function parseSkillManifest(
  text: string,
  where: string,
): Result<SkillManifest, SkillIssue[]> {
  let raw: unknown;
  try {
    raw = parse(text);
  } catch (cause) {
    return err([
      issue("error", `${where}: invalid YAML (${(cause as Error).message.split("\n")[0]})`),
    ]);
  }
  const result = skillManifestSchema.safeParse(raw);
  if (result.success) return ok(result.data);
  return err(
    result.error.issues.map((i) =>
      issue(
        "error",
        `${where}: ${i.path.join(".") || "(root)"} — ${i.code === "unrecognized_keys" ? `unknown key(s) ${i.keys.join(", ")}` : i.message}`,
      ),
    ),
  );
}

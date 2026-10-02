import { err, ok, type Result } from "@engineering-skills/core";
import { parse, stringify } from "yaml";
import { z } from "zod";

/**
 * `.engineering/project-profile.yaml` — machine-generated, never hand-edited, committed so
 * reviewers can see how the agent understands the repository (docs/02-specs/project-profile-schema.md).
 */

export const PROFILE_VERSION = 1;
export const DEFAULT_PROFILE_PATH = ".engineering/project-profile.yaml";

const evidence = z.object({ path: z.string(), detail: z.string(), weight: z.number() }).strict();
const alternatives = z.array(z.object({ value: z.string(), confidence: z.number() }).strict());

const claim = z
  .object({
    value: z.string(),
    confidence: z.number().min(0).max(1),
    evidence: z.array(evidence).min(1, "A claim without evidence is invalid"),
    alternatives: alternatives.optional(),
  })
  .strict();

const convention = z
  .object({
    value: z.string(),
    ratio: z.number().min(0).max(1),
    sample_size: z.number().int().positive(),
    detail: z.string().optional(),
    consistent: z.literal(false).optional(),
  })
  .strict();

const maturity = z.enum(["detected", "partial", "missing"]);

export const profileSchema = z
  .object({
    version: z.literal(PROFILE_VERSION),
    generated: z
      .object({
        at: z.string(),
        by: z.string(),
        commit: z.string().optional(),
        files_scanned: z.number().int().nonnegative(),
        duration_ms: z.number().nonnegative(),
        truncated: z.literal(true).optional(),
      })
      .strict(),
    project: z
      .object({
        mode: z.enum(["new", "existing"]),
        root: z.string(),
        source_roots: z.array(z.string()),
      })
      .strict(),
    stack: z
      .object({
        language: claim.optional(),
        package_manager: claim.optional(),
        backend: z
          .object({ runtime: claim.optional(), framework: claim.optional() })
          .strict()
          .optional(),
        frontend: z.object({ framework: claim.optional() }).strict().optional(),
        database: z.object({ engine: claim.optional(), orm: claim.optional() }).strict().optional(),
        testing: z.object({ framework: claim.optional() }).strict().optional(),
      })
      .strict(),
    architecture: z
      .object({
        backend: claim
          .extend({
            conformance: z.number().min(0).max(1).optional(),
            structure: z
              .object({
                root: z.string(),
                directories: z.array(
                  z.object({ path: z.string(), files: z.number().int() }).strict(),
                ),
              })
              .strict()
              .optional(),
          })
          .strict(),
      })
      .strict()
      .optional(),
    conventions: z
      .object({
        naming: z
          .object({
            variables: convention.optional(),
            files: convention.optional(),
            classes: convention.optional(),
          })
          .strict(),
        tests: z
          .object({ placement: convention.optional(), naming: convention.optional() })
          .strict(),
        errors: z.object({ strategy: convention }).strict().optional(),
        validation: z.object({ library: convention }).strict().optional(),
        imports: z
          .object({ style: convention, aliases: z.array(z.string()) })
          .strict()
          .optional(),
        exports: z.object({ style: convention }).strict().optional(),
        async: z.object({ style: convention }).strict().optional(),
      })
      .strict(),
    reference_modules: z.array(
      z.object({ concern: z.string(), path: z.string(), reason: z.string() }).strict(),
    ),
    observations: z.array(
      z
        .object({
          id: z.string(),
          severity: z.enum(["info", "warning"]),
          count: z.number().int().positive(),
          locations: z.array(z.string()),
          detail: z.string(),
        })
        .strict(),
    ),
    maturity: z
      .object({
        architecture: maturity,
        conventions: maturity,
        testing: maturity,
        security: maturity,
        documentation: maturity,
        observability: maturity,
      })
      .strict(),
    gaps: z.array(z.object({ area: z.string(), detail: z.string() }).strict()),
  })
  .strict();

export type Profile = z.output<typeof profileSchema>;

/** Canonical YAML: construction order is spec order, arrays are pre-sorted, LF, one trailing newline. */
export function serializeProfile(profile: Profile): string {
  return stringify(profile, { lineWidth: 0, sortMapEntries: false, indent: 2 });
}

/** Parse and validate profile text. Returns readable problems instead of throwing. */
export function parseProfile(text: string): Result<Profile, string[]> {
  let raw: unknown;
  try {
    raw = parse(text);
  } catch (cause) {
    return err([`Invalid YAML: ${(cause as Error).message.split("\n")[0]}`]);
  }
  const result = profileSchema.safeParse(raw);
  if (result.success) return ok(result.data);
  return err(result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`));
}

/** A profile generated at another commit may describe code that has since changed. */
export function isProfileStale(profile: Profile, currentCommit: string | undefined): boolean {
  return (
    profile.generated.commit !== undefined &&
    currentCommit !== undefined &&
    profile.generated.commit !== currentCommit
  );
}

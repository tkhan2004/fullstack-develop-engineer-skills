import { skillManifestSchema, type SkillManifest } from "./manifest.js";
import { createSkill, type Skill } from "./skill.js";

/** Build a skill in memory for tests. */
export function makeSkill(
  id: string,
  extra: Partial<Record<keyof SkillManifest, unknown>> = {},
  body = `# ${id}\n\n## Purpose\nx\n`,
): Skill {
  const category = id.split("/")[0];
  const manifest = skillManifestSchema.parse({
    id,
    version: "1.0.0",
    title: id,
    summary: `Skill ${id}`,
    category,
    ...extra,
  });
  return createSkill(manifest, body, "skills", `skills/${id}`);
}

import { estimateTokens, parseSkillDocument, type SkillDocument } from "./document.js";
import type { SkillManifest } from "./manifest.js";

/** Where a skill came from: general skills, or an architecture definition directory. */
export type SkillOrigin = "skills" | "architectures";

export interface Skill {
  readonly manifest: SkillManifest;
  /** SKILL.md text. */
  readonly body: string;
  readonly document: SkillDocument;
  readonly tokens: number;
  readonly origin: SkillOrigin;
  /** Directory the skill was loaded from (for messages). */
  readonly dir: string;
}

export function createSkill(
  manifest: SkillManifest,
  body: string,
  origin: SkillOrigin,
  dir: string,
): Skill {
  return {
    manifest,
    body,
    document: parseSkillDocument(body),
    tokens: estimateTokens(body),
    origin,
    dir,
  };
}

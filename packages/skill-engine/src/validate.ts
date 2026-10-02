import { limitsFor } from "./budget.js";
import { issue, type SkillIssue } from "./issue.js";
import type { Skill } from "./skill.js";

/** Required `SKILL.md` sections, in order (docs/02-specs/skill-contract.md §3). */
export const REQUIRED_HEADINGS = [
  "Purpose",
  "When This Skill Applies",
  "Core Principles",
  "Decision Rules",
  "Do",
  "Don't",
  "Examples",
  "Review Checklist",
  "Interaction With Other Skills",
] as const;

export const ARCHITECTURE_AWARENESS = "Architecture Awareness";
const AWARENESS_SENTENCE =
  "do not introduce a different structure into an existing project unless a migration has been explicitly requested";

/** Phrases that signal advice nobody can violate, or tool-specific voice (contract §5). */
export const BANNED_PHRASES = [
  "write clean code",
  "follow best practices",
  "as an ai",
  "as claude",
  "as codex",
] as const;

const HARD_CODED_STRUCTURE =
  /\bsrc\/(domain|application|infrastructure|presentation|controllers|services|repositories|modules|ports|adapters)\b/i;

const MAX_BULLETS_PER_SECTION = 12;
const BULLET = /^\s*(?:[-*]|\d+\.)\s+/;

export interface ValidateOptions {
  /** Known `sot` ids (from docs/sot/mapping). When given, every `sources[].sot` must be in it. */
  readonly knownSources?: ReadonlySet<string>;
  /** Require at least one source per skill (V1 definition of done). */
  readonly requireSources?: boolean;
}

function firstLineMatching(body: string, test: (line: string) => boolean): number | undefined {
  const index = body.split("\n").findIndex(test);
  return index === -1 ? undefined : index + 1;
}

/** Validate one skill against the contract. Returns every problem found. */
export function validateSkillContract(skill: Skill, options: ValidateOptions = {}): SkillIssue[] {
  const { manifest, document, body } = skill;
  const id = manifest.id;
  const problems: SkillIssue[] = [];
  const error = (message: string) => problems.push(issue("error", message, id));
  const warn = (message: string) => problems.push(issue("warning", message, id));

  if (!document.title) error("SKILL.md must start with a level-1 title");

  // Structure
  const needsAwareness = manifest.touches_structure || manifest.category === "architecture";
  const required: string[] = [...REQUIRED_HEADINGS];
  if (needsAwareness) required.splice(2, 0, ARCHITECTURE_AWARENESS);

  const headings = document.sections.map((s) => s.heading);
  let lastIndex = -1;
  for (const heading of required) {
    const index = headings.indexOf(heading);
    if (index === -1) {
      error(`Missing required section "## ${heading}"`);
      continue;
    }
    if (index < lastIndex) error(`Section "## ${heading}" is out of order`);
    lastIndex = Math.max(lastIndex, index);
    if ((document.sections[index]?.body ?? "") === "") error(`Section "## ${heading}" is empty`);
  }

  if (needsAwareness) {
    const section = document.sections.find((s) => s.heading === ARCHITECTURE_AWARENESS);
    const normalized = section?.body.replace(/\s+/g, " ").toLowerCase() ?? "";
    if (section && !normalized.includes(AWARENESS_SENTENCE)) {
      error(`"## ${ARCHITECTURE_AWARENESS}" must contain the standard block (contract §4)`);
    }
  }

  // Content
  for (const phrase of BANNED_PHRASES) {
    const word = new RegExp(`\\b${phrase.replace(/[-\s]/g, "[-\\s]")}\\b`, "i");
    const line = firstLineMatching(body, (l) => word.test(l));
    if (line !== undefined)
      error(`Line ${line}: banned phrase "${phrase}" — state a falsifiable rule instead`);
  }

  if (skill.origin === "skills") {
    const line = firstLineMatching(body, (l) => HARD_CODED_STRUCTURE.test(l));
    if (line !== undefined) {
      error(
        `Line ${line}: hard-coded architecture path — structure comes from the architecture manifest, not a skill`,
      );
    }
  }

  for (const section of document.sections) {
    if (section.heading === "Review Checklist") continue;
    const bullets = section.body.split("\n").filter((l) => BULLET.test(l)).length;
    if (bullets > MAX_BULLETS_PER_SECTION) {
      warn(
        `Section "## ${section.heading}" has ${bullets} bullets; long lists are ignored — keep the ones that matter`,
      );
    }
  }

  // Size
  const { target, cap } = limitsFor(manifest.category);
  if (skill.tokens > cap)
    error(`~${skill.tokens} tokens exceeds the ${cap} cap for ${manifest.category} skills`);
  else if (skill.tokens > target)
    warn(`~${skill.tokens} tokens is over the ${target} target for ${manifest.category} skills`);

  // Traceability
  if (options.requireSources && manifest.sources.length === 0)
    error("Declare at least one entry in sources[]");
  if (options.knownSources) {
    for (const source of manifest.sources) {
      if (!options.knownSources.has(source.sot)) {
        error(`sources[] entry "${source.sot}" is not in docs/sot/mapping/skill-source-map.md`);
      }
    }
  }

  return problems;
}

export function validateLibrary(
  skills: readonly Skill[],
  options: ValidateOptions = {},
): SkillIssue[] {
  return skills.flatMap((skill) => validateSkillContract(skill, options));
}

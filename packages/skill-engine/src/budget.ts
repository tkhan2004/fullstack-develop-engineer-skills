import { issue, type SkillIssue } from "./issue.js";
import type { SkillCategory } from "./manifest.js";
import type { ResolvedSkillSet } from "./resolver.js";

/** Size classes from docs/02-specs/skill-contract.md §6. */
export type SizeClass = "core" | "architecture" | "technology" | "practice";

export const SIZE_CLASS: Record<SkillCategory, SizeClass> = {
  core: "core",
  architecture: "architecture",
  backend: "technology",
  frontend: "technology",
  database: "technology",
  quality: "practice",
  engineering: "practice",
};

/** `target` is a warning threshold; `cap` is a hard limit enforced in CI. */
export const TOKEN_LIMITS: Record<SizeClass, { readonly target: number; readonly cap: number }> = {
  core: { target: 1200, cap: 1800 },
  architecture: { target: 1500, cap: 2200 },
  technology: { target: 1200, cap: 1800 },
  practice: { target: 1000, cap: 1500 },
};

/** A typical resolved set should stay under this many tokens. */
export const DEFAULT_TOTAL_BUDGET = 12_000;

export function limitsFor(category: SkillCategory) {
  return TOKEN_LIMITS[SIZE_CLASS[category]];
}

/** Warn when the whole set is over budget, naming the largest contributors. */
export function budgetWarnings(
  set: ResolvedSkillSet,
  totalBudget = DEFAULT_TOTAL_BUDGET,
): SkillIssue[] {
  if (set.totalTokens <= totalBudget) return [];
  const largest = [...set.skills]
    .sort((a, b) => b.skill.tokens - a.skill.tokens || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map((s) => `${s.id} (${s.skill.tokens})`)
    .join(", ");
  return [
    issue(
      "warning",
      `Resolved skills total ~${set.totalTokens} tokens, over the ${totalBudget} budget. Largest: ${largest}`,
    ),
  ];
}

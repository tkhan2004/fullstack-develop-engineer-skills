export type SkillIssueLevel = "error" | "warning";

/** A problem found while loading, validating or resolving skills. */
export interface SkillIssue {
  readonly level: SkillIssueLevel;
  /** Skill id the issue is about, when known. */
  readonly skill?: string;
  readonly message: string;
}

export const issue = (level: SkillIssueLevel, message: string, skill?: string): SkillIssue =>
  skill === undefined ? { level, message } : { level, skill, message };

export function formatSkillIssues(issues: readonly SkillIssue[]): string {
  return issues
    .map(
      (i) =>
        `${i.level === "error" ? "error" : "warning"}${i.skill ? ` [${i.skill}]` : ""}: ${i.message}`,
    )
    .join("\n");
}

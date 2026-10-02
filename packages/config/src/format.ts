import type { ConfigIssue } from "./issue.js";

function formatIssue(issue: ConfigIssue): string[] {
  const head = issue.path === "" ? "(document)" : issue.path;
  const lines = [
    issue.line === undefined ? head : `${head}  (line ${issue.line})`,
    `  ${issue.message}`,
  ];
  if (issue.expected && issue.expected.length > 0) {
    lines.push(
      `  ${issue.message.startsWith("Unknown key") ? "Valid keys" : "Expected one of"}: ${issue.expected.join(", ")}`,
    );
  }
  if (issue.suggestion) lines.push(`  Did you mean: ${issue.suggestion}`);
  return lines;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Render errors for humans: path, what was found, what is allowed, and a suggestion. */
export function formatIssues(issues: readonly ConfigIssue[], source: string): string {
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const out: string[] = [];

  if (errors.length > 0) {
    out.push(`Invalid configuration: ${source}`, "");
    errors.forEach((issue) => out.push(...formatIssue(issue), ""));
    out.push(`${plural(errors.length, "error")}. No files were written.`);
  }
  if (warnings.length > 0) {
    if (out.length > 0) out.push("");
    out.push(`Warnings for ${source}`, "");
    warnings.forEach((issue) => out.push(...formatIssue(issue), ""));
    out.push(plural(warnings.length, "warning") + ".");
  }
  return out.join("\n");
}

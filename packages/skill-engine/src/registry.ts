import { err, ok, type Result } from "@engineering-skills/core";
import { issue, type SkillIssue } from "./issue.js";
import type { Skill } from "./skill.js";

export interface Registry {
  readonly all: readonly Skill[];
  get(id: string): Skill | undefined;
  has(id: string): boolean;
}

/** Find one dependency cycle (as an id path ending where it began), if any. */
function findCycle(skills: ReadonlyMap<string, Skill>): string[] | undefined {
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];

  const visit = (id: string): string[] | undefined => {
    if (state.get(id) === "done") return undefined;
    if (state.get(id) === "visiting") return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, "visiting");
    stack.push(id);
    for (const dep of skills.get(id)?.manifest.requires ?? []) {
      if (!skills.has(dep)) continue;
      const cycle = visit(dep);
      if (cycle) return cycle;
    }
    stack.pop();
    state.set(id, "done");
    return undefined;
  };

  for (const id of [...skills.keys()].sort()) {
    const cycle = visit(id);
    if (cycle) return cycle;
  }
  return undefined;
}

/** Index skills and validate the graph: unique ids, resolvable edges, symmetric conflicts, no cycles. */
export function buildRegistry(skills: readonly Skill[]): Result<Registry, SkillIssue[]> {
  const issues: SkillIssue[] = [];
  const byId = new Map<string, Skill>();

  for (const skill of skills) {
    const id = skill.manifest.id;
    const existing = byId.get(id);
    if (existing) {
      issues.push(
        issue("error", `Duplicate skill id (also defined in ${existing.dir} and ${skill.dir})`, id),
      );
    } else {
      byId.set(id, skill);
    }
  }

  for (const skill of byId.values()) {
    const { id, requires, conflicts_with: conflicts } = skill.manifest;
    for (const dep of requires) {
      if (dep === id) issues.push(issue("error", "A skill cannot require itself", id));
      else if (!byId.has(dep))
        issues.push(issue("error", `Requires "${dep}", which does not exist`, id));
    }
    for (const other of conflicts) {
      const target = byId.get(other);
      if (other === id) issues.push(issue("error", "A skill cannot conflict with itself", id));
      else if (!target)
        issues.push(issue("error", `conflicts_with "${other}", which does not exist`, id));
      else if (!target.manifest.conflicts_with.includes(id)) {
        issues.push(
          issue(
            "error",
            `conflicts_with "${other}" must be symmetric, but "${other}" does not list "${id}"`,
            id,
          ),
        );
      }
      if (requires.includes(other))
        issues.push(issue("error", `Both requires and conflicts with "${other}"`, id));
    }
  }

  const cycle = findCycle(byId);
  if (cycle) issues.push(issue("error", `Dependency cycle: ${cycle.join(" → ")}`, cycle[0]));

  if (issues.length > 0) return err(issues);

  const all = [...byId.values()].sort((a, b) => a.manifest.id.localeCompare(b.manifest.id));
  return ok({ all, get: (id) => byId.get(id), has: (id) => byId.has(id) });
}

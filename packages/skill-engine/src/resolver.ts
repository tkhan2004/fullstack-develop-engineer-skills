import type { EngineeringConfig } from "@engineering-skills/config";
import { err, ok, type Result, type Strictness } from "@engineering-skills/core";
import { issue, type SkillIssue } from "./issue.js";
import { matchAppliesTo } from "./matcher.js";
import type { Registry } from "./registry.js";
import type { Skill } from "./skill.js";

export interface ResolvedSkill {
  readonly id: string;
  readonly skill: Skill;
  /** Why this skill is in the set (`always on`, `stack.backend.framework=express`, `required by …`). */
  readonly selectedBy: string;
  /** Strictness-specific wording, when the skill defines one. */
  readonly tone: string | undefined;
}

export interface ResolvedSkillSet {
  readonly strictness: Strictness;
  readonly skills: readonly ResolvedSkill[];
  readonly totalTokens: number;
}

const primaryStrictness = (config: EngineeringConfig): Strictness =>
  config.architecture.backend?.strictness ?? config.architecture.frontend?.strictness ?? "standard";

/** Kahn's algorithm; among ready skills, lowest (priority, id) first. Deterministic. */
function orderSkills(selected: ReadonlyMap<string, Skill>): Skill[] {
  const pending = new Map(
    [...selected].map(([id, skill]) => [id, new Set(skill.manifest.requires)]),
  );
  const ordered: Skill[] = [];

  while (pending.size > 0) {
    const ready = [...pending]
      .filter(([, deps]) => deps.size === 0)
      .map(([id]) => selected.get(id) as Skill)
      .sort(
        (a, b) =>
          a.manifest.priority - b.manifest.priority || a.manifest.id.localeCompare(b.manifest.id),
      );
    const next = ready[0];
    if (!next)
      throw new Error("Dependency cycle in selected skills; buildRegistry should have rejected it");
    ordered.push(next);
    pending.delete(next.manifest.id);
    for (const deps of pending.values()) deps.delete(next.manifest.id);
  }
  return ordered;
}

/**
 * Pure function: (registry, config) → ordered skill set with provenance.
 * No I/O, no randomness; same input yields byte-identical output.
 */
export function resolveSkills(
  registry: Registry,
  config: EngineeringConfig,
): Result<ResolvedSkillSet, SkillIssue[]> {
  const issues: SkillIssue[] = [];
  const selectedBy = new Map<string, string>();
  const include = config.overrides?.skills?.include ?? [];
  const exclude = new Set(config.overrides?.skills?.exclude ?? []);

  for (const [list, key] of [
    [include, "include"],
    [[...exclude], "exclude"],
  ] as const) {
    for (const id of list) {
      if (!registry.has(id))
        issues.push(issue("error", `overrides.skills.${key} references unknown skill "${id}"`));
    }
  }

  // 1–2. always-on skills and skills whose applies_to matches the config
  for (const skill of registry.all) {
    const { id, applies_to: appliesTo } = skill.manifest;
    if (exclude.has(id)) continue;
    if (!appliesTo) selectedBy.set(id, "always on");
    else {
      const reason = matchAppliesTo(appliesTo, config);
      if (reason) selectedBy.set(id, reason);
    }
  }

  // 3. explicit includes
  for (const id of [...include].sort()) {
    if (registry.has(id) && !exclude.has(id) && !selectedBy.has(id))
      selectedBy.set(id, "overrides.skills.include");
  }

  // 4. transitive requires
  const queue = [...selectedBy.keys()].sort();
  while (queue.length > 0) {
    const id = queue.shift() as string;
    for (const dep of [...(registry.get(id)?.manifest.requires ?? [])].sort()) {
      if (exclude.has(dep)) {
        issues.push(
          issue("error", `Requires "${dep}", which is excluded by overrides.skills.exclude`, id),
        );
      } else if (!selectedBy.has(dep)) {
        selectedBy.set(dep, `required by ${id}`);
        queue.push(dep);
      }
    }
  }

  // 5. conflicts between selected skills
  const ids = [...selectedBy.keys()].sort();
  for (const id of ids) {
    for (const other of registry.get(id)?.manifest.conflicts_with ?? []) {
      if (id < other && selectedBy.has(other)) {
        issues.push(
          issue(
            "error",
            `Conflicts with "${other}", but both are selected (${selectedBy.get(id)}; ${selectedBy.get(other)})`,
            id,
          ),
        );
      }
    }
  }

  if (issues.length > 0) return err(issues);

  const selected = new Map(ids.map((id) => [id, registry.get(id) as Skill]));
  const strictness = primaryStrictness(config);
  const skills = orderSkills(selected).map((skill) => ({
    id: skill.manifest.id,
    skill,
    selectedBy: selectedBy.get(skill.manifest.id) as string,
    tone: skill.manifest.strictness_overrides?.[strictness],
  }));

  return ok({
    strictness,
    skills,
    totalTokens: skills.reduce((sum, s) => sum + s.skill.tokens, 0),
  });
}

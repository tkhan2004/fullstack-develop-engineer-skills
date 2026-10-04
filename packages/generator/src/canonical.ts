import type { ArchitectureManifest } from "@engineering-skills/architecture-engine";
import type { EngineeringConfig } from "@engineering-skills/config";
import {
  displayName,
  type CanonicalOutput,
  type CanonicalProject,
  type CanonicalSection,
} from "@engineering-skills/core";
import type { Profile } from "@engineering-skills/detection";
import { reviewChecklist, type ResolvedSkillSet } from "@engineering-skills/skill-engine";
import { describeDependencyRules, describeStructure } from "./structure.js";

export interface BuildInput {
  readonly config: EngineeringConfig;
  readonly resolved: ResolvedSkillSet;
  readonly manifests: readonly ArchitectureManifest[];
  /** Present for existing projects (and any project that has been analysed). */
  readonly profile?: Profile | undefined;
  readonly projectName?: string | undefined;
}

type StackLabel =
  | "Language"
  | "Runtime"
  | "Backend"
  | "Frontend"
  | "Database"
  | "ORM"
  | "Tests"
  | "Package manager";

function stackFacts(config: EngineeringConfig): CanonicalProject["stack"] {
  const s = config.stack;
  const values: [StackLabel, string | undefined][] = [
    ["Language", s.language],
    ["Runtime", s.backend?.runtime],
    ["Backend", s.backend?.framework],
    ["Frontend", s.frontend?.framework],
    ["Database", s.database?.engine],
    ["ORM", s.database?.orm],
    ["Tests", s.testing?.framework],
    ["Package manager", s.package_manager],
  ];
  return values
    .filter((v): v is [StackLabel, string] => v[1] !== undefined && v[1] !== "none")
    .map(([label, value]) => ({ label, value }));
}

function constraintsFor(config: EngineeringConfig): string[] {
  const out: string[] = [];
  const strategy = config.adoption?.strategy;
  const migration = config.migration;

  if (config.project.mode === "existing") {
    if (strategy === "migrate" && migration) {
      out.push(
        `The project is migrating from ${displayName(migration.from)} to ${displayName(migration.to)}. Do not rewrite the whole repository.`,
        "Migrate one module at a time, keep the tests passing between steps, and follow `.engineering/migration-plan.yaml` when it exists.",
        "Until a module has been migrated, follow the existing structure for it.",
      );
    } else {
      out.push(
        "Do not restructure the project or introduce a different architecture.",
        "Follow the existing directories and mirror the closest existing module when adding code.",
      );
      if (strategy === "recommend")
        out.push(
          "Report deviations and improvement opportunities in your response; do not apply them unless asked.",
        );
    }
  } else if (config.architecture.backend) {
    out.push(
      "Place new code in the directories listed below and keep to the selected architecture.",
    );
  }
  return out;
}

type Convention = NonNullable<Profile["conventions"]["naming"]["variables"]>;

const CONVENTION_LABELS: [string, (c: Profile["conventions"]) => Convention | undefined][] = [
  ["Variable names", (c) => c.naming.variables],
  ["File names", (c) => c.naming.files],
  ["Class names", (c) => c.naming.classes],
  ["Test placement", (c) => c.tests.placement],
  ["Test file names", (c) => c.tests.naming],
  ["Error handling", (c) => c.errors?.strategy],
  ["Validation", (c) => c.validation?.library],
  ["Imports", (c) => c.imports?.style],
  ["Exports", (c) => c.exports?.style],
  ["Async style", (c) => c.async?.style],
];

/** Only conventions that are actually consistent: a coin flip is not a convention to mirror. */
function conventionsFrom(profile: Profile | undefined): CanonicalProject["conventions"] {
  if (!profile) return [];
  return CONVENTION_LABELS.flatMap(([label, pick]) => {
    const c = pick(profile.conventions);
    return c && c.consistent !== false
      ? [{ label, value: displayName(c.value), share: c.ratio }]
      : [];
  });
}

function sectionsFrom(resolved: ResolvedSkillSet): CanonicalSection[] {
  return resolved.skills.map(({ skill, tone }) => ({
    id: skill.manifest.id,
    title: skill.manifest.title,
    summary: skill.manifest.summary,
    priority: skill.manifest.priority,
    // The architecture-awareness block is identical in every skill; adapters state it once.
    body: skill.document.sections
      .filter((s) => s.heading !== "Architecture Awareness")
      .map((s) => `### ${s.heading}\n\n${s.body}`)
      .join("\n\n"),
    tone,
    checklist: reviewChecklist(skill.document),
  }));
}

/** Everything an agent needs to be told, independent of which agent reads it. */
export function buildCanonicalOutput(input: BuildInput): CanonicalOutput {
  const { config, resolved, manifests, profile } = input;
  const backend = config.architecture.backend;
  const manifest = backend ? manifests.find((m) => m.name === backend.style) : undefined;

  return {
    version: 1,
    project: {
      name: input.projectName ?? config.project.name,
      mode: config.project.mode,
      strategy: config.adoption?.strategy,
      architecture: backend
        ? {
            style: backend.style,
            source: backend.source,
            confidence: backend.confidence,
            strictness: backend.strictness,
          }
        : undefined,
      stack: stackFacts(config),
      constraints: constraintsFor(config),
      structure: backend ? describeStructure({ backend, manifest, profile }) : undefined,
      conventions: config.project.mode === "existing" ? conventionsFrom(profile) : [],
      dependencyRules: backend ? describeDependencyRules({ backend, manifest }) : [],
      migration: config.migration
        ? {
            from: config.migration.from,
            to: config.migration.to,
            strategy: config.migration.strategy,
          }
        : undefined,
    },
    sections: sectionsFrom(resolved),
    references:
      config.project.mode === "existing"
        ? (profile?.reference_modules ?? []).map((r) => ({
            concern: r.concern,
            path: r.path,
            reason: r.reason,
          }))
        : [],
    lockfile: {
      skills: resolved.skills.map((s) => ({
        id: s.id,
        version: s.skill.manifest.version,
        selectedBy: s.selectedBy,
      })),
    },
  };
}

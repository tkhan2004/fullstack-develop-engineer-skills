import type { CanonicalOutput } from "@engineering-skills/core";

/** A hand-built canonical output: an existing layered Express project, adopted at observe strictness. */
export function existingLayered(
  overrides: Partial<CanonicalOutput["project"]> = {},
): CanonicalOutput {
  return {
    version: 1,
    project: {
      name: "acme-api",
      mode: "existing",
      strategy: "adopt",
      architecture: {
        style: "layered",
        source: "detected",
        confidence: 0.91,
        strictness: "observe",
      },
      stack: [
        { label: "Language", value: "typescript" },
        { label: "Runtime", value: "node" },
        { label: "Backend", value: "express" },
        { label: "Database", value: "postgresql" },
        { label: "ORM", value: "prisma" },
        { label: "Tests", value: "vitest" },
      ],
      constraints: [
        "Do not restructure the project or introduce a different architecture.",
        "Follow the existing directories and mirror the closest existing module when adding code.",
      ],
      structure: {
        root: "src",
        directories: [
          {
            path: "src/controllers",
            note: "Translates HTTP into service calls; no business rules",
          },
          { path: "src/services", note: "Business logic and orchestration" },
          { path: "src/repositories", note: "Data access; the only layer that talks to the ORM" },
        ],
        modules: [],
      },
      conventions: [
        { label: "File names", value: "kebab-case", share: 1 },
        { label: "Tests", value: "colocated with source", share: 0.87 },
      ],
      dependencyRules: [
        "`controllers` may import: `services`, `validators`, `models`",
        "`services` may import: `repositories`, `models`",
        "`repositories` may import: `models`",
        "`services` must not import: `express`",
      ],
      migration: undefined,
      ...overrides,
    },
    sections: [
      {
        id: "core/project-onboarding",
        title: "Project Onboarding",
        summary: "Learn an existing repository before changing it.",
        priority: 11,
        body: "### Purpose\n\nLearn the repository first.\n\n### Do\n\n- Read the nearest module before writing.",
        tone: "Mirror the surrounding code. Do not introduce this pattern unprompted.",
        checklist: ["Did you read the nearest module first?"],
      },
      {
        id: "quality/clean-code",
        title: "Clean Code",
        summary: "Naming, function and module rules.",
        priority: 50,
        body: "### Purpose\n\nKeep code readable.\n\n### Don't\n\n- Name a variable `data` without context.",
        tone: undefined,
        checklist: [],
      },
    ],
    references: [
      {
        concern: "service",
        path: "src/services/user.service.ts",
        reason: "has a colocated test; 17 lines",
      },
    ],
    lockfile: {
      skills: [
        { id: "core/project-onboarding", version: "1.0.0", selectedBy: "always on" },
        { id: "quality/clean-code", version: "1.0.0", selectedBy: "engineering.clean_code=true" },
      ],
    },
  };
}

export const OPTIONS = {
  mode: "inline",
  version: "0.0.0-test",
  source: ".engineering/config.yaml",
} as const;

import { parseConfig, type EngineeringConfig } from "@engineering-skills/config";
import { describe, expect, it } from "vitest";
import { buildRegistry } from "./registry.js";
import { resolveSkills } from "./resolver.js";
import { makeSkill } from "./test-support.js";

/** Synthetic library mirroring docs/01-concepts/skill-system.md §3. */
const library = () => [
  makeSkill("core/engineering-principles", { priority: 10 }),
  makeSkill("core/project-onboarding", { priority: 11 }),
  makeSkill("core/requirements-analysis", { priority: 12 }),
  makeSkill("core/problem-solving", { priority: 13 }),
  makeSkill("architecture/architecture-principles", { priority: 20 }),
  makeSkill("architecture/layered", {
    priority: 21,
    applies_to: { "architecture.backend.style": ["layered"] },
  }),
  makeSkill("architecture/feature-clean", {
    priority: 21,
    applies_to: { "architecture.backend.style": ["feature-clean"] },
  }),
  makeSkill("backend/typescript", {
    priority: 30,
    applies_to: { "stack.language": ["typescript"] },
  }),
  makeSkill("backend/nodejs", { priority: 31, applies_to: { "stack.backend.runtime": ["node"] } }),
  makeSkill("backend/express", {
    priority: 32,
    applies_to: { "stack.backend.framework": ["express"] },
    requires: ["backend/nodejs", "backend/typescript"],
  }),
  makeSkill("database/sql", {
    priority: 40,
    applies_to: { "stack.database.engine": ["postgresql", "mysql", "sqlite"] },
  }),
  makeSkill("database/postgresql", {
    priority: 41,
    applies_to: { "stack.database.engine": ["postgresql"] },
    requires: ["database/sql"],
  }),
  makeSkill("database/prisma", { priority: 42, applies_to: { "stack.database.orm": ["prisma"] } }),
  makeSkill("quality/clean-code", {
    priority: 50,
    applies_to: { "engineering.clean_code": [true] },
  }),
  makeSkill("quality/solid", { priority: 51, applies_to: { "engineering.solid": [true] } }),
  makeSkill("quality/code-review", { priority: 52 }),
  makeSkill("engineering/testing", { priority: 60, applies_to: { "engineering.testing": [true] } }),
  makeSkill("engineering/security", {
    priority: 61,
    applies_to: { "engineering.security": [true] },
  }),
  makeSkill("engineering/error-handling", {
    priority: 62,
    applies_to: { "engineering.error_handling": [true] },
  }),
  makeSkill("engineering/performance", {
    priority: 63,
    applies_to: { "engineering.performance": [true] },
  }),
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Draft = Record<string, any>;

const registryOf = (skills = library()) => {
  const result = buildRegistry(skills);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
};

function configOf(patch: (draft: Draft) => void = () => {}): EngineeringConfig {
  const draft: Draft = {
    version: 1,
    project: { mode: "existing" },
    adoption: { strategy: "adopt" },
    stack: {
      language: "typescript",
      backend: { runtime: "node", framework: "express" },
      database: { engine: "postgresql", orm: "prisma" },
    },
    architecture: {
      backend: { style: "feature-clean", source: "selected", strictness: "standard" },
    },
    engineering: {
      clean_code: true,
      solid: false,
      testing: true,
      security: true,
      error_handling: true,
    },
  };
  patch(draft);
  const result = parseConfig(draft);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value.config;
}

const idsOf = (set: { skills: readonly { id: string }[] }) => set.skills.map((s) => s.id);
const resolve = (config = configOf(), skills = library()) => {
  const result = resolveSkills(registryOf(skills), config);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
};

describe("reference configuration (skill-system.md §3)", () => {
  it("resolves to exactly the documented set, in order", () => {
    expect(idsOf(resolve())).toEqual([
      "core/engineering-principles",
      "core/project-onboarding",
      "core/requirements-analysis",
      "core/problem-solving",
      "architecture/architecture-principles",
      "architecture/feature-clean",
      "backend/typescript",
      "backend/nodejs",
      "backend/express",
      "database/sql",
      "database/postgresql",
      "database/prisma",
      "quality/clean-code",
      "quality/code-review",
      "engineering/testing",
      "engineering/security",
      "engineering/error-handling",
    ]);
  });

  it("records why each skill was selected", () => {
    const by = Object.fromEntries(resolve().skills.map((s) => [s.id, s.selectedBy]));
    expect(by["backend/express"]).toBe("stack.backend.framework=express");
    expect(by["architecture/feature-clean"]).toBe("architecture.backend.style=feature-clean");
    expect(by["backend/nodejs"]).toBe("stack.backend.runtime=node");
    expect(by["core/project-onboarding"]).toBe("always on");
  });
});

describe("provenance of dependencies", () => {
  it("names the skill that pulled in a dependency-only skill", () => {
    const skills = [
      makeSkill("core/helper", { applies_to: { "project.mode": ["never"] } }),
      makeSkill("backend/express", {
        applies_to: { "stack.backend.framework": ["express"] },
        requires: ["core/helper"],
      }),
    ];
    const set = resolve(configOf(), skills);
    expect(set.skills.find((s) => s.id === "core/helper")?.selectedBy).toBe(
      "required by backend/express",
    );
  });
});

describe("selection", () => {
  it("removing a practice removes exactly that skill", () => {
    const base = idsOf(resolve());
    const without = idsOf(
      resolve(
        configOf((c) => {
          c["engineering"].testing = false;
        }),
      ),
    );
    expect(base.filter((id) => !without.includes(id))).toEqual(["engineering/testing"]);
  });

  it("switching architecture switches only the architecture skill", () => {
    const ids = idsOf(
      resolve(
        configOf((c) => {
          c["architecture"].backend.style = "layered";
        }),
      ),
    );
    expect(ids).toContain("architecture/layered");
    expect(ids).not.toContain("architecture/feature-clean");
  });

  it("is total: a minimal config still yields the always-on skills", () => {
    const config = configOf((c) => {
      c["stack"] = { language: "javascript" };
      c["architecture"] = {};
      c["engineering"] = {
        clean_code: false,
        solid: false,
        testing: false,
        security: false,
        error_handling: false,
      };
    });
    expect(idsOf(resolve(config))).toEqual([
      "core/engineering-principles",
      "core/project-onboarding",
      "core/requirements-analysis",
      "core/problem-solving",
      "architecture/architecture-principles",
      "quality/code-review",
    ]);
  });

  it("matches negations and wildcards", () => {
    const skills = [
      makeSkill("core/base"),
      makeSkill("frontend/anything", { applies_to: { "stack.frontend.framework": ["*"] } }),
      makeSkill("backend/not-nest", { applies_to: { "stack.backend.framework": ["!nestjs"] } }),
    ];
    expect(idsOf(resolve(configOf(), skills))).toEqual(["backend/not-nest", "core/base"]);
    const withFrontend = configOf((c) => {
      c["stack"].frontend = { framework: "react" };
    });
    expect(idsOf(resolve(withFrontend, skills))).toContain("frontend/anything");
  });

  it("requires every applies_to key to match", () => {
    const skills = [
      makeSkill("backend/express-prisma", {
        applies_to: { "stack.backend.framework": ["express"], "stack.database.orm": ["drizzle"] },
      }),
    ];
    expect(idsOf(resolve(configOf(), skills))).toEqual([]);
  });
});

describe("properties", () => {
  it("is deterministic: 100 resolutions are identical", () => {
    const first = JSON.stringify(idsOf(resolve()));
    for (let i = 0; i < 100; i++) expect(JSON.stringify(idsOf(resolve()))).toBe(first);
  });

  it("is independent of registration order", () => {
    const shuffled = [...library()].reverse();
    expect(idsOf(resolve(configOf(), shuffled))).toEqual(idsOf(resolve()));
  });

  it("is idempotent: resolving a resolved set changes nothing", () => {
    const first = resolve();
    const again = resolve(
      configOf(),
      first.skills.map((s) => s.skill),
    );
    expect(idsOf(again)).toEqual(idsOf(first));
  });

  it("is explainable: every selected skill has a non-empty reason", () => {
    for (const s of resolve().skills) expect(s.selectedBy.length).toBeGreaterThan(0);
  });

  it("puts every skill after the skills it requires", () => {
    const set = resolve();
    const position = new Map(idsOf(set).map((id, i) => [id, i]));
    for (const { skill, id } of set.skills) {
      for (const dep of skill.manifest.requires)
        expect(position.get(dep)).toBeLessThan(position.get(id) as number);
    }
  });

  it("orders a high-priority-number dependency before its dependent", () => {
    const skills = [
      makeSkill("core/late", { priority: 99 }),
      makeSkill("core/early", { priority: 1, requires: ["core/late"] }),
    ];
    expect(idsOf(resolve(configOf(), skills))).toEqual(["core/late", "core/early"]);
  });
});

describe("overrides", () => {
  it("includes a skill that would not otherwise apply", () => {
    const config = configOf((c) => {
      c["overrides"] = { skills: { include: ["engineering/performance"] } };
    });
    const set = resolve(config);
    expect(idsOf(set)).toContain("engineering/performance");
    expect(set.skills.find((s) => s.id === "engineering/performance")?.selectedBy).toBe(
      "overrides.skills.include",
    );
  });

  it("excludes a skill that would otherwise apply", () => {
    const config = configOf((c) => {
      c["overrides"] = { skills: { exclude: ["quality/clean-code"] } };
    });
    expect(idsOf(resolve(config))).not.toContain("quality/clean-code");
  });

  it("refuses to exclude a skill another selected skill requires", () => {
    const config = configOf((c) => {
      c["overrides"] = { skills: { exclude: ["backend/nodejs"] } };
    });
    const result = resolveSkills(registryOf(), config);
    if (result.ok) throw new Error("expected failure");
    expect(result.error[0]).toMatchObject({ skill: "backend/express" });
    expect(result.error[0]?.message).toContain("excluded by overrides.skills.exclude");
  });

  it("rejects overrides that name unknown skills", () => {
    const config = configOf((c) => {
      c["overrides"] = { skills: { include: ["nope/missing"], exclude: ["nope/other"] } };
    });
    const result = resolveSkills(registryOf(), config);
    if (result.ok) throw new Error("expected failure");
    expect(result.error.map((i) => i.message)).toEqual([
      'overrides.skills.include references unknown skill "nope/missing"',
      'overrides.skills.exclude references unknown skill "nope/other"',
    ]);
  });
});

describe("conflicts", () => {
  const skills = () => [
    makeSkill("architecture/a", {
      applies_to: { "architecture.backend.style": ["feature-clean"] },
      conflicts_with: ["architecture/b"],
    }),
    makeSkill("architecture/b", {
      applies_to: { "project.mode": ["existing"] },
      conflicts_with: ["architecture/a"],
    }),
  ];

  it("fails with both reasons when conflicting skills are selected", () => {
    const result = resolveSkills(registryOf(skills()), configOf());
    if (result.ok) throw new Error("expected failure");
    expect(result.error).toHaveLength(1);
    expect(result.error[0]?.message).toContain("architecture.backend.style=feature-clean");
    expect(result.error[0]?.message).toContain("project.mode=existing");
  });

  it("passes when only one side is selected", () => {
    expect(
      resolveSkills(
        registryOf(skills()),
        configOf((c) => {
          c["project"].mode = "new";
          delete c["adoption"];
        }),
      ).ok,
    ).toBe(true);
  });
});

describe("strictness wording", () => {
  const skills = () => [
    makeSkill("quality/clean-code", {
      strictness_overrides: { observe: "Mirror the surrounding code.", strict: "Blocking rule." },
    }),
  ];

  it("attaches wording for the configured strictness", () => {
    const strict = configOf((c) => {
      c["architecture"].backend.strictness = "strict";
    });
    expect(resolve(strict, skills()).skills[0]?.tone).toBe("Blocking rule.");
    const observe = configOf((c) => {
      c["architecture"].backend.strictness = "observe";
    });
    expect(resolve(observe, skills()).skills[0]?.tone).toBe("Mirror the surrounding code.");
  });

  it("leaves tone undefined when the skill defines none for that level", () => {
    expect(resolve(configOf(), skills()).skills[0]?.tone).toBeUndefined();
  });

  it("falls back to standard when no architecture is configured", () => {
    const config = configOf((c) => {
      c["architecture"] = {};
    });
    expect(resolve(config, skills()).strictness).toBe("standard");
  });
});

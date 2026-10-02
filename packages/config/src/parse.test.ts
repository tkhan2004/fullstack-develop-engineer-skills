import { describe, expect, it } from "vitest";
import { formatIssues } from "./format.js";
import { customStyle, existingProject, migrating, mutate, newProject } from "./fixtures.js";
import { parseConfig } from "./parse.js";

describe("valid configurations", () => {
  const cases: [string, Record<string, unknown>][] = [
    ["new project, feature-clean", newProject()],
    ["existing project, adopt + detected layered", existingProject()],
    [
      "existing project with custom detected architecture",
      mutate(existingProject(), (c) => {
        c["architecture"].backend = customStyle();
      }),
    ],
    ["existing project, migrate with plan", migrating()],
    [
      "new project, layered",
      mutate(newProject(), (c) => {
        c["architecture"].backend.style = "layered";
      }),
    ],
    [
      "new project, feature",
      mutate(newProject(), (c) => {
        c["architecture"].backend.style = "feature";
      }),
    ],
    [
      "new project, clean",
      mutate(newProject(), (c) => {
        c["architecture"].backend.style = "clean";
      }),
    ],
    [
      "new project, hexagonal",
      mutate(newProject(), (c) => {
        c["architecture"].backend.style = "hexagonal";
      }),
    ],
    [
      "strictness minimal",
      mutate(newProject(), (c) => {
        c["architecture"].backend.strictness = "minimal";
      }),
    ],
    [
      "strictness strict",
      mutate(newProject(), (c) => {
        c["architecture"].backend.strictness = "strict";
      }),
    ],
    [
      "strictness observe on a new project",
      mutate(newProject(), (c) => {
        c["architecture"].backend.strictness = "observe";
      }),
    ],
    [
      "no frontend",
      mutate(newProject(), (c) => {
        delete c["stack"].frontend;
      }),
    ],
    [
      "no database at all",
      mutate(newProject(), (c) => {
        delete c["stack"].database;
      }),
    ],
    [
      "database none, orm none",
      mutate(newProject(), (c) => {
        c["stack"].database = { engine: "none", orm: "none" };
      }),
    ],
    [
      "javascript language",
      mutate(newProject(), (c) => {
        c["stack"].language = "javascript";
      }),
    ],
    [
      "nestjs backend",
      mutate(newProject(), (c) => {
        c["stack"].backend.framework = "nestjs";
      }),
    ],
    [
      "frontend architecture too",
      mutate(newProject(), (c) => {
        c["architecture"].frontend = {
          style: "feature",
          source: "selected",
          strictness: "standard",
          root: "app",
        };
      }),
    ],
    [
      "minimal stack",
      { version: 1, project: { mode: "new" }, stack: { language: "typescript" }, architecture: {} },
    ],
    [
      "all practices off",
      mutate(newProject(), (c) => {
        c["engineering"] = {
          clean_code: false,
          solid: false,
          testing: false,
          security: false,
          error_handling: false,
        };
      }),
    ],
    [
      "multiple adapters + output override",
      mutate(newProject(), (c) => {
        c["ai"] = {
          adapters: ["claude", "codex", "generic"],
          output: { claude: "CLAUDE.md" },
          mode: "reference",
        };
      }),
    ],
    [
      "skill overrides",
      mutate(newProject(), (c) => {
        c["overrides"] = {
          skills: { include: ["engineering/observability"], exclude: ["quality/design-patterns"] },
        };
      }),
    ],
    [
      "rule override with a reason",
      mutate(newProject(), (c) => {
        c["overrides"] = {
          rules: [
            { id: "clean-code/max-function-length", enabled: false, reason: "Legacy convention" },
          ],
        };
      }),
    ],
    [
      "confidence boundary 0",
      mutate(existingProject(), (c) => {
        c["architecture"].backend.confidence = 0;
      }),
    ],
    [
      "confidence boundary 1",
      mutate(existingProject(), (c) => {
        c["architecture"].backend.confidence = 1;
      }),
    ],
    [
      "existing + recommend",
      mutate(existingProject(), (c) => {
        c["adoption"].strategy = "recommend";
        c["architecture"].backend.strictness = "standard";
      }),
    ],
  ];

  it.each(cases)("accepts: %s", (_name, input) => {
    const result = parseConfig(input);
    expect(result.ok, result.ok ? "" : formatIssues(result.error, "test")).toBe(true);
  });

  it("applies schema defaults for engineering and ai", () => {
    const result = parseConfig(newProject());
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.config.engineering).toEqual({
      clean_code: true,
      solid: true,
      design_patterns: false,
      testing: true,
      security: true,
      error_handling: true,
      performance: false,
      observability: false,
      caching: false,
    });
    expect(result.value.config.ai.adapters).toEqual(["generic"]);
  });
});

describe("invalid configurations", () => {
  interface Case {
    name: string;
    input: unknown;
    path: string;
    message: string;
    extra?: string;
  }
  const bad = (
    name: string,
    input: unknown,
    path: string,
    message: string,
    extra?: string,
  ): Case =>
    extra === undefined ? { name, input, path, message } : { name, input, path, message, extra };

  const cases: Case[] = [
    bad("not a mapping", "just a string", "", "must be a YAML mapping"),
    bad("array root", [1, 2], "", "must be a YAML mapping"),
    bad(
      "missing version",
      mutate(newProject(), (c) => {
        delete c["version"];
      }),
      "version",
      "Required field is missing",
    ),
    bad(
      "future version",
      mutate(newProject(), (c) => {
        c["version"] = 99;
      }),
      "version",
      "newer than this CLI supports",
    ),
    bad(
      "zero version",
      mutate(newProject(), (c) => {
        c["version"] = 0;
      }),
      "version",
      "Expected 1",
    ),
    bad(
      "unknown architecture, typo",
      mutate(newProject(), (c) => {
        c["architecture"].backend.style = "clean-archtecture";
      }),
      "architecture.backend.style",
      'Unknown architecture "clean-archtecture"',
      "Did you mean: clean",
    ),
    bad(
      "unknown architecture, near miss",
      mutate(newProject(), (c) => {
        c["architecture"].backend.style = "layred";
      }),
      "architecture.backend.style",
      'Unknown architecture "layred"',
      "Did you mean: layered",
    ),
    bad(
      "unknown strictness",
      mutate(newProject(), (c) => {
        c["architecture"].backend.strictness = "extreme";
      }),
      "architecture.backend.strictness",
      'Unknown strictness level "extreme"',
    ),
    bad(
      "unknown project mode",
      mutate(newProject(), (c) => {
        c["project"].mode = "old";
      }),
      "project.mode",
      'Unknown project mode "old"',
    ),
    bad(
      "unknown framework",
      mutate(newProject(), (c) => {
        c["stack"].backend.framework = "expres";
      }),
      "stack.backend.framework",
      'Unknown framework "expres"',
      "Did you mean: express",
    ),
    bad(
      "unknown key at the root",
      mutate(newProject(), (c) => {
        c["extra"] = 1;
      }),
      "extra",
      'Unknown key "extra"',
    ),
    bad(
      "typo in practices key",
      mutate(newProject(), (c) => {
        c["engineering"] = { clean_cod: true };
      }),
      "engineering.clean_cod",
      'Unknown key "clean_cod"',
      "Did you mean: clean_code",
    ),
    bad(
      "missing stack language",
      mutate(newProject(), (c) => {
        delete c["stack"].language;
      }),
      "stack.language",
      "Required field is missing",
    ),
    bad(
      "wrong type for boolean",
      mutate(newProject(), (c) => {
        c["engineering"] = { testing: "yes" };
      }),
      "engineering.testing",
      "Expected boolean, received string",
    ),
    bad(
      "existing without adoption",
      mutate(existingProject(), (c) => {
        delete c["adoption"];
      }),
      "adoption",
      'Required when project.mode is "existing"',
    ),
    bad(
      "new with adoption",
      mutate(newProject(), (c) => {
        c["adoption"] = { strategy: "adopt" };
      }),
      "adoption",
      'Only valid when project.mode is "existing"',
    ),
    bad(
      "custom without block",
      mutate(existingProject(), (c) => {
        c["architecture"].backend = { style: "custom", source: "manual", strictness: "observe" };
      }),
      "architecture.backend.custom",
      'Required when style is "custom"',
    ),
    bad(
      "custom block on named style",
      mutate(existingProject(), (c) => {
        c["architecture"].backend.custom = { root: "src" };
      }),
      "architecture.backend.custom",
      'Only valid when style is "custom"',
    ),
    bad(
      "custom block without root",
      mutate(existingProject(), (c) => {
        c["architecture"].backend = { ...customStyle(), custom: {} };
      }),
      "architecture.backend.custom.root",
      "Required field is missing",
    ),
    bad(
      "detected without confidence",
      mutate(existingProject(), (c) => {
        delete c["architecture"].backend.confidence;
      }),
      "architecture.backend.confidence",
      'Required when source is "detected"',
    ),
    bad(
      "confidence on a selected architecture",
      mutate(newProject(), (c) => {
        c["architecture"].backend.confidence = 0.9;
      }),
      "architecture.backend.confidence",
      'Only valid when source is "detected" or "confirmed"',
    ),
    bad(
      "confidence above 1",
      mutate(existingProject(), (c) => {
        c["architecture"].backend.confidence = 1.5;
      }),
      "architecture.backend.confidence",
      "less than or equal to 1",
    ),
    bad(
      "confidence below 0",
      mutate(existingProject(), (c) => {
        c["architecture"].backend.confidence = -0.1;
      }),
      "architecture.backend.confidence",
      "greater than or equal to 0",
    ),
    bad(
      "migrate without migration block",
      mutate(existingProject(), (c) => {
        c["adoption"].strategy = "migrate";
      }),
      "migration",
      'Required when adoption.strategy is "migrate"',
    ),
    bad(
      "migration block without migrate strategy",
      mutate(migrating(), (c) => {
        c["adoption"].strategy = "adopt";
      }),
      "migration",
      'Only valid when adoption.strategy is "migrate"',
    ),
    bad(
      "migration from equals to",
      mutate(migrating(), (c) => {
        c["migration"].to = "layered";
      }),
      "migration.to",
      'Must differ from migration.from ("layered")',
    ),
    bad(
      "orm without a database engine",
      mutate(newProject(), (c) => {
        c["stack"].database = { engine: "none", orm: "prisma" };
      }),
      "stack.database.orm",
      'ORM "prisma" requires a database engine',
    ),
    bad(
      "rule override without a reason",
      mutate(newProject(), (c) => {
        c["overrides"] = { rules: [{ id: "x/y", enabled: false }] };
      }),
      "overrides.rules.0.reason",
      "Required field is missing",
    ),
    bad(
      "rule override with an empty reason",
      mutate(newProject(), (c) => {
        c["overrides"] = { rules: [{ id: "x/y", enabled: false, reason: "" }] };
      }),
      "overrides.rules.0.reason",
      "Must not be empty",
    ),
    bad(
      "empty adapter list",
      mutate(newProject(), (c) => {
        c["ai"] = { adapters: [] };
      }),
      "ai.adapters",
      "Select at least one adapter",
    ),
    bad(
      "unknown adapter",
      mutate(newProject(), (c) => {
        c["ai"] = { adapters: ["clod"] };
      }),
      "ai.adapters.0",
      'Unknown adapter "clod"',
    ),
  ];

  it.each(cases)("rejects: $name", ({ input, path, message, extra }) => {
    const result = parseConfig(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const match = result.error.find((issue) => issue.path === path);
    expect(
      match,
      `no issue at "${path}"; got ${JSON.stringify(result.error.map((i) => i.path))}`,
    ).toBeDefined();
    const rendered = formatIssues([match!], "test");
    expect(rendered).toContain(message);
    if (extra) expect(rendered).toContain(extra);
  });

  it("reports all structural errors, not just the first", () => {
    const input = mutate(newProject(), (c) => {
      c["architecture"].backend.style = "nope";
      c["architecture"].backend.strictness = "nope";
      c["stack"].language = "cobol";
    });
    const result = parseConfig(input);
    if (result.ok) throw new Error("expected failure");
    expect(result.error.map((i) => i.path).sort()).toEqual([
      "architecture.backend.strictness",
      "architecture.backend.style",
      "stack.language",
    ]);
  });

  it("splits several unknown keys into separate issues", () => {
    const result = parseConfig(
      mutate(newProject(), (c) => {
        c["a"] = 1;
        c["b"] = 2;
      }),
    );
    if (result.ok) throw new Error("expected failure");
    expect(result.error.map((i) => i.path).sort()).toEqual(["a", "b"]);
  });
});

describe("warnings", () => {
  it("warns about strict enforcement on an adopted architecture", () => {
    const result = parseConfig(
      mutate(existingProject(), (c) => {
        c["architecture"].backend.strictness = "strict";
      }),
    );
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.warnings.map((w) => w.path)).toContain("architecture.backend.strictness");
  });

  it("warns when a frontend architecture has no frontend framework", () => {
    const result = parseConfig(
      mutate(newProject(), (c) => {
        delete c["stack"].frontend;
        c["architecture"].frontend = {
          style: "feature",
          source: "selected",
          strictness: "standard",
        };
      }),
    );
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.warnings.map((w) => w.path)).toContain("architecture.frontend");
  });

  it("produces no warnings for a clean config", () => {
    const result = parseConfig(newProject());
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.warnings).toEqual([]);
  });
});

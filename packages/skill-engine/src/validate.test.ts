import { describe, expect, it } from "vitest";
import {
  BANNED_PHRASES,
  REQUIRED_HEADINGS,
  validateLibrary,
  validateSkillContract,
} from "./validate.js";
import { makeSkill } from "./test-support.js";

const AWARENESS = `## Architecture Awareness

Determine the project's architecture, in this order:

1. Explicit \`.engineering/config.yaml\`
2. \`.engineering/project-profile.yaml\`

Do not introduce a different structure into an existing project unless a migration has been
explicitly requested.
`;

function body(options: { skip?: string; awareness?: boolean; extra?: string } = {}): string {
  const sections = REQUIRED_HEADINGS.filter((h) => h !== options.skip).map(
    (h) => `## ${h}\nContent for ${h}.\n`,
  );
  if (options.awareness) sections.splice(2, 0, AWARENESS);
  return `# Title\n\n${sections.join("\n")}\n${options.extra ?? ""}`;
}

const check = (id: string, text: string, extra = {}) =>
  validateSkillContract(makeSkill(id, extra, text));
const errors = (problems: ReturnType<typeof check>) =>
  problems.filter((p) => p.level === "error").map((p) => p.message);

describe("validateSkillContract", () => {
  it("accepts a well-formed skill", () => {
    expect(check("quality/clean-code", body())).toEqual([]);
  });

  it.each(REQUIRED_HEADINGS)("requires the section %s", (heading) => {
    expect(errors(check("quality/clean-code", body({ skip: heading })))).toEqual([
      `Missing required section "## ${heading}"`,
    ]);
  });

  it("rejects sections out of order", () => {
    const text =
      "# T\n\n## Do\nx\n\n## Purpose\nx\n" +
      REQUIRED_HEADINGS.filter((h) => h !== "Do" && h !== "Purpose")
        .map((h) => `\n## ${h}\nx\n`)
        .join("");
    expect(errors(check("quality/clean-code", text)).some((m) => m.includes("out of order"))).toBe(
      true,
    );
  });

  it("rejects empty sections and a missing title", () => {
    const text = body().replace("Content for Purpose.", "").replace("# Title", "");
    const found = errors(check("quality/clean-code", text));
    expect(found).toContain('Section "## Purpose" is empty');
    expect(found).toContain("SKILL.md must start with a level-1 title");
  });

  it("allows extra sections", () => {
    expect(check("quality/clean-code", body({ extra: "## Appendix\nMore.\n" }))).toEqual([]);
  });
});

describe("architecture awareness", () => {
  it("is required for architecture skills", () => {
    expect(errors(check("architecture/clean", body()))).toEqual([
      'Missing required section "## Architecture Awareness"',
    ]);
    expect(check("architecture/clean", body({ awareness: true }))).toEqual([]);
  });

  it("is required for any skill that declares touches_structure", () => {
    expect(errors(check("quality/refactoring", body(), { touches_structure: true }))).toHaveLength(
      1,
    );
    expect(
      check("quality/refactoring", body({ awareness: true }), { touches_structure: true }),
    ).toEqual([]);
  });

  it("must contain the standard block, not just the heading", () => {
    const text = body().replace(
      "## Core Principles",
      "## Architecture Awareness\nLook around.\n\n## Core Principles",
    );
    expect(errors(check("architecture/clean", text))).toEqual([
      '"## Architecture Awareness" must contain the standard block (contract §4)',
    ]);
  });
});

describe("content rules", () => {
  it.each(BANNED_PHRASES)("bans the phrase %s, with its line number", (phrase) => {
    const found = errors(
      check(
        "quality/clean-code",
        body({ extra: `\nYou should ${phrase.toUpperCase()} always.\n` }),
      ),
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(new RegExp(`^Line \\d+: banned phrase "${phrase}"`));
  });

  it("matches banned phrases as whole words only", () => {
    expect(
      check("quality/clean-code", body({ extra: "\nA module has an aim and one owner.\n" })),
    ).toEqual([]);
  });

  it("rejects hard-coded architecture paths in general skills", () => {
    const found = errors(
      check(
        "backend/express",
        body({ extra: "\nAlways create src/domain and src/application.\n" }),
      ),
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("hard-coded architecture path");
  });

  it("allows architecture paths in architecture definitions", () => {
    const skill = makeSkill(
      "architecture/clean",
      {},
      body({ awareness: true, extra: "\nLayers live under src/domain.\n" }),
    );
    const architecture = { ...skill, origin: "architectures" as const };
    expect(validateSkillContract(architecture)).toEqual([]);
  });

  it("warns about long bullet lists but not about the review checklist", () => {
    const bullets = Array.from({ length: 13 }, (_, i) => `- item ${i}`).join("\n");
    const long = body()
      .replace("Content for Do.", bullets)
      .replace("Content for Review Checklist.", bullets);
    const found = check("quality/clean-code", long);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ level: "warning" });
    expect(found[0]?.message).toContain('"## Do" has 13 bullets');
  });
});

describe("size", () => {
  it("warns over target and errors over the hard cap", () => {
    const over = check("quality/clean-code", body({ extra: "x".repeat(1100 * 4) }));
    expect(over.map((p) => p.level)).toEqual(["warning"]);
    const way = check("quality/clean-code", body({ extra: "x".repeat(1600 * 4) }));
    expect(errors(way)[0]).toContain("exceeds the 1500 cap");
  });
});

describe("traceability", () => {
  const sourced = { sources: [{ sot: "books/clean-code", topics: ["naming"] }] };

  it("requires a source when asked", () => {
    const skill = makeSkill("quality/clean-code", {}, body());
    expect(errors(validateSkillContract(skill, { requireSources: true }))).toEqual([
      "Declare at least one entry in sources[]",
    ]);
    expect(validateSkillContract(skill)).toEqual([]);
  });

  it("checks sources against the known source map", () => {
    const skill = makeSkill("quality/clean-code", sourced, body());
    expect(validateSkillContract(skill, { knownSources: new Set(["books/clean-code"]) })).toEqual(
      [],
    );
    expect(
      errors(validateSkillContract(skill, { knownSources: new Set(["books/other"]) }))[0],
    ).toContain('sources[] entry "books/clean-code" is not in docs/sot/mapping');
  });
});

describe("validateLibrary", () => {
  it("collects problems from every skill", () => {
    const skills = [
      makeSkill("core/a", {}, body({ skip: "Purpose" })),
      makeSkill("core/b", {}, body({ skip: "Examples" })),
    ];
    expect(validateLibrary(skills).map((p) => p.skill)).toEqual(["core/a", "core/b"]);
  });
});

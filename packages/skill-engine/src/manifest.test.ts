import { describe, expect, it } from "vitest";
import { parseSkillManifest } from "./manifest.js";

const valid = `
id: quality/clean-code
version: 1.0.0
title: Clean Code
summary: Naming and function rules.
category: quality
applies_to:
  engineering.clean_code: [true]
requires: [core/engineering-principles]
strictness_overrides:
  observe: Mirror the surrounding code.
sources:
  - sot: books/clean-code
    topics: [naming]
`;

describe("parseSkillManifest", () => {
  it("accepts a complete manifest and applies defaults", () => {
    const result = parseSkillManifest(valid, "skill.yaml");
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.priority).toBe(50);
    expect(result.value.conflicts_with).toEqual([]);
    expect(result.value.touches_structure).toBe(false);
    expect(result.value.applies_to).toEqual({ "engineering.clean_code": [true] });
  });

  const minimal = (extra: string) =>
    `id: core/x\nversion: 1.0.0\ntitle: X\nsummary: s\ncategory: core\n${extra}`;

  it.each([
    ["bad id (no category)", valid.replace("quality/clean-code", "clean-code"), "id"],
    ["bad id (uppercase)", valid.replace("quality/clean-code", "Quality/Clean"), "id"],
    ["bad version", valid.replace("1.0.0", "1.0"), "version"],
    ["unknown category", valid.replace("category: quality", "category: misc"), "category"],
    ["unknown key", `${valid}\nextra: 1`, "unknown key(s) extra"],
    ["unknown strictness key", valid.replace("observe:", "relaxed:"), "unknown key(s) relaxed"],
    ["empty applies_to list", minimal("applies_to:\n  stack.language: []"), "applies_to"],
    ["non-array requires", minimal("requires: core/y"), "requires"],
    ["invalid yaml", "id: [unclosed", "invalid YAML"],
  ])("rejects %s", (_name, text, fragment) => {
    const result = parseSkillManifest(text, "skills/x/skill.yaml");
    if (result.ok) throw new Error("expected failure");
    expect(result.error.map((i) => i.message).join("\n")).toContain(fragment);
    expect(result.error[0]?.message).toContain("skills/x/skill.yaml");
  });
});

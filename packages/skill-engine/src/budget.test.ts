import { parseConfig } from "@engineering-skills/config";
import { describe, expect, it } from "vitest";
import { budgetWarnings, limitsFor } from "./budget.js";
import { buildRegistry } from "./registry.js";
import { resolveSkills } from "./resolver.js";
import { makeSkill } from "./test-support.js";

const config = (() => {
  const result = parseConfig({
    version: 1,
    project: { mode: "new" },
    stack: { language: "typescript" },
    architecture: {},
  });
  if (!result.ok) throw new Error("fixture invalid");
  return result.value.config;
})();

const resolveBodies = (...sizes: number[]) => {
  const skills = sizes.map((size, i) => makeSkill(`core/s${i}`, {}, "x".repeat(size * 4)));
  const registry = buildRegistry(skills);
  if (!registry.ok) throw new Error("registry");
  const set = resolveSkills(registry.value, config);
  if (!set.ok) throw new Error("resolve");
  return set.value;
};

describe("token limits", () => {
  it("groups categories into the size classes from the contract", () => {
    expect(limitsFor("core")).toEqual({ target: 1200, cap: 1800 });
    expect(limitsFor("architecture")).toEqual({ target: 1500, cap: 2200 });
    expect(limitsFor("backend")).toEqual(limitsFor("database"));
    expect(limitsFor("quality")).toEqual({ target: 1000, cap: 1500 });
  });
});

describe("budgetWarnings", () => {
  it("is silent within budget", () => {
    expect(budgetWarnings(resolveBodies(100, 200), 1000)).toEqual([]);
  });

  it("warns once and names the three largest contributors", () => {
    const set = resolveBodies(100, 900, 500, 700);
    const [warning, ...rest] = budgetWarnings(set, 1000);
    expect(rest).toEqual([]);
    expect(warning?.level).toBe("warning");
    expect(warning?.message).toContain("~2200 tokens");
    expect(warning?.message).toContain("core/s1 (900), core/s3 (700), core/s2 (500)");
    expect(warning?.message).not.toContain("core/s0");
  });
});

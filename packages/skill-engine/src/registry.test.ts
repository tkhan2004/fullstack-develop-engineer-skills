import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadSkillsFromDir } from "./loader.js";
import { buildRegistry } from "./registry.js";
import { makeSkill } from "./test-support.js";

const messages = (skills: ReturnType<typeof makeSkill>[]) => {
  const result = buildRegistry(skills);
  if (result.ok) throw new Error("expected failure");
  return result.error.map((i) => i.message);
};

describe("buildRegistry", () => {
  it("indexes skills sorted by id", () => {
    const result = buildRegistry([makeSkill("quality/b"), makeSkill("core/a")]);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.all.map((s) => s.manifest.id)).toEqual(["core/a", "quality/b"]);
    expect(result.value.get("core/a")?.manifest.id).toBe("core/a");
    expect(result.value.has("nope/x")).toBe(false);
  });

  it("rejects duplicate ids", () => {
    expect(messages([makeSkill("core/a"), makeSkill("core/a")])[0]).toContain("Duplicate skill id");
  });

  it("names both skills when a dependency is missing", () => {
    const result = buildRegistry([makeSkill("backend/express", { requires: ["backend/nodejs"] })]);
    if (result.ok) throw new Error("expected failure");
    expect(result.error[0]).toMatchObject({ skill: "backend/express" });
    expect(result.error[0]?.message).toContain('"backend/nodejs"');
  });

  it("detects dependency cycles and prints the path", () => {
    const [message] = messages([
      makeSkill("core/a", { requires: ["core/b"] }),
      makeSkill("core/b", { requires: ["core/c"] }),
      makeSkill("core/c", { requires: ["core/a"] }),
    ]);
    expect(message).toContain("core/a → core/b → core/c → core/a");
  });

  it("rejects self-requirement", () => {
    expect(messages([makeSkill("core/a", { requires: ["core/a"] })])[0]).toContain(
      "cannot require itself",
    );
  });

  it("requires conflicts to be symmetric", () => {
    const [message] = messages([
      makeSkill("core/a", { conflicts_with: ["core/b"] }),
      makeSkill("core/b"),
    ]);
    expect(message).toContain("must be symmetric");
  });

  it("accepts symmetric conflicts", () => {
    const result = buildRegistry([
      makeSkill("core/a", { conflicts_with: ["core/b"] }),
      makeSkill("core/b", { conflicts_with: ["core/a"] }),
    ]);
    expect(result.ok).toBe(true);
  });

  it("rejects a skill that both requires and conflicts with the same skill", () => {
    const issues = messages([
      makeSkill("core/a", { requires: ["core/b"], conflicts_with: ["core/b"] }),
      makeSkill("core/b", { conflicts_with: ["core/a"] }),
    ]);
    expect(issues.some((m) => m.includes("Both requires and conflicts"))).toBe(true);
  });
});

describe("loadSkillsFromDir", () => {
  const manifest = (id: string, category: string) =>
    `id: ${id}\nversion: 1.0.0\ntitle: T\nsummary: s\ncategory: ${category}\n`;

  async function withTempDir<T>(run: (dir: string) => Promise<T>): Promise<T> {
    const dir = await mkdtemp(join(tmpdir(), "skills-"));
    try {
      return await run(dir);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  it("loads nested skills and ignores examples and tests directories", async () => {
    await withTempDir(async (root) => {
      await mkdir(join(root, "quality", "clean-code", "examples"), { recursive: true });
      await writeFile(
        join(root, "quality", "clean-code", "skill.yaml"),
        manifest("quality/clean-code", "quality"),
      );
      await writeFile(
        join(root, "quality", "clean-code", "SKILL.md"),
        "# Clean Code\n\n## Purpose\nx\n",
      );
      await writeFile(
        join(root, "quality", "clean-code", "examples", "skill.yaml"),
        "id: ignored\n",
      );

      const result = await loadSkillsFromDir(root, { origin: "skills" });
      if (!result.ok) throw new Error(JSON.stringify(result.error));
      expect(result.value.map((s) => s.manifest.id)).toEqual(["quality/clean-code"]);
      expect(result.value[0]?.tokens).toBeGreaterThan(0);
    });
  });

  it("applies the id prefix for architecture definitions", async () => {
    await withTempDir(async (root) => {
      await mkdir(join(root, "clean"), { recursive: true });
      await writeFile(
        join(root, "clean", "skill.yaml"),
        manifest("architecture/clean", "architecture"),
      );
      await writeFile(join(root, "clean", "SKILL.md"), "# Clean\n");

      const result = await loadSkillsFromDir(root, {
        origin: "architectures",
        idPrefix: "architecture/",
      });
      expect(result.ok).toBe(true);
    });
  });

  it("rejects an id that does not match its location", async () => {
    await withTempDir(async (root) => {
      await mkdir(join(root, "quality", "clean-code"), { recursive: true });
      await writeFile(
        join(root, "quality", "clean-code", "skill.yaml"),
        manifest("quality/other", "quality"),
      );
      await writeFile(join(root, "quality", "clean-code", "SKILL.md"), "# x\n");

      const result = await loadSkillsFromDir(root, { origin: "skills" });
      if (result.ok) throw new Error("expected failure");
      expect(result.error[0]?.message).toContain('must match its location ("quality/clean-code")');
    });
  });

  it("reports a missing SKILL.md", async () => {
    await withTempDir(async (root) => {
      await mkdir(join(root, "core", "x"), { recursive: true });
      await writeFile(join(root, "core", "x", "skill.yaml"), manifest("core/x", "core"));

      const result = await loadSkillsFromDir(root, { origin: "skills" });
      if (result.ok) throw new Error("expected failure");
      expect(result.error[0]?.message).toContain("SKILL.md is missing");
    });
  });

  it("returns no skills when the root does not exist", async () => {
    const result = await loadSkillsFromDir(join(tmpdir(), "no-such-skills-root"), {
      origin: "skills",
    });
    expect(result).toEqual({ ok: true, value: [] });
  });
});

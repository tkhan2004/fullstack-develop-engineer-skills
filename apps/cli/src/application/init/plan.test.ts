import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planStructure, loadManifests } from "@engineering-skills/architecture-engine";
import { describe, expect, it } from "vitest";
import { applyWritePlan, buildWritePlan, hasChanges, renderPlan } from "./plan.js";

async function inTempDir<T>(run: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "plan-"));
  try {
    return await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const file = (path: string, content: string) => ({ path, content, note: "n" });

async function cleanStructure() {
  const manifests = await loadManifests(join(process.cwd(), "architectures"));
  if (!manifests.ok) throw new Error("manifests");
  const planned = planStructure(
    manifests.value.find((m) => m.name === "clean")!,
    { mode: "new" },
  );
  if (!planned.ok) throw new Error(planned.error);
  return planned.value;
}

describe("buildWritePlan", () => {
  it("classifies files as create, update or unchanged", async () => {
    await inTempDir(async (dir) => {
      await writeFile(join(dir, "same.yaml"), "a\n");
      await writeFile(join(dir, "changed.yaml"), "old\n");
      const plan = await buildWritePlan({
        root: dir,
        files: [file("new.yaml", "x"), file("same.yaml", "a\n"), file("changed.yaml", "new\n")],
      });
      expect(plan.files.map((f) => [f.path, f.action])).toEqual([
        ["new.yaml", "create"],
        ["same.yaml", "unchanged"],
        ["changed.yaml", "update"],
      ]);
      expect(hasChanges(plan)).toBe(true);
    });
  });

  it("reports no changes when everything is up to date", async () => {
    await inTempDir(async (dir) => {
      await writeFile(join(dir, "a.yaml"), "a\n");
      expect(hasChanges(await buildWritePlan({ root: dir, files: [file("a.yaml", "a\n")] }))).toBe(
        false,
      );
    });
  });

  it("changes nothing while planning", async () => {
    await inTempDir(async (dir) => {
      await buildWritePlan({
        root: dir,
        files: [file(".engineering/config.yaml", "x")],
        structure: await cleanStructure(),
      });
      expect(await readdir(dir)).toEqual([]);
    });
  });

  it("marks existing directories as left untouched", async () => {
    await inTempDir(async (dir) => {
      await mkdir(join(dir, "src", "domain"), { recursive: true });
      const plan = await buildWritePlan({
        root: dir,
        files: [],
        structure: await cleanStructure(),
      });
      const text = renderPlan(plan);
      expect(text).toContain("· exists  src/domain/  (left untouched)");
      expect(text).toContain("src/application/");
      expect(text).toContain("No source file is modified.");
    });
  });
});

describe("applyWritePlan", () => {
  it("writes only what changed and leaves no temporary files behind", async () => {
    await inTempDir(async (dir) => {
      await writeFile(join(dir, "same.yaml"), "a\n");
      const plan = await buildWritePlan({
        root: dir,
        files: [file("same.yaml", "a\n"), file(".engineering/config.yaml", "x\n")],
      });
      const { written } = await applyWritePlan(dir, plan);
      expect(written).toEqual([".engineering/config.yaml"]);
      expect(await readFile(join(dir, ".engineering/config.yaml"), "utf8")).toBe("x\n");
      expect(await readdir(join(dir, ".engineering"))).toEqual(["config.yaml"]);
    });
  });

  it("creates the structure without touching existing content", async () => {
    await inTempDir(async (dir) => {
      await mkdir(join(dir, "src", "domain"), { recursive: true });
      await writeFile(join(dir, "src", "domain", "mine.ts"), "keep");
      const plan = await buildWritePlan({
        root: dir,
        files: [],
        structure: await cleanStructure(),
      });
      const { written } = await applyWritePlan(dir, plan);
      expect(written).toContain("src/application/");
      expect(written).not.toContain("src/domain/");
      expect(await readFile(join(dir, "src", "domain", "mine.ts"), "utf8")).toBe("keep");
    });
  });
});

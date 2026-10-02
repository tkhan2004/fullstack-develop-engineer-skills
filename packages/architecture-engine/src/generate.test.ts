import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { applyStructure, planStructure } from "./generate.js";
import { loadManifests } from "./loader.js";
import type { ArchitectureManifest } from "./manifest.js";

let manifests: Record<string, ArchitectureManifest> = {};
const manifest = (name: string) => manifests[name] as ArchitectureManifest;

beforeAll(async () => {
  const result = await loadManifests(
    join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "architectures"),
  );
  if (!result.ok) throw new Error(result.error.join("\n"));
  manifests = Object.fromEntries(result.value.map((m) => [m.name, m]));
});

const plan = (name: string, options: Parameters<typeof planStructure>[1]) => {
  const result = planStructure(manifest(name), options);
  if (!result.ok) throw new Error(result.error);
  return result.value;
};

async function inTempDir<T>(run: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "arch-"));
  try {
    return await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function tree(dir: string, prefix = ""): Promise<string[]> {
  const out: string[] = [];
  for (const entry of (await readdir(join(dir, prefix), { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    out.push(
      entry.isDirectory() ? `${rel}/` : rel,
      ...(entry.isDirectory() ? await tree(dir, rel) : []),
    );
  }
  return out;
}

describe("planStructure", () => {
  it("plans the documented clean architecture tree", () => {
    const { directories } = plan("clean", { mode: "new" });
    for (const expected of [
      "src/domain/entities",
      "src/application/use-cases",
      "src/infrastructure/repositories",
      "src/presentation/http",
      "src/config",
    ]) {
      expect(directories).toContain(expected);
    }
  });

  it("plans feature-clean modules from the module template", () => {
    const { directories } = plan("feature-clean", { mode: "new", modules: ["orders", "users"] });
    expect(directories).toContain("src/modules/users/domain/entities");
    expect(directories).toContain("src/modules/orders/application/use-cases");
    expect(directories).toContain("src/shared");
    expect(directories.some((d) => d.startsWith("src/modules/billing"))).toBe(false);
  });

  it("scaffolds a bare module for the flat feature architecture", () => {
    expect(plan("feature", { mode: "new", modules: ["auth"] }).directories).toContain(
      "src/modules/auth",
    );
  });

  it("puts .gitkeep only in empty leaf directories", () => {
    const { keepFiles } = plan("clean", { mode: "new" });
    expect(keepFiles).toContain("src/domain/entities/.gitkeep");
    expect(keepFiles).not.toContain("src/domain/.gitkeep");
  });

  it("is deterministic and independent of module order", () => {
    expect(plan("feature-clean", { mode: "new", modules: ["b", "a"] })).toEqual(
      plan("feature-clean", { mode: "new", modules: ["a", "b", "a"] }),
    );
  });

  it("refuses to generate structure for an existing project", () => {
    const result = planStructure(manifest("clean"), { mode: "existing" });
    if (result.ok) throw new Error("expected failure");
    expect(result.error).toContain("new projects only");
    expect(result.error).toContain("eng-skills migrate");
  });

  it("rejects bad module names and modules for non-module architectures", () => {
    expect(
      planStructure(manifest("feature"), { mode: "new", modules: ["Bad Name"] }),
    ).toMatchObject({ ok: false });
    const flat = planStructure(manifest("clean"), { mode: "new", modules: ["users"] });
    if (flat.ok) throw new Error("expected failure");
    expect(flat.error).toContain("not module-oriented");
  });

  it("rejects manifests whose paths escape the project root", () => {
    const evil = {
      ...manifest("clean"),
      structure: { ...manifest("clean").structure, directories: ["../outside"] },
    };
    const result = planStructure(evil, { mode: "new" });
    if (result.ok) throw new Error("expected failure");
    expect(result.error).toContain("Unsafe path");
  });
});

describe("applyStructure", () => {
  it("creates the planned tree", async () => {
    await inTempDir(async (dir) => {
      const result = await applyStructure(dir, plan("clean", { mode: "new" }));
      expect(result.skipped).toBe(0);
      const files = await tree(dir);
      expect(files).toContain("src/domain/entities/");
      expect(files).toContain("src/domain/entities/.gitkeep");
    });
  });

  it("is idempotent: a second run creates nothing", async () => {
    await inTempDir(async (dir) => {
      const p = plan("feature-clean", { mode: "new", modules: ["users"] });
      await applyStructure(dir, p);
      const before = await tree(dir);
      const second = await applyStructure(dir, p);
      expect(second.created).toBe(0);
      expect(await tree(dir)).toEqual(before);
    });
  });

  it("never overwrites: existing files and directories are left exactly as they were", async () => {
    await inTempDir(async (dir) => {
      await mkdir(join(dir, "src", "domain"), { recursive: true });
      await writeFile(join(dir, "src", "domain", "keep-me.ts"), "export const mine = 1;\n");
      await writeFile(join(dir, "src", "app.ts"), "// user code\n");

      const result = await applyStructure(dir, plan("clean", { mode: "new" }));

      expect(result.actions.find((a) => a.path === "src/domain")).toEqual({
        path: "src/domain",
        action: "exists",
      });
      expect(await readFile(join(dir, "src", "domain", "keep-me.ts"), "utf8")).toBe(
        "export const mine = 1;\n",
      );
      expect(await readFile(join(dir, "src", "app.ts"), "utf8")).toBe("// user code\n");
      expect(await tree(dir)).not.toContain("src/domain/.gitkeep");
    });
  });

  it("writes nothing on a dry run but reports what it would do", async () => {
    await inTempDir(async (dir) => {
      const result = await applyStructure(dir, plan("clean", { mode: "new" }), { dryRun: true });
      expect(result.created).toBeGreaterThan(0);
      expect(await readdir(dir)).toEqual([]);
    });
  });
});

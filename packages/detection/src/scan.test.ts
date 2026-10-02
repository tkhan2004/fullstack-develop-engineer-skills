import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { claim, combineEvidence } from "./claims.js";
import { fixturePath } from "./fixtures.js";
import { scanDirectory } from "./scan.js";
import { createSnapshot, isSourceFile, isTestFile, parseLooseJson } from "./snapshot.js";

async function inTempDir<T>(run: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "scan-"));
  try {
    return await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const put = async (dir: string, path: string, content: string) => {
  await mkdir(join(dir, path, ".."), { recursive: true });
  await writeFile(join(dir, path), content);
};

describe("scanDirectory", () => {
  it("reads text files and records sizes, in sorted order", async () => {
    await inTempDir(async (dir) => {
      await put(dir, "src/b.ts", "export const b = 1;");
      await put(dir, "src/a.ts", "export const a = 1;");
      await put(dir, "package.json", "{}");
      const snapshot = await scanDirectory(dir);
      expect(snapshot.files.map((f) => f.path)).toEqual(["package.json", "src/a.ts", "src/b.ts"]);
      expect(snapshot.text("src/a.ts")).toBe("export const a = 1;");
      expect(snapshot.truncated).toBe(false);
    });
  });

  it("skips dependency and build directories even without a .gitignore", async () => {
    await inTempDir(async (dir) => {
      for (const skipped of [
        "node_modules/x/index.js",
        "dist/a.js",
        "build/a.js",
        "coverage/a.js",
        ".next/a.js",
        ".git/config",
      ]) {
        await put(dir, skipped, "x");
      }
      await put(dir, "src/keep.ts", "x");
      expect((await scanDirectory(dir)).files.map((f) => f.path)).toEqual(["src/keep.ts"]);
    });
  });

  it("respects the root .gitignore", async () => {
    await inTempDir(async (dir) => {
      await put(dir, ".gitignore", "generated/\n*.log\n");
      await put(dir, "generated/a.ts", "x");
      await put(dir, "debug.log", "x");
      await put(dir, "src/a.ts", "x");
      expect((await scanDirectory(dir)).files.map((f) => f.path)).toEqual([
        ".gitignore",
        "src/a.ts",
      ]);
    });
  });

  it("does not follow symlinks", async () => {
    await inTempDir(async (dir) => {
      await put(dir, "real/a.ts", "x");
      await symlink(join(dir, "real"), join(dir, "linked"));
      expect((await scanDirectory(dir)).files.map((f) => f.path)).toEqual(["real/a.ts"]);
    });
  });

  it("lists but does not read oversized or binary-looking files", async () => {
    await inTempDir(async (dir) => {
      await put(dir, "big.ts", "x".repeat(1000));
      await put(dir, "image.png", "x");
      const snapshot = await scanDirectory(dir, { maxFileBytes: 100 });
      expect(snapshot.get("big.ts")).toMatchObject({ size: 1000, text: undefined });
      expect(snapshot.get("image.png")?.text).toBeUndefined();
    });
  });

  it("stops at the file limit and says so", async () => {
    await inTempDir(async (dir) => {
      for (let i = 0; i < 5; i++) await put(dir, `src/f${i}.ts`, "x");
      const snapshot = await scanDirectory(dir, { maxFiles: 3 });
      expect(snapshot.files).toHaveLength(3);
      expect(snapshot.truncated).toBe(true);
    });
  });

  it("is read-only: scanning leaves the directory byte-identical", async () => {
    const digest = async (dir: string): Promise<string> => {
      const hash = createHash("sha256");
      const walk = async (rel: string): Promise<void> => {
        for (const e of (await readdir(join(dir, rel), { withFileTypes: true })).sort((a, b) =>
          a.name.localeCompare(b.name),
        )) {
          const p = rel ? `${rel}/${e.name}` : e.name;
          if (e.isDirectory()) await walk(p);
          else hash.update(p).update(await readFile(join(dir, p)));
        }
      };
      await walk("");
      return hash.digest("hex");
    };
    const dir = fixturePath("express-layered-clean");
    const before = await digest(dir);
    await scanDirectory(dir);
    expect(await digest(dir)).toBe(before);
  });
});

describe("snapshot helpers", () => {
  it("classifies source and test files", () => {
    expect(isSourceFile("src/a.ts")).toBe(true);
    expect(isSourceFile("src/a.d.ts")).toBe(false);
    expect(isSourceFile("README.md")).toBe(false);
    expect(isTestFile("src/a.test.ts")).toBe(true);
    expect(isTestFile("src/a.spec.tsx")).toBe(true);
    expect(isTestFile("src/__tests__/a.ts")).toBe(true);
    expect(isTestFile("src/a.ts")).toBe(false);
  });

  it("finds files by pattern", () => {
    const snapshot = createSnapshot({ "a.ts": "", "b.md": "" });
    expect(snapshot.find(/\.ts$/).map((f) => f.path)).toEqual(["a.ts"]);
    expect(snapshot.has("b.md")).toBe(true);
  });

  it("parses JSON with comments and trailing commas, keeping // inside strings", () => {
    const parsed = parseLooseJson('{\n // comment\n "url": "http://x", /* c */ "a": [1,],\n}');
    expect(parsed).toEqual({ url: "http://x", a: [1] });
    expect(parseLooseJson("not json")).toBeUndefined();
    expect(parseLooseJson(undefined)).toBeUndefined();
  });
});

describe("claims", () => {
  it("combines independent evidence as noisy-OR and caps at 0.99", () => {
    expect(
      combineEvidence([
        { path: "a", detail: "", weight: 0.5 },
        { path: "b", detail: "", weight: 0.5 },
      ]),
    ).toBe(0.75);
    expect(combineEvidence([{ path: "a", detail: "", weight: 1 }])).toBe(0.99);
  });

  it("refuses a claim with no evidence", () => {
    expect(() => claim("x", [])).toThrow("no evidence");
  });

  it("rounds weights and omits empty alternatives", () => {
    const c = claim(
      "express",
      [{ path: "package.json", detail: "dependency", weight: 0.9123 }],
      [],
    );
    expect(c.evidence[0]?.weight).toBe(0.91);
    expect("alternatives" in c).toBe(false);
  });
});

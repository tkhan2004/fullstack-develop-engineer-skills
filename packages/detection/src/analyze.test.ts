import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadManifests, type ArchitectureManifest } from "@engineering-skills/architecture-engine";
import { beforeAll, describe, expect, it } from "vitest";
import { analyzeRepository, writeProfile } from "./analyze.js";
import { ARCHITECTURES_DIR, fixturePath } from "./fixtures.js";
import { readGitCommit } from "./git.js";
import { isProfileStale, parseProfile, serializeProfile } from "./profile.js";

const GOLDEN_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "tests",
  "fixtures",
  "profiles",
);
const FIXTURES = [
  "ambiguous-mixed",
  "clean-strict",
  "empty",
  "express-layered-clean",
  "express-layered-violations",
  "feature-clean",
  "js-no-types",
  "nest-feature",
];

let architectures: ArchitectureManifest[] = [];
beforeAll(async () => {
  const result = await loadManifests(ARCHITECTURES_DIR);
  if (!result.ok) throw new Error(result.error.join("\n"));
  architectures = result.value;
});

const analyse = (root: string) =>
  analyzeRepository(root, {
    architectures,
    generator: "@engineering-skills/cli@test",
    deterministic: true,
    commit: "0000000",
  });

async function inTempDir<T>(run: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "analyze-"));
  try {
    return await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function listFiles(dir: string, rel = ""): Promise<string[]> {
  const out: string[] = [];
  for (const e of (await readdir(join(dir, rel), { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const p = rel ? `${rel}/${e.name}` : e.name;
    out.push(...(e.isDirectory() ? await listFiles(dir, p) : [p]));
  }
  return out;
}

async function digest(dir: string): Promise<string> {
  const hash = createHash("sha256");
  for (const p of await listFiles(dir)) hash.update(p).update(await readFile(join(dir, p)));
  return hash.digest("hex");
}

describe("profile snapshots (regenerate deliberately with UPDATE_GOLDEN=1)", () => {
  it.each(FIXTURES)("%s matches its committed profile", async (name) => {
    const { profile } = await analyse(fixturePath(name));
    const text = serializeProfile(profile);
    const goldenPath = join(GOLDEN_DIR, `${name}.yaml`);
    if (process.env["UPDATE_GOLDEN"] === "1") {
      await mkdir(GOLDEN_DIR, { recursive: true });
      await writeFile(goldenPath, text);
    }
    expect(text).toBe(await readFile(goldenPath, "utf8"));
  });
});

describe("profile properties", () => {
  it.each(FIXTURES)("%s: output validates against the schema and round-trips", async (name) => {
    const { profile } = await analyse(fixturePath(name));
    const text = serializeProfile(profile);
    const parsed = parseProfile(text);
    if (!parsed.ok) throw new Error(parsed.error.join("\n"));
    expect(serializeProfile(parsed.value)).toBe(text);
  });

  it.each(FIXTURES)("%s: two deterministic runs are byte-identical", async (name) => {
    const a = serializeProfile((await analyse(fixturePath(name))).profile);
    const b = serializeProfile((await analyse(fixturePath(name))).profile);
    expect(b).toBe(a);
  });

  it("zeroes the timestamp and duration only when deterministic", async () => {
    const { profile } = await analyse(fixturePath("express-layered-clean"));
    expect(profile.generated).toMatchObject({
      at: "1970-01-01T00:00:00.000Z",
      duration_ms: 0,
      commit: "0000000",
    });
    const live = await analyzeRepository(fixturePath("empty"), {
      architectures,
      generator: "x",
      commit: undefined,
    });
    expect(live.profile.generated.at).not.toBe("1970-01-01T00:00:00.000Z");
    expect(live.profile.generated.commit).toBeUndefined();
  });

  it("describes the expected architecture and neutral observations for the violations fixture", async () => {
    const { profile } = await analyse(fixturePath("express-layered-violations"));
    expect(profile.architecture?.backend.value).toBe("layered");
    expect(profile.architecture?.backend.structure?.directories.map((d) => d.path)).toContain(
      "src/controllers",
    );
    expect(profile.observations.map((o) => o.id)).toEqual(
      expect.arrayContaining([
        "dependency-rule-violations",
        "framework-leakage",
        "logic-in-controller",
        "orm-outside-data-layer",
      ]),
    );
  });

  it("describes a custom structure instead of classifying it", async () => {
    const { profile } = await analyse(fixturePath("ambiguous-mixed"));
    expect(profile.architecture?.backend.value).toBe("custom");
    expect(profile.architecture?.backend.structure?.root).toBe("src");
    expect(profile.architecture?.backend.structure?.directories.map((d) => d.path)).toContain(
      "src/common",
    );
    expect(profile.architecture?.backend.conformance).toBeUndefined();
  });

  it("suggests the new mode for an empty directory and records no claims", async () => {
    const { profile } = await analyse(fixturePath("empty"));
    expect(profile.project).toEqual({ mode: "new", root: ".", source_roots: [] });
    expect(profile.stack).toEqual({});
    expect(profile.architecture).toBeUndefined();
  });
});

describe("analysis is read-only; the profile is the only write", () => {
  it.each(FIXTURES)("%s: analysing leaves the repository byte-identical", async (name) => {
    const before = await digest(fixturePath(name));
    await analyse(fixturePath(name));
    expect(await digest(fixturePath(name))).toBe(before);
  });

  it("writeProfile adds exactly .engineering/project-profile.yaml", async () => {
    await inTempDir(async (dir) => {
      await cp(fixturePath("express-layered-clean"), dir, { recursive: true });
      const before = await listFiles(dir);
      const { profile } = await analyse(dir);
      await writeProfile(dir, profile);
      expect((await listFiles(dir)).filter((f) => !before.includes(f))).toEqual([
        ".engineering/project-profile.yaml",
      ]);
    });
  });

  it("deleting the profile and re-running reproduces it exactly", async () => {
    await inTempDir(async (dir) => {
      await cp(fixturePath("clean-strict"), dir, { recursive: true });
      const first = await writeProfile(dir, (await analyse(dir)).profile);
      const text = await readFile(join(dir, first), "utf8");
      await rm(join(dir, first));
      await writeProfile(dir, (await analyse(dir)).profile);
      expect(await readFile(join(dir, first), "utf8")).toBe(text);
    });
  });

  it("the profile itself does not change what is detected on the next run", async () => {
    await inTempDir(async (dir) => {
      await cp(fixturePath("nest-feature"), dir, { recursive: true });
      const first = serializeProfile((await analyse(dir)).profile).replace(
        /files_scanned: \d+/,
        "",
      );
      await writeProfile(dir, (await analyse(dir)).profile);
      const second = serializeProfile((await analyse(dir)).profile).replace(
        /files_scanned: \d+/,
        "",
      );
      expect(second).toBe(first);
    });
  });
});

describe("parseProfile and staleness", () => {
  it("rejects a claim without evidence", () => {
    const text = serializeProfile({
      version: 1,
      generated: { at: "x", by: "y", files_scanned: 0, duration_ms: 0 },
      project: { mode: "new", root: ".", source_roots: [] },
      stack: {},
      conventions: { naming: {}, tests: {} },
      reference_modules: [],
      observations: [],
      maturity: {
        architecture: "missing",
        conventions: "missing",
        testing: "missing",
        security: "missing",
        documentation: "missing",
        observability: "missing",
      },
      gaps: [],
    }).replace(
      "stack: {}",
      "stack:\n  language:\n    value: typescript\n    confidence: 0.9\n    evidence: []",
    );
    const result = parseProfile(text);
    if (result.ok) throw new Error("expected failure");
    expect(result.error.join("\n")).toContain("A claim without evidence is invalid");
  });

  it("rejects unknown keys and bad YAML", () => {
    expect(parseProfile("version: 1\nextra: true").ok).toBe(false);
    expect(parseProfile("version: [").ok).toBe(false);
  });

  it("is stale only when both commits are known and differ", async () => {
    const { profile } = await analyse(fixturePath("empty"));
    expect(isProfileStale(profile, "0000000")).toBe(false);
    expect(isProfileStale(profile, "abcdef1")).toBe(true);
    expect(isProfileStale(profile, undefined)).toBe(false);
    expect(
      isProfileStale(
        { ...profile, generated: { ...profile.generated, commit: undefined as never } },
        "abcdef1",
      ),
    ).toBe(false);
  });
});

describe("readGitCommit", () => {
  const git = (cwd: string, ...args: string[]) =>
    execFileSync(
      "git",
      ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...args],
      { cwd, stdio: "pipe" },
    );

  it("returns the short HEAD of a repository root", async () => {
    await inTempDir(async (dir) => {
      git(dir, "init", "-q");
      await writeFile(join(dir, "a.txt"), "x");
      git(dir, "add", ".");
      git(dir, "commit", "-q", "-m", "init");
      expect(await readGitCommit(dir)).toMatch(/^[0-9a-f]{7}$/);
    });
  });

  it("is undefined outside git, and for a subdirectory of someone else's repository", async () => {
    await inTempDir(async (dir) => {
      expect(await readGitCommit(dir)).toBeUndefined();
      git(dir, "init", "-q");
      await writeFile(join(dir, "a.txt"), "x");
      git(dir, "add", ".");
      git(dir, "commit", "-q", "-m", "init");
      await mkdir(join(dir, "sub"));
      expect(await readGitCommit(join(dir, "sub"))).toBeUndefined();
    });
  });
});

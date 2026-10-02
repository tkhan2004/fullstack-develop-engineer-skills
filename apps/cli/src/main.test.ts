import { cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseProfile } from "@engineering-skills/detection";
import { describe, expect, it } from "vitest";
import { VERSION, main } from "./main.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const fixture = (name: string) => join(repoRoot, "tests", "fixtures", "repos", name);

async function run(argv: string[], options: { cwd?: string; color?: boolean } = {}) {
  let out = "";
  let err = "";
  const code = await main(argv, {
    out: (t) => (out += t),
    err: (t) => (err += t),
    cwd: options.cwd ?? process.cwd(),
    color: options.color ?? false,
    dataDir: repoRoot,
  });
  return { code, out, err };
}

async function withCopy<T>(name: string, use: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "cli-"));
  try {
    await cp(fixture(name), dir, { recursive: true });
    return await use(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const listFiles = async (dir: string, rel = ""): Promise<string[]> => {
  const out: string[] = [];
  for (const e of await readdir(join(dir, rel), { withFileTypes: true })) {
    const p = rel ? `${rel}/${e.name}` : e.name;
    out.push(...(e.isDirectory() ? await listFiles(dir, p) : [p]));
  }
  return out.sort();
};

describe("cli entry", () => {
  it("prints usage with no arguments and lists the analyze command", async () => {
    const { code, out } = await run([]);
    expect(code).toBe(0);
    expect(out).toContain("Usage: eng-skills");
    expect(out).toContain("analyze");
  });

  it("prints the version", async () => {
    expect((await run(["--version"])).out).toBe(`${VERSION}\n`);
  });

  it("exits 2 for an unknown command", async () => {
    const { code, err } = await run(["frobnicate"]);
    expect(code).toBe(2);
    expect(err).toContain("frobnicate");
  });
});

describe("eng-skills analyze", () => {
  it("prints a human report and writes only the profile", async () => {
    await withCopy("express-layered-clean", async (dir) => {
      const before = await listFiles(dir);
      const { code, out, err } = await run(["analyze", "--deterministic"], { cwd: dir });
      expect(code).toBe(0);
      expect(err).toBe("");
      expect(out).toContain("Engineering Project Analysis");
      expect(out).toContain("Layered");
      expect(out).toContain("confidence 95%");
      expect(out).toContain("TypeScript");
      expect(out).toContain("Express");
      expect(out).toContain("Generated: .engineering/project-profile.yaml");
      expect((await listFiles(dir)).filter((f) => !before.includes(f))).toEqual([
        ".engineering/project-profile.yaml",
      ]);

      const profile = parseProfile(
        await readFile(join(dir, ".engineering", "project-profile.yaml"), "utf8"),
      );
      expect(profile.ok).toBe(true);
    });
  });

  it("--no-write analyses without touching the directory", async () => {
    await withCopy("clean-strict", async (dir) => {
      const before = await listFiles(dir);
      const { code, out } = await run(["analyze", "--no-write"], { cwd: dir });
      expect(code).toBe(0);
      expect(out).toContain("No files were written.");
      expect(await listFiles(dir)).toEqual(before);
    });
  });

  it("--json prints a valid profile and no report", async () => {
    const { code, out } = await run([
      "analyze",
      "--json",
      "--no-write",
      "--cwd",
      fixture("nest-feature"),
    ]);
    expect(code).toBe(0);
    const profile = JSON.parse(out) as { architecture: { backend: { value: string } } };
    expect(profile.architecture.backend.value).toBe("feature");
    expect(out).not.toContain("Engineering Project Analysis");
  });

  it("--output writes the profile where asked", async () => {
    await withCopy("js-no-types", async (dir) => {
      await run(["analyze", "--output", "out/profile.yaml"], { cwd: dir });
      expect(await listFiles(dir)).toContain("out/profile.yaml");
    });
  });

  it("reports an unclear architecture honestly instead of guessing", async () => {
    const { out } = await run(["analyze", "--no-write", "--cwd", fixture("ambiguous-mixed")]);
    expect(out).toContain("Custom");
    expect(out).toContain("Architecture boundaries are not fully clear.");
    expect(out).toContain("closest: Layered");
  });

  it("shows neutral observations for the repository with violations", async () => {
    const { out } = await run([
      "analyze",
      "--no-write",
      "--cwd",
      fixture("express-layered-violations"),
    ]);
    expect(out).toContain("Observations");
    expect(out).toContain("Direct ORM or query-builder usage outside the data layer");
    expect(out).toContain("src/services/billing.service.ts:1");
  });

  it("exits 0 even when the project looks unhealthy: analyze reports, doctor judges", async () => {
    expect(
      (await run(["analyze", "--no-write", "--cwd", fixture("express-layered-violations")])).code,
    ).toBe(0);
  });

  it("emits ANSI colour only when asked", async () => {
    const args = ["analyze", "--no-write", "--cwd", fixture("clean-strict")];
    expect((await run(args, { color: false })).out).not.toContain("\u001b[");
    expect((await run(args, { color: true })).out).toContain("\u001b[");
  });

  it("is reproducible with --deterministic", async () => {
    const args = [
      "analyze",
      "--json",
      "--no-write",
      "--deterministic",
      "--cwd",
      fixture("feature-clean"),
    ];
    expect((await run(args)).out).toBe((await run(args)).out);
  });

  it.each([
    [["analyze", "--bogus"], "bogus"],
    [["analyze", "--max-files", "abc"], "--max-files must be a positive integer"],
    [["analyze", "--max-files", "0"], "--max-files must be a positive integer"],
  ])("%j exits 2 with a clear message", async (argv, message) => {
    const { code, err } = await run(argv);
    expect(code).toBe(2);
    expect(err).toContain(message);
  });

  it("warns when scanning stops at the file limit", async () => {
    const { code, err } = await run([
      "analyze",
      "--no-write",
      "--max-files",
      "5",
      "--cwd",
      fixture("express-layered-clean"),
    ]);
    expect(code).toBe(0);
    expect(err).toContain("scanning stopped at the file limit");
  });

  it("prints analyze help", async () => {
    const { code, out } = await run(["analyze", "--help"]);
    expect(code).toBe(0);
    expect(out).toContain("Usage: eng-skills analyze");
    expect(out).toContain("--deterministic");
  });
});

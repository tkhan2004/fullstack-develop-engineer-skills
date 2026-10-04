import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { main } from "./main.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const fixture = (name: string) => join(repoRoot, "tests", "fixtures", "repos", name);

const skillYaml = (id: string, category: string, priority: number) =>
  `id: ${id}\nversion: 1.0.0\ntitle: ${id}\nsummary: "Summary of ${id}."\ncategory: ${category}\npriority: ${priority}\n`;
const skillMd = (id: string) =>
  `# ${id}\n\n## Purpose\n\nProtect ${id}.\n\n## Do\n\n- Do it.\n\n## Review Checklist\n\n- Did you?\n`;

/** A data directory with the real architectures and two small skills. */
async function makeData(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "data-"));
  await cp(join(repoRoot, "architectures"), join(dir, "architectures"), { recursive: true });
  await cp(join(repoRoot, "presets"), join(dir, "presets"), { recursive: true });
  for (const [id, category, priority] of [
    ["core/project-onboarding", "core", 11],
    ["quality/clean-code", "quality", 50],
  ] as const) {
    await mkdir(join(dir, "skills", id), { recursive: true });
    await writeFile(join(dir, "skills", id, "skill.yaml"), skillYaml(id, category, priority));
    await writeFile(join(dir, "skills", id, "SKILL.md"), skillMd(id));
  }
  return dir;
}

async function inProject<T>(
  name: string,
  use: (dir: string, data: string) => Promise<T>,
): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "gen-"));
  const data = await makeData();
  try {
    await cp(fixture(name), dir, { recursive: true });
    return await use(dir, data);
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(data, { recursive: true, force: true });
  }
}

async function cli(command: string, argv: string[], cwd: string, dataDir: string) {
  let out = "";
  let err = "";
  const code = await main([command, ...argv], {
    out: (t) => (out += t),
    err: (t) => (err += t),
    cwd,
    color: false,
    dataDir,
  });
  return { code, out, err };
}

async function listFiles(dir: string, rel = ""): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(join(dir, rel), { withFileTypes: true })) {
    const p = rel ? `${rel}/${e.name}` : e.name;
    out.push(...(e.isDirectory() ? await listFiles(dir, p) : [p]));
  }
  return out.sort();
}

async function digest(dir: string, skip: (p: string) => boolean): Promise<string> {
  const hash = createHash("sha256");
  for (const p of (await listFiles(dir)).filter((f) => !skip(f)))
    hash.update(p).update(await readFile(join(dir, p)));
  return hash.digest("hex");
}

const notGenerated = (p: string) =>
  p.startsWith(".engineering/") ||
  p === "CLAUDE.md" ||
  p === "AGENTS.md" ||
  p.startsWith(".claude/");

/** init an existing project non-interactively, with all three adapters. */
const initExisting = (dir: string, data: string) =>
  cli("init", ["--yes", "--adapters", "claude,codex,generic"], dir, data);

describe("eng-skills generate", () => {
  it("generates instructions for every adapter and touches no source file", async () => {
    await inProject("express-layered-clean", async (dir, data) => {
      await initExisting(dir, data);
      const before = await digest(dir, notGenerated);
      const { code, out } = await cli("generate", [], dir, data);
      expect(code).toBe(0);
      expect(out).toContain(
        "Generating from .engineering/config.yaml (layered · observe · existing/adopt)",
      );
      expect(out).toContain("+ create     CLAUDE.md");
      expect(out).toContain("3 skills");
      expect(await listFiles(dir)).toEqual(
        expect.arrayContaining([
          "CLAUDE.md",
          "AGENTS.md",
          ".engineering/generated/INSTRUCTIONS.md",
          ".engineering/generated/lockfile.yaml",
          ".engineering/skills/conventions/SKILL.md",
          ".claude/skills/eng-project-conventions/SKILL.md",
          ".claude/skills/eng-quality-clean-code/SKILL.md",
        ]),
      );
      expect(await digest(dir, notGenerated)).toBe(before);
      const claude = await readFile(join(dir, "CLAUDE.md"), "utf8");
      expect(claude).toContain("Do not restructure the project");
      expect(claude).toContain("`src/controllers`");
    });
  });

  it("is idempotent: a second run changes nothing", async () => {
    await inProject("express-layered-clean", async (dir, data) => {
      await initExisting(dir, data);
      await cli("generate", [], dir, data);
      const before = await digest(dir, () => false);
      const again = await cli("generate", [], dir, data);
      expect(again.code).toBe(0);
      expect(again.out).toContain("Nothing to do");
      expect(again.out).not.toContain("+ create");
      expect(await digest(dir, () => false)).toBe(before);
    });
  });

  it("--check is the CI guard: exit 1 until generated, 0 after, 1 again after drift", async () => {
    await inProject("clean-strict", async (dir, data) => {
      await initExisting(dir, data);
      const stale = await cli("generate", ["--check"], dir, data);
      expect(stale.code).toBe(1);
      expect(stale.err).toContain("Out of date");
      expect(await listFiles(dir)).not.toContain("CLAUDE.md");

      await cli("generate", [], dir, data);
      expect((await cli("generate", ["--check"], dir, data)).code).toBe(0);

      const config = await readFile(join(dir, ".engineering/config.yaml"), "utf8");
      await writeFile(
        join(dir, ".engineering/config.yaml"),
        config.replace("strictness: observe", "strictness: strict"),
      );
      expect((await cli("generate", ["--check"], dir, data)).code).toBe(1);
    });
  });

  it("--dry-run shows the plan and writes nothing", async () => {
    await inProject("clean-strict", async (dir, data) => {
      await initExisting(dir, data);
      const before = await listFiles(dir);
      const { code, out } = await cli("generate", ["--dry-run"], dir, data);
      expect(code).toBe(0);
      expect(out).toContain("Dry run: nothing was written.");
      expect(await listFiles(dir)).toEqual(before);
    });
  });

  it("stops at a hand-edited generated file, writes nothing at all, and --force replaces it", async () => {
    await inProject("express-layered-clean", async (dir, data) => {
      await initExisting(dir, data);
      await cli("generate", [], dir, data);
      const path = join(dir, ".engineering/generated/INSTRUCTIONS.md");
      await writeFile(
        path,
        (await readFile(path, "utf8")).replace("Do not restructure", "Please restructure"),
      );
      const config = await readFile(join(dir, ".engineering/config.yaml"), "utf8");
      await writeFile(
        join(dir, ".engineering/config.yaml"),
        config.replace("strictness: observe", "strictness: minimal"),
      );
      const claudeBefore = await readFile(join(dir, "CLAUDE.md"), "utf8");

      const stopped = await cli("generate", [], dir, data);
      expect(stopped.code).toBe(1);
      expect(stopped.err).toContain("generated file was edited by hand");
      expect(stopped.err).toContain("--force");
      expect(await readFile(join(dir, "CLAUDE.md"), "utf8")).toBe(claudeBefore);

      expect((await cli("generate", ["--force"], dir, data)).code).toBe(0);
      expect(await readFile(path, "utf8")).toContain("Do not restructure");
    });
  });

  it("keeps the team's CLAUDE.md and AGENTS.md content", async () => {
    await inProject("express-layered-clean", async (dir, data) => {
      await writeFile(join(dir, "CLAUDE.md"), "# Team notes\n\nUse tabs.\n");
      await initExisting(dir, data);
      expect((await cli("generate", [], dir, data)).code).toBe(0);
      const claude = await readFile(join(dir, "CLAUDE.md"), "utf8");
      expect(claude.startsWith("# Team notes\n\nUse tabs.\n")).toBe(true);
      expect(claude).toContain("<!-- engineering-skills:start id=engineering-skills");
    });
  });

  it("--adapters limits what is written", async () => {
    await inProject("clean-strict", async (dir, data) => {
      await initExisting(dir, data);
      expect((await cli("generate", ["--adapters", "generic"], dir, data)).code).toBe(0);
      const files = await listFiles(dir);
      expect(files).toContain(".engineering/generated/INSTRUCTIONS.md");
      expect(files).not.toContain("CLAUDE.md");
      expect(files).not.toContain("AGENTS.md");
    });
  });

  it("works for a new project: architecture rules, no project skill", async () => {
    await inProject("empty", async (dir, data) => {
      await cli(
        "init",
        [
          "--yes",
          "--mode",
          "new",
          "--backend",
          "express",
          "--architecture",
          "clean",
          "--adapters",
          "generic",
        ],
        dir,
        data,
      );
      expect((await cli("generate", [], dir, data)).code).toBe(0);
      const text = await readFile(join(dir, ".engineering/generated/INSTRUCTIONS.md"), "utf8");
      expect(text).toContain("`domain` imports no other layer");
      expect(await listFiles(dir)).not.toContain(".engineering/skills/conventions/SKILL.md");
    });
  });

  it("warns about a missing profile for an existing project but still generates", async () => {
    await inProject("clean-strict", async (dir, data) => {
      await initExisting(dir, data);
      await rm(join(dir, ".engineering/project-profile.yaml"));
      const { code, out } = await cli("generate", [], dir, data);
      expect(code).toBe(0);
      expect(out).toContain("No project profile");
    });
  });

  it("explains how to start when there is no configuration", async () => {
    await inProject("empty", async (dir, data) => {
      const { code, err } = await cli("generate", [], dir, data);
      expect(code).toBe(2);
      expect(err).toContain("eng-skills init");
    });
  });

  it("reports an invalid configuration without writing", async () => {
    await inProject("empty", async (dir, data) => {
      await mkdir(join(dir, ".engineering"), { recursive: true });
      await writeFile(join(dir, ".engineering/config.yaml"), "version: 1\nproject:\n  mode: old\n");
      const { code, err } = await cli("generate", [], dir, data);
      expect(code).toBe(2);
      expect(err).toContain("Invalid configuration");
      expect(await listFiles(dir)).toEqual([".engineering/config.yaml", "README.md"]);
    });
  });

  it.each([
    [["--adapters", "gemini"], 'unknown adapter "gemini"'],
    [["--bogus"], "bogus"],
  ])("%j exits 2", async (argv, message) => {
    const { code, err } = await cli("generate", argv, process.cwd(), repoRoot);
    expect(code).toBe(2);
    expect(err).toContain(message);
  });

  it("prints help", async () => {
    const { code, out } = await cli("generate", ["--help"], process.cwd(), repoRoot);
    expect(code).toBe(0);
    expect(out).toContain("--check");
  });

  it("init's closing hint now points at generate", async () => {
    await inProject("empty", async (dir, data) => {
      const { out } = await cli(
        "init",
        ["--yes", "--mode", "new", "--frontend", "react"],
        dir,
        data,
      );
      expect(out).toContain("eng-skills generate");
      expect(out).not.toContain("not available yet");
    });
  });
});

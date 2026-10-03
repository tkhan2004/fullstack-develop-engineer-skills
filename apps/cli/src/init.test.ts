import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseConfig, parseConfigText } from "@engineering-skills/config";
import { describe, expect, it } from "vitest";
import { main } from "./main.js";
import { ScriptedPrompter } from "./test-support/scripted-prompter.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const fixture = (name: string) => join(repoRoot, "tests", "fixtures", "repos", name);
const CONFIG = ".engineering/config.yaml";
const PROFILE = ".engineering/project-profile.yaml";

async function withCopy<T>(name: string, use: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "init-"));
  try {
    await cp(fixture(name), dir, { recursive: true });
    return await use(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function run(argv: string[], cwd: string, prompter?: ScriptedPrompter) {
  let out = "";
  let err = "";
  const code = await main(["init", ...argv], {
    out: (t) => (out += t),
    err: (t) => (err += t),
    cwd,
    color: false,
    dataDir: repoRoot,
    ...(prompter ? { prompter } : {}),
  });
  return { code, out, err };
}

/** Like run(), but mirrors output into `sink` as it is produced so a prompt hook can read it. */
async function runCapturing(
  argv: string[],
  cwd: string,
  prompter: ScriptedPrompter,
  sink: { text: string },
) {
  let err = "";
  const code = await main(["init", ...argv], {
    out: (t) => (sink.text += t),
    err: (t) => (err += t),
    cwd,
    color: false,
    dataDir: repoRoot,
    prompter,
  });
  return { code, out: sink.text, err };
}

async function listFiles(dir: string, rel = ""): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(join(dir, rel), { withFileTypes: true })) {
    const p = rel ? `${rel}/${e.name}` : e.name;
    out.push(...(e.isDirectory() ? await listFiles(dir, p) : [p]));
  }
  return out.sort();
}

/** Hash of everything except .engineering, to prove source files are untouched. */
async function sourceDigest(dir: string): Promise<string> {
  const hash = createHash("sha256");
  for (const p of (await listFiles(dir)).filter((f) => !f.startsWith(".engineering/")))
    hash.update(p).update(await readFile(join(dir, p)));
  return hash.digest("hex");
}

const loadConfig = async (dir: string) => {
  const result = parseConfigText(await readFile(join(dir, CONFIG), "utf8"));
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value.config;
};

const PRACTICES = ["clean_code", "solid", "testing", "security", "error_handling"];

describe("argument handling", () => {
  it("needs a terminal or --yes", async () => {
    await withCopy("empty", async (dir) => {
      const { code, err } = await run([], dir);
      expect(code).toBe(2);
      expect(err).toContain("needs an interactive terminal");
      expect(await listFiles(dir)).toEqual(["README.md"]);
    });
  });

  it("rejects an unknown value with a suggestion", async () => {
    const { code, err } = await run(["--yes", "--backend", "expres"], process.cwd());
    expect(code).toBe(2);
    expect(err).toContain('--backend: unknown value "expres"');
    expect(err).toContain("Did you mean: express");
  });

  it("rejects unknown flags and prints help", async () => {
    expect((await run(["--bogus"], process.cwd())).code).toBe(2);
    const help = await run(["--help"], process.cwd());
    expect(help.code).toBe(0);
    expect(help.out).toContain("Usage: eng-skills init");
    expect(help.out).toContain("--architecture");
  });

  it("rejects an unknown preset with a suggestion", async () => {
    await withCopy("empty", async (dir) => {
      const { code, err } = await run(["--yes", "--preset", "pern-expres"], dir);
      expect(code).toBe(2);
      expect(err).toContain("Did you mean: pern-express");
    });
  });
});

describe("new project", () => {
  const script = {
    mode: "new",
    language: "typescript",
    backend: "express",
    frontend: "none",
    database: "postgresql",
    orm: "prisma",
    testing: "vitest",
    architecture: "feature-clean",
    strictness: "standard",
    practices: PRACTICES,
    adapters: ["claude", "generic"],
    modules: "users, orders",
    "confirm-write": true,
  };

  it("walks through the questions and writes the configuration and structure", async () => {
    await withCopy("empty", async (dir) => {
      const prompter = new ScriptedPrompter(script);
      const { code, out } = await run([], dir, prompter);
      expect(code).toBe(0);
      expect(prompter.asked).toEqual([
        "mode",
        "language",
        "backend",
        "frontend",
        "database",
        "orm",
        "testing",
        "architecture",
        "strictness",
        "practices",
        "adapters",
        "modules",
        "confirm-write",
      ]);

      const config = await loadConfig(dir);
      expect(config.project).toMatchObject({ mode: "new" });
      expect(config.architecture.backend).toMatchObject({
        style: "feature-clean",
        source: "selected",
        strictness: "standard",
      });
      expect(config.stack.database).toEqual({ engine: "postgresql", orm: "prisma" });
      expect(config.engineering).toMatchObject({
        clean_code: true,
        solid: true,
        performance: false,
        caching: false,
      });
      expect(config.ai.adapters).toEqual(["claude", "generic"]);
      expect(config.adoption).toBeUndefined();

      const files = await listFiles(dir);
      expect(files).toContain("src/modules/users/domain/entities/.gitkeep");
      expect(files).toContain("src/modules/orders/application/use-cases/.gitkeep");
      expect(files).not.toContain(PROFILE);
      expect(out).toContain("Architecture options");
      expect(out).toContain("No source file is modified.");
    });
  });

  it("pre-selects the mode from evidence: an empty directory is new", async () => {
    await withCopy("empty", async (dir) => {
      const prompter = new ScriptedPrompter({ ...script, "confirm-write": false });
      await run([], dir, prompter);
      expect(prompter.initials.get("mode")).toBe("new");
    });
  });

  it("writes nothing when the plan is declined", async () => {
    await withCopy("empty", async (dir) => {
      const { code, out } = await run(
        [],
        dir,
        new ScriptedPrompter({ ...script, "confirm-write": false }),
      );
      expect(code).toBe(0);
      expect(out).toContain("Nothing was written.");
      expect(await listFiles(dir)).toEqual(["README.md"]);
    });
  });

  it("writes nothing on Ctrl-C and exits 130", async () => {
    await withCopy("empty", async (dir) => {
      const { code, out } = await run(
        [],
        dir,
        new ScriptedPrompter({ ...script, architecture: "CANCEL" }),
      );
      expect(code).toBe(130);
      expect(out).toContain("Cancelled. Nothing was written.");
      expect(await listFiles(dir)).toEqual(["README.md"]);
    });
  });

  it("--dry-run shows the plan and writes nothing", async () => {
    await withCopy("empty", async (dir) => {
      const { code, out } = await run(
        ["--yes", "--dry-run", "--mode", "new", "--backend", "express", "--architecture", "clean"],
        dir,
      );
      expect(code).toBe(0);
      expect(out).toContain("+ create  .engineering/config.yaml");
      expect(out).toContain("src/domain/entities/");
      expect(out).toContain("Dry run: nothing was written.");
      expect(await listFiles(dir)).toEqual(["README.md"]);
    });
  });

  it("--preset with --yes needs no questions", async () => {
    await withCopy("empty", async (dir) => {
      const { code } = await run(["--yes", "--preset", "pern-express"], dir);
      expect(code).toBe(0);
      const config = await loadConfig(dir);
      expect(config.architecture.backend?.style).toBe("layered");
      expect(config.stack.backend?.framework).toBe("express");
      expect(config.stack.frontend?.framework).toBe("react");
      expect(await listFiles(dir)).toContain("src/controllers/.gitkeep");
    });
  });

  it("--yes will not choose an architecture for you", async () => {
    await withCopy("empty", async (dir) => {
      const { code, err } = await run(["--yes", "--backend", "express"], dir);
      expect(code).toBe(2);
      expect(err).toContain("--yes needs an architecture");
      expect(await listFiles(dir)).toEqual(["README.md"]);
    });
  });

  it("a project without a backend gets no architecture and no structure", async () => {
    await withCopy("empty", async (dir) => {
      expect((await run(["--yes", "--mode", "new", "--frontend", "react"], dir)).code).toBe(0);
      const config = await loadConfig(dir);
      expect(config.architecture).toEqual({});
      expect((await listFiles(dir)).filter((f) => f.startsWith("src/"))).toEqual([]);
    });
  });

  it("--no-structure skips directory generation", async () => {
    await withCopy("empty", async (dir) => {
      await run(
        [
          "--yes",
          "--mode",
          "new",
          "--backend",
          "express",
          "--architecture",
          "layered",
          "--no-structure",
        ],
        dir,
      );
      expect(await listFiles(dir)).toEqual([".engineering/config.yaml", "README.md"]);
    });
  });

  it("choosing new in a non-empty directory warns, asks, and never overwrites", async () => {
    await withCopy("express-layered-clean", async (dir) => {
      const before = await sourceDigest(dir);
      const declined = await run(
        [],
        dir,
        new ScriptedPrompter({ mode: "new", "new-in-nonempty": false }),
      );
      expect(declined.out).toContain("already contains a project");
      expect(await sourceDigest(dir)).toBe(before);
      expect(await listFiles(dir)).not.toContain(CONFIG);

      const accepted = await run(
        ["--yes", "--mode", "new", "--backend", "express", "--architecture", "clean"],
        dir,
      );
      expect(accepted.code).toBe(0);
      expect(accepted.out).toContain("Existing files are never overwritten");
      const files = await listFiles(dir);
      expect(files).toContain("src/domain/entities/.gitkeep");
      // Existing files and directories are untouched; only additions exist.
      expect(await readFile(join(dir, "src/services/user.service.ts"), "utf8")).toContain(
        "class UserService",
      );
      expect(accepted.out).toContain("(left untouched)");
    });
  });

  it("is deterministic: the same answers produce the same configuration", async () => {
    const texts: string[] = [];
    for (let i = 0; i < 2; i++) {
      await withCopy("empty", async (dir) => {
        await run(
          [
            "--yes",
            "--mode",
            "new",
            "--name",
            "demo",
            "--backend",
            "express",
            "--architecture",
            "clean",
            "--database",
            "postgresql",
            "--orm",
            "prisma",
          ],
          dir,
        );
        texts.push(await readFile(join(dir, CONFIG), "utf8"));
      });
    }
    expect(texts[1]).toBe(texts[0]);
  });
});

describe("existing project: adopt", () => {
  const script = {
    mode: "existing",
    "architecture-accept": true,
    strategy: "adopt",
    strictness: "observe",
    practices: PRACTICES,
    adapters: ["claude", "generic"],
    "confirm-write": true,
  };

  it("analyses first, shows the report, adopts the detected architecture and touches no source file", async () => {
    await withCopy("express-layered-clean", async (dir) => {
      const before = await sourceDigest(dir);
      let outAtArchitectureQuestion = "";
      let filesAtConfirm: string[] = [];
      const sink = { text: "" };
      const prompter = new ScriptedPrompter(script, async (id) => {
        if (id === "architecture-accept") outAtArchitectureQuestion = sink.text;
        if (id === "confirm-write") filesAtConfirm = await listFiles(dir);
      });
      const { code, out } = await runCapturing([], dir, prompter, sink);
      expect(code).toBe(0);

      // The analysis is shown before any question about the architecture, and nothing is on disk
      // at the moment the user is asked to confirm.
      expect(outAtArchitectureQuestion).toContain("Engineering Project Analysis");
      expect(outAtArchitectureQuestion).toContain("Layered");
      expect(filesAtConfirm.some((f) => f.startsWith(".engineering/"))).toBe(false);
      expect(out.indexOf("Engineering Project Analysis")).toBeLessThan(
        out.indexOf("Planned changes"),
      );
      expect(prompter.asked).toEqual([
        "mode",
        "architecture-accept",
        "strategy",
        "strictness",
        "practices",
        "adapters",
        "confirm-write",
      ]);
      expect(prompter.initials.get("mode")).toBe("existing");
      expect(prompter.initials.get("strategy")).toBe("adopt");
      expect(prompter.initials.get("strictness")).toBe("observe");

      const config = await loadConfig(dir);
      expect(config.project.mode).toBe("existing");
      expect(config.adoption).toEqual({ strategy: "adopt", profile: PROFILE });
      expect(config.architecture.backend).toMatchObject({
        style: "layered",
        source: "detected",
        strictness: "observe",
        root: "src",
      });
      expect(config.architecture.backend?.confidence).toBeGreaterThanOrEqual(0.85);
      expect(config.stack).toMatchObject({
        language: "typescript",
        backend: { framework: "express" },
        database: { engine: "postgresql", orm: "prisma" },
      });

      expect(await sourceDigest(dir)).toBe(before);
      expect((await listFiles(dir)).filter((f) => f.startsWith(".engineering/"))).toEqual([
        CONFIG,
        PROFILE,
      ]);
    });
  });

  it("--yes accepts a confident detection with no questions", async () => {
    await withCopy("clean-strict", async (dir) => {
      const before = await sourceDigest(dir);
      const { code } = await run(["--yes"], dir);
      expect(code).toBe(0);
      const config = await loadConfig(dir);
      expect(config.architecture.backend).toMatchObject({ style: "clean", source: "detected" });
      expect(config.adoption?.strategy).toBe("adopt");
      expect(await sourceDigest(dir)).toBe(before);
    });
  });

  it("--yes refuses to guess below 0.85 and says how to proceed", async () => {
    await withCopy("ambiguous-mixed", async (dir) => {
      const { code, err } = await run(["--yes"], dir);
      expect(code).toBe(3);
      expect(err).toContain("Architecture boundaries are not fully clear");
      expect(err).toContain("--yes will not guess");
      expect(err).toContain("--architecture custom");
      expect((await listFiles(dir)).some((f) => f.startsWith(".engineering/"))).toBe(false);
    });
    await withCopy("express-layered-violations", async (dir) => {
      const { code, err } = await run(["--yes"], dir);
      expect(code).toBe(3);
      expect(err).toContain("likely, but not certain");
    });
  });

  it("--architecture custom describes the structure as it is", async () => {
    await withCopy("ambiguous-mixed", async (dir) => {
      const before = await sourceDigest(dir);
      expect((await run(["--yes", "--architecture", "custom"], dir)).code).toBe(0);
      const backend = (await loadConfig(dir)).architecture.backend;
      expect(backend).toMatchObject({ style: "custom", source: "manual" });
      expect(backend?.custom?.root).toBe("src");
      expect(Object.keys(backend?.custom?.modules ?? {})).toEqual(["billing", "reports"]);
      expect(backend?.custom?.shared?.map((s) => s.path)).toEqual(
        expect.arrayContaining(["src/common", "src/utils"]),
      );
      expect(backend?.custom?.rules?.dependency_direction).toBe("existing");
      expect(await sourceDigest(dir)).toBe(before);
    });
  });

  it("an explicit --architecture that matches detection is recorded as confirmed", async () => {
    await withCopy("express-layered-violations", async (dir) => {
      expect((await run(["--yes", "--architecture", "layered"], dir)).code).toBe(0);
      const backend = (await loadConfig(dir)).architecture.backend;
      expect(backend).toMatchObject({ style: "layered", source: "confirmed" });
      expect(backend?.confidence).toBeGreaterThan(0.6);
    });
  });

  it("a likely detection (0.60–0.84) asks the user to choose and keeps the confidence", async () => {
    await withCopy("express-layered-violations", async (dir) => {
      const prompter = new ScriptedPrompter({ ...script, "architecture-choose": "layered" });
      delete (prompter as unknown as { script: Record<string, unknown> }).script[
        "architecture-accept"
      ];
      const { code } = await run([], dir, prompter);
      expect(code).toBe(0);
      expect(prompter.asked).toContain("architecture-choose");
      expect(prompter.options.get("architecture-choose")?.map((o) => o.value)).toEqual(
        expect.arrayContaining(["layered", "custom"]),
      );
      const backend = (await loadConfig(dir)).architecture.backend;
      expect(backend).toMatchObject({ style: "layered", source: "confirmed" });
      expect(backend?.confidence).toBeLessThan(0.85);
    });
  });

  it("an unclear architecture offers keep, define manually, or analyse further", async () => {
    const base = {
      mode: "existing",
      strategy: "adopt",
      strictness: "observe",
      practices: PRACTICES,
      adapters: ["generic"],
      "confirm-write": true,
    };
    await withCopy("ambiguous-mixed", async (dir) => {
      const prompter = new ScriptedPrompter({ ...base, "architecture-unclear": "keep" });
      expect((await run([], dir, prompter)).code).toBe(0);
      expect(prompter.options.get("architecture-unclear")?.map((o) => o.value)).toEqual([
        "keep",
        "manual",
        "analyze",
      ]);
      const backend = (await loadConfig(dir)).architecture.backend;
      expect(backend).toMatchObject({ style: "custom", source: "detected" });
      expect(backend?.confidence).toBeDefined();
    });
    await withCopy("ambiguous-mixed", async (dir) => {
      const prompter = new ScriptedPrompter({
        ...base,
        "architecture-unclear": "manual",
        "architecture-manual": "layered",
      });
      expect((await run([], dir, prompter)).code).toBe(0);
      expect((await loadConfig(dir)).architecture.backend).toMatchObject({
        style: "layered",
        source: "manual",
      });
    });
  });

  it("declining the detected architecture falls through to a manual choice", async () => {
    await withCopy("clean-strict", async (dir) => {
      const prompter = new ScriptedPrompter({
        ...script,
        "architecture-accept": false,
        "architecture-manual": "custom",
      });
      expect((await run([], dir, prompter)).code).toBe(0);
      expect((await loadConfig(dir)).architecture.backend).toMatchObject({
        style: "custom",
        source: "manual",
      });
    });
  });

  it("--out relocates the configuration and the adoption profile path", async () => {
    await withCopy("clean-strict", async (dir) => {
      expect((await run(["--yes", "--out", "tools/eng"], dir)).code).toBe(0);
      const files = await listFiles(dir);
      expect(files).toEqual(
        expect.arrayContaining(["tools/eng/config.yaml", "tools/eng/project-profile.yaml"]),
      );
      expect(files).not.toContain(CONFIG);
      const parsed = parseConfigText(await readFile(join(dir, "tools/eng/config.yaml"), "utf8"));
      if (!parsed.ok) throw new Error("invalid config");
      expect(parsed.value.config.adoption?.profile).toBe("tools/eng/project-profile.yaml");
    });
  });
});

describe("existing project: strategies", () => {
  it("migrate records an explicit, planned migration and still changes no source", async () => {
    await withCopy("express-layered-clean", async (dir) => {
      const before = await sourceDigest(dir);
      const { code } = await run(
        ["--yes", "--strategy", "migrate", "--migrate-to", "feature-clean"],
        dir,
      );
      expect(code).toBe(0);
      const config = await loadConfig(dir);
      expect(config.adoption?.strategy).toBe("migrate");
      expect(config.migration).toMatchObject({
        from: "layered",
        to: "feature-clean",
        strategy: "incremental",
        status: "planned",
      });
      expect(config.architecture.backend?.strictness).toBe("standard");
      expect(await sourceDigest(dir)).toBe(before);
    });
  });

  it("migrate without a target fails clearly", async () => {
    await withCopy("express-layered-clean", async (dir) => {
      const { code, err } = await run(["--yes", "--strategy", "migrate"], dir);
      expect(code).toBe(2);
      expect(err).toContain("--migrate-to");
    });
  });

  it("recommend defaults to standard strictness", async () => {
    await withCopy("clean-strict", async (dir) => {
      await run(["--yes", "--strategy", "recommend"], dir);
      expect((await loadConfig(dir)).architecture.backend?.strictness).toBe("standard");
    });
  });
});

describe("existing configuration and profile", () => {
  it("--yes on a configured project is a no-op that points at --force", async () => {
    await withCopy("clean-strict", async (dir) => {
      await run(["--yes"], dir);
      const before = await readFile(join(dir, CONFIG), "utf8");
      const { code, out } = await run(["--yes"], dir);
      expect(code).toBe(0);
      expect(out).toContain("Already configured");
      expect(out).toContain("--force");
      expect(await readFile(join(dir, CONFIG), "utf8")).toBe(before);
    });
  });

  it("offers keep, review or reconfigure interactively", async () => {
    await withCopy("clean-strict", async (dir) => {
      await run(["--yes"], dir);
      const before = await readFile(join(dir, CONFIG), "utf8");

      const keep = await run([], dir, new ScriptedPrompter({ "existing-config": "keep" }));
      expect(keep.out).toContain("Configuration unchanged.");
      const review = await run([], dir, new ScriptedPrompter({ "existing-config": "review" }));
      expect(review.out).toContain("style: clean");
      expect(await readFile(join(dir, CONFIG), "utf8")).toBe(before);

      const prompter = new ScriptedPrompter({
        "existing-config": "reconfigure",
        mode: "existing",
        "profile-reuse": "use",
        "architecture-accept": true,
        strategy: "adopt",
        strictness: "minimal",
        practices: PRACTICES,
        adapters: ["generic"],
        "confirm-write": true,
      });
      const reconfigured = await run([], dir, prompter);
      expect(reconfigured.out).toContain("replaces the existing configuration");
      expect((await loadConfig(dir)).architecture.backend?.strictness).toBe("minimal");
    });
  });

  it("an invalid configuration is reported, not silently replaced, unless --force", async () => {
    await withCopy("clean-strict", async (dir) => {
      await run(["--yes"], dir);
      await writeFile(join(dir, CONFIG), "version: 1\nproject:\n  mode: old\n");
      const refused = await run(["--yes"], dir);
      expect(refused.code).toBe(2);
      expect(refused.err).toContain("Invalid configuration");
      expect(refused.err).toContain("--force");
      expect(await readFile(join(dir, CONFIG), "utf8")).toContain("mode: old");

      expect((await run(["--yes", "--force"], dir)).code).toBe(0);
      expect(parseConfig({ ...(await loadConfig(dir)) }).ok).toBe(true);
    });
  });

  it("reuses a fresh profile instead of analysing again, and reports nothing to do when nothing changed", async () => {
    await withCopy("clean-strict", async (dir) => {
      await run(["--yes"], dir);
      const profileBefore = await readFile(join(dir, PROFILE), "utf8");
      const again = await run(["--yes", "--force"], dir);
      expect(again.out).toContain("Nothing to do");
      expect(await readFile(join(dir, PROFILE), "utf8")).toBe(profileBefore);
    });
  });

  it("asks before reusing a profile and re-analyses on request", async () => {
    await withCopy("clean-strict", async (dir) => {
      await run(["--yes"], dir);
      const prompter = new ScriptedPrompter({
        "existing-config": "reconfigure",
        mode: "existing",
        "profile-reuse": "reanalyze",
        "architecture-accept": true,
        strategy: "adopt",
        strictness: "observe",
        practices: PRACTICES,
        adapters: ["generic"],
        "confirm-write": true,
      });
      const { out } = await run([], dir, prompter);
      expect(prompter.asked).toContain("profile-reuse");
      expect(out).toContain("~ update  .engineering/project-profile.yaml");
    });
  });

  it("flags a stale profile and analyses again", async () => {
    await withCopy("clean-strict", async (dir) => {
      const git = (...args: string[]) =>
        execFileSync(
          "git",
          ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...args],
          { cwd: dir, stdio: "pipe" },
        );
      git("init", "-q");
      git("add", ".");
      git("commit", "-q", "-m", "one");
      await run(["--yes"], dir);
      const first = await readFile(join(dir, PROFILE), "utf8");
      git("commit", "-q", "--allow-empty", "-m", "two");
      const { out } = await run(["--yes", "--force"], dir);
      expect(out).toContain("Existing profile is stale");
      expect(await readFile(join(dir, PROFILE), "utf8")).not.toBe(first);
    });
  });
});

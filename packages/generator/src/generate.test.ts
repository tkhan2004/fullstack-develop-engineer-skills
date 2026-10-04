import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findManagedBlock, inspectGeneratedFile } from "@engineering-skills/adapters";
import { loadManifests, type ArchitectureManifest } from "@engineering-skills/architecture-engine";
import {
  parseConfig,
  resolveLayers,
  serializeConfig,
  type EngineeringConfig,
  type Layer,
} from "@engineering-skills/config";
import { analyzeRepository, type Profile } from "@engineering-skills/detection";
import { createSkill, skillManifestSchema, type Skill } from "@engineering-skills/skill-engine";
import { parse } from "yaml";
import { beforeAll, describe, expect, it } from "vitest";
import { planGeneration, type GenerateInput, type GenerationPlan } from "./generate.js";
import type { PlannedWrite } from "./plan.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
let manifests: ArchitectureManifest[] = [];
const profiles: Record<string, Profile> = {};

beforeAll(async () => {
  const loaded = await loadManifests(join(repoRoot, "architectures"));
  if (!loaded.ok) throw new Error("manifests");
  manifests = loaded.value;
  for (const name of ["express-layered-clean", "clean-strict"]) {
    profiles[name] = (
      await analyzeRepository(join(repoRoot, "tests", "fixtures", "repos", name), {
        architectures: manifests,
        generator: "t",
        deterministic: true,
        commit: undefined,
      })
    ).profile;
  }
});

const BODY = (title: string) =>
  `# ${title}\n\n## Purpose\n\nProtect ${title}.\n\n## Do\n\n- Do it.\n\n## Review Checklist\n\n- Did you?\n`;
const skill = (id: string, extra: Record<string, unknown> = {}): Skill =>
  createSkill(
    skillManifestSchema.parse({
      id,
      version: "1.0.0",
      title: id,
      summary: `Summary of ${id}.`,
      category: id.split("/")[0],
      ...extra,
    }),
    BODY(id),
    "skills",
    `skills/${id}`,
  );
const SKILLS = () => [
  skill("core/project-onboarding", { priority: 11 }),
  skill("quality/clean-code", { priority: 50 }),
];

function configOf(layer: Layer): EngineeringConfig {
  const result = parseConfig(resolveLayers({ flags: layer }));
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value.config;
}

const existingConfig = (extra: Layer = {}) =>
  configOf({
    project: { mode: "existing", name: "acme-api" },
    adoption: { strategy: "adopt", profile: ".engineering/project-profile.yaml" },
    stack: { language: "typescript", backend: { runtime: "node", framework: "express" } },
    architecture: {
      backend: {
        style: "layered",
        source: "detected",
        confidence: 0.95,
        strictness: "observe",
        root: "src",
      },
    },
    ai: { adapters: ["claude", "codex", "generic"] },
    ...extra,
  });

/** An in-memory project directory. */
class MemFs {
  constructor(readonly files = new Map<string, string>()) {}
  read = async (path: string) => this.files.get(path);
  apply(plan: GenerationPlan) {
    for (const w of plan.writes)
      if (w.action === "create" || w.action === "update") this.files.set(w.path, w.content);
  }
}

async function plan(fs: MemFs, config: EngineeringConfig, extra: Partial<GenerateInput> = {}) {
  const result = await planGeneration({
    config,
    configText: serializeConfig(config),
    profile: profiles["express-layered-clean"],
    skills: SKILLS(),
    manifests,
    read: fs.read,
    version: "0.0.0-test",
    engineeringDir: ".engineering",
    force: false,
    ...extra,
  });
  if (!result.ok) throw new Error(result.error.join("\n"));
  return result.value;
}

const actions = (p: GenerationPlan) => Object.fromEntries(p.writes.map((w) => [w.path, w.action]));

describe("an existing project, first run", () => {
  it("plans every file: instructions for each adapter, the project skill, and the lockfile", async () => {
    const p = await plan(new MemFs(), existingConfig());
    expect(actions(p)).toEqual({
      ".claude/skills/eng-core-project-onboarding/SKILL.md": "create",
      ".claude/skills/eng-project-conventions/SKILL.md": "create",
      ".claude/skills/eng-quality-clean-code/SKILL.md": "create",
      ".engineering/generated/INSTRUCTIONS.md": "create",
      ".engineering/generated/lockfile.yaml": "create",
      ".engineering/skills/conventions/SKILL.md": "create",
      ".engineering/skills/conventions/skill.yaml": "create",
      "AGENTS.md": "create",
      "CLAUDE.md": "create",
    });
    expect(p.conflicts).toEqual([]);
  });

  it("selects the project skill first, then the shipped skills in order", async () => {
    const p = await plan(new MemFs(), existingConfig());
    expect(p.resolved.skills.map((s) => s.id)).toEqual([
      "project/conventions",
      "core/project-onboarding",
      "quality/clean-code",
    ]);
    expect(p.resolved.skills[0]?.selectedBy).toBe("project.mode=existing");
  });

  it("tells every adapter's audience the same facts", async () => {
    const p = await plan(new MemFs(), existingConfig());
    for (const path of ["CLAUDE.md", "AGENTS.md", ".engineering/generated/INSTRUCTIONS.md"]) {
      const text = p.writes.find((w) => w.path === path)?.content ?? "";
      expect(text, path).toContain("Do not restructure the project");
      expect(text, path).toContain("`src/controllers`");
    }
  });

  it("records the lockfile: config hash, skills with reasons, and a hash per generated file", async () => {
    const p = await plan(new MemFs(), existingConfig());
    const lock = parse(
      p.writes.find((w) => w.path === ".engineering/generated/lockfile.yaml")?.content ?? "",
    ) as {
      version: number;
      generator: string;
      config_hash: string;
      skills: { id: string; selected_by: string }[];
      files: { path: string; hash: string }[];
    };
    expect(lock).toMatchObject({ version: 1, generator: "@engineering-skills/cli@0.0.0-test" });
    expect(lock.config_hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(lock.skills.map((s) => s.id)).toEqual([
      "project/conventions",
      "core/project-onboarding",
      "quality/clean-code",
    ]);
    expect(lock.skills[1]?.selected_by).toBe("always on");
    expect(lock.files.map((f) => f.path)).toEqual([...lock.files.map((f) => f.path)].sort());
    expect(lock.files.map((f) => f.path)).not.toContain(".engineering/generated/lockfile.yaml");
  });
});

describe("idempotence", () => {
  it("planning again after writing changes nothing", async () => {
    const fs = new MemFs();
    const config = existingConfig();
    fs.apply(await plan(fs, config));
    const second = await plan(fs, config);
    expect(new Set(Object.values(actions(second)))).toEqual(new Set(["unchanged"]));
  });

  it("is deterministic: two plans are identical", async () => {
    const a = await plan(new MemFs(), existingConfig());
    const b = await plan(new MemFs(), existingConfig());
    expect(b.writes).toEqual(a.writes);
  });

  it("changing the configuration changes the lockfile and the affected files only", async () => {
    const fs = new MemFs();
    fs.apply(await plan(fs, existingConfig()));
    const strict = existingConfig({
      architecture: {
        backend: {
          style: "layered",
          source: "detected",
          confidence: 0.95,
          strictness: "strict",
          root: "src",
        },
      },
    });
    const changed = actions(await plan(fs, strict));
    expect(changed[".engineering/generated/lockfile.yaml"]).toBe("update");
    expect(changed["CLAUDE.md"]).toBe("update");
    expect(changed[".engineering/skills/conventions/SKILL.md"]).toBe("unchanged");
  });
});

describe("the team's files are protected", () => {
  it("keeps the team's CLAUDE.md content and only manages its own block", async () => {
    const fs = new MemFs(new Map([["CLAUDE.md", "# Team notes\n\nUse tabs.\n"]]));
    const p = await plan(fs, existingConfig());
    const claude = p.writes.find((w) => w.path === "CLAUDE.md");
    expect(claude?.action).toBe("update");
    expect(claude?.content.startsWith("# Team notes\n\nUse tabs.\n")).toBe(true);
    expect(findManagedBlock(claude?.content ?? "", "engineering-skills")).toBeDefined();
  });

  it("stops at a hand-edited generated file, and replaces it only with --force", async () => {
    const fs = new MemFs();
    fs.apply(await plan(fs, existingConfig()));
    const path = ".engineering/generated/INSTRUCTIONS.md";
    fs.files.set(
      path,
      (fs.files.get(path) ?? "").replace("Do not restructure", "Please restructure"),
    );
    const stopped = await plan(fs, existingConfig());
    expect(stopped.conflicts.map((c) => c.path)).toEqual([path]);
    expect((await plan(fs, existingConfig(), { force: true })).conflicts).toEqual([]);
  });

  it("keeps a hand-edited project skill and uses it, instead of overwriting it", async () => {
    const fs = new MemFs();
    fs.apply(await plan(fs, existingConfig()));
    const path = ".engineering/skills/conventions/SKILL.md";
    fs.files.set(
      path,
      (fs.files.get(path) ?? "").replace("Keep new code consistent", "Keep OUR code consistent"),
    );
    const p = await plan(fs, existingConfig());
    expect(actions(p)[path]).toBeUndefined();
    expect(p.warnings.join("\n")).toContain(
      "Kept your edited .engineering/skills/conventions/SKILL.md",
    );
    expect(p.output.sections.find((s) => s.id === "project/conventions")?.body).toContain(
      "Keep OUR code consistent",
    );

    const forced = await plan(fs, existingConfig(), { force: true });
    expect(actions(forced)[path]).toBe("update");
  });

  it("regenerates an unedited project skill when the profile changes", async () => {
    const fs = new MemFs();
    fs.apply(await plan(fs, existingConfig()));
    const other = await plan(fs, existingConfig(), { profile: profiles["clean-strict"] });
    expect(actions(other)[".engineering/skills/conventions/SKILL.md"]).toBe("update");
  });
});

describe("configuration options", () => {
  it("--adapters limits what is generated", async () => {
    const p = await plan(new MemFs(), existingConfig(), { adapters: ["generic"] });
    expect(p.writes.map((w) => w.path).filter((x) => !x.startsWith(".engineering/"))).toEqual([]);
    expect(p.writes.some((w) => w.path === "CLAUDE.md")).toBe(false);
  });

  it("rejects an unknown adapter", async () => {
    const result = await planGeneration({
      config: existingConfig(),
      configText: "",
      skills: SKILLS(),
      manifests,
      read: async () => undefined,
      version: "x",
      engineeringDir: ".engineering",
      force: false,
      adapters: ["gemini"],
    });
    expect(result).toMatchObject({ ok: false, error: ['Unknown adapter "gemini".'] });
  });

  it("claude inline mode writes no skill files", async () => {
    const p = await plan(
      new MemFs(),
      existingConfig({ ai: { adapters: ["claude"], mode: "inline" } }),
    );
    expect(p.writes.filter((w) => w.path.startsWith(".claude/"))).toEqual([]);
  });

  it("honours an output path override", async () => {
    const p = await plan(
      new MemFs(),
      existingConfig({ ai: { adapters: ["codex"], output: { codex: "docs/AGENTS.md" } } }),
    );
    expect(p.writes.map((w) => w.path)).toContain("docs/AGENTS.md");
    expect(p.writes.map((w) => w.path)).not.toContain("AGENTS.md");
  });

  it("rejects two adapters writing the same path", async () => {
    const result = await planGeneration({
      config: existingConfig({
        ai: { adapters: ["claude", "codex"], output: { claude: "AGENTS.md" } },
      }),
      configText: "",
      skills: SKILLS(),
      manifests,
      read: async () => undefined,
      version: "x",
      engineeringDir: ".engineering",
      force: false,
    });
    expect(result.ok).toBe(false);
  });
});

describe("a new project", () => {
  const newConfig = () =>
    configOf({
      project: { mode: "new", name: "demo" },
      stack: { language: "typescript", backend: { runtime: "node", framework: "express" } },
      architecture: {
        backend: { style: "clean", source: "selected", strictness: "standard", root: "src" },
      },
      ai: { adapters: ["generic"] },
    });

  it("has no project skill and no observed facts", async () => {
    const p = await plan(new MemFs(), newConfig(), { profile: undefined });
    expect(p.resolved.skills.map((s) => s.id)).toEqual([
      "core/project-onboarding",
      "quality/clean-code",
    ]);
    expect(p.writes.some((w) => w.path.includes("skills/conventions"))).toBe(false);
    const text = p.writes.find((w) => w.path.endsWith("INSTRUCTIONS.md"))?.content ?? "";
    expect(text).toContain("`domain` imports no other layer");
    expect(inspectGeneratedFile(text)).toBe("pristine");
  });
});

describe("warnings and failures", () => {
  it("warns when no skills are installed but still generates the project facts", async () => {
    const p = await plan(new MemFs(), existingConfig(), { skills: [] });
    expect(p.warnings.join("\n")).toContain("No skills are installed");
    expect(p.writes.some((w) => w.path === "CLAUDE.md")).toBe(true);
  });

  it("fails with a readable message when the skill graph is broken", async () => {
    const result = await planGeneration({
      config: existingConfig(),
      configText: "",
      manifests,
      read: async () => undefined,
      version: "x",
      engineeringDir: ".engineering",
      force: false,
      skills: [skill("core/a", { requires: ["core/missing"] })],
    });
    if (result.ok) throw new Error("expected failure");
    expect(result.error[0]).toContain('Requires "core/missing"');
  });

  it("warns when the resolved skills exceed the token budget", async () => {
    const big = createSkill(
      skillManifestSchema.parse({
        id: "core/big",
        version: "1.0.0",
        title: "Big",
        summary: "s",
        category: "core",
      }),
      `# Big\n\n## Purpose\n\n${"x".repeat(60_000)}\n`,
      "skills",
      "skills/core/big",
    );
    const p = await plan(new MemFs(), existingConfig(), { skills: [big] });
    expect(p.warnings.join("\n")).toContain("over the 12000 budget");
  });
});

describe("the plan is data: nothing is written while planning", () => {
  it("reads only, and returns writes as values", async () => {
    const reads: string[] = [];
    await plan(new MemFs(), existingConfig(), { read: async (p) => (reads.push(p), undefined) });
    expect(reads.length).toBeGreaterThan(0);
    expect(reads.every((p) => !p.startsWith("/") && !p.includes(".."))).toBe(true);
    const p: PlannedWrite[] = (await plan(new MemFs(), existingConfig())).writes as PlannedWrite[];
    expect(p.every((w) => typeof w.content === "string")).toBe(true);
  });
});

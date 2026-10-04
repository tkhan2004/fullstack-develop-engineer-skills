import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadManifests, type ArchitectureManifest } from "@engineering-skills/architecture-engine";
import {
  parseConfig,
  resolveLayers,
  type EngineeringConfig,
  type Layer,
} from "@engineering-skills/config";
import { analyzeRepository, type Profile } from "@engineering-skills/detection";
import {
  buildRegistry,
  createSkill,
  resolveSkills,
  skillManifestSchema,
  type ResolvedSkillSet,
  type Skill,
} from "@engineering-skills/skill-engine";
import { beforeAll, describe, expect, it } from "vitest";
import { buildCanonicalOutput } from "./canonical.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
let manifests: ArchitectureManifest[] = [];
const profiles: Record<string, Profile> = {};

const BODY = `# T

## Purpose

Protect something.

## Architecture Awareness

Determine the project's architecture, in this order: config.

## Do

- Do the thing.

## Review Checklist

- [ ] Did you do the thing?
- Is it tested?
`;

const skill = (id: string, extra: Record<string, unknown> = {}): Skill =>
  createSkill(
    skillManifestSchema.parse({
      id,
      version: "1.2.0",
      title: `Title of ${id}`,
      summary: `Summary of ${id}.`,
      category: id.split("/")[0],
      ...extra,
    }),
    BODY,
    "skills",
    `skills/${id}`,
  );

beforeAll(async () => {
  const loaded = await loadManifests(join(repoRoot, "architectures"));
  if (!loaded.ok) throw new Error(loaded.error.join("\n"));
  manifests = loaded.value;
  for (const name of ["express-layered-clean", "ambiguous-mixed"]) {
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

function configOf(layer: Layer): EngineeringConfig {
  const result = parseConfig(resolveLayers({ flags: layer }));
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value.config;
}

function resolve(
  config: EngineeringConfig,
  skills: Skill[] = [
    skill("core/project-onboarding", {
      priority: 11,
      strictness_overrides: { observe: "Mirror the surrounding code." },
    }),
    skill("quality/clean-code", { priority: 50 }),
  ],
): ResolvedSkillSet {
  const registry = buildRegistry(skills);
  if (!registry.ok) throw new Error(JSON.stringify(registry.error));
  const set = resolveSkills(registry.value, config);
  if (!set.ok) throw new Error(JSON.stringify(set.error));
  return set.value;
}

const existing = (extra: Layer = {}): EngineeringConfig =>
  configOf({
    project: { mode: "existing", name: "acme-api" },
    adoption: { strategy: "adopt" },
    stack: {
      language: "typescript",
      backend: { runtime: "node", framework: "express" },
      database: { engine: "postgresql", orm: "prisma" },
      testing: { framework: "vitest" },
    },
    architecture: {
      backend: {
        style: "layered",
        source: "detected",
        confidence: 0.95,
        strictness: "observe",
        root: "src",
      },
    },
    ...extra,
  });

describe("an existing, adopted, layered project", () => {
  const config = existing();
  const out = () =>
    buildCanonicalOutput({
      config,
      resolved: resolve(config),
      manifests,
      profile: profiles["express-layered-clean"],
    });

  it("states the facts", () => {
    expect(out().project).toMatchObject({
      name: "acme-api",
      mode: "existing",
      strategy: "adopt",
      architecture: {
        style: "layered",
        source: "detected",
        confidence: 0.95,
        strictness: "observe",
      },
    });
    expect(out().project.stack).toEqual([
      { label: "Language", value: "typescript" },
      { label: "Runtime", value: "node" },
      { label: "Backend", value: "express" },
      { label: "Database", value: "postgresql" },
      { label: "ORM", value: "prisma" },
      { label: "Tests", value: "vitest" },
    ]);
  });

  it("forbids restructuring and points at the existing directories", () => {
    expect(out().project.constraints).toEqual([
      "Do not restructure the project or introduce a different architecture.",
      "Follow the existing directories and mirror the closest existing module when adding code.",
    ]);
    expect(out().project.structure?.directories).toContainEqual({
      path: "src/controllers",
      note: "Translates HTTP into service calls; no business rules",
    });
    expect(out().project.structure?.directories.map((d) => d.path)).toEqual(
      expect.arrayContaining([
        "src/controllers",
        "src/services",
        "src/repositories",
        "src/models",
        "src/routes",
      ]),
    );
  });

  it("turns the manifest into dependency rules, including forbidden framework imports", () => {
    const rules = out().project.dependencyRules;
    expect(rules).toContain("`services` may import: `repositories`, `models`");
    expect(rules).toContain("`models` imports no other layer");
    expect(rules.find((r) => r.startsWith("`services` must not import:"))).toContain("`express`");
  });

  it("carries the observed conventions and reference modules from the profile", () => {
    expect(out().project.conventions).toContainEqual({
      label: "File names",
      value: "kebab-case",
      share: 1,
    });
    expect(out().project.conventions.find((c) => c.label === "Test placement")?.value).toBe(
      "colocated with source",
    );
    expect(out().references.map((r) => r.concern)).toEqual([
      "controller",
      "repository",
      "service",
      "test",
    ]);
  });

  it("emits one section per skill, with the awareness block removed and the checklist extracted", () => {
    const [first] = out().sections;
    expect(first).toMatchObject({
      id: "core/project-onboarding",
      title: "Title of core/project-onboarding",
      priority: 11,
      tone: "Mirror the surrounding code.",
    });
    expect(first?.body).toContain("### Purpose");
    expect(first?.body).toContain("### Do");
    expect(first?.body).not.toContain("Architecture Awareness");
    expect(first?.checklist).toEqual(["Did you do the thing?", "Is it tested?"]);
    expect(out().sections.map((s) => s.id)).toEqual([
      "core/project-onboarding",
      "quality/clean-code",
    ]);
  });

  it("records the lockfile with versions and why each skill was selected", () => {
    expect(out().lockfile.skills).toEqual([
      { id: "core/project-onboarding", version: "1.2.0", selectedBy: "always on" },
      { id: "quality/clean-code", version: "1.2.0", selectedBy: "always on" },
    ]);
  });

  it("is deterministic", () => {
    expect(out()).toEqual(out());
  });
});

describe("strategies", () => {
  const profile = profiles["express-layered-clean"];
  it("recommend adds a reporting instruction and keeps the do-not-restructure rule", () => {
    const config = existing({ adoption: { strategy: "recommend" } });
    const c = buildCanonicalOutput({ config, resolved: resolve(config), manifests, profile })
      .project.constraints;
    expect(c).toContain("Do not restructure the project or introduce a different architecture.");
    expect(c).toContain(
      "Report deviations and improvement opportunities in your response; do not apply them unless asked.",
    );
  });

  it("migrate replaces it with a module-by-module instruction and never says rewrite everything", () => {
    const config = existing({
      adoption: { strategy: "migrate" },
      migration: {
        from: "layered",
        to: "feature-clean",
        strategy: "incremental",
        status: "planned",
      },
    });
    const out = buildCanonicalOutput({ config, resolved: resolve(config), manifests, profile });
    expect(out.project.constraints[0]).toBe(
      "The project is migrating from Layered to Feature + Clean Architecture. Do not rewrite the whole repository.",
    );
    expect(out.project.constraints.join(" ")).toContain("one module at a time");
    expect(out.project.constraints).not.toContain(
      "Do not restructure the project or introduce a different architecture.",
    );
    expect(out.project.migration).toEqual({
      from: "layered",
      to: "feature-clean",
      strategy: "incremental",
    });
  });
});

describe("a new project", () => {
  const newProject = (style: string) =>
    configOf({
      project: { mode: "new", name: "demo" },
      stack: { language: "typescript", backend: { runtime: "node", framework: "express" } },
      architecture: { backend: { style, source: "selected", strictness: "standard", root: "src" } },
    });

  it("tells the agent to use the selected architecture's directories, and has no observed facts", () => {
    const config = newProject("clean");
    const out = buildCanonicalOutput({ config, resolved: resolve(config), manifests });
    expect(out.project.constraints).toEqual([
      "Place new code in the directories listed below and keep to the selected architecture.",
    ]);
    expect(out.project.conventions).toEqual([]);
    expect(out.references).toEqual([]);
    expect(out.project.dependencyRules).toContain("`domain` imports no other layer");
  });

  it("describes a module-oriented architecture per module and states the isolation rule", () => {
    const config = newProject("feature-clean");
    const out = buildCanonicalOutput({ config, resolved: resolve(config), manifests });
    const dirs = out.project.structure?.directories ?? [];
    expect(dirs[0]).toMatchObject({ path: "src/modules" });
    expect(dirs[0]?.note).toContain("`domain`, `application`, `infrastructure`, `presentation`");
    expect(dirs.map((d) => d.path)).toContain("src/modules/<module>/domain");
    expect(out.project.dependencyRules[0]).toBe("These rules apply inside each module.");
    expect(out.project.dependencyRules).toContain(
      "A module must not import another module's internals; use its public `index` or shared code.",
    );
  });

  it("remaps paths when the source root is not src", () => {
    const config = configOf({
      project: { mode: "new" },
      stack: { language: "typescript", backend: { runtime: "node", framework: "express" } },
      architecture: {
        backend: { style: "clean", source: "selected", strictness: "standard", root: "server" },
      },
    });
    const dirs =
      buildCanonicalOutput({
        config,
        resolved: resolve(config),
        manifests,
      }).project.structure?.directories.map((d) => d.path) ?? [];
    expect(dirs).toContain("server/domain");
    expect(dirs.some((d) => d.startsWith("src/"))).toBe(false);
  });

  it("has no architecture facts when there is no backend architecture", () => {
    const config = configOf({
      project: { mode: "new" },
      stack: { language: "typescript", frontend: { framework: "react" } },
      architecture: {},
    });
    const out = buildCanonicalOutput({ config, resolved: resolve(config), manifests });
    expect(out.project).toMatchObject({
      architecture: undefined,
      structure: undefined,
      dependencyRules: [],
      constraints: [],
    });
  });
});

describe("a custom architecture", () => {
  const config = existing({
    architecture: {
      backend: {
        style: "custom",
        source: "detected",
        confidence: 0.62,
        strictness: "observe",
        root: "src",
        custom: {
          root: "src",
          modules: {
            billing: { path: "src/modules/billing" },
            reports: { path: "src/modules/reports" },
          },
          shared: [{ path: "src/common", role: "cross-cutting" }],
          rules: {
            dependency_direction: "existing",
            observed: ["Imports that cross layers (1 observed)"],
          },
        },
      },
    },
  });
  const out = () =>
    buildCanonicalOutput({
      config,
      resolved: resolve(config),
      manifests,
      profile: profiles["ambiguous-mixed"],
    });

  it("describes what is there, with roles where known and the modules listed", () => {
    const dirs = out().project.structure?.directories ?? [];
    expect(dirs).toContainEqual({ path: "src/common", note: "cross-cutting" });
    expect(dirs).toContainEqual({ path: "src/controllers", note: "Observed directory" });
    expect(out().project.structure?.modules).toEqual([
      { name: "billing", path: "src/modules/billing" },
      { name: "reports", path: "src/modules/reports" },
    ]);
  });

  it("states that dependency directions were observed, not imposed", () => {
    expect(out().project.dependencyRules).toEqual([
      "Follow the dependency directions already present in the code; they were observed, not imposed.",
      "Observed: Imports that cross layers (1 observed)",
    ]);
  });
});

describe("conventions", () => {
  it("leaves out inconsistent ones: a coin flip is not a convention to mirror", () => {
    const base = profiles["express-layered-clean"] as Profile;
    const profile: Profile = {
      ...base,
      conventions: {
        ...base.conventions,
        naming: { files: { value: "kebab-case", ratio: 0.55, sample_size: 9, consistent: false } },
      },
    };
    const config = existing();
    const out = buildCanonicalOutput({ config, resolved: resolve(config), manifests, profile });
    expect(out.project.conventions.map((c) => c.label)).not.toContain("File names");
  });
});

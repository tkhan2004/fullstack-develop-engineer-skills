import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadManifests } from "@engineering-skills/architecture-engine";
import { parseConfig, resolveLayers } from "@engineering-skills/config";
import {
  buildRegistry,
  loadSkillsFromDir,
  resolveSkills,
  validateLibrary,
  type Skill,
} from "@engineering-skills/skill-engine";
import { beforeAll, describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** Every `books/…`, `standards/…`, `articles/…` id the source map declares. */
function knownSources(): Set<string> {
  const map = readFileSync(join(root, "docs/sot/mapping/skill-source-map.md"), "utf8");
  const ids = map.split("## Source ids")[1] ?? "";
  return new Set([...ids.matchAll(/^\|\s*`([a-z-]+\/[a-z0-9-]+)`/gm)].map((m) => m[1] as string));
}

let skills: Skill[] = [];

beforeAll(async () => {
  const loaded = await loadSkillsFromDir(join(root, "skills"), { origin: "skills" });
  if (!loaded.ok) throw new Error(loaded.error.map((i) => i.message).join("\n"));
  skills = loaded.value;
});

describe("the shipped skill library", () => {
  it("loads", () => {
    expect(skills.length).toBeGreaterThan(0);
  });

  it("satisfies the skill contract, with every source traced to the source map", () => {
    const problems = validateLibrary(skills, {
      knownSources: knownSources(),
      requireSources: true,
    });
    expect(
      problems.filter((p) => p.level === "error").map((p) => `${p.skill ?? "?"}: ${p.message}`),
    ).toEqual([]);
  });

  it("forms a registry with no dangling requires, cycles or asymmetric conflicts", () => {
    const registry = buildRegistry(skills);
    expect(registry.ok, JSON.stringify(registry.ok ? [] : registry.error)).toBe(true);
  });

  it("stays within the token budget of a typical configuration", async () => {
    const manifests = await loadManifests(join(root, "architectures"));
    if (!manifests.ok) throw new Error("manifests");
    const registry = buildRegistry(skills);
    if (!registry.ok) throw new Error("registry");
    const config = parseConfig(
      resolveLayers({
        flags: {
          project: { mode: "existing" },
          adoption: { strategy: "adopt" },
          stack: { language: "typescript", backend: { runtime: "node", framework: "express" } },
          architecture: { backend: { style: "layered", source: "manual", strictness: "observe" } },
        },
      }),
    );
    if (!config.ok) throw new Error(JSON.stringify(config.error));
    const resolved = resolveSkills(registry.value, config.value.config);
    if (!resolved.ok) throw new Error("resolve");
    expect(resolved.value.totalTokens).toBeLessThan(12_000);
  });
  it("has no size or style warnings", () => {
    const warnings = validateLibrary(skills).filter((p) => p.level === "warning");
    expect(warnings.map((p) => `${p.skill ?? "?"}: ${p.message}`)).toEqual([]);
  });

  describe("project onboarding", () => {
    const select = (mode: "new" | "existing") => {
      const registry = buildRegistry(skills);
      if (!registry.ok) throw new Error("registry");
      const config = parseConfig(
        resolveLayers({
          flags: {
            project: { mode },
            ...(mode === "existing" ? { adoption: { strategy: "adopt" } } : {}),
            stack: { language: "typescript" },
            architecture: {
              backend: { style: "layered", source: "manual", strictness: "observe" },
            },
          },
        }),
      );
      if (!config.ok) throw new Error(JSON.stringify(config.error));
      const resolved = resolveSkills(registry.value, config.value.config);
      if (!resolved.ok) throw new Error("resolve");
      return resolved.value.skills.map((s) => s.id);
    };

    it("is selected for an existing project", () => {
      expect(select("existing")).toContain("core/project-onboarding");
    });

    it("is not selected for a new project", () => {
      expect(select("new")).not.toContain("core/project-onboarding");
    });
  });
});

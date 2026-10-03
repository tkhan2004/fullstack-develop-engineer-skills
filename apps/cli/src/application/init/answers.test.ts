import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadManifests } from "@engineering-skills/architecture-engine";
import { parseConfig, resolveLayers } from "@engineering-skills/config";
import { analyzeRepository, type Profile } from "@engineering-skills/detection";
import { beforeAll, describe, expect, it } from "vitest";
import {
  customBlockFromProfile,
  practicesToEngineering,
  stackLayerFromProfile,
} from "./answers.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..");
const profiles: Record<string, Profile> = {};

interface CustomBlock {
  root: string;
  modules: Record<string, { path: string }>;
  shared: { path: string; role: string }[];
  rules: { dependency_direction: string };
}

beforeAll(async () => {
  const manifests = await loadManifests(join(repoRoot, "architectures"));
  if (!manifests.ok) throw new Error("manifests");
  for (const name of ["express-layered-clean", "ambiguous-mixed", "nest-feature"]) {
    profiles[name] = (
      await analyzeRepository(join(repoRoot, "tests", "fixtures", "repos", name), {
        architectures: manifests.value,
        generator: "t",
        deterministic: true,
        commit: undefined,
      })
    ).profile;
  }
});

describe("stackLayerFromProfile", () => {
  it("turns detected claims into a config stack layer", () => {
    expect(stackLayerFromProfile(profiles["express-layered-clean"] as Profile)).toEqual({
      language: "typescript",
      backend: { runtime: "node", framework: "express" },
      database: { engine: "postgresql", orm: "prisma" },
      testing: { framework: "vitest" },
    });
  });

  it("produces a layer the config schema accepts", () => {
    const stack = stackLayerFromProfile(profiles["nest-feature"] as Profile);
    const result = parseConfig(
      resolveLayers({ flags: { project: { mode: "new" }, stack, architecture: {} } }),
    );
    expect(result.ok).toBe(true);
  });
});

describe("customBlockFromProfile", () => {
  it("describes the repository: modules, shared directories, and what was observed", () => {
    const block = customBlockFromProfile(
      profiles["ambiguous-mixed"] as Profile,
    ) as unknown as CustomBlock;
    expect(block.root).toBe("src");
    expect(block.modules).toEqual({
      billing: { path: "src/modules/billing" },
      reports: { path: "src/modules/reports" },
    });
    expect(block.shared).toEqual(
      expect.arrayContaining([
        { path: "src/common", role: "cross-cutting" },
        { path: "src/utils", role: "utilities" },
      ]),
    );
    expect(block.rules.dependency_direction).toBe("existing");
  });

  it("is accepted by the config schema as a custom architecture", () => {
    const custom = customBlockFromProfile(profiles["ambiguous-mixed"] as Profile);
    const result = parseConfig(
      resolveLayers({
        flags: {
          project: { mode: "existing" },
          adoption: { strategy: "adopt" },
          stack: { language: "typescript" },
          architecture: {
            backend: { style: "custom", source: "manual", strictness: "observe", custom },
          },
        },
      }),
    );
    expect(result.ok, JSON.stringify(result.ok ? [] : result.error)).toBe(true);
  });
});

describe("practicesToEngineering", () => {
  it("turns a selection into a complete set of flags", () => {
    expect(practicesToEngineering(["testing", "security"])).toEqual({
      clean_code: false,
      solid: false,
      design_patterns: false,
      testing: true,
      security: true,
      error_handling: false,
      performance: false,
      observability: false,
      caching: false,
    });
  });
});

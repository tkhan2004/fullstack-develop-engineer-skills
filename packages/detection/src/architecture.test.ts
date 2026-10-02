import { loadManifests, type ArchitectureManifest } from "@engineering-skills/architecture-engine";
import { beforeAll, describe, expect, it } from "vitest";
import { detectArchitecture, detectSourceRoot, readAliases, toSrcPath } from "./architecture.js";
import { ARCHITECTURES_DIR, fixturePath } from "./fixtures.js";
import { scanDirectory } from "./scan.js";
import { createSnapshot } from "./snapshot.js";

let manifests: ArchitectureManifest[] = [];
beforeAll(async () => {
  const result = await loadManifests(ARCHITECTURES_DIR);
  if (!result.ok) throw new Error(result.error.join("\n"));
  manifests = result.value;
});

const detect = async (fixture: string) =>
  detectArchitecture(await scanDirectory(fixturePath(fixture)), manifests);

describe("fixture repositories land in their expected confidence bands", () => {
  it("express-layered-clean → layered, ≥ 0.85", async () => {
    const result = await detect("express-layered-clean");
    expect(result?.style).toBe("layered");
    expect(result?.confidence).toBeGreaterThanOrEqual(0.85);
    expect(result?.conformance).toBe(1);
  });

  it("express-layered-violations → layered, 0.60–0.84, with measured violations", async () => {
    const result = await detect("express-layered-violations");
    expect(result?.style).toBe("layered");
    expect(result?.confidence).toBeGreaterThanOrEqual(0.6);
    expect(result?.confidence).toBeLessThan(0.85);
    expect(result?.best?.violations).toBeGreaterThan(0);
  });

  it("nest-feature → feature, ≥ 0.85", async () => {
    const result = await detect("nest-feature");
    expect(result?.style).toBe("feature");
    expect(result?.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("clean-strict → clean, ≥ 0.90", async () => {
    const result = await detect("clean-strict");
    expect(result?.style).toBe("clean");
    expect(result?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("feature-clean → feature-clean, ≥ 0.85, and does not treat feature as a competitor", async () => {
    const result = await detect("feature-clean");
    expect(result?.style).toBe("feature-clean");
    expect(result?.confidence).toBeGreaterThanOrEqual(0.85);
    expect(result?.alternatives.map((a) => a.value)).toContain("feature");
  });

  it("ambiguous-mixed → custom, with the closest named styles as alternatives", async () => {
    const result = await detect("ambiguous-mixed");
    expect(result?.style).toBe("custom");
    expect(result?.best?.style).toBeDefined();
    expect(result?.alternatives.length).toBeGreaterThan(0);
    for (const a of result?.alternatives ?? []) expect(a.confidence).toBeLessThan(0.6);
    expect(result?.evidence[0]?.detail).toContain("below the 0.6 threshold");
    expect(result?.topLevel.map((t) => t.path)).toEqual(
      expect.arrayContaining([
        "src/common",
        "src/controllers",
        "src/helpers",
        "src/managers",
        "src/modules",
        "src/random",
        "src/services",
        "src/utils",
      ]),
    );
  });

  it("repositories without a source root abstain instead of guessing", async () => {
    expect(await detect("empty")).toBeUndefined();
    expect(await detect("js-no-types")).toBeUndefined();
  });
});

describe("the evidence behind a claim", () => {
  it("cites marker directories, import-graph conformance and file naming", async () => {
    const result = await detect("express-layered-clean");
    const paths = result?.evidence.map((e) => e.path) ?? [];
    expect(paths).toEqual(
      expect.arrayContaining([
        "src/controllers",
        "src/services",
        "src/repositories",
        "import-graph",
        "file-names",
      ]),
    );
    expect(result?.evidence.find((e) => e.path === "import-graph")?.detail).toBe(
      "16/16 cross-boundary imports follow the dependency rules",
    );
  });

  it("keeps ranked alternatives when more than one style has markers", async () => {
    const result = await detect("ambiguous-mixed");
    expect(result?.scores.map((s) => s.style)).toEqual(
      expect.arrayContaining(["layered", "feature"]),
    );
  });

  it("never reports certainty: custom confidence is capped", async () => {
    const snapshot = createSnapshot({
      "src/a/x.ts": "export const x = 1;",
      "src/b/y.ts": "export const y = 1;",
    });
    const result = detectArchitecture(snapshot, manifests);
    expect(result?.style).toBe("custom");
    expect(result?.confidence).toBeLessThanOrEqual(0.95);
    expect(result?.evidence[0]?.detail).toBe("no known architecture markers found");
  });
});

describe("source roots and aliases", () => {
  it("prefers src, then app/lib/server with enough files", () => {
    expect(detectSourceRoot(createSnapshot({ "src/a.ts": "", "app/b.ts": "" }))).toBe("src");
    expect(
      detectSourceRoot(createSnapshot({ "app/a.ts": "", "app/b.ts": "", "app/c.ts": "" })),
    ).toBe("app");
    expect(detectSourceRoot(createSnapshot({ "app/a.ts": "" }))).toBeUndefined();
  });

  it("detects an architecture under a non-src root by remapping paths", () => {
    const files: Record<string, string> = {};
    for (const layer of ["controllers", "services", "repositories"]) {
      files[`server/${layer}/a.${layer.slice(0, -1)}.ts`] = "export const a = 1;";
    }
    files["server/controllers/b.controller.ts"] = 'import { a } from "../services/a.service";';
    files["server/extra/one.ts"] = "";
    files["server/extra/two.ts"] = "";
    const result = detectArchitecture(createSnapshot(files), manifests);
    expect(result?.sourceRoot).toBe("server");
    expect(result?.style).toBe("layered");
    expect(result?.evidence.map((e) => e.path)).toContain("server/controllers");
  });

  it("reads tsconfig path aliases and remaps them", () => {
    const snapshot = createSnapshot({
      "tsconfig.json":
        '{ "compilerOptions": { "paths": { "@/*": ["./src/*"], "~lib/*": ["./lib/*"] } } }',
    });
    expect(readAliases(snapshot, "src")).toEqual({ "@/": "src/", "~lib/": "lib/" });
    expect(toSrcPath("app/x.ts", "app")).toBe("src/x.ts");
  });

  it("uses aliases when scoring conformance", () => {
    const files = {
      "tsconfig.json": '{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
      "src/domain/a.ts": 'import { r } from "@/infrastructure/r";',
      "src/infrastructure/r.ts": "export const r = 1;",
      "src/application/u.ts": "export const u = 1;",
      "src/presentation/p.ts": "export const p = 1;",
    };
    const result = detectArchitecture(createSnapshot(files), manifests);
    expect(result?.best?.violations).toBe(1);
  });
});

describe("marker alternatives", () => {
  const featureRepo = (container: string) =>
    createSnapshot({
      [`src/${container}/users/users.service.ts`]: "export const a = 1;",
      [`src/${container}/orders/orders.service.ts`]: 'import { a } from "../users";',
      [`src/${container}/users/index.ts`]: "export {};",
    });

  it.each(["modules", "features"])("treats src/%s/* as the same feature marker", (container) => {
    const result = detectArchitecture(featureRepo(container), manifests);
    expect(result?.best?.style).toBe("feature");
    expect(result?.best?.vocabulary).toBe(1);
  });
});

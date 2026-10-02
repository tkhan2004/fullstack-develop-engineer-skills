import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { formatIssues } from "./format.js";
import { mergeLayers, resolveLayers } from "./layers.js";
import { parseConfig } from "./parse.js";
import { listPresets, loadPreset } from "./presets.js";
import { suggest } from "./suggest.js";

const presetsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "presets");

describe("mergeLayers", () => {
  it("merges objects deeply and lets later layers win", () => {
    expect(mergeLayers({ a: { b: 1, c: 2 } }, { a: { b: 9 } })).toEqual({ a: { b: 9, c: 2 } });
  });

  it("replaces arrays instead of concatenating", () => {
    expect(mergeLayers({ list: [1, 2] }, { list: [3] })).toEqual({ list: [3] });
  });

  it("ignores undefined layers and values, and does not mutate inputs", () => {
    const base = { a: { b: 1 } };
    const merged = mergeLayers(base, undefined, { a: { b: undefined } });
    expect(merged).toEqual({ a: { b: 1 } });
    (merged["a"] as { b: number }).b = 5;
    expect(base.a.b).toBe(1);
  });
});

describe("resolveLayers precedence", () => {
  const preset = {
    stack: { language: "typescript", backend: { framework: "express" } },
    architecture: { backend: { style: "layered", source: "selected" } },
  };

  it("flags > file > profile > preset", () => {
    const merged = resolveLayers({
      preset,
      profile: { stack: { backend: { framework: "fastify" } } },
      file: { project: { mode: "new" }, stack: { backend: { framework: "nestjs" } } },
      flags: { stack: { backend: { framework: "express" } } },
    });
    expect((merged["stack"] as any).backend.framework).toBe("express"); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  it("the user's file wins over a preset", () => {
    const merged = resolveLayers({
      preset,
      file: { project: { mode: "new" }, architecture: { backend: { style: "clean" } } },
    });
    expect((merged["architecture"] as any).backend.style).toBe("clean"); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  it("new projects default to standard strictness", () => {
    const merged = resolveLayers({ preset, file: { project: { mode: "new" } } });
    expect((merged["architecture"] as any).backend.strictness).toBe("standard"); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  it("existing projects default to adopt + observe", () => {
    const merged = resolveLayers({
      preset: {
        stack: { language: "typescript" },
        architecture: { backend: { style: "layered", source: "detected", confidence: 0.9 } },
      },
      file: { project: { mode: "existing" } },
    });
    expect(merged["adoption"]).toEqual({ strategy: "adopt" });
    expect((merged["architecture"] as any).backend.strictness).toBe("observe"); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(parseConfig(merged).ok).toBe(true);
  });

  it("existing + recommend defaults to standard", () => {
    const merged = resolveLayers({
      file: {
        project: { mode: "existing" },
        adoption: { strategy: "recommend" },
        architecture: { backend: { style: "layered", source: "confirmed", confidence: 0.7 } },
      },
    });
    expect((merged["architecture"] as any).backend.strictness).toBe("standard"); // eslint-disable-line @typescript-eslint/no-explicit-any
  });
});

describe("presets", () => {
  it("ships pern-express, next-express and node-api", async () => {
    expect(await listPresets(presetsDir)).toEqual(["next-express", "node-api", "pern-express"]);
  });

  it.each(["pern-express", "next-express", "node-api"])(
    "%s resolves to a valid configuration",
    async (name) => {
      const preset = await loadPreset(presetsDir, name);
      if (!preset.ok) throw new Error(preset.error);
      const result = parseConfig(
        resolveLayers({ preset: preset.value, file: { project: { mode: "new" } } }),
      );
      expect(result.ok, result.ok ? "" : formatIssues(result.error, name)).toBe(true);
    },
  );

  it("suggests the closest preset", async () => {
    const result = await loadPreset(presetsDir, "pern-expres");
    if (result.ok) throw new Error("expected failure");
    expect(result.error).toContain("Did you mean: pern-express");
  });

  it("rejects path traversal in preset names", async () => {
    const result = await loadPreset(presetsDir, "../package");
    expect(result.ok).toBe(false);
  });
});

describe("suggest", () => {
  it("matches small typos and separator-extended names", () => {
    expect(suggest("layred", ["layered", "clean"])).toBe("layered");
    expect(suggest("clean-archtecture", ["layered", "clean", "feature-clean"])).toBe("clean");
  });

  it("prefers the longest matching prefix", () => {
    expect(suggest("feature-clean-x", ["feature", "feature-clean"])).toBe("feature-clean");
  });

  it("returns nothing when nothing is close", () => {
    expect(suggest("zzzzzzzz", ["layered", "clean"])).toBeUndefined();
  });
});

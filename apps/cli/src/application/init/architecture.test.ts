import { loadManifests, type ArchitectureManifest } from "@engineering-skills/architecture-engine";
import type { Profile } from "@engineering-skills/detection";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { ScriptedPrompter } from "../../test-support/scripted-prompter.js";
import {
  CLASSIFY_THRESHOLD,
  CONFIRM_THRESHOLD,
  decideExistingArchitecture,
} from "./architecture.js";
import type { InitOptions } from "./options.js";

let manifests: ArchitectureManifest[] = [];
beforeAll(async () => {
  const result = await loadManifests(join(process.cwd(), "architectures"));
  if (!result.ok) throw new Error("manifests");
  manifests = result.value;
});

const options = (extra: Partial<InitOptions> = {}): InitOptions => ({
  cwd: "/p",
  out: ".engineering",
  yes: false,
  dryRun: false,
  force: false,
  noStructure: false,
  ...extra,
});

function profile(
  value: string | undefined,
  confidence = 0.9,
  alternatives: { value: string; confidence: number }[] = [],
): Profile {
  return {
    version: 1,
    generated: { at: "x", by: "y", files_scanned: 1, duration_ms: 0 },
    project: { mode: "existing", root: ".", source_roots: ["src"] },
    stack: {},
    ...(value
      ? {
          architecture: {
            backend: {
              value,
              confidence,
              evidence: [{ path: "src", detail: "d", weight: 0.5 }],
              ...(alternatives.length ? { alternatives } : {}),
              structure: { root: "src", directories: [{ path: "src/a", files: 1 }] },
            },
          },
        }
      : {}),
    conventions: { naming: {}, tests: {} },
    reference_modules: [],
    observations: [],
    maturity: {
      architecture: "detected",
      conventions: "detected",
      testing: "missing",
      security: "missing",
      documentation: "missing",
      observability: "missing",
    },
    gaps: [],
  };
}

const decide = (p: Profile, o: InitOptions, prompter?: ScriptedPrompter) =>
  decideExistingArchitecture({ profile: p, options: o, prompter, manifests });

describe("thresholds are the documented ones", () => {
  it("0.85 confirms and 0.60 classifies", () => {
    expect(CONFIRM_THRESHOLD).toBe(0.85);
    expect(CLASSIFY_THRESHOLD).toBe(0.6);
  });
});

describe("confidence bands (interactive)", () => {
  it("exactly 0.85 is a one-key confirm", async () => {
    const prompter = new ScriptedPrompter({ "architecture-accept": true });
    expect(await decide(profile("layered", 0.85), options(), prompter)).toEqual({
      ok: true,
      decision: { style: "layered", source: "detected", confidence: 0.85 },
    });
    expect(prompter.asked).toEqual(["architecture-accept"]);
  });

  it("just below 0.85 requires a choice and records the pick as confirmed", async () => {
    const prompter = new ScriptedPrompter({ "architecture-choose": "feature" });
    const result = await decide(
      profile("layered", 0.84, [{ value: "feature", confidence: 0.4 }]),
      options(),
      prompter,
    );
    expect(result).toEqual({
      ok: true,
      decision: { style: "feature", source: "confirmed", confidence: 0.4 },
    });
    expect(prompter.options.get("architecture-choose")?.map((o) => o.value)).toEqual([
      "layered",
      "feature",
      "custom",
    ]);
  });

  it("exactly 0.60 still classifies; just below is unclear", async () => {
    expect(
      (
        await decide(
          profile("layered", 0.6),
          options(),
          new ScriptedPrompter({ "architecture-choose": "layered" }),
        )
      ).ok,
    ).toBe(true);
    const prompter = new ScriptedPrompter({ "architecture-unclear": "keep" });
    const result = await decide(profile("layered", 0.59), options(), prompter);
    expect(prompter.asked).toEqual(["architecture-unclear"]);
    expect(result).toMatchObject({
      ok: true,
      decision: { style: "custom", source: "detected", confidence: 0.59 },
    });
  });

  it("a custom detection is unclear by definition", async () => {
    const prompter = new ScriptedPrompter({ "architecture-unclear": "analyze" });
    expect(await decide(profile("custom", 0.9), options(), prompter)).toMatchObject({
      ok: true,
      decision: { style: "custom" },
    });
  });

  it("the unclear branch can hand over to a manual choice", async () => {
    const prompter = new ScriptedPrompter({
      "architecture-unclear": "manual",
      "architecture-manual": "clean",
    });
    expect(await decide(profile("custom", 0.9), options(), prompter)).toEqual({
      ok: true,
      decision: { style: "clean", source: "manual" },
    });
  });

  it("declining a confident detection asks which style it is", async () => {
    const prompter = new ScriptedPrompter({
      "architecture-accept": false,
      "architecture-manual": "feature",
    });
    expect(await decide(profile("layered", 0.95), options(), prompter)).toEqual({
      ok: true,
      decision: { style: "feature", source: "manual" },
    });
  });

  it("no detection at all asks for a manual choice", async () => {
    const prompter = new ScriptedPrompter({ "architecture-manual": "custom" });
    expect(await decide(profile(undefined), options(), prompter)).toMatchObject({
      ok: true,
      decision: { style: "custom", source: "manual" },
    });
  });
});

describe("--yes never guesses", () => {
  it("accepts a confident detection", async () => {
    expect(await decide(profile("clean", 0.9), options({ yes: true }))).toEqual({
      ok: true,
      decision: { style: "clean", source: "detected", confidence: 0.9 },
    });
  });

  it.each([
    ["likely", profile("layered", 0.84)],
    ["unclear", profile("layered", 0.5)],
    ["custom", profile("custom", 0.9)],
    ["undetected", profile(undefined)],
  ])("refuses a %s detection with exit 3 and the explicit alternatives", async (_name, p) => {
    const result = await decide(p, options({ yes: true }));
    expect(result).toMatchObject({ ok: false, code: 3 });
    if (result.ok) return;
    expect(result.message).toContain("--architecture <");
    expect(result.message).toContain("--architecture custom");
  });
});

describe("explicit --architecture", () => {
  it("wins over detection; matching detection is recorded as confirmed with its confidence", async () => {
    expect(
      await decide(profile("layered", 0.7), options({ yes: true, architecture: "layered" })),
    ).toEqual({ ok: true, decision: { style: "layered", source: "confirmed", confidence: 0.7 } });
    expect(
      await decide(profile("layered", 0.7), options({ yes: true, architecture: "clean" })),
    ).toEqual({ ok: true, decision: { style: "clean", source: "manual" } });
  });

  it("custom builds the description from the profile", async () => {
    const result = await decide(
      profile("layered", 0.7),
      options({ yes: true, architecture: "custom" }),
    );
    expect(result).toMatchObject({
      ok: true,
      decision: { style: "custom", source: "manual", custom: { root: "src" } },
    });
  });

  it("rejects an unknown style with exit 2", async () => {
    expect(
      await decide(profile("layered"), options({ yes: true, architecture: "onion" })),
    ).toMatchObject({ ok: false, code: 2 });
  });
});

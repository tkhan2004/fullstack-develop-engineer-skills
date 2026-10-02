import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadManifests } from "./loader.js";
import { parseManifest, type ArchitectureManifest } from "./manifest.js";
import { validateManifest } from "./validate.js";

const architecturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "architectures",
);

const BASE = `
name: demo
version: 1
title: Demo
description: A demo.
targets: [backend]
layers:
  - { id: domain, description: d }
  - { id: application, description: a }
dependency_rules:
  scope: global
  domain: { may_import: [] }
  application: { may_import: [domain] }
structure:
  root: src
  directories: [src/domain, src/application]
trade_offs:
  benefits: [b]
  costs: [c]
`;

const parsed = (yaml: string): ArchitectureManifest => {
  const result = parseManifest(yaml, "demo.yaml");
  if (!result.ok) throw new Error(result.error.join("\n"));
  return result.value;
};
const problems = (yaml: string, options = {}) => validateManifest(parsed(yaml), options);

describe("shipped architectures", () => {
  it("ships layered, feature, clean and feature-clean, all valid", async () => {
    const result = await loadManifests(architecturesDir);
    if (!result.ok) throw new Error(result.error.join("\n"));
    expect(result.value.map((m) => m.name)).toEqual([
      "clean",
      "feature",
      "feature-clean",
      "layered",
    ]);
  });

  it("states costs as clearly as benefits", async () => {
    const result = await loadManifests(architecturesDir);
    if (!result.ok) throw new Error("invalid");
    for (const m of result.value) {
      expect(m.trade_offs.benefits.length, m.name).toBeGreaterThan(0);
      expect(m.trade_offs.costs.length, m.name).toBeGreaterThan(0);
    }
  });

  it("encodes the clean dependency rule from the architecture catalog", async () => {
    const result = await loadManifests(architecturesDir);
    if (!result.ok) throw new Error("invalid");
    const clean = result.value.find((m) => m.name === "clean");
    expect(clean?.mayImport).toEqual({
      domain: [],
      application: ["domain"],
      presentation: ["application"],
      infrastructure: ["application", "domain"],
    });
  });

  it("applies the same rules per module in feature-clean", async () => {
    const result = await loadManifests(architecturesDir);
    if (!result.ok) throw new Error("invalid");
    const featureClean = result.value.find((m) => m.name === "feature-clean");
    expect(featureClean?.dependency_rules.scope).toBe("module");
    expect(featureClean?.dependency_rules.cross_module?.allowed).toBe(false);
  });
});

describe("parseManifest", () => {
  it("normalises layer rules out of dependency_rules", () => {
    const m = parsed(BASE);
    expect(m.mayImport).toEqual({ domain: [], application: ["domain"] });
    expect(m.dependency_rules.scope).toBe("global");
    expect(m.strictness.strict.block).toBe(true);
  });

  it("rejects a malformed layer rule", () => {
    const result = parseManifest(
      BASE.replace("domain: { may_import: [] }", "domain: []"),
      "x.yaml",
    );
    if (result.ok) throw new Error("expected failure");
    expect(result.error[0]).toContain("dependency_rules.domain");
  });

  it("rejects one-sided trade-offs", () => {
    const result = parseManifest(BASE.replace("costs: [c]", "costs: []"), "x.yaml");
    if (result.ok) throw new Error("expected failure");
    expect(result.error.join("\n")).toContain("costs must not be empty");
  });

  it("rejects unknown top-level keys and bad YAML", () => {
    expect(parseManifest(`${BASE}\nextra: 1`, "x.yaml").ok).toBe(false);
    expect(parseManifest("name: [unclosed", "x.yaml").ok).toBe(false);
  });
});

describe("validateManifest", () => {
  it("accepts a consistent manifest", () => {
    expect(problems(BASE)).toEqual([]);
  });

  it("requires the name to match the directory", () => {
    expect(problems(BASE, { expectedName: "other" })[0]).toContain(
      'must match its directory ("other")',
    );
  });

  it("rejects rules for undeclared layers and imports of unknown layers", () => {
    const found = problems(
      BASE.replace(
        "domain: { may_import: [] }",
        "domain: { may_import: [ghost] }\n  extra: { may_import: [] }",
      ),
    );
    expect(found.some((p) => p.includes('unknown layer "ghost"'))).toBe(true);
    expect(found.some((p) => p.includes("dependency_rules.extra is not a declared layer"))).toBe(
      true,
    );
  });

  it("requires every layer to have a rule", () => {
    expect(problems(BASE.replace("  application: { may_import: [domain] }\n", ""))[0]).toContain(
      'layer "application" has no dependency rule',
    );
  });

  it("detects cycles between layers", () => {
    const found = problems(
      BASE.replace("domain: { may_import: [] }", "domain: { may_import: [application] }"),
    );
    expect(
      found.some(
        (p) =>
          p.includes("cycle: application → domain → application") ||
          p.includes("cycle: domain → application → domain"),
      ),
    ).toBe(true);
  });

  it("rejects self-import", () => {
    expect(
      problems(BASE.replace("domain: { may_import: [] }", "domain: { may_import: [domain] }")).some(
        (p) => p.includes("lists itself"),
      ),
    ).toBe(true);
  });

  it("requires the structure to cover every layer", () => {
    expect(problems(BASE.replace("[src/domain, src/application]", "[src/domain]"))[0]).toContain(
      'does not cover layer "application" (expected "src/application")',
    );
  });

  it("requires structure.module and cross_module for module scope", () => {
    const found = problems(BASE.replace("scope: global", "scope: module"));
    expect(found.some((p) => p.includes("requires structure.module"))).toBe(true);
    expect(found.some((p) => p.includes("requires dependency_rules.cross_module"))).toBe(true);
  });

  it("rejects forbidden_imports for unknown layers", () => {
    const withForbidden = `${BASE}forbidden_imports:\n  ghost: { external: [express], reason: r }\n`;
    expect(problems(withForbidden)[0]).toContain("forbidden_imports.ghost is not a declared layer");
  });

  it("checks skills exist when a skill list is given", () => {
    const withSkills = `${BASE}skills: [architecture/missing]\n`;
    expect(problems(withSkills, { knownSkillIds: new Set(["architecture/other"]) })[0]).toContain(
      'unknown skill "architecture/missing"',
    );
    expect(problems(withSkills)).toEqual([]);
  });

  it("supports a hexagonal-style layout with nested paths (format is not clean-specific)", () => {
    const hexagonal = `
name: hexagonal
version: 1
title: Hexagonal
description: Ports and adapters.
targets: [backend]
layers:
  - { id: domain, description: d }
  - { id: application, description: a }
  - { id: ports, description: p }
  - { id: adapters, description: ad }
dependency_rules:
  scope: global
  domain: { may_import: [] }
  application: { may_import: [domain, ports] }
  ports: { may_import: [domain] }
  adapters: { may_import: [application, ports, domain] }
structure:
  root: src
  directories: [src/domain, src/application, src/ports, src/ports/inbound, src/ports/outbound, src/adapters]
trade_offs: { benefits: [b], costs: [c] }
`;
    expect(problems(hexagonal)).toEqual([]);
  });
});

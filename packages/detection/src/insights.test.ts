import { loadManifests, type ArchitectureManifest } from "@engineering-skills/architecture-engine";
import { beforeAll, describe, expect, it } from "vitest";
import { detectArchitecture } from "./architecture.js";
import { detectConventions } from "./conventions.js";
import { ARCHITECTURES_DIR, fixturePath } from "./fixtures.js";
import { assessMaturity } from "./maturity.js";
import { suggestProjectMode } from "./mode.js";
import { detectObservations } from "./observations.js";
import { selectReferenceModules } from "./reference.js";
import { scanDirectory } from "./scan.js";
import { createSnapshot } from "./snapshot.js";
import { detectStack } from "./stack.js";

let manifests: ArchitectureManifest[] = [];
beforeAll(async () => {
  const result = await loadManifests(ARCHITECTURES_DIR);
  if (!result.ok) throw new Error(result.error.join("\n"));
  manifests = result.value;
});

const analyse = async (fixture: string) => {
  const snapshot = await scanDirectory(fixturePath(fixture));
  const architecture = detectArchitecture(snapshot, manifests);
  const stack = detectStack(snapshot);
  const conventions = detectConventions(snapshot);
  return { snapshot, architecture, stack, conventions };
};

describe("observations", () => {
  it("a conforming repository has none", async () => {
    const { snapshot, architecture } = await analyse("express-layered-clean");
    expect(detectObservations(snapshot, architecture)).toEqual([]);
  });

  it("express-layered-violations reports each pattern with counts and locations", async () => {
    const { snapshot, architecture } = await analyse("express-layered-violations");
    const byId = Object.fromEntries(
      detectObservations(snapshot, architecture).map((o) => [o.id, o]),
    );

    expect(byId["logic-in-controller"]).toMatchObject({ severity: "info", count: 1 });
    expect(byId["logic-in-controller"]?.locations[0]).toMatch(
      /^src\/controllers\/order\.controller\.ts:\d+$/,
    );
    expect(byId["orm-outside-data-layer"]?.count).toBe(2);
    expect(byId["orm-outside-data-layer"]?.locations).toEqual([
      "src/controllers/order.controller.ts:2",
      "src/services/billing.service.ts:1",
    ]);
    expect(byId["dependency-rule-violations"]?.count).toBeGreaterThan(0);
    expect(
      byId["framework-leakage"]?.locations.some((l) =>
        l.startsWith("src/services/billing.service.ts"),
      ),
    ).toBe(true);
  });

  it("uses neutral wording", async () => {
    const { snapshot, architecture } = await analyse("express-layered-violations");
    for (const o of detectObservations(snapshot, architecture)) {
      expect(o.detail).not.toMatch(/\b(bad|wrong|terrible|messy|poor|smell)\b/i);
    }
  });

  it("makes no architectural claims when the structure is custom", async () => {
    const { snapshot, architecture } = await analyse("ambiguous-mixed");
    const ids = detectObservations(snapshot, architecture).map((o) => o.id);
    expect(ids).not.toContain("dependency-rule-violations");
  });

  it("does not flag the ORM in infrastructure code or repositories", () => {
    const snapshot = createSnapshot({
      "src/infrastructure/prisma.service.ts": 'import { PrismaClient } from "@prisma/client";',
      "src/users/users.repository.ts": 'import { PrismaClient } from "@prisma/client";',
      "src/users/users.service.ts": 'import { PrismaClient } from "@prisma/client";',
    });
    expect(detectObservations(snapshot)[0]?.locations).toEqual(["src/users/users.service.ts:1"]);
  });

  it("caps locations at ten", () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 15; i++)
      files[`src/services/s${i}.service.ts`] = 'import { PrismaClient } from "@prisma/client";';
    const [obs] = detectObservations(createSnapshot(files));
    expect(obs?.count).toBe(15);
    expect(obs?.locations).toHaveLength(10);
  });
});

describe("reference modules", () => {
  it("picks one tested, conforming example per concern", async () => {
    const { snapshot, architecture } = await analyse("express-layered-clean");
    const refs = selectReferenceModules(
      snapshot,
      new Set(architecture?.findings.map((f) => f.file)),
    );
    expect(refs.map((r) => r.concern)).toEqual(["controller", "repository", "service", "test"]);
    const service = refs.find((r) => r.concern === "service");
    expect(service?.path).toBe("src/services/order.service.ts");
    expect(service?.reason).toContain("has a colocated test");
  });

  it("never offers a file that violates the rules, even if that leaves a concern without an example", async () => {
    const { snapshot, architecture } = await analyse("express-layered-violations");
    const violating = new Set(architecture?.findings.map((f) => f.file));
    const refs = Object.fromEntries(
      selectReferenceModules(snapshot, violating).map((r) => [r.concern, r]),
    );

    // billing.service.ts and user.repository.ts violate the rules; cleaner siblings exist.
    expect(violating.has(refs["service"]?.path as string)).toBe(false);
    expect(violating.has(refs["repository"]?.path as string)).toBe(false);
    // Both controllers violate, so there is no safe example to imitate.
    expect(refs["controller"]).toBeUndefined();
    for (const ref of Object.values(refs)) expect(violating.has(ref.path)).toBe(false);
  });

  it("is deterministic and offers nothing for an empty repository", async () => {
    const { snapshot } = await analyse("clean-strict");
    expect(selectReferenceModules(snapshot)).toEqual(selectReferenceModules(snapshot));
    expect(selectReferenceModules(createSnapshot({}))).toEqual([]);
  });
});

describe("maturity and gaps", () => {
  const assess = async (fixture: string) => {
    const a = await analyse(fixture);
    return assessMaturity(a.snapshot, a);
  };

  it("express-layered-clean: architecture and conventions detected, unit tests only", async () => {
    const { maturity, gaps } = await assess("express-layered-clean");
    expect(maturity).toMatchObject({
      architecture: "detected",
      conventions: "detected",
      testing: "partial",
      security: "partial",
      documentation: "partial",
      observability: "missing",
    });
    expect(gaps).toEqual([
      { area: "testing", detail: "No integration or end-to-end tests detected" },
    ]);
  });

  it("an ambiguous architecture is partial, not missing", async () => {
    expect((await assess("ambiguous-mixed")).maturity.architecture).toBe("partial");
  });

  it("flags absent tests, validation and README", () => {
    const snapshot = createSnapshot({
      "package.json": '{"dependencies":{"express":"4"}}',
      "src/app.ts": "const app = express();",
    });
    const stack = detectStack(snapshot);
    const { maturity, gaps } = assessMaturity(snapshot, {
      stack,
      architecture: undefined,
      conventions: detectConventions(snapshot),
    });
    expect(maturity).toMatchObject({
      architecture: "missing",
      testing: "missing",
      security: "missing",
      documentation: "missing",
    });
    expect(gaps.map((g) => g.area)).toEqual(["documentation", "security", "testing"]);
  });

  it("recognises integration tests via supertest", () => {
    const snapshot = createSnapshot({
      "package.json": '{"dependencies":{"express":"4"},"devDependencies":{"supertest":"7"}}',
      "src/a.test.ts": "it('x', () => {});",
    });
    const stack = detectStack(snapshot);
    expect(
      assessMaturity(snapshot, {
        stack,
        architecture: undefined,
        conventions: detectConventions(snapshot),
      }).maturity.testing,
    ).toBe("detected");
  });
});

describe("suggestProjectMode", () => {
  it("suggests new for an empty directory and existing otherwise", async () => {
    expect(suggestProjectMode(await scanDirectory(fixturePath("empty")))).toMatchObject({
      mode: "new",
    });
    expect(
      suggestProjectMode(await scanDirectory(fixturePath("express-layered-clean"))),
    ).toMatchObject({ mode: "existing", reason: "package.json present" });
    expect(suggestProjectMode(await scanDirectory(fixturePath("js-no-types"))).mode).toBe(
      "existing",
    );
  });

  it("treats a handful of unrelated files as existing once there is source", () => {
    expect(suggestProjectMode(createSnapshot({ "README.md": "", "src/a.ts": "" })).mode).toBe(
      "existing",
    );
    expect(suggestProjectMode(createSnapshot({})).mode).toBe("new");
  });
});

import { describe, expect, it } from "vitest";
import { detectConventions, sample, styleOf } from "./conventions.js";
import { fixturePath } from "./fixtures.js";
import { scanDirectory } from "./scan.js";
import { createSnapshot } from "./snapshot.js";

const conventionsOf = async (fixture: string) =>
  detectConventions(await scanDirectory(fixturePath(fixture)));

describe("styleOf", () => {
  it.each([
    ["getUser", "camelCase"],
    ["UserService", "PascalCase"],
    ["user_name", "snake_case"],
    ["user-name", "kebab-case"],
    ["_privateName", "camelCase"],
    ["_", undefined],
    ["user", undefined],
    ["MAX_RETRIES", undefined],
    ["x", undefined],
  ])("%s → %s", (name, style) => {
    expect(styleOf(name)).toBe(style);
  });
});

describe("conventions on a consistent repository", () => {
  it("express-layered-clean", async () => {
    const c = await conventionsOf("express-layered-clean");
    expect(c.naming.variables).toMatchObject({ value: "camelCase", consistent: true });
    expect(c.naming.files).toMatchObject({ value: "kebab-case", consistent: true });
    expect(c.naming.classes).toMatchObject({ value: "PascalCase", ratio: 1 });
    expect(c.tests.placement).toMatchObject({ value: "colocated", ratio: 1 });
    expect(c.tests.naming?.value).toBe("*.test.*");
    expect(c.errors).toMatchObject({ value: "custom-error-class", ratio: 1 });
    expect(c.errors?.detail).toBe("AppError in src/utils/app-error.ts");
    expect(c.validation).toMatchObject({
      value: "zod",
      ratio: 1,
      detail: "used in 2/2 validator/schema files",
    });
    expect(c.imports).toMatchObject({ value: "relative", ratio: 1, aliases: [] });
    expect(c.exports?.value).toBe("named");
    expect(c.async?.value).toBe("async-await");
  });

  it("nest-feature uses *.spec.* tests, class-validator and framework-style structure", async () => {
    const c = await conventionsOf("nest-feature");
    expect(c.tests.naming?.value).toBe("*.spec.*");
    expect(c.validation).toMatchObject({ value: "class-validator", ratio: 1 });
  });

  it("every convention reports a sample size and a ratio in [0, 1]", async () => {
    const c = await conventionsOf("clean-strict");
    for (const conv of [
      c.naming.variables,
      c.naming.files,
      c.naming.classes,
      c.tests.placement,
      c.errors,
      c.imports,
      c.exports,
      c.async,
    ]) {
      if (!conv) continue;
      expect(conv.sampleSize).toBeGreaterThan(0);
      expect(conv.ratio).toBeGreaterThan(0);
      expect(conv.ratio).toBeLessThanOrEqual(1);
    }
  });
});

describe("inconsistent conventions", () => {
  it("flags a coin-flip as inconsistent instead of calling it a convention", () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 5; i++) files[`src/kebab-file-${i}.ts`] = "export const a = 1;";
    for (let i = 0; i < 4; i++) files[`src/camelFile${i}.ts`] = "export const a = 1;";
    const c = detectConventions(createSnapshot(files));
    expect(c.naming.files).toMatchObject({ value: "kebab-case", consistent: false });
    expect(c.naming.files?.ratio).toBeLessThan(0.65);
  });

  it("reports mixed test placement", () => {
    const c = detectConventions(
      createSnapshot({
        "src/a.test.ts": "",
        "src/b.test.ts": "",
        "tests/c.ts": "",
        "tests/d.ts": "",
        "src/__tests__/e.ts": "",
      }),
    );
    expect(c.tests.placement?.consistent).toBe(false);
  });
});

describe("individual detectors", () => {
  it("separates custom, built-in and framework errors", () => {
    const text = (body: string) => createSnapshot({ "src/a.ts": body });
    expect(
      detectConventions(
        text(
          "class AppError extends Error {}\nthrow new AppError('x');\nthrow new AppError('y');\nthrow new Error('z');",
        ),
      ).errors,
    ).toMatchObject({ value: "custom-error-class", ratio: 0.67 });
    expect(
      detectConventions(text("throw new Error('x');\nthrow new TypeError('y');")).errors?.value,
    ).toBe("built-in-errors");
    expect(detectConventions(text("throw new NotFoundException();")).errors?.value).toBe(
      "framework-exceptions",
    );
    expect(detectConventions(text("export const a = 1;")).errors).toBeUndefined();
  });

  it("detects path aliases and the alias import style", () => {
    const snapshot = createSnapshot({
      "tsconfig.json": '{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
      "src/a.ts": 'import { b } from "@/b";\nimport { c } from "@/c";\nimport { d } from "./d";',
    });
    expect(detectConventions(snapshot).imports).toMatchObject({
      value: "alias",
      ratio: 0.67,
      aliases: ["@/"],
    });
  });

  it("does not report a validation library that is installed but unused", () => {
    const snapshot = createSnapshot({
      "package.json": '{"dependencies":{"zod":"^3"}}',
      "src/a.controller.ts": "export const a = 1;",
    });
    expect(detectConventions(snapshot).validation).toBeUndefined();
  });

  it("counts default versus named exports and promise chains", () => {
    const snapshot = createSnapshot({
      "src/a.ts": "export default function a() {}\nexport default 1;\nfetch('x').then(f).then(g);",
    });
    const c = detectConventions(snapshot);
    expect(c.exports?.value).toBe("default");
    expect(c.async?.value).toBe("promise-chains");
  });

  it("returns an empty result for a repository without source", () => {
    expect(detectConventions(createSnapshot({ "README.md": "# x" }))).toEqual({
      naming: {},
      tests: {},
    });
  });
});

describe("sample", () => {
  it("is deterministic, evenly spaced and bounded", () => {
    const items = Array.from({ length: 1000 }, (_, i) => i);
    const picked = sample(items, 10);
    expect(picked).toEqual([0, 100, 200, 300, 400, 500, 600, 700, 800, 900]);
    expect(sample([1, 2, 3], 10)).toEqual([1, 2, 3]);
  });
});

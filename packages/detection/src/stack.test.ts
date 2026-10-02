import { describe, expect, it } from "vitest";
import { fixturePath } from "./fixtures.js";
import { scanDirectory } from "./scan.js";
import { createSnapshot } from "./snapshot.js";
import { detectStack, readPackage } from "./stack.js";

const stackOf = async (fixture: string) => detectStack(await scanDirectory(fixturePath(fixture)));
const values = (s: Awaited<ReturnType<typeof stackOf>>) => ({
  language: s.language?.value,
  packageManager: s.packageManager?.value,
  runtime: s.runtime?.value,
  backend: s.backendFramework?.value,
  frontend: s.frontendFramework?.value,
  engine: s.databaseEngine?.value,
  orm: s.orm?.value,
  tests: s.testFramework?.value,
});

describe("stack detection on fixtures", () => {
  it("express-layered-clean", async () => {
    expect(values(await stackOf("express-layered-clean"))).toEqual({
      language: "typescript",
      runtime: "node",
      backend: "express",
      engine: "postgresql",
      orm: "prisma",
      tests: "vitest",
    });
  });

  it("nest-feature prefers NestJS and tests with Jest", async () => {
    const stack = await stackOf("nest-feature");
    expect(stack.backendFramework?.value).toBe("nestjs");
    expect(stack.testFramework?.value).toBe("jest");
    expect(stack.backendFramework?.evidence.map((e) => e.detail)).toContain(
      "bootstraps with NestFactory",
    );
  });

  it("js-no-types is JavaScript with Express and no ORM", async () => {
    const stack = await stackOf("js-no-types");
    expect(stack.language?.value).toBe("javascript");
    expect(stack.backendFramework?.value).toBe("express");
    expect(stack.orm).toBeUndefined();
    expect(stack.databaseEngine).toBeUndefined();
    expect(stack.testFramework?.value).toBe("jest");
  });

  it("an empty repository yields no claims at all", async () => {
    expect(await stackOf("empty")).toEqual({});
  });

  it("every claim carries evidence and a confidence in (0, 1)", async () => {
    for (const name of ["express-layered-clean", "nest-feature", "clean-strict", "feature-clean"]) {
      for (const c of Object.values(await stackOf(name))) {
        expect(c.evidence.length, name).toBeGreaterThan(0);
        expect(c.confidence).toBeGreaterThan(0);
        expect(c.confidence).toBeLessThan(1);
      }
    }
  });

  it("records strict mode in the TypeScript evidence", async () => {
    const language = (await stackOf("express-layered-clean")).language;
    expect(language?.evidence.find((e) => e.path === "tsconfig.json")?.detail).toBe("strict: true");
    expect(language?.confidence).toBeGreaterThanOrEqual(0.95);
  });
});

describe("stack detection rules", () => {
  const pkg = (deps: Record<string, string>, extra: Record<string, unknown> = {}) =>
    JSON.stringify({ name: "x", dependencies: deps, ...extra });

  it("reads the database engine from the Prisma datasource provider over a dependency", () => {
    const snapshot = createSnapshot({
      "package.json": pkg({ mysql2: "^3" }),
      "prisma/schema.prisma": 'datasource db {\n  provider = "postgresql"\n  url = env("X")\n}',
    });
    const engine = detectStack(snapshot).databaseEngine;
    expect(engine?.value).toBe("postgresql");
    expect(engine?.alternatives).toEqual([{ value: "mysql", confidence: 0.85 }]);
  });

  it("reinforces a claim when independent evidence agrees", () => {
    const snapshot = createSnapshot({
      "package.json": pkg({ pg: "^8" }),
      "docker-compose.yml": "services:\n  db:\n    image: postgres:16\n",
    });
    expect(detectStack(snapshot).databaseEngine?.confidence).toBeGreaterThan(0.95);
  });

  it("detects the package manager from the lockfile and the packageManager field", () => {
    expect(
      detectStack(createSnapshot({ "package.json": pkg({}), "pnpm-lock.yaml": "" })).packageManager
        ?.value,
    ).toBe("pnpm");
    expect(
      detectStack(createSnapshot({ "package.json": pkg({}, { packageManager: "yarn@4.0.0" }) }))
        .packageManager?.value,
    ).toBe("yarn");
  });

  it("prefers Next.js over plain React", () => {
    const snapshot = createSnapshot({
      "package.json": pkg({ next: "14", react: "18" }),
      "next.config.js": "",
    });
    expect(detectStack(snapshot).frontendFramework?.value).toBe("nextjs");
    expect(
      detectStack(createSnapshot({ "package.json": pkg({ react: "18" }), "src/App.tsx": "" }))
        .frontendFramework?.value,
    ).toBe("react");
  });

  it("does not guess a framework from source alone", () => {
    expect(
      detectStack(createSnapshot({ "package.json": pkg({}), "src/app.ts": "const x = express();" }))
        .backendFramework,
    ).toBeUndefined();
  });

  it("falls back to loose JSON for tsconfig with comments", () => {
    const snapshot = createSnapshot({
      "tsconfig.json": '{ // c\n "compilerOptions": { "strict": true, }, }',
    });
    expect(detectStack(snapshot).language?.evidence[0]?.detail).toBe("strict: true");
  });

  it("survives a malformed package.json", () => {
    expect(readPackage(createSnapshot({ "package.json": "{ nope" })).dependencies).toEqual({});
  });
});

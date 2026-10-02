import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { checkDependencies, measureConformance, type Finding, type SourceFile } from "./check.js";
import { classify } from "./classify.js";
import { loadManifests } from "./loader.js";
import type { ArchitectureManifest } from "./manifest.js";

let manifests: Record<string, ArchitectureManifest> = {};

beforeAll(async () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "architectures");
  const result = await loadManifests(dir);
  if (!result.ok) throw new Error(result.error.join("\n"));
  manifests = Object.fromEntries(result.value.map((m) => [m.name, m]));
});

const repo = (files: Record<string, string>): SourceFile[] =>
  Object.entries(files).map(([path, source]) => ({ path, source }));

const summary = (findings: readonly Finding[]) =>
  findings.map((f) => `${f.rule} ${f.file}:${f.line} ${f.specifier}`);

describe("clean architecture", () => {
  const good = repo({
    "src/domain/entities/order.entity.ts": `import { Money } from "../value-objects/money";`,
    "src/domain/value-objects/money.ts": `export class Money {}`,
    "src/domain/repositories/order.repository.ts": `import type { Order } from "../entities/order.entity";`,
    "src/application/use-cases/place-order.use-case.ts": `import { Order } from "../../domain/entities/order.entity";\nimport type { OrderRepository } from "../../domain/repositories/order.repository";`,
    "src/infrastructure/repositories/prisma-order.repository.ts": `import { PrismaClient } from "@prisma/client";\nimport type { OrderRepository } from "../../domain/repositories/order.repository";\nimport { PlaceOrder } from "../../application/use-cases/place-order.use-case";`,
    "src/presentation/http/order.controller.ts": `import express from "express";\nimport { PlaceOrder } from "../../application/use-cases/place-order.use-case";`,
  });

  it("passes a conforming codebase at every strictness", () => {
    for (const strictness of ["observe", "minimal", "standard", "strict"] as const) {
      expect(
        checkDependencies(manifests["clean"] as ArchitectureManifest, good, { strictness }),
      ).toEqual([]);
    }
  });

  const bad = repo({
    "src/domain/entities/order.entity.ts": `import { PrismaClient } from "@prisma/client";\nimport { PlaceOrder } from "../../application/use-cases/place-order.use-case";`,
    "src/application/use-cases/place-order.use-case.ts": `import { PrismaOrderRepository } from "../../infrastructure/repositories/prisma-order.repository";\nimport express from "express";`,
    "src/infrastructure/repositories/prisma-order.repository.ts": `import { OrderController } from "../../presentation/http/order.controller";`,
    "src/presentation/http/order.controller.ts": `import { OrderRepository } from "../../domain/repositories/order.repository";`,
    "src/domain/repositories/order.repository.ts": `export interface OrderRepository {}`,
  });

  it("flags exactly the violations, with file and line", () => {
    const findings = checkDependencies(manifests["clean"] as ArchitectureManifest, bad, {
      strictness: "standard",
    });
    expect(summary(findings)).toEqual([
      "architecture/dependency-rule src/application/use-cases/place-order.use-case.ts:1 ../../infrastructure/repositories/prisma-order.repository",
      "architecture/framework-leakage src/application/use-cases/place-order.use-case.ts:2 express",
      "architecture/framework-leakage src/domain/entities/order.entity.ts:1 @prisma/client",
      "architecture/dependency-rule src/domain/entities/order.entity.ts:2 ../../application/use-cases/place-order.use-case",
      "architecture/dependency-rule src/infrastructure/repositories/prisma-order.repository.ts:1 ../../presentation/http/order.controller",
      "architecture/dependency-rule src/presentation/http/order.controller.ts:1 ../../domain/repositories/order.repository",
    ]);
  });

  it("explains the rule and a fix", () => {
    const [first] = checkDependencies(manifests["clean"] as ArchitectureManifest, bad, {
      strictness: "standard",
    });
    expect(first?.message).toBe(
      'Layer "application" may not import layer "infrastructure" (allowed: domain).',
    );
    expect(first?.fix).toContain("Invert the dependency");
  });

  it("is advisory at standard and blocking at strict; silent at minimal and observe", () => {
    const manifest = manifests["clean"] as ArchitectureManifest;
    expect(
      new Set(checkDependencies(manifest, bad, { strictness: "standard" }).map((f) => f.level)),
    ).toEqual(new Set(["warning"]));
    expect(
      new Set(checkDependencies(manifest, bad, { strictness: "strict" }).map((f) => f.level)),
    ).toEqual(new Set(["error"]));
    expect(checkDependencies(manifest, bad, { strictness: "minimal" })).toEqual([]);
    expect(checkDependencies(manifest, bad, { strictness: "observe" })).toEqual([]);
  });

  it("follows path aliases and ignores non-source files", () => {
    const files = repo({
      "src/domain/a.ts": `import { x } from "@/infrastructure/db";`,
      "src/infrastructure/db.ts": `export const x = 1;`,
      "src/domain/notes.md": `import x from "@/infrastructure/db"`,
    });
    const findings = checkDependencies(manifests["clean"] as ArchitectureManifest, files, {
      strictness: "strict",
      aliases: { "@/": "src/" },
    });
    expect(summary(findings)).toEqual([
      "architecture/dependency-rule src/domain/a.ts:1 @/infrastructure/db",
    ]);
  });

  it("does not guess about imports it cannot resolve", () => {
    const files = repo({ "src/domain/a.ts": `import x from "./missing";` });
    expect(
      checkDependencies(manifests["clean"] as ArchitectureManifest, files, {
        strictness: "strict",
      }),
    ).toEqual([]);
  });
});

describe("layered architecture", () => {
  const files = repo({
    "src/controllers/user.controller.ts": `import { UserRepository } from "../repositories/user.repository";\nimport { UserService } from "../services/user.service";`,
    "src/services/user.service.ts": `import { Router } from "express";\nimport { UserRepository } from "../repositories/user.repository";`,
    "src/repositories/user.repository.ts": `import { PrismaClient } from "@prisma/client";\nimport type { User } from "../models/user";`,
    "src/models/user.ts": `export interface User {}`,
  });

  it("catches a controller bypassing the service layer and a service importing HTTP", () => {
    const findings = checkDependencies(manifests["layered"] as ArchitectureManifest, files, {
      strictness: "standard",
    });
    expect(summary(findings)).toEqual([
      "architecture/dependency-rule src/controllers/user.controller.ts:1 ../repositories/user.repository",
      "architecture/framework-leakage src/services/user.service.ts:1 express",
    ]);
  });

  it("lets repositories use the ORM (that is their job)", () => {
    const findings = checkDependencies(manifests["layered"] as ArchitectureManifest, files, {
      strictness: "standard",
    });
    expect(findings.some((f) => f.file.includes("repositories"))).toBe(false);
  });
});

describe("feature-clean architecture", () => {
  it("applies layer rules inside each module", () => {
    const files = repo({
      "src/modules/users/domain/user.entity.ts": `import { X } from "../infrastructure/db";`,
      "src/modules/users/infrastructure/db.ts": `export const X = 1;`,
      "src/modules/users/application/get-user.use-case.ts": `import { User } from "../domain/user.entity";`,
    });
    const findings = checkDependencies(manifests["feature-clean"] as ArchitectureManifest, files, {
      strictness: "strict",
    });
    expect(summary(findings)).toEqual([
      "architecture/dependency-rule src/modules/users/domain/user.entity.ts:1 ../infrastructure/db",
    ]);
  });

  it("forbids reaching into another module's internals but allows its public API and shared code", () => {
    const files = repo({
      "src/modules/orders/application/place-order.use-case.ts": [
        `import { User } from "../../users/domain/user.entity";`,
        `import { UsersApi } from "../../users";`,
        `import { log } from "../../../shared/log";`,
      ].join("\n"),
      "src/modules/users/domain/user.entity.ts": `export class User {}`,
      "src/modules/users/index.ts": `export class UsersApi {}`,
      "src/shared/log.ts": `export const log = 1;`,
    });
    const findings = checkDependencies(manifests["feature-clean"] as ArchitectureManifest, files, {
      strictness: "standard",
    });
    expect(summary(findings)).toEqual([
      "architecture/cross-module src/modules/orders/application/place-order.use-case.ts:1 ../../users/domain/user.entity",
    ]);
    expect(findings[0]?.fix).toContain("src/modules/users/index.ts");
  });
});

describe("feature architecture (no layers)", () => {
  it("enforces module isolation without layer rules", () => {
    const files = repo({
      "src/modules/orders/order.service.ts": `import { UserRepository } from "../users/user.repository";\nimport { local } from "./order.repository";`,
      "src/modules/orders/order.repository.ts": `export const local = 1;`,
      "src/modules/users/user.repository.ts": `export class UserRepository {}`,
    });
    const findings = checkDependencies(manifests["feature"] as ArchitectureManifest, files, {
      strictness: "standard",
    });
    expect(summary(findings)).toEqual([
      "architecture/cross-module src/modules/orders/order.service.ts:1 ../users/user.repository",
    ]);
  });
});

describe("classify", () => {
  it("places files by layer (global) and by module and layer (module scope)", () => {
    expect(classify("src/domain/x.ts", manifests["clean"] as ArchitectureManifest)).toEqual({
      layer: "domain",
      module: undefined,
    });
    expect(classify("src/config/env.ts", manifests["clean"] as ArchitectureManifest)).toEqual({
      layer: undefined,
      module: undefined,
    });
    const fc = manifests["feature-clean"] as ArchitectureManifest;
    expect(classify("src/modules/users/domain/user.ts", fc)).toEqual({
      layer: "domain",
      module: "users",
    });
    expect(classify("src/modules/users/index.ts", fc)).toEqual({
      layer: undefined,
      module: "users",
    });
    expect(classify("src/shared/log.ts", fc)).toEqual({ layer: undefined, module: undefined });
  });
});

describe("determinism", () => {
  it("returns identical findings regardless of input file order", () => {
    const files = repo({
      "src/domain/a.ts": `import x from "express";`,
      "src/domain/b.ts": `import x from "http";`,
    });
    const manifest = manifests["clean"] as ArchitectureManifest;
    const forward = checkDependencies(manifest, files, { strictness: "strict" });
    const reversed = checkDependencies(manifest, [...files].reverse(), { strictness: "strict" });
    expect(reversed).toEqual(forward);
  });
});

describe("measureConformance", () => {
  const manifest = () => manifests["clean"] as ArchitectureManifest;

  it("is 1 when every checked import conforms", () => {
    const files = repo({
      "src/application/a.ts": `import { E } from "../domain/e";`,
      "src/domain/e.ts": `export class E {}`,
      "src/infrastructure/r.ts": `import { E } from "../domain/e";`,
    });
    expect(measureConformance(manifest(), files)).toEqual({
      checked: 2,
      violations: 0,
      conformance: 1,
    });
  });

  it("is the share of checked imports that conform", () => {
    const files = repo({
      "src/application/a.ts": `import { E } from "../domain/e";`,
      "src/domain/e.ts": `import { R } from "../infrastructure/r";`,
      "src/infrastructure/r.ts": `export class R {}`,
      "src/presentation/c.ts": `import { A } from "../application/a";`,
    });
    const result = measureConformance(manifest(), files);
    expect(result).toMatchObject({ checked: 3, violations: 1 });
    expect(result.conformance).toBeCloseTo(2 / 3, 10);
  });

  it("reports no evidence (undefined) when no rule applied, instead of pretending to be perfect", () => {
    const files = repo({
      "src/domain/e.ts": `import { x } from "./other";`,
      "src/domain/other.ts": `export const x = 1;`,
    });
    expect(measureConformance(manifest(), files)).toEqual({
      checked: 0,
      violations: 0,
      conformance: undefined,
    });
  });

  it("counts framework-governed external imports as checks", () => {
    const files = repo({
      "src/domain/e.ts": `import path from "node:path";\nimport express from "express";`,
    });
    expect(measureConformance(manifest(), files)).toEqual({
      checked: 2,
      violations: 1,
      conformance: 0.5,
    });
  });

  it("counts cross-module imports as checks", () => {
    const fc = manifests["feature-clean"] as ArchitectureManifest;
    const files = repo({
      "src/modules/orders/application/a.ts": `import { U } from "../../users";\nimport { D } from "../../users/domain/d";`,
      "src/modules/users/index.ts": `export class U {}`,
      "src/modules/users/domain/d.ts": `export class D {}`,
    });
    expect(measureConformance(fc, files)).toEqual({ checked: 2, violations: 1, conformance: 0.5 });
  });

  it("measures even where reporting is silent (minimal strictness)", () => {
    const files = repo({
      "src/domain/e.ts": `import { R } from "../infrastructure/r";`,
      "src/infrastructure/r.ts": ``,
    });
    expect(checkDependencies(manifest(), files, { strictness: "minimal" })).toEqual([]);
    expect(measureConformance(manifest(), files).violations).toBe(1);
  });
});

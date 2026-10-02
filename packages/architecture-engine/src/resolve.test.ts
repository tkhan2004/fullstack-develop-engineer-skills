import { describe, expect, it } from "vitest";
import { packageName, resolveImport } from "./resolve.js";

const files = new Set([
  "src/services/user.service.ts",
  "src/repositories/index.ts",
  "src/repositories/user.repository.ts",
  "src/models/user.tsx",
  "src/shared/log.js",
]);
const ctx = { files, aliases: { "@/": "src/" } };

describe("resolveImport", () => {
  it("resolves relative imports with an extension added", () => {
    expect(resolveImport("src/services/a.ts", "../repositories/user.repository", ctx)).toEqual({
      kind: "internal",
      path: "src/repositories/user.repository.ts",
    });
  });

  it("resolves a directory to its index file", () => {
    expect(resolveImport("src/services/a.ts", "../repositories", ctx)).toEqual({
      kind: "internal",
      path: "src/repositories/index.ts",
    });
  });

  it("maps .js specifiers to TypeScript sources", () => {
    expect(resolveImport("src/services/a.ts", "./user.service.js", ctx)).toEqual({
      kind: "internal",
      path: "src/services/user.service.ts",
    });
    expect(resolveImport("src/services/a.ts", "../models/user.jsx", ctx)).toEqual({
      kind: "internal",
      path: "src/models/user.tsx",
    });
  });

  it("resolves aliases, longest prefix first", () => {
    expect(resolveImport("x.ts", "@/services/user.service", ctx)).toEqual({
      kind: "internal",
      path: "src/services/user.service.ts",
    });
    const nested = { files, aliases: { "@/": "src/", "@/models/": "src/models/" } };
    expect(resolveImport("x.ts", "@/models/user", nested)).toEqual({
      kind: "internal",
      path: "src/models/user.tsx",
    });
  });

  it("reports unresolvable relative imports instead of guessing", () => {
    expect(resolveImport("src/a.ts", "./missing", ctx)).toEqual({
      kind: "unresolved",
      specifier: "./missing",
    });
  });

  it("treats everything else as an external package", () => {
    expect(resolveImport("a.ts", "express", ctx)).toEqual({ kind: "external", pkg: "express" });
    expect(resolveImport("a.ts", "@prisma/client/runtime", ctx)).toEqual({
      kind: "external",
      pkg: "@prisma/client",
    });
    expect(resolveImport("a.ts", "node:http", ctx)).toEqual({ kind: "external", pkg: "http" });
    expect(resolveImport("a.ts", "lodash/fp", ctx)).toEqual({ kind: "external", pkg: "lodash" });
  });
});

describe("packageName", () => {
  it("returns the package root", () => {
    expect(packageName("@nestjs/common")).toBe("@nestjs/common");
    expect(packageName("node:fs/promises")).toBe("fs");
  });
});

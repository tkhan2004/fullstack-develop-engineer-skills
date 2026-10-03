import { describe, expect, it } from "vitest";
import { OptionError, parseInitOptions } from "./options.js";

describe("parseInitOptions", () => {
  it("applies defaults", () => {
    expect(parseInitOptions({}, "/p")).toEqual({
      cwd: "/p",
      out: ".engineering",
      yes: false,
      dryRun: false,
      force: false,
      noStructure: false,
    });
  });

  it("maps flags and parses lists", () => {
    const o = parseInitOptions(
      {
        yes: true,
        "dry-run": true,
        structure: false,
        backend: "express",
        orm: "prisma",
        adapters: "claude, generic",
        modules: "users, orders,",
        "migrate-to": "clean",
        out: "x",
      },
      "/p",
    );
    expect(o).toMatchObject({
      yes: true,
      dryRun: true,
      noStructure: true,
      backend: "express",
      orm: "prisma",
      out: "x",
      migrateTo: "clean",
    });
    expect(o.adapters).toEqual(["claude", "generic"]);
    expect(o.modules).toEqual(["users", "orders"]);
  });

  it("omits flags that were not given (no undefined keys)", () => {
    expect(Object.keys(parseInitOptions({ backend: "express" }, "/p")).sort()).toEqual([
      "backend",
      "cwd",
      "dryRun",
      "force",
      "noStructure",
      "out",
      "yes",
    ]);
  });

  it.each([
    [{ backend: "expres" }, "--backend", "Did you mean: express"],
    [{ strictness: "strikt" }, "--strictness", "Did you mean: strict"],
    [{ mode: "old" }, "--mode", "Expected one of: new, existing"],
    [{ adapters: "claude,clod" }, "--adapters", 'unknown value "clod"'],
    [{ migration: "big-bang" }, "--migration", "incremental, full"],
  ])("rejects %j", (flags, flag, message) => {
    expect(() => parseInitOptions(flags, "/p")).toThrow(OptionError);
    expect(() => parseInitOptions(flags, "/p")).toThrow(flag);
    expect(() => parseInitOptions(flags, "/p")).toThrow(message);
  });
});

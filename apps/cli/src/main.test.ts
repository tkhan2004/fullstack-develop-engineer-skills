import { describe, expect, it } from "vitest";
import { VERSION, main } from "./main.js";

const run = (...argv: string[]) => {
  let out = "";
  let err = "";
  const code = main(argv, { out: (t) => (out += t), err: (t) => (err += t) });
  return { code, out, err };
};

describe("cli entry", () => {
  it("prints usage with no arguments", () => {
    const { code, out } = run();
    expect(code).toBe(0);
    expect(out).toContain("Usage: eng-skills");
  });

  it("prints the version", () => {
    expect(run("--version").out).toBe(`${VERSION}\n`);
  });

  it("exits 2 for an unknown command", () => {
    const { code, err } = run("frobnicate");
    expect(code).toBe(2);
    expect(err).toContain("frobnicate");
  });
});

import { describe, expect, it } from "vitest";
import { extractImports } from "./imports.js";

const specifiers = (source: string) => extractImports(source).map((i) => i.specifier);

describe("extractImports", () => {
  it("finds the common import forms", () => {
    const source = `
import a from "a";
import { b, c } from 'b';
import * as d from "d";
import e, { f } from "e";
import "side-effect";
import type { T } from "types";
export * from "reexport-all";
export { g } from "reexport-named";
export type { H } from "reexport-type";
const x = require("req");
const y = await import("dyn");
`;
    expect(specifiers(source).sort()).toEqual(
      [
        "a",
        "b",
        "d",
        "dyn",
        "e",
        "reexport-all",
        "reexport-named",
        "reexport-type",
        "req",
        "side-effect",
        "types",
      ].sort(),
    );
  });

  it("handles multi-line import lists and reports the line of the statement", () => {
    const source = `import {\n  one,\n  two,\n} from "./multi";\n\nimport z from "z";`;
    expect(extractImports(source)).toEqual([
      { specifier: "./multi", line: 1, typeOnly: false },
      { specifier: "z", line: 6, typeOnly: false },
    ]);
  });

  it("flags type-only imports", () => {
    expect(extractImports(`import type { A } from "a";`)[0]?.typeOnly).toBe(true);
    expect(extractImports(`import { A } from "a";`)[0]?.typeOnly).toBe(false);
  });

  it("ignores imports in line and block comments", () => {
    const source = `// import a from "commented";\n/* import b from "block";\n import c from "block2"; */\nimport d from "real";`;
    expect(specifiers(source)).toEqual(["real"]);
  });

  it("ignores code-looking text inside template literals", () => {
    const source = 'const doc = `import x from "inside-template"`;\nimport y from "real";';
    expect(specifiers(source)).toEqual(["real"]);
  });

  it("is not confused by a comment marker inside a string", () => {
    const source = `const url = "http://example.com";\nimport a from "after-url";`;
    expect(specifiers(source)).toEqual(["after-url"]);
  });

  it("does not treat an identifier containing 'import' as an import", () => {
    expect(specifiers(`const reimport = 1; myimport("x");`)).toEqual([]);
  });

  it("returns nothing for empty input", () => {
    expect(extractImports("")).toEqual([]);
  });

  it("keeps line numbers correct after comments and templates", () => {
    const source = `/* a\nb\nc */\nconst t = \`x\ny\`;\nimport q from "q";`;
    expect(extractImports(source)[0]?.line).toBe(6);
  });
});

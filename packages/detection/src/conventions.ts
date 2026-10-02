import { extractImports } from "@engineering-skills/architecture-engine";
import { round2 } from "./claims.js";
import {
  isSourceFile,
  isTestFile,
  parseLooseJson,
  type Snapshot,
  type SnapshotFile,
} from "./snapshot.js";
import { readPackage } from "./stack.js";

/** A convention at 55% is a coin flip, not a convention: below this it is reported as inconsistent. */
export const CONSISTENCY_THRESHOLD = 0.65;
const MAX_SAMPLED_FILES = 400;

export interface Convention {
  readonly value: string;
  /** Share of the sample that follows `value`. */
  readonly ratio: number;
  readonly sampleSize: number;
  readonly consistent: boolean;
  readonly detail?: string;
}

export interface Conventions {
  readonly naming: {
    readonly variables?: Convention;
    readonly files?: Convention;
    readonly classes?: Convention;
  };
  readonly tests: { readonly placement?: Convention; readonly naming?: Convention };
  readonly errors?: Convention;
  readonly validation?: Convention;
  readonly imports?: Convention & { readonly aliases: readonly string[] };
  readonly exports?: Convention;
  readonly async?: Convention;
}

function majority(counts: ReadonlyMap<string, number>, detail?: string): Convention | undefined {
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  if (total === 0) return undefined;
  const [value, count] = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] as [
    string,
    number,
  ];
  const ratio = round2(count / total);
  return {
    value,
    ratio,
    sampleSize: total,
    consistent: ratio >= CONSISTENCY_THRESHOLD,
    ...(detail ? { detail } : {}),
  };
}

const tally = (items: Iterable<string>) => {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return counts;
};

/** Deterministic, evenly spaced sample so large repositories stay fast and results stay stable. */
export function sample<T>(items: readonly T[], limit = MAX_SAMPLED_FILES): readonly T[] {
  if (items.length <= limit) return items;
  const step = items.length / limit;
  return Array.from({ length: limit }, (_, i) => items[Math.floor(i * step)] as T);
}

/** Identifier style, or undefined when the name carries no information (one lowercase word, CONSTANT). */
export function styleOf(rawName: string): string | undefined {
  const name = rawName.replace(/^[_$]+/, "");
  if (name.length < 2 || /^[A-Z][A-Z0-9_]*$/.test(name)) return undefined;
  if (/^[a-z][a-z0-9]*$/.test(name)) return undefined;
  if (/^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(name)) return "kebab-case";
  if (/^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/.test(name)) return "snake_case";
  if (/^[a-z][a-zA-Z0-9]*$/.test(name)) return "camelCase";
  if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) return "PascalCase";
  return undefined;
}

const sourceFiles = (snapshot: Snapshot): readonly SnapshotFile[] =>
  snapshot.find((p) => isSourceFile(p) && !isTestFile(p)).filter((f) => f.text !== undefined);

const stem = (path: string) => (path.split("/").pop() as string).split(".")[0] as string;

function detectNaming(files: readonly SnapshotFile[]): Conventions["naming"] {
  const sampled = sample(files);
  const variables = tally(
    sampled.flatMap((f) =>
      [
        ...(f.text as string).matchAll(
          /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*[=:;,]|\bfunction\s*\*?\s+([A-Za-z_$][\w$]*)/g,
        ),
      ].flatMap((m) => {
        const style = styleOf((m[1] ?? m[2]) as string);
        return style ? [style] : [];
      }),
    ),
  );
  const classes = tally(
    sampled.flatMap((f) =>
      [...(f.text as string).matchAll(/\bclass\s+([A-Za-z_$][\w$]*)/g)].map(
        (m) => styleOf(m[1] as string) ?? "PascalCase",
      ),
    ),
  );
  const fileNames = tally(
    files.flatMap((f) => {
      const name = stem(f.path);
      const style = name === "index" ? undefined : styleOf(name);
      return style ? [style] : [];
    }),
  );
  const v = majority(variables);
  const f = majority(fileNames);
  const c = majority(classes);
  return {
    ...(v ? { variables: v } : {}),
    ...(f ? { files: f } : {}),
    ...(c ? { classes: c } : {}),
  };
}

function detectTests(snapshot: Snapshot): Conventions["tests"] {
  const tests = snapshot.find(
    (p) => isSourceFile(p) && (isTestFile(p) || /^(?:tests?|e2e)\//.test(p)),
  );
  const placement = majority(
    tally(
      tests.map((t) =>
        t.path.includes("__tests__/")
          ? "dunder-tests"
          : /^(?:tests?|e2e)\//.test(t.path)
            ? "separate-dir"
            : "colocated",
      ),
    ),
  );
  const naming = majority(
    tally(
      tests.flatMap((t) =>
        /\.test\./.test(t.path) ? ["*.test.*"] : /\.spec\./.test(t.path) ? ["*.spec.*"] : [],
      ),
    ),
  );
  return { ...(placement ? { placement } : {}), ...(naming ? { naming } : {}) };
}

const BUILT_IN_ERRORS = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "SyntaxError",
  "ReferenceError",
]);

function detectErrors(files: readonly SnapshotFile[]): Convention | undefined {
  const customClasses = new Map<string, string>();
  for (const f of files) {
    for (const m of (f.text as string).matchAll(
      /\bclass\s+(\w+)\s+extends\s+(?:\w*Error|\w*Exception)\b/g,
    )) {
      if (!customClasses.has(m[1] as string)) customClasses.set(m[1] as string, f.path);
    }
  }
  const thrown = tally(
    files.flatMap((f) =>
      [...(f.text as string).matchAll(/\bthrow\s+new\s+(\w+)\s*\(/g)].map((m) => m[1] as string),
    ),
  );
  const categories = new Map<string, number>();
  let topCustom: [string, number] | undefined;
  for (const [name, count] of thrown) {
    const category = customClasses.has(name)
      ? "custom-error-class"
      : BUILT_IN_ERRORS.has(name)
        ? "built-in-errors"
        : /Exception$/.test(name)
          ? "framework-exceptions"
          : "other";
    categories.set(category, (categories.get(category) ?? 0) + count);
    if (category === "custom-error-class" && (!topCustom || count > topCustom[1]))
      topCustom = [name, count];
  }
  const detail = topCustom ? `${topCustom[0]} in ${customClasses.get(topCustom[0])}` : undefined;
  return majority(categories, detail);
}

const VALIDATION_LIBS = ["zod", "joi", "yup", "class-validator", "valibot", "ajv"] as const;
const roleOf = (path: string) =>
  /\.(controller|route|routes|validator|schema|dto)\.[cm]?[jt]sx?$/.exec(path)?.[1];

function detectValidation(
  files: readonly SnapshotFile[],
  deps: Readonly<Record<string, string>>,
): Convention | undefined {
  const lib = VALIDATION_LIBS.filter((l) => l in deps)
    .map((l) => ({
      lib: l,
      users: files.filter((f) =>
        new RegExp(`from\\s+["']${l}["']|require\\(\\s*["']${l}["']\\s*\\)`).test(f.text as string),
      ),
    }))
    .sort((a, b) => b.users.length - a.users.length)[0];
  if (!lib || lib.users.length === 0) return undefined;

  const schemaRoles = new Set(["validator", "schema", "dto"]);
  let boundary = files.filter((f) => schemaRoles.has(roleOf(f.path) ?? ""));
  let label = "validator/schema";
  if (boundary.length === 0) {
    boundary = files.filter((f) =>
      ["controller", "route", "routes"].includes(roleOf(f.path) ?? ""),
    );
    label = "controller/route";
  }
  const using = boundary.filter((f) => lib.users.includes(f)).length;
  if (boundary.length === 0)
    return {
      value: lib.lib,
      ratio: 1,
      sampleSize: lib.users.length,
      consistent: true,
      detail: `imported in ${lib.users.length} files`,
    };
  const ratio = round2(using / boundary.length);
  return {
    value: lib.lib,
    ratio,
    sampleSize: boundary.length,
    consistent: ratio >= CONSISTENCY_THRESHOLD,
    detail: `used in ${using}/${boundary.length} ${label} files`,
  };
}

function detectImports(
  files: readonly SnapshotFile[],
  aliasPrefixes: readonly string[],
): Conventions["imports"] {
  const isAlias = (s: string) =>
    aliasPrefixes.some((p) => s.startsWith(p)) ||
    (/^(?:@|~|#)\//.test(s) && aliasPrefixes.length > 0);
  const counts = tally(
    sample(files).flatMap((f) =>
      extractImports(f.text as string).flatMap((i) =>
        i.specifier.startsWith(".") ? ["relative"] : isAlias(i.specifier) ? ["alias"] : [],
      ),
    ),
  );
  const result = majority(counts);
  return result ? { ...result, aliases: aliasPrefixes } : undefined;
}

function detectExports(files: readonly SnapshotFile[]): Convention | undefined {
  let named = 0;
  let byDefault = 0;
  for (const f of sample(files)) {
    const text = f.text as string;
    byDefault += (text.match(/\bexport\s+default\b/g) ?? []).length;
    named += (
      text.match(
        /\bexport\s+(?:declare\s+)?(?:abstract\s+)?(?:const|let|var|function|async\s+function|class|interface|type|enum)\b|\bexport\s*\{/g,
      ) ?? []
    ).length;
  }
  return majority(
    new Map(
      [
        ["named", named],
        ["default", byDefault],
      ].filter(([, n]) => (n as number) > 0) as [string, number][],
    ),
  );
}

function detectAsync(files: readonly SnapshotFile[]): Convention | undefined {
  let awaits = 0;
  let chains = 0;
  for (const f of sample(files)) {
    const text = f.text as string;
    awaits += (text.match(/\bawait\b/g) ?? []).length;
    chains += (text.match(/\.then\s*\(/g) ?? []).length;
  }
  return majority(
    new Map(
      [
        ["async-await", awaits],
        ["promise-chains", chains],
      ].filter(([, n]) => (n as number) > 0) as [string, number][],
    ),
  );
}

export function detectConventions(snapshot: Snapshot): Conventions {
  const files = sourceFiles(snapshot);
  const pkg = readPackage(snapshot);
  const paths = (
    parseLooseJson(snapshot.text("tsconfig.json"))?.["compilerOptions"] as
      Record<string, unknown> | undefined
  )?.["paths"];
  const aliasPrefixes =
    typeof paths === "object" && paths !== null
      ? Object.keys(paths)
          .filter((k) => k.endsWith("/*"))
          .map((k) => k.slice(0, -1))
          .sort()
      : [];

  const errors = detectErrors(files);
  const validation = detectValidation(files, pkg.dependencies);
  const imports = detectImports(files, aliasPrefixes);
  const exports = detectExports(files);
  const async = detectAsync(files);
  return {
    naming: detectNaming(files),
    tests: detectTests(snapshot),
    ...(errors ? { errors } : {}),
    ...(validation ? { validation } : {}),
    ...(imports ? { imports } : {}),
    ...(exports ? { exports } : {}),
    ...(async ? { async } : {}),
  };
}

export interface ImportRef {
  readonly specifier: string;
  /** 1-based line of the statement. */
  readonly line: number;
  readonly typeOnly: boolean;
}

/**
 * Blank out comments and template-literal contents (keeping newlines, so offsets and line
 * numbers are unchanged). Quoted strings are kept: import specifiers live in them.
 */
function mask(source: string): string {
  const out: string[] = [];
  const n = source.length;
  let i = 0;

  const keep = () => {
    out.push(source[i] as string);
    i++;
  };
  const blank = () => {
    const ch = source[i] as string;
    out.push(ch === "\n" || ch === "\r" ? ch : " ");
    i++;
  };

  while (i < n) {
    const ch = source[i] as string;
    const next = source[i + 1];

    if (ch === "/" && next === "/") {
      while (i < n && source[i] !== "\n") blank();
    } else if (ch === "/" && next === "*") {
      blank();
      blank();
      while (i < n && !(source[i] === "*" && source[i + 1] === "/")) blank();
      if (i < n) {
        blank();
        blank();
      }
    } else if (ch === "'" || ch === '"') {
      keep();
      while (i < n && source[i] !== ch && source[i] !== "\n") {
        if (source[i] === "\\" && i + 1 < n) keep();
        keep();
      }
      if (i < n && source[i] === ch) keep();
    } else if (ch === "`") {
      keep();
      while (i < n && source[i] !== "`") {
        if (source[i] === "\\" && i + 1 < n) blank();
        blank();
      }
      if (i < n) keep();
    } else {
      keep();
    }
  }
  return out.join("");
}

const PATTERNS: readonly RegExp[] = [
  // import x from "a" · import { a, b } from "a" · import type … · import "a"
  /\bimport\s+(?:type\s+)?(?:[^'";()]*?\sfrom\s+)?(['"])([^'"\n]+)\1/g,
  // export * from "a" · export { a } from "a" · export type … from "a"
  /\bexport\s+(?:type\s+)?(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s*from\s+(['"])([^'"\n]+)\1/g,
  // import("a") · require("a")
  /\b(?:import|require)\s*\(\s*(['"])([^'"\n]+)\1\s*\)/g,
];

/**
 * Extract module specifiers from JS/TS source with a lightweight scanner (no compiler).
 * Limits: it does not understand every syntax edge case; an import inside a quoted string
 * would be reported. Good enough to build a dependency graph, not to be a linter.
 */
export function extractImports(source: string): ImportRef[] {
  const masked = mask(source);
  const lineStarts = [0];
  for (let i = 0; i < masked.length; i++) if (masked[i] === "\n") lineStarts.push(i + 1);
  const lineAt = (offset: number) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((lineStarts[mid] as number) <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };

  const found = new Map<string, ImportRef>();
  for (const pattern of PATTERNS) {
    for (const match of masked.matchAll(pattern)) {
      const specifier = match[2] as string;
      const line = lineAt(match.index ?? 0);
      const key = `${line}:${specifier}`;
      if (!found.has(key))
        found.set(key, { specifier, line, typeOnly: /^(?:import|export)\s+type\b/.test(match[0]) });
    }
  }
  return [...found.values()].sort(
    (a, b) => a.line - b.line || a.specifier.localeCompare(b.specifier),
  );
}

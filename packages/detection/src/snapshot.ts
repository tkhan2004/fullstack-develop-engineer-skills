/**
 * An in-memory view of a repository. Detectors are pure functions over a snapshot, so they
 * are testable without touching the disk and can never execute project code.
 */

export interface SnapshotFile {
  /** POSIX path relative to the repository root. */
  readonly path: string;
  readonly size: number;
  /** File text, when the file is a known text type within the size limit. */
  readonly text: string | undefined;
}

export interface Snapshot {
  readonly files: readonly SnapshotFile[];
  /** True when scanning stopped at the file-count limit. */
  readonly truncated: boolean;
  get(path: string): SnapshotFile | undefined;
  text(path: string): string | undefined;
  has(path: string): boolean;
  find(test: RegExp | ((path: string) => boolean)): readonly SnapshotFile[];
}

const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const TEST = /(?:\.(?:test|spec)\.[cm]?[jt]sx?$)|(?:(?:^|\/)__tests__\/)/;

export const isSourceFile = (path: string) => SOURCE.test(path) && !path.endsWith(".d.ts");
export const isTestFile = (path: string) => TEST.test(path);
export const isTypeScript = (path: string) => /\.[cm]?tsx?$/.test(path) && !path.endsWith(".d.ts");

export function createSnapshot(
  input: Readonly<Record<string, string>> | readonly SnapshotFile[],
  options: { truncated?: boolean } = {},
): Snapshot {
  const list: SnapshotFile[] = Array.isArray(input)
    ? [...(input as readonly SnapshotFile[])]
    : Object.entries(input as Record<string, string>).map(([path, text]) => ({
        path,
        size: text.length,
        text,
      }));
  list.sort((a, b) => a.path.localeCompare(b.path));
  const byPath = new Map(list.map((f) => [f.path, f]));

  return {
    files: list,
    truncated: options.truncated ?? false,
    get: (path) => byPath.get(path),
    text: (path) => byPath.get(path)?.text,
    has: (path) => byPath.has(path),
    find: (test) =>
      list.filter((f) => (typeof test === "function" ? test(f.path) : test.test(f.path))),
  };
}

/** Parse JSON that may contain comments or trailing commas (tsconfig.json). Returns undefined on failure. */
export function parseLooseJson(text: string | undefined): Record<string, unknown> | undefined {
  if (text === undefined) return undefined;
  const stripped = text
    .replace(
      /("(?:[^"\\]|\\.)*")|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
      (_m, str: string | undefined) => str ?? "",
    )
    .replace(/,(\s*[}\]])/g, "$1");
  try {
    const value: unknown = JSON.parse(stripped);
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

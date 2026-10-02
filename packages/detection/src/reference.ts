import { extractImports } from "@engineering-skills/architecture-engine";
import { isSourceFile, isTestFile, type Snapshot, type SnapshotFile } from "./snapshot.js";

export interface ReferenceModule {
  readonly concern: string;
  readonly path: string;
  readonly reason: string;
}

const CONCERNS: readonly { readonly concern: string; readonly role: RegExp }[] = [
  { concern: "controller", role: /\.controller\.[cm]?[jt]sx?$/ },
  { concern: "service", role: /\.service\.[cm]?[jt]sx?$/ },
  { concern: "repository", role: /\.repository\.[cm]?[jt]sx?$/ },
  { concern: "use-case", role: /\.use-case\.[cm]?[jt]sx?$/ },
];

const lineCount = (file: SnapshotFile) => (file.text as string).split("\n").length;

const stemOf = (path: string) => path.replace(/\.[cm]?[jt]sx?$/, "");
const testSibling = (path: string, tests: readonly SnapshotFile[]) =>
  tests.some((t) => stemOf(t.path).replace(/\.(?:test|spec)$/, "") === stemOf(path));

/**
 * Pick, per concern, the in-repo file an agent should imitate: tested, reasonably sized and
 * not tangled. Deterministic: ties break by path.
 *
 * A file with architecture-rule findings is never offered: an agent imitates what it is shown,
 * so no example is better than a bad one.
 *
 * @param violating real paths of files with architecture-rule findings
 */
export function selectReferenceModules(
  snapshot: Snapshot,
  violating: ReadonlySet<string> = new Set(),
): ReferenceModule[] {
  const sources = snapshot
    .find((p) => isSourceFile(p) && !isTestFile(p))
    .filter((f) => f.text !== undefined);
  const tests = snapshot
    .find((p) => isSourceFile(p) && isTestFile(p))
    .filter((f) => f.text !== undefined);
  const chosen: ReferenceModule[] = [];

  for (const { concern, role } of CONCERNS) {
    const ranked = sources
      .filter((f) => role.test(f.path) && !violating.has(f.path))
      .map((file) => {
        const facts: string[] = [];
        let score = 0;
        if (testSibling(file.path, tests)) {
          score += 2;
          facts.push("has a colocated test");
        }
        const lines = lineCount(file);
        if (lines >= 10 && lines <= 250) {
          score += 1;
          facts.push(`${lines} lines`);
        }
        if (extractImports(file.text as string).length <= 8) score += 0.5;
        return { file, score, facts };
      })
      .sort((a, b) => b.score - a.score || a.file.path.localeCompare(b.file.path));
    const top = ranked[0];
    if (top)
      chosen.push({
        concern,
        path: top.file.path,
        reason: top.facts.join("; ") || "only candidate",
      });
  }

  const rankedTests = tests
    .map((file) => {
      const lines = lineCount(file);
      const facts: string[] = [];
      let score = 0;
      if (/\b(?:describe|it|test)\s*\(/.test(file.text as string)) {
        score += 1;
        facts.push("uses the project's test runner");
      }
      if (lines >= 10 && lines <= 200) {
        score += 1;
        facts.push(`${lines} lines`);
      }
      return { file, score, facts };
    })
    .sort((a, b) => b.score - a.score || a.file.path.localeCompare(b.file.path))[0];
  if (rankedTests)
    chosen.push({
      concern: "test",
      path: rankedTests.file.path,
      reason: rankedTests.facts.join("; ") || "only candidate",
    });

  return chosen.sort((a, b) => a.concern.localeCompare(b.concern));
}

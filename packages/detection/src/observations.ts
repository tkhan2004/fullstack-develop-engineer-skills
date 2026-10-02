import type { ArchitectureDetection } from "./architecture.js";
import { isSourceFile, isTestFile, type Snapshot } from "./snapshot.js";

/** Neutral findings: what exists, how often, and where. Never a verdict on the team. */
export interface Observation {
  readonly id: string;
  readonly severity: "info" | "warning";
  readonly count: number;
  /** `path:line`, at most {@link MAX_LOCATIONS}, sorted. */
  readonly locations: readonly string[];
  readonly detail: string;
}

export const MAX_LOCATIONS = 10;
export const BRANCHING_THRESHOLD = 5;

const ORM_PACKAGES = ["@prisma/client", "typeorm", "drizzle-orm", "sequelize", "mongoose", "knex"];
const BRANCH = /\b(?:if|for|while|switch)\s*\(|\bcase\b/g;
const CONTROLLER = /\.controller\.[cm]?[jt]sx?$|(?:^|\/)controllers\//;
const DATA_LAYER =
  /(?:^|\/)(?:infrastructure|repositories|repository|database|db|prisma|persistence|dao)\/|\.repository\.[cm]?[jt]sx?$/;
const BUSINESS_OR_EDGE =
  /\.(?:controller|service|route|routes|use-case|middleware|validator|handler)\.[cm]?[jt]sx?$|(?:^|\/)(?:controllers|services|routes|application|domain|presentation|middlewares|validators)\//;

const lineOf = (text: string, index: number) => text.slice(0, index).split("\n").length;
const locations = (items: readonly string[]) => [...new Set(items)].sort().slice(0, MAX_LOCATIONS);

export function detectObservations(
  snapshot: Snapshot,
  architecture?: ArchitectureDetection,
): Observation[] {
  const sources = snapshot
    .find((p) => isSourceFile(p) && !isTestFile(p))
    .filter((f) => f.text !== undefined);
  const found: Observation[] = [];

  const heavy = sources.flatMap((f) => {
    if (!CONTROLLER.test(f.path)) return [];
    const matches = [...(f.text as string).matchAll(BRANCH)];
    return matches.length >= BRANCHING_THRESHOLD
      ? [`${f.path}:${lineOf(f.text as string, matches[0]?.index ?? 0)}`]
      : [];
  });
  if (heavy.length > 0) {
    found.push({
      id: "logic-in-controller",
      severity: "info",
      count: heavy.length,
      locations: locations(heavy),
      detail: `Controllers with ${BRANCHING_THRESHOLD} or more branching statements (business rules may live in the HTTP layer)`,
    });
  }

  const ormHits = sources.flatMap((f) => {
    if (DATA_LAYER.test(f.path) || !BUSINESS_OR_EDGE.test(f.path)) return [];
    const text = f.text as string;
    for (const pkg of ORM_PACKAGES) {
      const match = new RegExp(
        `from\\s+["']${pkg.replace("/", "\\/")}["']|require\\(\\s*["']${pkg.replace("/", "\\/")}["']\\s*\\)`,
      ).exec(text);
      if (match) return [`${f.path}:${lineOf(text, match.index)}`];
    }
    return [];
  });
  if (ormHits.length > 0) {
    found.push({
      id: "orm-outside-data-layer",
      severity: "warning",
      count: ormHits.length,
      locations: locations(ormHits),
      detail: "Direct ORM or query-builder usage outside the data layer",
    });
  }

  if (architecture && architecture.style !== "custom") {
    const byRule = (rule: string) =>
      architecture.findings.filter((f) => f.rule === rule).map((f) => `${f.file}:${f.line}`);
    const rules: [string, string, string][] = [
      [
        "architecture/dependency-rule",
        "dependency-rule-violations",
        `Imports that cross layers against the ${architecture.style} dependency rules`,
      ],
      [
        "architecture/cross-module",
        "module-internals-access",
        "Modules importing another module's internals instead of its public API",
      ],
      [
        "architecture/framework-leakage",
        "framework-leakage",
        "Framework or driver imports in a layer that should not know about them",
      ],
    ];
    for (const [rule, id, detail] of rules) {
      const hits = byRule(rule);
      if (hits.length > 0)
        found.push({
          id,
          severity: "warning",
          count: hits.length,
          locations: locations(hits),
          detail,
        });
    }
  }

  return found.sort((a, b) => a.id.localeCompare(b.id));
}

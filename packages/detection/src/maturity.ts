import type { ArchitectureDetection } from "./architecture.js";
import { CLASSIFICATION_THRESHOLD } from "./architecture.js";
import type { Conventions } from "./conventions.js";
import { isSourceFile, isTestFile, type Snapshot } from "./snapshot.js";
import { readPackage, type StackDetection } from "./stack.js";

/** What was found, not a grade. */
export type Maturity = "detected" | "partial" | "missing";

export interface MaturityReport {
  readonly architecture: Maturity;
  readonly conventions: Maturity;
  readonly testing: Maturity;
  readonly security: Maturity;
  readonly documentation: Maturity;
  readonly observability: Maturity;
}

export interface Gap {
  readonly area: string;
  readonly detail: string;
}

const SECURITY_MIDDLEWARE = [
  "helmet",
  "cors",
  "express-rate-limit",
  "rate-limiter-flexible",
  "@nestjs/throttler",
  "csurf",
];
const OBSERVABILITY = [
  "pino",
  "winston",
  "prom-client",
  "@sentry/node",
  "@sentry/nextjs",
  "bunyan",
];

const hasIntegrationTests = (snapshot: Snapshot, deps: Readonly<Record<string, string>>) =>
  "supertest" in deps ||
  snapshot.find((p) => /(?:^|\/)(?:integration|e2e)\//.test(p) || /\.e2e-spec\.[cm]?[jt]s$/.test(p))
    .length > 0;

export function assessMaturity(
  snapshot: Snapshot,
  input: {
    stack: StackDetection;
    architecture: ArchitectureDetection | undefined;
    conventions: Conventions;
  },
): { maturity: MaturityReport; gaps: Gap[] } {
  const { stack, architecture, conventions } = input;
  const deps = readPackage(snapshot).dependencies;
  const gaps: Gap[] = [];

  const archMaturity: Maturity = !architecture
    ? "missing"
    : architecture.style !== "custom" && architecture.confidence >= CLASSIFICATION_THRESHOLD
      ? "detected"
      : "partial";

  const measured = [
    conventions.naming.variables,
    conventions.naming.files,
    conventions.naming.classes,
    conventions.tests.placement,
    conventions.errors,
    conventions.imports,
    conventions.exports,
    conventions.async,
  ].filter((c) => c !== undefined);
  const consistent = measured.filter((c) => c.consistent).length;
  const conventionMaturity: Maturity =
    measured.length === 0
      ? "missing"
      : measured.length >= 4 && consistent / measured.length >= 0.75
        ? "detected"
        : "partial";

  const testFiles = snapshot.find(
    (p) => isSourceFile(p) && (isTestFile(p) || /^(?:tests?|e2e)\//.test(p)),
  );
  const integration = hasIntegrationTests(snapshot, deps);
  const testing: Maturity =
    testFiles.length === 0 ? "missing" : integration ? "detected" : "partial";
  const hasBackend = stack.backendFramework !== undefined;
  if (
    testFiles.length === 0 &&
    snapshot.find((p) => isSourceFile(p) && !isTestFile(p)).length > 0
  ) {
    gaps.push({ area: "testing", detail: "No test files detected" });
  } else if (testing === "partial" && hasBackend) {
    gaps.push({ area: "testing", detail: "No integration or end-to-end tests detected" });
  }

  const hasValidation = conventions.validation !== undefined;
  const hasHardening = SECURITY_MIDDLEWARE.some((d) => d in deps);
  const security: Maturity =
    hasValidation && hasHardening
      ? "detected"
      : hasValidation || hasHardening
        ? "partial"
        : "missing";
  if (hasBackend && !hasValidation)
    gaps.push({ area: "security", detail: "No request validation library detected" });

  const hasReadme = snapshot.find(/^readme(?:\.md)?$/i).length > 0;
  const hasDocs =
    snapshot.find(/^docs\//).length > 0 || snapshot.find(/^contributing(?:\.md)?$/i).length > 0;
  const documentation: Maturity =
    hasReadme && hasDocs ? "detected" : hasReadme ? "partial" : "missing";
  if (!hasReadme) gaps.push({ area: "documentation", detail: "No README detected" });

  const observability: Maturity = OBSERVABILITY.some((d) => d in deps) ? "detected" : "missing";

  return {
    maturity: {
      architecture: archMaturity,
      conventions: conventionMaturity,
      testing,
      security,
      documentation,
      observability,
    },
    gaps: gaps.sort((a, b) => a.area.localeCompare(b.area) || a.detail.localeCompare(b.detail)),
  };
}

import type { Strictness } from "@engineering-skills/core";
import { classify, isModulePublicApi } from "./classify.js";
import { extractImports } from "./imports.js";
import type { ArchitectureManifest } from "./manifest.js";
import { resolveImport, type ResolveContext } from "./resolve.js";

export interface SourceFile {
  /** POSIX path relative to the project root. */
  readonly path: string;
  readonly source: string;
}

export type RuleId =
  "architecture/dependency-rule" | "architecture/cross-module" | "architecture/framework-leakage";

export interface Finding {
  readonly level: "error" | "warning";
  readonly rule: RuleId;
  readonly file: string;
  readonly line: number;
  readonly specifier: string;
  readonly message: string;
  readonly fix: string;
}

export interface CheckOptions {
  readonly strictness: Strictness;
  readonly aliases?: ResolveContext["aliases"];
}

export interface EvaluateOptions {
  readonly aliases?: ResolveContext["aliases"];
  readonly level: Finding["level"];
}

export interface Evaluation {
  /** Imports that a rule applied to (cross-layer, cross-module, or framework-governed). */
  readonly checked: number;
  readonly findings: readonly Finding[];
}

const SOURCE_FILE = /\.(?:[cm]?[jt]sx?)$/;

function globToRegExp(pattern: string): RegExp {
  return new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
}

/**
 * Evaluate every import against the manifest's rules, regardless of strictness. Returns the
 * violations and how many imports a rule applied to, so callers can compute conformance.
 */
export function evaluateDependencies(
  manifest: ArchitectureManifest,
  files: readonly SourceFile[],
  options: EvaluateOptions,
): Evaluation {
  const { level } = options;
  const context: ResolveContext = {
    files: new Set(files.map((f) => f.path)),
    ...(options.aliases ? { aliases: options.aliases } : {}),
  };
  const forbidden = Object.entries(manifest.forbidden_imports).map(([layer, rule]) => ({
    layer,
    patterns: rule.external.map(globToRegExp),
    reason: rule.reason,
  }));
  const cross = manifest.dependency_rules.cross_module;

  let checked = 0;
  const findings: Finding[] = [];
  for (const file of files) {
    if (!SOURCE_FILE.test(file.path)) continue;
    const from = classify(file.path, manifest);

    for (const imp of extractImports(file.source)) {
      const add = (rule: RuleId, message: string, fix: string) =>
        findings.push({
          level,
          rule,
          file: file.path,
          line: imp.line,
          specifier: imp.specifier,
          message,
          fix,
        });
      const resolved = resolveImport(file.path, imp.specifier, context);

      if (resolved.kind === "external") {
        if (forbidden.some((f) => f.layer === from.layer)) checked++;
        const rule = forbidden.find(
          (f) => f.layer === from.layer && f.patterns.some((re) => re.test(resolved.pkg)),
        );
        if (rule) {
          add(
            "architecture/framework-leakage",
            `Layer "${rule.layer}" imports "${resolved.pkg}". ${rule.reason}`,
            `Remove "${resolved.pkg}" from "${rule.layer}": declare a contract the layer owns and implement it with "${resolved.pkg}" in an outer layer.`,
          );
        }
        continue;
      }
      if (resolved.kind !== "internal") continue;

      const to = classify(resolved.path, manifest);

      if (from.module && to.module && from.module !== to.module) {
        checked++;
        if (
          cross &&
          !cross.allowed &&
          !(cross.via.includes("module-public-api") && isModulePublicApi(resolved.path, manifest))
        ) {
          add(
            "architecture/cross-module",
            `Module "${from.module}" imports the internals of module "${to.module}" (${resolved.path}).`,
            `Import through "${manifest.structure.module?.container}/${to.module}/index.ts", or move the shared code to a shared location.`,
          );
        }
        continue;
      }

      if (from.layer && to.layer && from.layer !== to.layer) {
        checked++;
        const allowed = manifest.mayImport[from.layer] ?? [];
        if (!allowed.includes(to.layer)) {
          add(
            "architecture/dependency-rule",
            `Layer "${from.layer}" may not import layer "${to.layer}" (allowed: ${allowed.join(", ") || "none"}).`,
            `Invert the dependency: declare a contract in "${from.layer}" (or a layer it may import) and implement it in "${to.layer}".`,
          );
        }
      }
    }
  }

  findings.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.specifier.localeCompare(b.specifier) ||
      a.rule.localeCompare(b.rule),
  );
  return { checked, findings };
}

/**
 * Check imports against an architecture's dependency rules.
 * `minimal` and `observe` report nothing; `standard` reports warnings; `strict` reports
 * errors (the manifest decides, see its `strictness` block).
 */
export function checkDependencies(
  manifest: ArchitectureManifest,
  files: readonly SourceFile[],
  options: CheckOptions,
): Finding[] {
  const policy =
    options.strictness === "observe" ? undefined : manifest.strictness[options.strictness];
  if (!policy?.report) return [];
  return [
    ...evaluateDependencies(manifest, files, {
      level: policy.block ? "error" : "warning",
      ...(options.aliases ? { aliases: options.aliases } : {}),
    }).findings,
  ];
}

/** How well does this code follow the manifest's rules? checked = 0 means no evidence either way. */
export function measureConformance(
  manifest: ArchitectureManifest,
  files: readonly SourceFile[],
  options: Pick<CheckOptions, "aliases"> = {},
): {
  readonly checked: number;
  readonly violations: number;
  readonly conformance: number | undefined;
} {
  const { checked, findings } = evaluateDependencies(manifest, files, {
    level: "warning",
    ...options,
  });
  return {
    checked,
    violations: findings.length,
    conformance: checked === 0 ? undefined : 1 - findings.length / checked,
  };
}

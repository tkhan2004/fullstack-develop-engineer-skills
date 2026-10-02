import type { ConfigIssue } from "./issue.js";
import type { EngineeringConfig } from "./schema.js";

/** Warnings: valid configurations that are probably not what the user intends. */
export function lintConfig(config: EngineeringConfig): ConfigIssue[] {
  const warnings: ConfigIssue[] = [];
  const warn = (path: string, message: string) =>
    warnings.push({ level: "warning", path, message });

  if (config.adoption?.strategy === "adopt") {
    for (const target of ["backend", "frontend"] as const) {
      if (config.architecture[target]?.strictness === "strict") {
        warn(
          `architecture.${target}.strictness`,
          '"strict" on an adopted architecture will flag pre-existing code; "standard" is recommended',
        );
      }
    }
  }

  const frontend = config.stack.frontend?.framework;
  if (config.architecture.frontend && (frontend === undefined || frontend === "none")) {
    warn(
      "architecture.frontend",
      'A frontend architecture is configured but stack.frontend.framework is "none"',
    );
  }
  const backend = config.stack.backend?.framework;
  if (config.architecture.backend && (backend === undefined || backend === "none")) {
    warn(
      "architecture.backend",
      'A backend architecture is configured but stack.backend.framework is "none"',
    );
  }

  return warnings;
}

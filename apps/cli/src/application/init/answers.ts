import type { Layer } from "@engineering-skills/config";
import type { Profile } from "@engineering-skills/detection";

/** Detected stack claims as a config layer (lowest-confidence-wins is not needed: claims already carry evidence). */
export function stackLayerFromProfile(profile: Profile): Layer {
  const { stack } = profile;
  const layer: Layer = {};
  if (stack.language) layer["language"] = stack.language.value;
  if (stack.package_manager) layer["package_manager"] = stack.package_manager.value;
  if (stack.backend?.framework) {
    layer["backend"] = {
      ...(stack.backend.runtime?.value === "node" ? { runtime: "node" } : {}),
      framework: stack.backend.framework.value,
    };
  }
  if (stack.frontend?.framework) layer["frontend"] = { framework: stack.frontend.framework.value };
  if (stack.database?.engine || stack.database?.orm) {
    layer["database"] = {
      ...(stack.database.engine ? { engine: stack.database.engine.value } : {}),
      ...(stack.database.orm ? { orm: stack.database.orm.value } : {}),
    };
  }
  if (stack.testing?.framework) layer["testing"] = { framework: stack.testing.framework.value };
  return layer;
}

const SHARED_ROLES: Readonly<Record<string, string>> = {
  shared: "utilities",
  common: "cross-cutting",
  utils: "utilities",
  helpers: "utilities",
  lib: "utilities",
};
const INFRASTRUCTURE = /^(?:database|db|infrastructure|prisma|persistence)$/;

/**
 * Describe the repository's own structure (`style: custom`): its modules, shared and
 * infrastructure directories, and what was observed about dependencies. The framework describes
 * the project instead of forcing it into a predefined architecture.
 */
export function customBlockFromProfile(profile: Profile): Layer {
  const structure = profile.architecture?.backend.structure;
  const root = structure?.root ?? profile.project.source_roots[0] ?? "src";
  const dirs = (structure?.directories ?? []).map((d) => ({
    ...d,
    name: d.path.slice(root.length + 1),
  }));

  const shared = dirs
    .filter((d) => d.name in SHARED_ROLES)
    .map((d) => ({ path: d.path, role: SHARED_ROLES[d.name] }));
  const infrastructure = dirs
    .filter((d) => INFRASTRUCTURE.test(d.name))
    .map((d) => ({ path: d.path, role: "persistence" }));
  const modules = Object.fromEntries(
    (structure?.modules ?? []).map((m) => [m.name, { path: m.path }]),
  );
  const observed = profile.observations.map((o) => `${o.detail} (${o.count} observed)`);

  return {
    root,
    ...(Object.keys(modules).length > 0 ? { modules } : {}),
    ...(shared.length > 0 ? { shared } : {}),
    ...(infrastructure.length > 0 ? { infrastructure } : {}),
    rules: { dependency_direction: "existing", ...(observed.length > 0 ? { observed } : {}) },
  };
}

export const PRACTICE_LABELS: Readonly<Record<string, string>> = {
  clean_code: "Clean Code",
  solid: "SOLID",
  design_patterns: "Design patterns",
  testing: "Testing",
  security: "Security",
  error_handling: "Error handling",
  performance: "Performance",
  observability: "Observability",
  caching: "Caching",
};

export const practicesToEngineering = (enabled: readonly string[]): Record<string, boolean> =>
  Object.fromEntries(Object.keys(PRACTICE_LABELS).map((key) => [key, enabled.includes(key)]));

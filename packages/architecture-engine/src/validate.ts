import { layerPath, type ArchitectureManifest } from "./manifest.js";

export interface ValidateManifestOptions {
  /** Known skill ids. When given, `skills[]` entries must exist. */
  readonly knownSkillIds?: ReadonlySet<string>;
  /** Expected name (the directory name). */
  readonly expectedName?: string;
}

/** Semantic checks beyond the schema (docs/02-specs/architecture-manifest.md §6). */
export function validateManifest(
  manifest: ArchitectureManifest,
  options: ValidateManifestOptions = {},
): string[] {
  const problems: string[] = [];
  const layerIds = new Set(manifest.layers.map((l) => l.id));
  const at = (what: string) => `${manifest.name}: ${what}`;

  if (options.expectedName !== undefined && manifest.name !== options.expectedName) {
    problems.push(at(`name must match its directory ("${options.expectedName}")`));
  }

  const seen = new Set<string>();
  for (const layer of manifest.layers) {
    if (seen.has(layer.id)) problems.push(at(`duplicate layer "${layer.id}"`));
    seen.add(layer.id);
  }

  for (const [layer, imports] of Object.entries(manifest.mayImport)) {
    if (!layerIds.has(layer))
      problems.push(at(`dependency_rules.${layer} is not a declared layer`));
    for (const target of imports) {
      if (!layerIds.has(target))
        problems.push(
          at(`dependency_rules.${layer}.may_import references unknown layer "${target}"`),
        );
      if (target === layer)
        problems.push(at(`dependency_rules.${layer} lists itself in may_import`));
    }
  }
  for (const id of layerIds) {
    if (!(id in manifest.mayImport))
      problems.push(at(`layer "${id}" has no dependency rule (use may_import: [] for none)`));
  }

  const cycle = findLayerCycle(manifest.mayImport);
  if (cycle) problems.push(at(`dependency rules form a cycle: ${cycle.join(" → ")}`));

  for (const layer of Object.keys(manifest.forbidden_imports)) {
    if (!layerIds.has(layer))
      problems.push(at(`forbidden_imports.${layer} is not a declared layer`));
  }

  // Structure must cover every layer.
  const { structure } = manifest;
  if (manifest.dependency_rules.scope === "module") {
    if (!structure.module) {
      problems.push(at('scope "module" requires structure.module'));
    } else {
      for (const layer of manifest.layers) {
        if (!structure.module.directories.includes(layerPath(layer))) {
          problems.push(at(`structure.module.directories does not cover layer "${layer.id}"`));
        }
      }
    }
  } else {
    for (const layer of manifest.layers) {
      const expected = `${structure.root}/${layerPath(layer)}`;
      if (!structure.directories.includes(expected)) {
        problems.push(
          at(`structure.directories does not cover layer "${layer.id}" (expected "${expected}")`),
        );
      }
    }
  }

  if (manifest.dependency_rules.scope === "module" && !manifest.dependency_rules.cross_module) {
    problems.push(at('scope "module" requires dependency_rules.cross_module'));
  }

  if (options.knownSkillIds) {
    for (const skill of manifest.skills) {
      if (!options.knownSkillIds.has(skill))
        problems.push(at(`skills[] references unknown skill "${skill}"`));
    }
  }

  return problems;
}

function findLayerCycle(
  mayImport: Readonly<Record<string, readonly string[]>>,
): string[] | undefined {
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];
  const visit = (id: string): string[] | undefined => {
    if (state.get(id) === "done") return undefined;
    if (state.get(id) === "visiting") return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, "visiting");
    stack.push(id);
    for (const next of mayImport[id] ?? []) {
      if (next === id) continue;
      const cycle = visit(next);
      if (cycle) return cycle;
    }
    stack.pop();
    state.set(id, "done");
    return undefined;
  };
  for (const id of Object.keys(mayImport).sort()) {
    const cycle = visit(id);
    if (cycle) return cycle;
  }
  return undefined;
}

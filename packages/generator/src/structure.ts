import { layerPath, type ArchitectureManifest } from "@engineering-skills/architecture-engine";
import type { EngineeringConfig } from "@engineering-skills/config";
import type { CanonicalStructure } from "@engineering-skills/core";
import type { Profile } from "@engineering-skills/detection";

type Backend = NonNullable<EngineeringConfig["architecture"]["backend"]>;

/** Manifests describe paths under `src/`; point them at the project's real source root. */
const atRoot = (path: string, root: string) =>
  root === "src" ? path : path.replace(/^src(?=\/|$)/, root);

const firstSentence = (text: string) =>
  text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=\.)\s/)[0] ?? text;

/** The project's directories and what each is for, so an agent can name them instead of guessing. */
export function describeStructure(input: {
  readonly backend: Backend;
  readonly manifest: ArchitectureManifest | undefined;
  readonly profile: Profile | undefined;
}): CanonicalStructure {
  const { backend, manifest, profile } = input;
  const root = backend.root ?? manifest?.structure.root ?? "src";
  const modules = (profile?.architecture?.backend.structure?.modules ?? []).map((m) => ({
    name: m.name,
    path: m.path,
  }));

  if (manifest) {
    const rules = manifest.dependency_rules;
    if (rules.scope === "global") {
      return {
        root,
        directories: manifest.layers.map((l) => ({
          path: atRoot(`${manifest.structure.root}/${layerPath(l)}`, root),
          note: l.description,
        })),
        modules: [],
      };
    }
    const container = atRoot(
      manifest.structure.module?.container ?? `${manifest.structure.root}/modules`,
      root,
    );
    return {
      root,
      directories: [
        {
          path: container,
          note:
            manifest.layers.length === 0
              ? "Feature modules; each owns its own code"
              : `Feature modules; each contains ${manifest.layers.map((l) => `\`${layerPath(l)}\``).join(", ")}`,
        },
        ...manifest.layers.map((l) => ({
          path: `${container}/<module>/${layerPath(l)}`,
          note: l.description,
        })),
        ...(manifest.structure.directories.includes(`${manifest.structure.root}/shared`)
          ? [
              {
                path: atRoot(`${manifest.structure.root}/shared`, root),
                note: "Code shared by modules; contains no domain-specific logic",
              },
            ]
          : []),
      ],
      modules,
    };
  }

  // custom: describe what is actually there.
  const custom = backend.custom;
  const roles = new Map<string, string>();
  for (const d of [...(custom?.shared ?? []), ...(custom?.infrastructure ?? [])])
    if (d.role) roles.set(d.path, d.role);
  const moduleEntries = Object.entries(custom?.modules ?? {}).map(([name, m]) => ({
    name,
    path: m.path,
  }));
  const observed = (profile?.architecture?.backend.structure?.directories ?? []).map((d) => d.path);
  const known = new Set([...moduleEntries.map((m) => m.path), ...roles.keys(), ...observed]);

  return {
    root,
    directories: [...known]
      .sort()
      .filter((path) => !moduleEntries.some((m) => m.path === path) || observed.length === 0)
      .map((path) => ({
        path,
        note:
          roles.get(path) ??
          (moduleEntries.some((m) => m.path === path) ? "Feature module" : "Observed directory"),
      })),
    modules: moduleEntries,
  };
}

/** Dependency rules as plain sentences, from the architecture's manifest or the custom description. */
export function describeDependencyRules(input: {
  readonly backend: Backend;
  readonly manifest: ArchitectureManifest | undefined;
}): string[] {
  const { backend, manifest } = input;
  const code = (s: string) => `\`${s}\``;

  if (!manifest) {
    const rules = backend.custom?.rules;
    return [
      "Follow the dependency directions already present in the code; they were observed, not imposed.",
      ...(rules?.observed ?? []).map((o) => `Observed: ${o}`),
    ];
  }

  const lines: string[] = [];
  if (manifest.dependency_rules.scope === "module")
    lines.push("These rules apply inside each module.");
  for (const layer of manifest.layers) {
    const may = manifest.mayImport[layer.id] ?? [];
    lines.push(
      may.length === 0
        ? `${code(layer.id)} imports no other layer`
        : `${code(layer.id)} may import: ${may.map(code).join(", ")}`,
    );
  }
  for (const [layer, rule] of Object.entries(manifest.forbidden_imports)) {
    lines.push(
      `${code(layer)} must not import: ${rule.external.map(code).join(", ")}. ${firstSentence(rule.reason)}`,
    );
  }
  const cross = manifest.dependency_rules.cross_module;
  if (cross && !cross.allowed) {
    lines.push(
      "A module must not import another module's internals; use its public `index` or shared code.",
    );
  }
  return lines;
}

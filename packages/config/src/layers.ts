import type { Strictness } from "@engineering-skills/core";

export type Layer = Record<string, unknown>;

const isPlainObject = (value: unknown): value is Layer =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Deep merge, later layers win. Objects merge recursively; arrays and scalars are replaced
 * (never concatenated: a user's list is the list).
 */
export function mergeLayers(...layers: readonly (Layer | undefined)[]): Layer {
  const result: Layer = {};
  for (const layer of layers) {
    if (!layer) continue;
    for (const [key, value] of Object.entries(layer)) {
      if (value === undefined) continue;
      const current = result[key];
      result[key] =
        isPlainObject(value) && isPlainObject(current)
          ? mergeLayers(current, value)
          : structuredClone(value);
    }
  }
  return result;
}

/** Default strictness by mode/strategy (docs/01-concepts/strictness-levels.md §3). */
export function defaultStrictness(mode: unknown, strategy: unknown): Strictness {
  return mode === "existing" && strategy === "adopt" ? "observe" : "standard";
}

/** Mode-dependent defaults, computed from the merged higher-precedence layers. */
function modeDefaults(merged: Layer): Layer {
  const project = merged["project"];
  const mode = isPlainObject(project) ? project["mode"] : undefined;
  const defaults: Layer = {};

  if (mode === "existing") defaults["adoption"] = { strategy: "adopt" };

  const adoption = isPlainObject(merged["adoption"]) ? merged["adoption"] : undefined;
  const strategy = adoption?.["strategy"] ?? "adopt";
  const architecture = isPlainObject(merged["architecture"]) ? merged["architecture"] : {};
  const strictness = defaultStrictness(mode, strategy);
  const targets: Layer = {};
  for (const target of Object.keys(architecture)) targets[target] = { strictness };
  if (Object.keys(targets).length > 0) defaults["architecture"] = targets;

  return defaults;
}

export interface ConfigLayers {
  /** Predefined configuration (contains no rules). */
  readonly preset?: Layer;
  /** Values derived from the project profile (detection). */
  readonly profile?: Layer;
  /** The user's config file. */
  readonly file?: Layer;
  /** Command-line flags. */
  readonly flags?: Layer;
}

/**
 * Precedence: flags > file > profile > preset > defaults
 * (`overrides` is a section of the config that governs skills; it is not a value layer).
 */
export function resolveLayers(layers: ConfigLayers): Layer {
  const merged = mergeLayers(layers.preset, layers.profile, layers.file, layers.flags);
  return mergeLayers({ version: 1 }, modeDefaults(merged), merged);
}

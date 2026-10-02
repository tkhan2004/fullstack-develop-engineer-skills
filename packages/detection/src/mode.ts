import type { Snapshot } from "./snapshot.js";

export interface ModeSuggestion {
  readonly mode: "new" | "existing";
  readonly reason: string;
}

/**
 * Pre-select the project mode from evidence, not menu order:
 * a near-empty directory with no manifest and no source is a new project.
 */
export function suggestProjectMode(snapshot: Snapshot): ModeSuggestion {
  const real = snapshot.files.filter((f) => !f.path.startsWith(".git/"));
  const hasManifest = snapshot.has("package.json");
  const hasSource = real.some((f) => /^(?:src|app|lib|server)\//.test(f.path));
  if (!hasManifest && !hasSource && real.length <= 3) {
    return {
      mode: "new",
      reason: `${real.length} file${real.length === 1 ? "" : "s"}, no package.json and no source directory`,
    };
  }
  return {
    mode: "existing",
    reason: hasManifest ? "package.json present" : `${real.length} files present`,
  };
}

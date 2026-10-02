import { layerPath, type ArchitectureManifest } from "./manifest.js";

export interface Placement {
  readonly layer: string | undefined;
  readonly module: string | undefined;
}

const stripSlash = (p: string) => p.replace(/\/+$/, "");

/** Where does a project file sit in the architecture? Files outside any layer/module are unclassified. */
export function classify(path: string, manifest: ArchitectureManifest): Placement {
  const { structure, layers } = manifest;
  const byLongestPath = [...layers].sort((a, b) => layerPath(b).length - layerPath(a).length);

  if (manifest.dependency_rules.scope === "global") {
    const layer = byLongestPath.find((l) =>
      path.startsWith(`${stripSlash(structure.root)}/${layerPath(l)}/`),
    );
    return { layer: layer?.id, module: undefined };
  }

  const container = stripSlash(structure.module?.container ?? "");
  if (!path.startsWith(`${container}/`)) return { layer: undefined, module: undefined };
  const [moduleName, ...rest] = path.slice(container.length + 1).split("/");
  if (!moduleName || rest.length === 0) return { layer: undefined, module: undefined };
  const inside = rest.join("/");
  const layer = byLongestPath.find((l) => inside.startsWith(`${layerPath(l)}/`));
  return { layer: layer?.id, module: moduleName };
}

/** Is `path` the public entry point (`index.*`) of its module? */
export function isModulePublicApi(path: string, manifest: ArchitectureManifest): boolean {
  const container = stripSlash(manifest.structure.module?.container ?? "");
  return new RegExp(
    `^${container.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/[^/]+/index\\.[cm]?[jt]sx?$`,
  ).test(path);
}

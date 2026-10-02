import {
  classify,
  measureConformance,
  type ArchitectureManifest,
  type SourceFile,
} from "@engineering-skills/architecture-engine";
import { round2, type Evidence } from "./claims.js";
import { isSourceFile, isTestFile, parseLooseJson, type Snapshot } from "./snapshot.js";

/** Weights of the three evidence families (docs/01-concepts/detection-engine.md §3.2). */
export const WEIGHTS = { vocabulary: 0.35, conformance: 0.45, composition: 0.2 } as const;
/** Below this confidence the structure is described (`custom`) instead of classified. */
export const CLASSIFICATION_THRESHOLD = 0.6;
/** Pseudo-observations at 0.5 that stop a handful of imports from looking conclusive. */
const SMOOTHING = 1;
const MAX_CUSTOM_CONFIDENCE = 0.95;

const ROLE =
  /\.(?:controllers?|services?|repositor(?:y|ies)|entit(?:y|ies)|models?|routes?|middlewares?|validators?|schemas?|use-cases?|dto|modules?|guards?|gateways?)\.[cm]?[jt]sx?$/;

export interface StyleScore {
  readonly style: string;
  readonly vocabulary: number;
  readonly presentMarkers: readonly { readonly marker: string; readonly files: number }[];
  /** Share of rule-governed imports that conform; undefined when no rule applied. */
  readonly conformance: number | undefined;
  readonly checked: number;
  readonly violations: number;
  readonly composition: number;
  readonly score: number;
}

export interface ArchitectureDetection {
  readonly sourceRoot: string;
  /** A named style, or `custom` when nothing fits with enough confidence. */
  readonly style: string;
  readonly confidence: number;
  readonly evidence: readonly Evidence[];
  readonly alternatives: readonly { readonly value: string; readonly confidence: number }[];
  /** Conformance of the best named style (reported even when we fall back to custom). */
  readonly conformance: number | undefined;
  /** Best named candidate, even when below the threshold. */
  readonly best: StyleScore | undefined;
  readonly scores: readonly StyleScore[];
  /** Top-level directories under the source root, for describing a custom structure. */
  readonly topLevel: readonly { readonly path: string; readonly files: number }[];
}

/** The directory holding application source: `src`, or `app`/`lib`/`server` with enough files. */
export function detectSourceRoot(snapshot: Snapshot): string | undefined {
  const sources = snapshot.find((p) => isSourceFile(p));
  const under = (root: string) => sources.filter((f) => f.path.startsWith(`${root}/`)).length;
  if (under("src") > 0) return "src";
  return ["app", "lib", "server"].find((root) => under(root) >= 3);
}

/** Manifests describe paths under `src/`; remap another root onto it. */
export const toSrcPath = (path: string, root: string) =>
  root === "src" ? path : `src/${path.slice(root.length + 1)}`;

/** tsconfig `paths` as prefix → directory aliases, remapped like source paths. */
export function readAliases(snapshot: Snapshot, root: string): Record<string, string> {
  const paths = (
    parseLooseJson(snapshot.text("tsconfig.json"))?.["compilerOptions"] as
      Record<string, unknown> | undefined
  )?.["paths"];
  const aliases: Record<string, string> = {};
  if (typeof paths !== "object" || paths === null) return aliases;
  for (const [key, targets] of Object.entries(paths)) {
    const target = Array.isArray(targets) ? String(targets[0] ?? "") : "";
    if (!key.endsWith("/*") || !target.endsWith("/*")) continue;
    const dir = target.slice(0, -1).replace(/^\.\//, "");
    aliases[key.slice(0, -1)] =
      dir.startsWith(`${root}/`) || dir === `${root}/` ? toSrcPath(dir, root) : dir;
  }
  return aliases;
}

function globToRegExp(glob: string): RegExp {
  let source = "";
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i] as string;
    if (ch === "*" && glob[i + 1] === "*") {
      const slash = glob[i + 2] === "/";
      source += slash ? "(?:.*/)?" : ".*";
      i += slash ? 2 : 1;
    } else if (ch === "*") {
      source += "[^/]*";
    } else {
      source += ch.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${source}$`);
}

const markerDirRegExp = (marker: string) =>
  new RegExp(`^${marker.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]+")}/`);

function scoreStyle(
  manifest: ArchitectureManifest,
  allPaths: readonly string[],
  sources: readonly SourceFile[],
  aliases: Record<string, string>,
): StyleScore {
  const detection = manifest.detection;
  const markers = detection?.marker_directories ?? [];
  // A marker may offer alternatives (modules/ or features/); it is present if any of them is.
  const present = markers.flatMap((entry) => {
    for (const marker of Array.isArray(entry) ? entry : [entry]) {
      const files = allPaths.filter((p) => markerDirRegExp(marker).test(p)).length;
      if (files > 0) return [{ marker, files }];
    }
    return [];
  });
  const empty = {
    style: manifest.name,
    vocabulary: 0,
    presentMarkers: present,
    conformance: undefined,
    checked: 0,
    violations: 0,
    composition: 0,
    score: 0,
  };
  if (markers.length === 0 || present.length < (detection?.min_confidence_markers ?? 1))
    return empty;

  const vocabulary = present.length / markers.length;
  const measured = measureConformance(manifest, sources, { aliases });
  const conforming = measured.checked - measured.violations;
  const conformance = (conforming + SMOOTHING * 0.5) / (measured.checked + SMOOTHING);

  const classified = sources.filter((f) => {
    const place = classify(f.path, manifest);
    return (
      (place.layer !== undefined || place.module !== undefined) &&
      !/(?:^|\/)index\.[cm]?[jt]sx?$/.test(f.path)
    );
  });
  const suffixRatio =
    classified.length === 0
      ? 0
      : classified.filter((f) => ROLE.test(f.path)).length / classified.length;
  const markerFiles = detection?.marker_files ?? [];
  const markerPresence =
    markerFiles.length === 0
      ? undefined
      : markerFiles.some((glob) => allPaths.some((p) => globToRegExp(glob).test(p)))
        ? 1
        : 0;
  const composition =
    markerPresence === undefined ? suffixRatio : (suffixRatio + markerPresence) / 2;

  return {
    style: manifest.name,
    vocabulary,
    presentMarkers: present,
    conformance: measured.checked === 0 ? undefined : conforming / measured.checked,
    checked: measured.checked,
    violations: measured.violations,
    composition,
    score:
      WEIGHTS.vocabulary * vocabulary +
      WEIGHTS.conformance * conformance +
      WEIGHTS.composition * composition,
  };
}

const related = (a: ArchitectureManifest | undefined, b: ArchitectureManifest | undefined) =>
  !!a &&
  !!b &&
  (a.detection?.refines.includes(b.name) === true ||
    b.detection?.refines.includes(a.name) === true);

/**
 * Classify the architecture from three independent families of evidence: directory vocabulary,
 * import-graph conformance (the strongest) and file-level composition.
 *
 *   score(style) = 0.35·vocabulary + 0.45·conformance + 0.20·composition
 *   confidence   = score(best) − 0.5·score(strongest unrelated competitor)
 *
 * A style that merely refines another (feature-clean refines feature) is not a competitor.
 * Below 0.60 the structure is reported as `custom` with the ranked alternatives.
 */
export function detectArchitecture(
  snapshot: Snapshot,
  manifests: readonly ArchitectureManifest[],
): ArchitectureDetection | undefined {
  const sourceRoot = detectSourceRoot(snapshot);
  if (sourceRoot === undefined) return undefined;

  const allPaths = snapshot.files
    .filter((f) => f.path.startsWith(`${sourceRoot}/`))
    .map((f) => toSrcPath(f.path, sourceRoot));
  const sources: SourceFile[] = snapshot.files
    .filter(
      (f) =>
        f.path.startsWith(`${sourceRoot}/`) &&
        isSourceFile(f.path) &&
        !isTestFile(f.path) &&
        f.text !== undefined,
    )
    .map((f) => ({ path: toSrcPath(f.path, sourceRoot), source: f.text as string }));
  const aliases = readAliases(snapshot, sourceRoot);

  const byName = new Map(manifests.map((m) => [m.name, m]));
  const scores = manifests
    .filter((m) => m.detection)
    .map((m) => scoreStyle(m, allPaths, sources, aliases))
    .filter((s) => s.score > 0);

  // A specialisation within 0.05 of the style it refines wins: it is the more specific truth.
  scores.sort((a, b) => {
    if (Math.abs(a.score - b.score) <= 0.05 && related(byName.get(a.style), byName.get(b.style))) {
      return byName.get(a.style)?.detection?.refines.includes(b.style) ? -1 : 1;
    }
    return b.score - a.score || a.style.localeCompare(b.style);
  });

  const best = scores[0];
  const topLevelCounts = new Map<string, number>();
  for (const p of allPaths) {
    const [, dir, rest] = p.split("/");
    if (dir && rest !== undefined) topLevelCounts.set(dir, (topLevelCounts.get(dir) ?? 0) + 1);
  }
  const topLevel = [...topLevelCounts]
    .map(([path, files]) => ({ path: `${sourceRoot}/${path}`, files }))
    .sort((a, b) => a.path.localeCompare(b.path));

  // Every candidate gets confidence the same way: its score minus half the strongest
  // competitor's, where a style and its refinement do not compete.
  const confidenceOf = (candidate: StyleScore) => {
    const rival = scores.find(
      (s) => s !== candidate && !related(byName.get(candidate.style), byName.get(s.style)),
    );
    return Math.max(0, candidate.score - 0.5 * (rival?.score ?? 0));
  };
  const bestConfidence = best ? confidenceOf(best) : 0;
  const alternatives = scores
    .slice(1)
    .map((s) => ({ value: s.style, confidence: round2(confidenceOf(s)) }));

  if (best && bestConfidence >= CLASSIFICATION_THRESHOLD) {
    const evidence: Evidence[] = [
      ...best.presentMarkers.map((m) => ({
        path: toRoot(m.marker, sourceRoot),
        detail: `${m.files} file${m.files === 1 ? "" : "s"}`,
        weight: round2((WEIGHTS.vocabulary * best.vocabulary) / best.presentMarkers.length),
      })),
      {
        path: "import-graph",
        detail:
          best.checked === 0
            ? "no cross-boundary imports to check"
            : `${best.checked - best.violations}/${best.checked} cross-boundary imports follow the dependency rules`,
        weight: round2(
          WEIGHTS.conformance * ((best.checked - best.violations + 0.5) / (best.checked + 1)),
        ),
      },
      {
        path: "file-names",
        detail: `${Math.round(best.composition * 100)}% role-naming and marker-file match`,
        weight: round2(WEIGHTS.composition * best.composition),
      },
    ];
    return {
      sourceRoot,
      style: best.style,
      confidence: round2(bestConfidence),
      evidence,
      alternatives,
      conformance: best.conformance,
      best,
      scores,
      topLevel,
    };
  }

  const confidence = round2(Math.min(MAX_CUSTOM_CONFIDENCE, 1 - bestConfidence));
  return {
    sourceRoot,
    style: "custom",
    confidence,
    evidence: [
      {
        path: sourceRoot,
        detail: best
          ? `closest named style is "${best.style}" at ${round2(bestConfidence)}, below the ${CLASSIFICATION_THRESHOLD} threshold`
          : "no known architecture markers found",
        weight: round2(1 - bestConfidence),
      },
      {
        path: sourceRoot,
        detail: `top-level directories: ${topLevel.map((t) => t.path.slice(sourceRoot.length + 1)).join(", ") || "(none)"}`,
        weight: 0.3,
      },
    ],
    alternatives: scores
      .slice(0, 3)
      .map((s) => ({ value: s.style, confidence: round2(confidenceOf(s)) })),
    conformance: best?.conformance,
    best,
    scores,
    topLevel,
  };
}

/** Marker paths are written against `src/`; show them against the real root. */
const toRoot = (marker: string, root: string) =>
  root === "src" ? marker : `${root}/${marker.slice("src/".length)}`;

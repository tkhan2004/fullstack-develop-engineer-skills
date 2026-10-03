import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ArchitectureManifest } from "@engineering-skills/architecture-engine";
import { type ArchitectureDetection, detectArchitecture } from "./architecture.js";
import type { Claim } from "./claims.js";
import { detectConventions, type Convention, type Conventions } from "./conventions.js";
import { readGitCommit } from "./git.js";
import { assessMaturity } from "./maturity.js";
import { suggestProjectMode } from "./mode.js";
import { detectObservations } from "./observations.js";
import {
  DEFAULT_PROFILE_PATH,
  PROFILE_VERSION,
  serializeProfile,
  type Profile,
} from "./profile.js";
import { selectReferenceModules } from "./reference.js";
import { scanDirectory, type ScanOptions } from "./scan.js";
import type { Snapshot } from "./snapshot.js";
import { detectStack, type StackDetection } from "./stack.js";

export interface AnalyzeOptions {
  readonly architectures: readonly ArchitectureManifest[];
  /** Recorded in the profile, e.g. `@engineering-skills/cli@0.1.0`. */
  readonly generator: string;
  /** Zero the timestamp and duration so output is reproducible. */
  readonly deterministic?: boolean;
  /** Override the git commit (otherwise read from the repository). */
  readonly commit?: string | undefined;
}

export interface Analysis {
  readonly profile: Profile;
  readonly architecture: ArchitectureDetection | undefined;
  readonly stack: StackDetection;
  readonly conventions: Conventions;
}

const toClaim = (c: Claim) => ({
  value: c.value,
  confidence: c.confidence,
  evidence: c.evidence.map((e) => ({ path: e.path, detail: e.detail, weight: e.weight })),
  ...(c.alternatives
    ? { alternatives: c.alternatives.map((a) => ({ value: a.value, confidence: a.confidence })) }
    : {}),
});

const toConvention = (c: Convention) => ({
  value: c.value,
  ratio: c.ratio,
  sample_size: c.sampleSize,
  ...(c.detail ? { detail: c.detail } : {}),
  ...(c.consistent ? {} : { consistent: false as const }),
});

function stackSection(stack: StackDetection): Profile["stack"] {
  const out: Profile["stack"] = {};
  if (stack.language) out.language = toClaim(stack.language);
  if (stack.packageManager) out.package_manager = toClaim(stack.packageManager);
  if (stack.runtime || stack.backendFramework) {
    out.backend = {
      ...(stack.runtime ? { runtime: toClaim(stack.runtime) } : {}),
      ...(stack.backendFramework ? { framework: toClaim(stack.backendFramework) } : {}),
    };
  }
  if (stack.frontendFramework) out.frontend = { framework: toClaim(stack.frontendFramework) };
  if (stack.databaseEngine || stack.orm) {
    out.database = {
      ...(stack.databaseEngine ? { engine: toClaim(stack.databaseEngine) } : {}),
      ...(stack.orm ? { orm: toClaim(stack.orm) } : {}),
    };
  }
  if (stack.testFramework) out.testing = { framework: toClaim(stack.testFramework) };
  return out;
}

function conventionsSection(c: Conventions): Profile["conventions"] {
  return {
    naming: {
      ...(c.naming.variables ? { variables: toConvention(c.naming.variables) } : {}),
      ...(c.naming.files ? { files: toConvention(c.naming.files) } : {}),
      ...(c.naming.classes ? { classes: toConvention(c.naming.classes) } : {}),
    },
    tests: {
      ...(c.tests.placement ? { placement: toConvention(c.tests.placement) } : {}),
      ...(c.tests.naming ? { naming: toConvention(c.tests.naming) } : {}),
    },
    ...(c.errors ? { errors: { strategy: toConvention(c.errors) } } : {}),
    ...(c.validation ? { validation: { library: toConvention(c.validation) } } : {}),
    ...(c.imports
      ? { imports: { style: toConvention(c.imports), aliases: [...c.imports.aliases] } }
      : {}),
    ...(c.exports ? { exports: { style: toConvention(c.exports) } } : {}),
    ...(c.async ? { async: { style: toConvention(c.async) } } : {}),
  };
}

function architectureSection(a: ArchitectureDetection | undefined): Profile["architecture"] {
  if (!a) return undefined;
  return {
    backend: {
      value: a.style,
      confidence: a.confidence,
      evidence: a.evidence.map((e) => ({ ...e })),
      ...(a.alternatives.length > 0 ? { alternatives: a.alternatives.map((x) => ({ ...x })) } : {}),
      // Conformance is only meaningful for a style we committed to; for `custom` it would describe a style we rejected.
      ...(a.style !== "custom" && a.conformance !== undefined
        ? { conformance: Math.round(a.conformance * 100) / 100 }
        : {}),
      // Always recorded: if the user rejects the detected style, `custom` still has a structure to describe.
      structure: {
        root: a.sourceRoot,
        directories: a.topLevel.map((t) => ({ ...t })),
        ...(a.modules.length > 0 ? { modules: a.modules.map((m) => ({ ...m })) } : {}),
      },
    },
  };
}

/** Pure analysis of a snapshot (no disk, no clock unless not deterministic). */
export function analyzeSnapshot(
  snapshot: Snapshot,
  options: AnalyzeOptions & { readonly startedAt?: number },
): Analysis {
  const stack = detectStack(snapshot);
  const architecture = detectArchitecture(snapshot, options.architectures);
  const conventions = detectConventions(snapshot);
  const violating = new Set(
    architecture?.style !== "custom" ? architecture?.findings.map((f) => f.file) : [],
  );
  const { maturity, gaps } = assessMaturity(snapshot, { stack, architecture, conventions });
  const mode = suggestProjectMode(snapshot);
  const deterministic = options.deterministic ?? false;
  const duration =
    deterministic || options.startedAt === undefined
      ? 0
      : Math.round(performance.now() - options.startedAt);

  const architectureBlock = architectureSection(architecture);
  const profile: Profile = {
    version: PROFILE_VERSION,
    generated: {
      at: deterministic ? "1970-01-01T00:00:00.000Z" : new Date().toISOString(),
      by: options.generator,
      ...(options.commit ? { commit: options.commit } : {}),
      files_scanned: snapshot.files.length,
      duration_ms: duration,
      ...(snapshot.truncated ? { truncated: true as const } : {}),
    },
    project: {
      mode: mode.mode,
      root: ".",
      source_roots: architecture ? [architecture.sourceRoot] : [],
    },
    stack: stackSection(stack),
    ...(architectureBlock ? { architecture: architectureBlock } : {}),
    conventions: conventionsSection(conventions),
    reference_modules: selectReferenceModules(snapshot, violating),
    observations: detectObservations(snapshot, architecture).map((o) => ({
      ...o,
      locations: [...o.locations],
    })),
    maturity,
    gaps,
  };
  return { profile, architecture, stack, conventions };
}

/** Scan a directory and analyse it. Reads only; see {@link writeProfile} for the one write. */
export async function analyzeRepository(
  root: string,
  options: AnalyzeOptions & { readonly scan?: ScanOptions },
): Promise<Analysis> {
  const startedAt = performance.now();
  const snapshot = await scanDirectory(root, options.scan);
  const commit = "commit" in options ? options.commit : await readGitCommit(root);
  return analyzeSnapshot(snapshot, { ...options, commit, startedAt });
}

/** The only file `analyze` writes. */
export async function writeProfile(
  root: string,
  profile: Profile,
  path = DEFAULT_PROFILE_PATH,
): Promise<string> {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, serializeProfile(profile), "utf8");
  return path;
}

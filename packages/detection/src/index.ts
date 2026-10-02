export { claim, combineEvidence, round2 } from "./claims.js";
export type { Claim, Evidence } from "./claims.js";
export { ALWAYS_SKIPPED_DIRECTORIES, scanDirectory } from "./scan.js";
export type { ScanOptions } from "./scan.js";
export {
  createSnapshot,
  isSourceFile,
  isTestFile,
  isTypeScript,
  parseLooseJson,
} from "./snapshot.js";
export type { Snapshot, SnapshotFile } from "./snapshot.js";
export { detectStack, readPackage } from "./stack.js";
export type { PackageInfo, StackDetection } from "./stack.js";
export {
  CLASSIFICATION_THRESHOLD,
  WEIGHTS,
  detectArchitecture,
  detectSourceRoot,
  readAliases,
  toSrcPath,
} from "./architecture.js";
export type { ArchitectureDetection, StyleScore } from "./architecture.js";
export { CONSISTENCY_THRESHOLD, detectConventions, sample, styleOf } from "./conventions.js";
export type { Convention, Conventions } from "./conventions.js";
export { selectReferenceModules } from "./reference.js";
export type { ReferenceModule } from "./reference.js";
export { BRANCHING_THRESHOLD, MAX_LOCATIONS, detectObservations } from "./observations.js";
export type { Observation } from "./observations.js";
export { assessMaturity } from "./maturity.js";
export type { Gap, Maturity, MaturityReport } from "./maturity.js";
export { suggestProjectMode } from "./mode.js";
export type { ModeSuggestion } from "./mode.js";

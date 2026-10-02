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

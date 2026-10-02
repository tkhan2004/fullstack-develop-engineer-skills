export { layerPath, manifestSchema, parseManifest } from "./manifest.js";
export type { ArchitectureManifest } from "./manifest.js";
export { validateManifest } from "./validate.js";
export type { ValidateManifestOptions } from "./validate.js";
export { loadManifests } from "./loader.js";
export { extractImports } from "./imports.js";
export type { ImportRef } from "./imports.js";
export { packageName, resolveImport } from "./resolve.js";
export type { ResolveContext, ResolvedImport } from "./resolve.js";
export { classify, isModulePublicApi } from "./classify.js";
export type { Placement } from "./classify.js";
export { checkDependencies, evaluateDependencies, measureConformance } from "./check.js";
export type {
  CheckOptions,
  EvaluateOptions,
  Evaluation,
  Finding,
  RuleId,
  SourceFile,
} from "./check.js";
export { applyStructure, planStructure } from "./generate.js";
export type { ApplyResult, PlanAction, PlanOptions, StructurePlan } from "./generate.js";

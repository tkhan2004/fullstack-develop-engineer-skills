import type {
  AdoptionStrategy,
  ArchitectureSource,
  ProjectMode,
  Strictness,
} from "./vocabulary.js";

/**
 * The tool-independent intermediate representation of "what the agent must be told".
 * Adapters consume only this; one that reads config.yaml directly is a bug
 * (docs/02-specs/ai-adapter-spec.md).
 */
export interface CanonicalOutput {
  readonly version: 1;
  readonly project: CanonicalProject;
  /** One section per resolved skill, in output order (project facts come first, advice last). */
  readonly sections: readonly CanonicalSection[];
  /** In-repo files an agent should imitate. */
  readonly references: readonly CanonicalReference[];
  readonly lockfile: { readonly skills: readonly LockedSkill[] };
}

export interface CanonicalProject {
  readonly name: string | undefined;
  readonly mode: ProjectMode;
  readonly strategy: AdoptionStrategy | undefined;
  /** Undefined when the project has no backend architecture to describe. */
  readonly architecture: CanonicalArchitecture | undefined;
  /** Ordered facts, e.g. `{ label: "Language", value: "typescript" }`. */
  readonly stack: readonly { readonly label: string; readonly value: string }[];
  /** Hard prohibitions and instructions, stated first. */
  readonly constraints: readonly string[];
  readonly structure: CanonicalStructure | undefined;
  /** Observed conventions worth mirroring (only the consistent ones). */
  readonly conventions: readonly {
    readonly label: string;
    readonly value: string;
    readonly share: number;
  }[];
  /** Dependency rules of the architecture, one sentence each. */
  readonly dependencyRules: readonly string[];
  readonly migration:
    { readonly from: string; readonly to: string; readonly strategy: string } | undefined;
}

export interface CanonicalArchitecture {
  readonly style: string;
  readonly source: ArchitectureSource;
  readonly confidence: number | undefined;
  readonly strictness: Strictness;
}

export interface CanonicalStructure {
  readonly root: string;
  readonly directories: readonly { readonly path: string; readonly note: string }[];
  readonly modules: readonly { readonly name: string; readonly path: string }[];
}

export interface CanonicalSection {
  /** The skill id. */
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly priority: number;
  /** Rendered markdown, without the title. */
  readonly body: string;
  /** Strictness-specific wording, when the skill defines one. */
  readonly tone: string | undefined;
  readonly checklist: readonly string[];
}

export interface CanonicalReference {
  readonly concern: string;
  readonly path: string;
  readonly reason: string;
}

export interface LockedSkill {
  readonly id: string;
  readonly version: string;
  readonly selectedBy: string;
}

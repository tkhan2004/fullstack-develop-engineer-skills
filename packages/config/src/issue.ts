export type IssueLevel = "error" | "warning";

/** One actionable problem with a configuration. */
export interface ConfigIssue {
  readonly level: IssueLevel;
  /** Dotted path, e.g. `architecture.backend.style`. Empty string = document root. */
  readonly path: string;
  readonly message: string;
  /** Allowed values, when the field is an enumeration or a closed set of keys. */
  readonly expected?: readonly string[];
  readonly suggestion?: string;
  /** 1-based line in the source text, when known. */
  readonly line?: number;
}

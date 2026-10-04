import type { CanonicalOutput } from "@engineering-skills/core";

export type OutputMode = "reference" | "inline";

export interface AdapterOptions {
  /** `reference`: entry file plus per-skill files. `inline`: everything in one file. */
  readonly mode: OutputMode;
  /** Used in generated-file headers. */
  readonly version: string;
  /** Where the content came from, shown in headers. */
  readonly source: string;
  /** Override the entry file path for this adapter. */
  readonly outputPath?: string;
}

/**
 * One file an adapter produces. A `full` file is written whole (and carries a hash header);
 * a `block` is placed inside a managed block of a file the user owns, so `content` is the block's
 * inner text and `path` the owning file.
 */
export interface GeneratedFile {
  readonly path: string;
  readonly content: string;
  readonly marker: "full" | "block";
  readonly blockId?: string;
}

export interface AiAdapter {
  readonly id: string;
  readonly displayName: string;
  /** What the adapter does when no mode is configured. */
  readonly defaultMode: OutputMode;
  /** Every path this adapter may write for the given output and options. */
  outputPaths(output: CanonicalOutput, options: AdapterOptions): readonly string[];
  render(output: CanonicalOutput, options: AdapterOptions): readonly GeneratedFile[];
}

/**
 * Render through an adapter and enforce its contract: it may write only the paths it declared,
 * and nothing twice. A leaking adapter fails here, not in a user's repository.
 */
export function renderAdapter(
  adapter: AiAdapter,
  output: CanonicalOutput,
  options: AdapterOptions,
): readonly GeneratedFile[] {
  const allowed = new Set(adapter.outputPaths(output, options));
  const files = adapter.render(output, options);
  const seen = new Set<string>();
  for (const file of files) {
    if (!allowed.has(file.path))
      throw new Error(`Adapter "${adapter.id}" tried to write undeclared path "${file.path}"`);
    if (seen.has(file.path))
      throw new Error(`Adapter "${adapter.id}" produced "${file.path}" twice`);
    seen.add(file.path);
  }
  return files;
}

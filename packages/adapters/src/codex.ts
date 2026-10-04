import type { CanonicalOutput } from "@engineering-skills/core";
import type { AdapterOptions, AiAdapter, GeneratedFile } from "./adapter.js";
import { renderInline } from "./markdown.js";

export const CODEX_PATH = "AGENTS.md";
export const BLOCK_ID = "engineering-skills";

/**
 * AGENTS.md is a file teams already own, so the rules live in a managed block and everything
 * else in the file is preserved. Single file: no references are assumed to be followed.
 */
export const codexAdapter: AiAdapter = {
  id: "codex",
  displayName: "OpenAI Codex",
  defaultMode: "inline",
  outputPaths: (_output, options) => [options.outputPath ?? CODEX_PATH],

  render(output: CanonicalOutput, options: AdapterOptions): readonly GeneratedFile[] {
    return [
      {
        path: options.outputPath ?? CODEX_PATH,
        content: renderInline(output),
        marker: "block",
        blockId: BLOCK_ID,
      },
    ];
  },
};

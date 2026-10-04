import type { AiAdapter, AdapterOptions, GeneratedFile } from "./adapter.js";
import { renderGeneratedFile } from "./files.js";
import { renderInline } from "./markdown.js";
import type { CanonicalOutput } from "@engineering-skills/core";

export const GENERIC_PATH = ".engineering/generated/INSTRUCTIONS.md";

/** Plain, self-contained Markdown any agent can be pointed at. Always inline. */
export const genericAdapter: AiAdapter = {
  id: "generic",
  displayName: "Generic (plain Markdown)",
  defaultMode: "inline",
  outputPaths: (_output, options) => [options.outputPath ?? GENERIC_PATH],

  render(output: CanonicalOutput, options: AdapterOptions): readonly GeneratedFile[] {
    const title = output.project.name
      ? `# Engineering rules for ${output.project.name}`
      : "# Engineering rules";
    const body = [
      title,
      "",
      "> Generated from the project's engineering configuration. Do not edit; run `eng-skills generate`.",
      "",
      renderInline(output),
    ].join("\n");
    return [
      {
        path: options.outputPath ?? GENERIC_PATH,
        content: renderGeneratedFile({ body }, options),
        marker: "full",
      },
    ];
  },
};

import type { CanonicalOutput, CanonicalSection } from "@engineering-skills/core";
import type { AdapterOptions, AiAdapter, GeneratedFile } from "./adapter.js";
import { renderGeneratedFile } from "./files.js";
import { renderContext, renderInline, renderSection } from "./markdown.js";

export const CLAUDE_PATH = "CLAUDE.md";
export const BLOCK_ID = "engineering-skills";

/** `quality/clean-code` → `eng-quality-clean-code`: a prefix keeps us clear of the user's own skills. */
export const claudeSkillName = (id: string) => `eng-${id.replace(/\//g, "-")}`;
const skillPath = (id: string) => `.claude/skills/${claudeSkillName(id)}/SKILL.md`;

function skillFile(
  section: CanonicalSection,
  output: CanonicalOutput,
  options: AdapterOptions,
): GeneratedFile {
  // Front matter must come first for Claude Code to read it, so the generated-file header follows it.
  const description = `${section.summary.replace(/\s+/g, " ").trim()} Part of this project's engineering rules (generated).`;
  const pre = `---\nname: ${claudeSkillName(section.id)}\ndescription: ${JSON.stringify(description)}\n---\n`;
  const body = renderSection(section, output.project.architecture?.strictness);
  return {
    path: skillPath(section.id),
    content: renderGeneratedFile({ pre, body }, options),
    marker: "full",
  };
}

/**
 * CLAUDE.md gets a managed block (the file is the team's). In `reference` mode the block holds the
 * project facts and prohibitions plus an index, and each skill becomes a `.claude/skills` file Claude
 * loads when relevant; in `inline` mode everything is in the block.
 */
export const claudeAdapter: AiAdapter = {
  id: "claude",
  displayName: "Claude Code",
  defaultMode: "reference",

  outputPaths(output, options) {
    const entry = options.outputPath ?? CLAUDE_PATH;
    return options.mode === "reference"
      ? [entry, ...output.sections.map((s) => skillPath(s.id))]
      : [entry];
  },

  render(output: CanonicalOutput, options: AdapterOptions): readonly GeneratedFile[] {
    const entry = options.outputPath ?? CLAUDE_PATH;
    if (options.mode === "inline") {
      return [{ path: entry, content: renderInline(output), marker: "block", blockId: BLOCK_ID }];
    }
    const index =
      output.sections.length === 0
        ? []
        : [
            "## Engineering skills",
            "",
            "Detailed rules live in these skills; use the ones that match the task.",
            "",
            ...output.sections.map(
              (s) =>
                `- \`${claudeSkillName(s.id)}\` — ${s.title}: ${s.summary.replace(/\s+/g, " ").trim()}`,
            ),
          ];
    return [
      {
        path: entry,
        content: [renderContext(output), ...(index.length > 0 ? [index.join("\n")] : [])].join(
          "\n\n",
        ),
        marker: "block",
        blockId: BLOCK_ID,
      },
      ...output.sections.map((s) => skillFile(s, output, options)),
    ];
  },
};

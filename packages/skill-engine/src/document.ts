/** Structural view of a SKILL.md: title, level-2 sections, and the review checklist. */

export interface Section {
  readonly heading: string;
  readonly body: string;
}

export interface SkillDocument {
  readonly title: string | undefined;
  readonly sections: readonly Section[];
}

const FENCE = /^\s*(```|~~~)/;

export function parseSkillDocument(markdown: string): SkillDocument {
  const sections: { heading: string; lines: string[] }[] = [];
  let title: string | undefined;
  let fence: string | undefined;

  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const fenceMatch = FENCE.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      fence = fence === undefined ? marker : fence === marker ? undefined : fence;
    }
    if (fence === undefined && !fenceMatch) {
      const h1 = /^#\s+(.+?)\s*$/.exec(line);
      if (h1 && title === undefined) {
        title = h1[1];
        continue;
      }
      const h2 = /^##\s+(.+?)\s*$/.exec(line);
      if (h2 && h2[1] !== undefined) {
        sections.push({ heading: h2[1], lines: [] });
        continue;
      }
    }
    sections.at(-1)?.lines.push(line);
  }

  return {
    title,
    sections: sections.map((s) => ({ heading: s.heading, body: s.lines.join("\n").trim() })),
  };
}

/** Items of the "Review Checklist" section: `- [ ] text` or `- text`. */
export function reviewChecklist(doc: SkillDocument): string[] {
  const section = doc.sections.find((s) => s.heading === "Review Checklist");
  if (!section) return [];
  return section.body
    .split("\n")
    .map((line) => /^\s*[-*]\s+(?:\[[ xX]\]\s+)?(.+?)\s*$/.exec(line)?.[1])
    .filter((item): item is string => item !== undefined);
}

/** Rough token estimate (~4 characters per token). Good enough for budgeting. */
export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

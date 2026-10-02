import { describe, expect, it } from "vitest";
import { estimateTokens, parseSkillDocument, reviewChecklist } from "./document.js";

const doc = `# Clean Code

## Purpose
Protect readability.

## Do
- Name by intent.

## Examples
\`\`\`md
## Not A Heading
\`\`\`

## Review Checklist
- [ ] Does each name state intent?
- [x] Is every branch reachable?
* Plain bullet item
`;

describe("parseSkillDocument", () => {
  const parsed = parseSkillDocument(doc);

  it("extracts the title and level-2 sections in order", () => {
    expect(parsed.title).toBe("Clean Code");
    expect(parsed.sections.map((s) => s.heading)).toEqual([
      "Purpose",
      "Do",
      "Examples",
      "Review Checklist",
    ]);
  });

  it("ignores headings inside fenced code blocks", () => {
    expect(parsed.sections.map((s) => s.heading)).not.toContain("Not A Heading");
    expect(parsed.sections.find((s) => s.heading === "Examples")?.body).toContain(
      "## Not A Heading",
    );
  });

  it("extracts review checklist items regardless of bullet style", () => {
    expect(reviewChecklist(parsed)).toEqual([
      "Does each name state intent?",
      "Is every branch reachable?",
      "Plain bullet item",
    ]);
  });

  it("returns an empty checklist when the section is absent", () => {
    expect(reviewChecklist(parseSkillDocument("# T\n\n## Purpose\nx"))).toEqual([]);
  });

  it("handles CRLF input", () => {
    expect(parseSkillDocument("# T\r\n\r\n## Purpose\r\nx\r\n").sections[0]?.heading).toBe(
      "Purpose",
    );
  });
});

describe("estimateTokens", () => {
  it("is roughly one token per four characters", () => {
    expect(estimateTokens("a".repeat(400))).toBe(100);
    expect(estimateTokens("")).toBe(0);
  });
});

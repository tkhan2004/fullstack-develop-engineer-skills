import {
  displayName,
  type CanonicalOutput,
  type CanonicalSection,
  type Strictness,
} from "@engineering-skills/core";

/** What each strictness level asks of the agent (docs/01-concepts/strictness-levels.md). */
export const STRICTNESS_LEAD: Readonly<Record<Strictness, string>> = {
  observe:
    "You are working in an existing codebase. Learn its conventions before writing code: mirror the nearest existing code, and do not introduce a new pattern, dependency or abstraction without asking.",
  minimal: "Follow the existing conventions. Avoid introducing unnecessary new patterns.",
  standard:
    "Follow the architecture and the rules in this file, and flag inconsistencies you notice.",
  strict:
    "These rules are blocking. Do not write code that violates a dependency rule; if a request requires it, say which rule and offer a compliant alternative.",
};

const DEPENDENCY_LEAD: Readonly<Record<Strictness, string>> = {
  observe:
    "These describe how the code is organised today. Follow them for new code; do not enforce them on code you are not touching.",
  minimal: "These describe how the code is organised today. Follow them for new code.",
  standard: "Follow these. Flag a violation if you notice one in code you touch.",
  strict:
    "These are blocking. A change that violates one is not acceptable; explain which rule it breaks and propose a compliant alternative.",
};

const SOURCE_LABEL = {
  selected: "selected",
  detected: "detected",
  confirmed: "confirmed",
  manual: "chosen by the team",
} as const;

const MODE_TEXT = {
  new: "New project",
  adopt: "Existing project (adopt): follow what is already here",
  recommend:
    "Existing project (recommend): follow the existing structure and report improvement opportunities",
  migrate: "Existing project (migrate): move toward the target architecture one module at a time",
} as const;

const pct = (n: number) => `${Math.round(n * 100)}%`;
const code = (s: string) => `\`${s}\``;

/** The one framework-level rule about architecture, stated once instead of in every skill. */
export const ARCHITECTURE_AWARENESS =
  "Determine the project's architecture from, in order: `.engineering/config.yaml`, `.engineering/project-profile.yaml`, observed repository conventions, then detection. " +
  "Do not introduce a different structure into an existing project unless a migration has been explicitly requested.";

/** The project facts and prohibitions every agent sees first. Deterministic, no timestamps. */
export function renderContext(output: CanonicalOutput): string {
  const { project } = output;
  const out: string[] = ["## Project context", ""];

  if (project.name) out.push(`- **Project:** ${project.name}`);
  out.push(
    `- **Mode:** ${MODE_TEXT[project.mode === "new" ? "new" : (project.strategy ?? "adopt")]}`,
  );
  if (project.architecture) {
    const a = project.architecture;
    const how = `${SOURCE_LABEL[a.source]}${a.confidence === undefined ? "" : `, ${pct(a.confidence)} confidence`}`;
    out.push(`- **Architecture:** ${displayName(a.style)} (${how}) · strictness: ${a.strictness}`);
  }
  if (project.stack.length > 0)
    out.push(
      `- **Stack:** ${project.stack.map((s) => `${s.label}: ${displayName(s.value)}`).join(" · ")}`,
    );
  if (project.migration) {
    out.push(
      `- **Migration:** ${displayName(project.migration.from)} → ${displayName(project.migration.to)} (${project.migration.strategy})`,
    );
  }

  out.push("", "## Before you write code", "");
  if (project.architecture) out.push(`- ${STRICTNESS_LEAD[project.architecture.strictness]}`);
  for (const c of project.constraints) out.push(`- ${c}`);
  out.push(`- ${ARCHITECTURE_AWARENESS}`);

  if (project.structure) {
    out.push(
      "",
      "## How this project is organised",
      "",
      `Source root: ${code(project.structure.root)}`,
      "",
    );
    for (const d of project.structure.directories) out.push(`- ${code(d.path)} — ${d.note}`);
    if (project.structure.modules.length > 0) {
      out.push(
        "",
        `Feature modules: ${project.structure.modules.map((m) => code(m.path)).join(", ")}`,
      );
    }
  }

  if (project.conventions.length > 0) {
    out.push("", "## Conventions to mirror", "");
    for (const c of project.conventions)
      out.push(`- ${c.label}: ${c.value} (observed in ${pct(c.share)})`);
  }

  if (project.dependencyRules.length > 0 && project.architecture) {
    out.push("", "## Dependency rules", "", DEPENDENCY_LEAD[project.architecture.strictness], "");
    for (const r of project.dependencyRules) out.push(`- ${r}`);
  }

  if (output.references.length > 0) {
    out.push("", "## Reference modules: imitate these", "");
    for (const r of output.references)
      out.push(`- **${r.concern}:** ${code(r.path)} — ${r.reason}`);
  }
  return out.join("\n");
}

/** A skill as a titled section. `toneLabel` is the strictness the tone belongs to. */
export function renderSection(
  section: CanonicalSection,
  strictness: Strictness | undefined,
): string {
  const out = [`## ${section.title}`, ""];
  if (section.tone)
    out.push(`> At ${strictness ?? "the configured"} strictness: ${section.tone}`, "");
  out.push(section.body.trim());
  return out.join("\n");
}

/** Context followed by every section, as one document body (no title). */
export function renderInline(output: CanonicalOutput): string {
  const strictness = output.project.architecture?.strictness;
  return [renderContext(output), ...output.sections.map((s) => renderSection(s, strictness))].join(
    "\n\n",
  );
}

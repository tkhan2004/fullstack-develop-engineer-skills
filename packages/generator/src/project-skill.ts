import {
  ARCHITECTURE_AWARENESS,
  renderGeneratedFile,
  type HeaderMeta,
} from "@engineering-skills/adapters";
import type { Profile } from "@engineering-skills/detection";

export const PROJECT_SKILL_ID = "project/conventions";
export const PROJECT_SKILL_DIR = "skills/conventions";

type Convention = NonNullable<Profile["conventions"]["naming"]["variables"]>;

interface Rule {
  readonly label: string;
  readonly consistent: boolean;
  readonly ratio: number;
  readonly do: string;
  readonly dont?: string;
  readonly check: string;
}

const phrase = (
  kind: string,
  value: string,
  c: Convention,
  aliases: readonly string[],
): { do: string; dont?: string; check: string } | undefined => {
  switch (`${kind}:${value}`) {
    case "tests.placement:colocated":
      return {
        do: "Put a test next to the code it tests.",
        dont: "Do not add a second test location.",
        check: "Is each new test next to the code it tests?",
      };
    case "tests.placement:dunder-tests":
      return {
        do: "Put tests in a `__tests__` directory beside the code.",
        dont: "Do not add a second test location.",
        check: "Are new tests in a `__tests__` directory?",
      };
    case "tests.placement:separate-dir":
      return {
        do: "Put tests under the top-level tests directory.",
        dont: "Do not scatter tests beside the code.",
        check: "Are new tests under the top-level tests directory?",
      };
    case "errors.strategy:custom-error-class":
      return {
        do: `Throw the project's custom error class${c.detail ? ` (${c.detail})` : ""}.`,
        dont: "Do not throw a bare `Error` where the custom error class fits.",
        check: "Do new failures use the project's error class?",
      };
    case "errors.strategy:built-in-errors":
      return {
        do: "Throw built-in error types.",
        dont: "Do not introduce a custom error hierarchy without asking.",
        check: "Do new failures use built-in error types?",
      };
    case "errors.strategy:framework-exceptions":
      return {
        do: "Use the framework's exception classes for failures.",
        check: "Do new failures use the framework's exceptions?",
      };
    case "imports.style:relative":
      return {
        do: "Use relative imports between project files.",
        dont: "Do not introduce path aliases.",
        check: "Are new imports relative?",
      };
    case "imports.style:alias":
      return {
        do: `Use the configured path aliases${aliases.length > 0 ? ` (${aliases.map((a) => `\`${a}\``).join(", ")})` : ""}.`,
        check: "Do new imports use the path aliases?",
      };
    case "exports.style:named":
      return {
        do: "Use named exports.",
        dont: "Do not add default exports.",
        check: "Are new modules exported by name?",
      };
    case "exports.style:default":
      return {
        do: "Use default exports for modules.",
        check: "Do new modules use default exports?",
      };
    case "async.style:async-await":
      return {
        do: "Use async/await.",
        dont: "Do not introduce promise chains.",
        check: "Is new asynchronous code written with async/await?",
      };
    case "async.style:promise-chains":
      return {
        do: "Follow the existing promise-chain style.",
        check: "Does new asynchronous code follow the existing promise-chain style?",
      };
    default:
      return undefined;
  }
};

function rules(profile: Profile): Rule[] {
  const c = profile.conventions;
  const out: Rule[] = [];
  const named = (label: string, conv: Convention | undefined, noun: string) => {
    if (!conv) return;
    out.push({
      label,
      consistent: conv.consistent !== false,
      ratio: conv.ratio,
      do: `Name ${noun} in ${conv.value}.`,
      check: `Are new ${noun} named in ${conv.value}?`,
    });
  };
  named("Variable names", c.naming.variables, "variables and functions");
  named("File names", c.naming.files, "files");
  named("Class names", c.naming.classes, "classes");

  const add = (kind: string, label: string, conv: Convention | undefined) => {
    if (!conv) return;
    const p = phrase(kind, conv.value, conv, c.imports?.aliases ?? []);
    if (p) out.push({ label, consistent: conv.consistent !== false, ratio: conv.ratio, ...p });
  };
  add("tests.placement", "Test placement", c.tests.placement);
  if (c.tests.naming) {
    out.push({
      label: "Test file names",
      consistent: c.tests.naming.consistent !== false,
      ratio: c.tests.naming.ratio,
      do: `Name test files ${"`"}${c.tests.naming.value}${"`"}.`,
      check: `Are new test files named ${"`"}${c.tests.naming.value}${"`"}?`,
    });
  }
  add("errors.strategy", "Error handling", c.errors?.strategy);
  if (c.validation) {
    out.push({
      label: "Validation",
      consistent: c.validation.library.consistent !== false,
      ratio: c.validation.library.ratio,
      do: `Validate input at the boundary with ${c.validation.library.value}.`,
      dont: `Do not add a second validation library; the project uses ${c.validation.library.value}.`,
      check: `Is new input validated with ${c.validation.library.value}?`,
    });
  }
  add("imports.style", "Imports", c.imports?.style);
  add("exports.style", "Exports", c.exports?.style);
  add("async.style", "Async style", c.async?.style);
  return out;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

const SKILL_YAML = `id: ${PROJECT_SKILL_ID}
version: 1.0.0
title: Project Conventions
summary: "How this repository is already written: naming, tests, errors and reference modules."
category: project
priority: 5
applies_to:
  project.mode: [existing]
touches_structure: true
strictness_overrides:
  observe: Mirror the nearest existing code. Do not introduce a new pattern unprompted.
`;

/**
 * The skill that tells an agent how *this* repository is written, built from the analysis.
 * It is generated once; a hand-edited copy is kept (see planGeneration). Returns undefined when
 * nothing consistent was observed, because an empty skill would be noise.
 */
export function renderProjectSkill(
  profile: Profile,
  meta: HeaderMeta,
): { readonly skillYaml: string; readonly skillMd: string } | undefined {
  const all = rules(profile);
  const consistent = all.filter((r) => r.consistent);
  if (consistent.length === 0 && profile.reference_modules.length === 0) return undefined;

  const bullets = (items: readonly string[], none: string) =>
    (items.length > 0 ? items : [none]).map((i) => `- ${i}`);
  const lines = [
    "# Project Conventions",
    "",
    "## Purpose",
    "",
    "Keep new code consistent with how this repository is already written. These conventions were observed in the code by `eng-skills analyze`: they describe the project as it is, not as a textbook says it should be.",
    "",
    "## When This Skill Applies",
    "",
    "When writing, modifying or reviewing code in this repository, and whenever a generic practice appears to conflict with what the code does.",
    "",
    "## Architecture Awareness",
    "",
    ARCHITECTURE_AWARENESS,
    "",
    "## Core Principles",
    "",
    "1. The existing code is the specification: match the nearest existing module before applying a generic rule.",
    "2. A convention followed by fewer than 65% of the sampled code is not a convention: do not extend it, and do not rewrite it.",
    "3. Report a problem you notice; do not repair it unasked.",
    "",
    "## Decision Rules",
    "",
    "- If a requirement cannot be implemented inside the existing structure, describe the conflict instead of introducing a new structural concept.",
    "- If two observed conventions disagree, follow the one in the files closest to the change.",
    "- If a convention conflicts with a security or correctness requirement, follow the requirement and say why.",
    "",
    "## Do",
    "",
    ...bullets(
      consistent.map((r) => `${r.do} (observed in ${pct(r.ratio)})`),
      "Mirror the nearest existing module.",
    ),
    "",
    "## Don't",
    "",
    ...bullets(
      consistent.flatMap((r) => (r.dont ? [r.dont] : [])),
      "Do not introduce a pattern, dependency or abstraction the project does not already use.",
    ),
    "",
    "## Examples",
    "",
    ...(profile.reference_modules.length > 0
      ? [
          "Imitate these existing files:",
          "",
          ...profile.reference_modules.map((m) => `- ${m.concern}: \`${m.path}\` (${m.reason})`),
        ]
      : ["No safe reference module was found; mirror the nearest module you read."]),
    "",
    "## Review Checklist",
    "",
    ...bullets(
      consistent.map((r) => `${r.check}`),
      "Does the change mirror the nearest existing module?",
    ),
    "",
    "## Interaction With Other Skills",
    "",
    "This skill describes what is true of this repository. When it conflicts with a generic quality rule it wins, unless the generic rule is about security or correctness. The architecture rules in `.engineering/config.yaml` still apply.",
  ];
  return { skillYaml: SKILL_YAML, skillMd: renderGeneratedFile({ body: lines.join("\n") }, meta) };
}

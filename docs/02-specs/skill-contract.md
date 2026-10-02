# Spec — Skill Contract

Status: draft

Every skill MUST satisfy this contract. CI validates it; a skill that fails is not shipped.

## 1. Layout

```text
skills/<category>/<name>/
├── skill.yaml       required — metadata
├── SKILL.md         required — agent-facing instructions
├── rules.md         optional — human rationale, trade-offs, references
├── examples/        recommended — bad.ts / good.ts pairs
│   ├── bad.ts
│   └── good.ts
└── tests/           optional — resolution and content assertions
```

## 2. `skill.yaml`

```yaml
id: quality/clean-code # MUST equal the directory path
version: 1.0.0 # semver
title: Clean Code
summary: >
  Actionable naming, function, and module rules; how to decide when an abstraction
  is justified.

category: quality # core|architecture|quality|backend|frontend|database|engineering
priority: 40 # lower = earlier in generated output

applies_to: # omitted = always on
  engineering.clean_code: [true]

requires: [core/engineering-principles]
conflicts_with: []

strictness_overrides:
  observe: >
    Mirror the naming and structure of the surrounding code even where it differs from
    these rules. Do not rename or restructure existing code.
  strict: >
    These rules are blocking for new and modified code.

sources: # traceability into docs/sot — see sot/mapping
  - sot: books/clean-code
    topics: [naming, functions, comments]
  - sot: style-guides/google-typescript
    topics: [naming]

tokens_estimate: 900 # budget guard; see §6
```

## 3. `SKILL.md` structure

Required headings, in this order:

```md
# <Title>

## Purpose

One paragraph. What engineering outcome this skill protects.

## When This Skill Applies

Concrete triggers. "When writing or reviewing a function", not "always".

## Architecture Awareness

Required for any skill that touches structure. Use the standard block (§4).

## Core Principles

3–7 numbered principles. Each is a claim that can be violated.

## Decision Rules

If/then guidance for the judgement calls this skill exists to resolve.

## Do

Imperative, checkable statements.

## Don't

Imperative, checkable statements. Each one SHOULD name the failure it prevents.

## Examples

Minimal bad/good pairs with a one-line explanation of what changed and why.

## Review Checklist

The questions a reviewer asks. Drives `eng-skills review`.

## Interaction With Other Skills

Which skills this defers to, extends, or overlaps with — and who wins.
```

## 4. Standard Architecture Awareness block

```md
## Architecture Awareness

Determine the project's architecture, in this order:

1. Explicit `.engineering/config.yaml`
2. `.engineering/project-profile.yaml`
3. Observed repository conventions
4. Architecture detection

Do not introduce a different structure into an existing project unless a migration has been
explicitly requested.
```

## 5. Writing rules

### Actionable, not aspirational

| ❌ Reject                 | ✅ Accept                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| "Write clean code."       | "A function that needs a comment to explain _what_ it does SHOULD be renamed or split."                           |
| "Use meaningful names."   | "Avoid `data`, `result`, `info`, `process`, `handle`, `manager` unless the meaning is obvious within five lines." |
| "Follow SOLID."           | "A class with two sets of methods that never touch the same field is two classes."                                |
| "Handle errors properly." | "A `catch` block that neither adds context nor changes control flow MUST be removed."                             |
| "Write good tests."       | "Every business rule in the requirement MUST have one test whose name states that rule."                          |

### Anti-patterns that fail review

1. **Hard-coded structure.** `Always create src/domain, src/application, src/infrastructure`.
   Structure comes from the architecture manifest, never from a skill body.
2. **Framework ⇒ architecture.** "In Express, put business logic in services." Only if the
   configured architecture says so.
3. **Duplicating another skill.** Reference it instead.
4. **Unfalsifiable advice.** If no diff can violate it, delete it.
5. **Tool-specific phrasing.** No "as Claude, you should…" — that is adapter territory.
6. **Unbounded lists.** 40 bullet points are ignored; pick the 7 that matter.

### Voice

- Second person, imperative, present tense.
- RFC 2119 keywords for normative force: MUST / MUST NOT / SHOULD / MAY.
- No hedging ("it might be nice to consider possibly").
- No motivational filler.

## 6. Size budget

| Skill class  | Target        | Hard cap |
| ------------ | ------------- | -------- |
| core         | ≤ 1200 tokens | 1800     |
| architecture | ≤ 1500 tokens | 2200     |
| technology   | ≤ 1200 tokens | 1800     |
| practice     | ≤ 1000 tokens | 1500     |

Total resolved output SHOULD stay under ~12k tokens for a typical config. The generator MUST
report the total and warn past the budget. Long reference material belongs in `rules.md`
(human-facing) or `docs/sot/notes/` — not in `SKILL.md`.

## 7. Examples

- `examples/bad.ts` and `examples/good.ts` MUST compile under the repo's `tsconfig`.
- They MUST be minimal — one idea per pair, ≤ 40 lines.
- The `good` version MUST fix only the issue under discussion.
- Examples MUST NOT embed an architecture unless the skill is an architecture skill.

## 8. Validation (CI)

- [ ] `skill.yaml` parses; `id` matches directory; semver valid
- [ ] all required `SKILL.md` headings present, in order
- [ ] `requires` resolve to existing skills; no cycles
- [ ] `conflicts_with` is symmetric
- [ ] no hard-coded architecture paths outside `architectures/**`
- [ ] token estimate within cap
- [ ] examples compile and lint
- [ ] every `sources[]` entry exists in `docs/sot/mapping/skill-source-map.md`
- [ ] no banned phrase ("write clean code", "follow best practices", "as an AI")

## 9. Authoring workflow

See [skill-authoring-checklist.md](../04-checklists/skill-authoring-checklist.md) — including
the step most often skipped: **test the skill against a real task before merging it**.

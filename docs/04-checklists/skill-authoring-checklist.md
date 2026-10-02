# Skill Authoring Checklist

Run this for **every** skill, new or modified.
Contract: [skill-contract.md](../02-specs/skill-contract.md)

## 1. Before writing

- [ ] The skill has one clear job, stateable in one sentence
- [ ] No existing skill already covers it (check `requires` / overlap)
- [ ] Sources identified in [docs/sot](../sot/INDEX.md) and recorded in `sources[]`
- [ ] Decide what this skill does **not** cover, and which skill does

## 2. Research

- [ ] Read the primary sources, not summaries of them
- [ ] Write distilled notes in `docs/sot/notes/<topic>.md` (your words, with citations)
- [ ] Note where sources disagree — the skill must take a position and say why
- [ ] Identify the 5–10 rules that actually change agent behaviour

## 3. Writing `SKILL.md`

- [ ] All required headings, in order
- [ ] `## Architecture Awareness` block included if the skill touches structure
- [ ] Every rule is falsifiable — a diff can violate it
- [ ] No hard-coded directory paths (outside architecture skills)
- [ ] No framework ⇒ architecture inference
- [ ] RFC 2119 keywords used deliberately
- [ ] Imperative, second person, no filler, no motivation
- [ ] Decision Rules cover the judgement calls, not just the easy cases
- [ ] Review Checklist is answerable while reading a diff
- [ ] Interaction With Other Skills states who wins on overlap

## 4. Anti-pattern sweep

- [ ] No "write clean code" / "follow best practices" / "use meaningful names" without a rule
- [ ] No duplicated content from another skill (reference instead)
- [ ] No tool-specific phrasing ("as Claude…")
- [ ] No unbounded bullet lists (≤ ~7 per section)
- [ ] No advice that assumes a project size, team size or domain not stated in config

## 5. Examples

- [ ] `examples/bad.ts` and `examples/good.ts` exist
- [ ] ≤ 40 lines each, one idea per pair
- [ ] Both compile; `good` fixes only the issue in question
- [ ] One-line note explaining what changed and why it matters
- [ ] No architecture embedded (unless an architecture skill)

## 6. Metadata

- [ ] `id` matches the directory path
- [ ] `version` set; bumped correctly on change (minor = content, major = applies_to/requires/id)
- [ ] `applies_to` is as narrow as correctness allows
- [ ] `requires` lists real dependencies only
- [ ] `priority` placed sensibly in the global ordering
- [ ] `strictness_overrides` written for `observe` and `strict` if the tone should differ
- [ ] `sources[]` entries resolvable in `docs/sot/mapping/skill-source-map.md`
- [ ] `tokens_estimate` within the category cap

## 7. Validation

- [ ] `pnpm skill:validate <id>` passes
- [ ] Resolution test: the skill appears for the configs it should, and not otherwise
- [ ] Generated output inspected — the skill reads well _in context_, not just alone
- [ ] Token budget for a typical config still within limits

## 8. Behaviour test (do not skip)

- [ ] Pick a realistic task in a fixture repo
- [ ] Run an agent **without** the skill — record the output
- [ ] Run **with** the skill — record the output
- [ ] The difference is visible and in the intended direction
- [ ] Record both in `docs/sot/notes/skill-evaluations.md`

> A skill that does not change agent behaviour is documentation, not a skill.

## 9. Review

- [ ] A second person (or a fresh session) reads it cold and can apply it
- [ ] Every rule survives "can a reviewer point at a diff and say this violates it?"
- [ ] Trade-offs stated where the rule has real costs
- [ ] No claim stronger than the evidence behind it

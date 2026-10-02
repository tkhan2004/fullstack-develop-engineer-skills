# P3 — Skill Engine

**Entry** P2 · **Exit** reference config resolves to the documented set, in order; deterministic + idempotent.
Specs: [skill-system.md](../01-concepts/skill-system.md), [skill-contract.md](../02-specs/skill-contract.md)

## Model

- [ ] `skill.yaml` Zod schema (id, version, title, summary, category, priority,
      `applies_to`, `requires`, `conflicts_with`, `strictness_overrides`, `sources`,
      `tokens_estimate`)
- [ ] `SKILL.md` parser: headings, checklist extraction, examples
- [ ] Skill id ↔ directory path validation

## Registry

- [ ] Loader scanning `skills/**` and `architectures/*/SKILL.md`
- [ ] In-memory index by id and by category
- [ ] Duplicate id → error
- [ ] Missing `requires` target → error naming both skills

## Resolver

- [ ] `applies_to` matcher: exact, list, `*`, `!negation`
- [ ] Always-on core seeding
- [ ] Transitive `requires` expansion
- [ ] `conflicts_with` detection with an actionable message
- [ ] Topological sort; ties by `priority`, then id
- [ ] `selected_by` provenance recorded per skill
- [ ] Strictness wording attached per skill

## Properties (tested, not assumed)

- [ ] Deterministic: same input → identical ordered output, 100 runs
- [ ] Idempotent: resolving a resolved set is a no-op
- [ ] Total: minimal config yields a valid core-only set
- [ ] Explainable: every skill has a non-empty `selected_by`

## Budget

- [ ] Token estimation per skill and for the whole set
- [ ] Warn when the set exceeds the configured budget
- [ ] Report the largest contributors when over budget

## Contract validation (CI)

- [ ] Required headings present and ordered
- [ ] No hard-coded architecture paths outside `architectures/**`
- [ ] Banned-phrase check ("write clean code", "best practices", "as an AI", …)
- [ ] Examples compile and lint
- [ ] Every `sources[]` entry exists in `docs/sot/mapping/skill-source-map.md`
- [ ] Per-skill token cap enforced

## Tests

- [ ] Reference config → exactly the set in skill-system.md §3, in order
- [ ] Removing `engineering.testing` removes exactly `engineering/testing`
- [ ] `overrides.skills.include/exclude` honoured
- [ ] Cycle in `requires` → readable error
- [ ] `mode: existing` always includes `core/project-onboarding`

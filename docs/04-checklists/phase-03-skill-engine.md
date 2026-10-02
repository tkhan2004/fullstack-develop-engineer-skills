# P3 — Skill Engine

**Entry** P2 · **Exit** reference config resolves to the documented set, in order; deterministic + idempotent.
Specs: [skill-system.md](../01-concepts/skill-system.md), [skill-contract.md](../02-specs/skill-contract.md)

## Model

- [x] `skill.yaml` Zod schema (id, version, title, summary, category, priority,
      `applies_to`, `requires`, `conflicts_with`, `strictness_overrides`, `sources`,
      `tokens_estimate`)
- [x] `SKILL.md` parser: headings, checklist extraction, examples
- [x] Skill id ↔ directory path validation

## Registry

- [x] Loader scanning `skills/**` and `architectures/*/SKILL.md`
- [x] In-memory index by id and by category
- [x] Duplicate id → error
- [x] Missing `requires` target → error naming both skills

## Resolver

- [x] `applies_to` matcher: exact, list, `*`, `!negation`
- [x] Always-on core seeding
- [x] Transitive `requires` expansion
- [x] `conflicts_with` detection with an actionable message
- [x] Topological sort; ties by `priority`, then id
- [x] `selected_by` provenance recorded per skill
- [x] Strictness wording attached per skill

## Properties (tested, not assumed)

- [x] Deterministic: same input → identical ordered output, 100 runs
- [x] Idempotent: resolving a resolved set is a no-op
- [x] Total: minimal config yields a valid core-only set
- [x] Explainable: every skill has a non-empty `selected_by`

## Budget

- [x] Token estimation per skill and for the whole set
- [x] Warn when the set exceeds the configured budget
- [x] Report the largest contributors when over budget

## Contract validation (CI)

- [x] Required headings present and ordered
- [x] No hard-coded architecture paths outside `architectures/**`
- [x] Banned-phrase check ("write clean code", "best practices", "as an AI", …)
- [ ] Examples compile and lint
- [x] Every `sources[]` entry exists in `docs/sot/mapping/skill-source-map.md`
- [x] Per-skill token cap enforced

## Tests

- [x] Reference config → exactly the set in skill-system.md §3, in order
- [x] Removing `engineering.testing` removes exactly `engineering/testing`
- [x] `overrides.skills.include/exclude` honoured
- [x] Cycle in `requires` → readable error
- [x] `mode: existing` always includes `core/project-onboarding` (it is always on, for every mode)

## Status notes

- Package: `packages/skill-engine`. 85 tests (178 in the repo).
- Resolver is proven against a _synthetic_ library mirroring skill-system.md §3. Re-run the
  same assertions against the real library in P10.
- Not yet done: compiling/linting `examples/bad.ts` + `good.ts` (needs real skills), and a
  heuristic for "framework ⇒ architecture" statements in skill text.
- `applies_to` reads the config only. Matching on profile values is deferred until a skill
  actually needs it.

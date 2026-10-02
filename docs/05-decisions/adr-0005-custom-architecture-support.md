# ADR-0005 — `custom` architecture is a V1 requirement

- **Status**: accepted
- **Date**: 2026-10-01

## Context

Real repositories often match none of the named styles:

```text
src/
├── auth/  user/  order/        ← feature-ish
├── common/  shared/            ← overlapping shared layers
└── database/                   ← imported directly by features
```

Detection on such a repo yields `feature-based 63%`, `modular-monolith 42%`. Forcing a choice
among named styles means either a confidently wrong label, or a prompt the user cannot answer
honestly. Either outcome makes `adopt` a fiction.

## Options considered

### A. Force a named style, pick the highest score

- Pros: simple; downstream code only handles known styles.
- Cons: dishonest; generated rules would describe a structure the project does not have; the
  agent would then "correct" code toward a style nobody chose.

### B. Fall back to "no architecture configured"

- Pros: honest.
- Cons: throws away everything detection learned; the agent gets no structural guidance at
  all, which is worse than imperfect guidance.

### C. `custom` — a manifest that _describes_ the repository

- Pros: honest and useful; the agent is told the actual module paths, shared directories and
  observed dependency directions; `doctor` can check consistency with observed behaviour;
  the escape hatch that makes `adopt` real.
- Cons: a second manifest shape (generated, no tree); rules become descriptive rather than
  prescriptive; `doctor` checks must distinguish "observed" from "declared".

## Decision

Ship `custom` in V1.

- The architecture catalogue is **open**: `layered | feature | clean | feature-clean |
hexagonal | custom`.
- `custom` manifests are generated from the project profile and describe `structure` and
  `dependency_rules.mode: observed`.
- `custom` generates no tree, ever.
- Detection falls back to `custom` below 0.60 confidence, carrying ranked alternatives.
- `--yes` with sub-0.85 confidence produces `custom`, never a guess.

> The framework can describe the architecture of a project, instead of forcing a project into
> a predefined architecture.

## Consequences

**Positive**

- Honest output on the majority of real repositories.
- `adopt` has something concrete to adopt.
- Low-confidence detection has a correct destination instead of a bad guess.

**Negative**

- Two manifest shapes to maintain (declared and observed).
- `doctor` semantics differ under `custom` (consistency, not compliance).
- Users may stay on `custom` indefinitely — acceptable; that is their call, and `recommend`
  exists for those who want a path forward.

**Follow-up**

- Manifest spec §5; config schema §3.
- `ambiguous-mixed` fixture asserts the fallback.
- A later `custom → named` promotion flow is backlog, not V1.

## Revisit when

Fixture evidence shows the named styles cover ≥ 90% of real repositories with high confidence —
unlikely, and still not a reason to remove the escape hatch.

# ADR-0003 — Architecture is independent of stack

- **Status**: accepted
- **Date**: 2026-10-01

## Context

Most tooling bundles a framework with an implied structure: Express tutorials assume
`controllers/services/`, NestJS assumes module-per-feature, Next.js assumes its routing
convention _is_ the architecture. Encoding those assumptions would make the framework
opinionated in exactly the dimension where teams differ most.

## Options considered

### A. Framework-implied architecture (with override)

- Pros: fewer questions; defaults feel smart.
- Cons: the default is wrong often enough to be dangerous; detection would inherit the bias
  ("it uses Express, so it must be layered"), producing confident wrong answers.

### B. Fully independent axes

- Pros: any legal combination is expressible; detection is driven by evidence rather than by
  assumption; adding a framework does not add architectural opinions.
- Cons: one more question in the new-project flow; more combinations to document.

## Decision

Stack and architecture are independent configuration axes. The framework MUST NOT infer one
from the other, in either direction, in configuration **or** in detection.

Specifically forbidden: Express ⇒ layered · NestJS ⇒ clean · TypeScript ⇒ anything ·
monorepo ⇒ microservices · a directory named `domain/` ⇒ DDD (that is evidence, weighted, not
proof).

Technology skills MUST read `architecture.*.style` and adapt; they MUST NOT prescribe folders.
Architecture skills MUST NOT assume a framework.

## Consequences

**Positive**

- Honest detection: a layered claim rests on the import graph, not on `package.json`.
- Adding Fastify/Drizzle/Vue is a data change with no architectural side effects.
- The product's core promise — "you choose the architecture" — is structurally true.

**Negative**

- The new-project flow asks one more question.
- Skill authors must write framework guidance that branches on architecture, which is harder.

**Follow-up**

- Skill contract bans framework ⇒ architecture statements; CI checks for them.
- Detection weights the import graph (0.45) above directory vocabulary (0.35) precisely to
  avoid name-based bias.

## Revisit when

Never for configuration. For detection, weights may be tuned with fixture evidence — but the
independence rule itself stands.

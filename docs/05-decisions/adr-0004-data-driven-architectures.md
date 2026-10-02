# ADR-0004 — Architectures and skills are data, not code

- **Status**: accepted
- **Date**: 2026-10-01

## Context

The naive implementation branches per architecture:

```ts
if (architecture === "clean") {
  /* 500 lines of mkdir and strings */
}
if (architecture === "layered") {
  /* 500 lines */
}
```

Every new architecture then means editing the engine, every rule change means a release, and
community contribution requires understanding the codebase.

## Options considered

### A. Code branches per architecture

- Pros: fastest to write the first one; full expressive power.
- Cons: combinatorial growth; untestable in isolation; contributions blocked behind core
  knowledge; the framework would violate the open/closed principle it teaches.

### B. Declarative manifests interpreted by a generic engine

- Pros: adding an architecture is a directory of YAML/Markdown; the engine can _reason_
  (dependency checking, detection scoring) rather than copy folders; data is reviewable by
  non-contributors; the project practises what it preaches.
- Cons: the manifest format must anticipate real variation; some styles may not fit and will
  need format extensions; an interpreter is more work than the first hard-coded case.

### C. Plugin modules with code

- Pros: unlimited expressiveness.
- Cons: executing third-party code; sandboxing; versioning pain; overkill for V1.

## Decision

Architectures, skills, stacks and presets are **data**. The engine interprets them.

```text
Code (packages/)                 Data (skills/, architectures/, stacks/, presets/)
how to resolve skills            which skills exist and what they say
how to read a manifest           what `clean` architecture is
how to score confidence          which directory names hint at `layered`
how to render output             the rule text
```

Acceptance test: adding Fastify, Drizzle, MySQL, Vue or a new architecture MUST require zero
engine changes. The architecture-authoring checklist makes this explicit.

## Consequences

**Positive**

- Community contributions are reviewable as content.
- Each architecture is independently testable.
- The dependency checker works for any architecture that declares rules.

**Negative**

- The manifest format is now a contract with versioning obligations.
- Some expressiveness is lost; unusual styles may need `custom` or a format extension.
- The first architecture costs more than a hard-coded one would.

**Follow-up**

- [architecture-manifest.md](../02-specs/architecture-manifest.md)
- A P4 test proves a throwaway architecture works with no engine change.
- Manifest `version` field from day one.

## Revisit when

A genuinely needed architecture cannot be expressed declaratively — then extend the format,
and only consider code plugins if extension fails twice.

# ADR-0001 — Project Mode is a first-class concept

- **Status**: accepted
- **Date**: 2026-10-01

## Context

The original plan assumed `init` on a fresh project: pick a stack, pick an architecture,
generate structure. Real usage is dominated by the opposite case — a developer (or an agent)
joining a codebase that already exists, with its own conventions, its own history and no
appetite for restructuring.

Treating "existing project" as a variation of the new-project flow produces a tool that runs
a generator against a working repository. That is the single most damaging failure mode this
product can have.

## Options considered

### A. One flow, with a "don't generate structure" flag

- Pros: least code; one prompt sequence.
- Cons: the flag silently changes the meaning of every later answer; architecture selection
  becomes a _decision_ when it should be a _detection_; nothing forces the tool to look at
  the repo before writing.

### B. Project Mode as a first-class axis (`new` | `existing`) with distinct workflows

- Pros: each workflow asks the question appropriate to its situation; detection becomes
  mandatory for existing projects; the config records the mode, so every downstream consumer
  (resolver, adapters, doctor) can behave correctly.
- Cons: more surface area; two flows to test; `custom` architecture support becomes mandatory.

### C. Separate binaries (`eng-skills-new`, `eng-skills-adopt`)

- Pros: maximum separation.
- Cons: terrible UX; duplicated infrastructure; users would not know which to run.

## Decision

Project Mode is a first-class concept. `init` asks it first, pre-selected by repository
evidence. `new` and `existing` have **different workflows** that share the configuration
model, the skill engine and the adapters — and nothing else.

Three workflows exist: **CREATE** (new), **ADOPT** (existing), **MIGRATE** (existing,
explicit).

```text
Building from scratch  → "What architecture should we use?"   → offer the catalogue
Joining a project      → "What architecture is already here?" → analyse first
Restructuring          → "How do we migrate safely A → B?"    → incremental plan
```

## Consequences

**Positive**

- Detection is mandatory, not optional, for existing projects.
- The agent is told the truth about the project it is in.
- The tool is safe to run on a stranger's repository.

**Negative**

- Two interactive flows, two sets of E2E tests.
- `custom` architecture support becomes non-negotiable (see ADR-0005).
- `project.mode` becomes a load-bearing config field that is awkward to change later.

**Follow-up**

- [project-mode.md](../01-concepts/project-mode.md)
- Detection engine (P5) is on the critical path for V1.
- `mode` recorded in config; changing it is an explicit user action, never automatic.

## Revisit when

Telemetry (if ever added) or user reports show one mode is effectively unused — then consider
collapsing the flows.

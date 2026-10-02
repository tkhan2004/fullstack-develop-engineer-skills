# ADR-0002 — `adopt` is the default strategy for existing projects

- **Status**: accepted
- **Date**: 2026-10-01

## Context

Once an existing project is detected, the framework must decide what to tell the agent. The
tempting default is "apply the architecture the user selected" — which, on a repository with
an established structure, means rewriting it.

A tool that reshapes every repository it touches will be uninstalled after one run, and
rightly so.

## Options considered

### A. Default to the user's selected architecture

- Pros: consistent output across projects.
- Cons: destructive; contradicts "existing conventions outrank generic best practice";
  produces agents that fight the codebase.

### B. Default to `adopt`, with `recommend` and `migrate` available

- Pros: safe; matches what a competent new team member does; makes the detected architecture
  the operating reality; migration remains possible but explicit.
- Cons: a project with a genuinely harmful structure gets its structure reinforced unless the
  user opts into `recommend` or `migrate`.

### C. Always ask, no default

- Pros: no implicit behaviour.
- Cons: forces a decision before the user has the information to make it; `--yes` has no
  sensible answer.

## Decision

For `project.mode: existing`:

- `adoption.strategy` defaults to **`adopt`**, pre-selected in the prompt.
- Default strictness for `adopt` is **`observe`**.
- `migrate` is **never** a default and requires an explicit command.
- No strictness level authorises restructuring. Only `migrate` does.

Mitigation for option B's cost: `adopt` still **reports** health observations neutrally (and
`recommend` elevates them), so a harmful structure is visible without being "fixed" uninvited.

## Consequences

**Positive**

- The framework is safe to run on any repository.
- Agent output matches the surrounding code, which is what reviewers want.
- "Diagnose first, migrate later, only when asked" becomes enforceable.

**Negative**

- Users who _want_ a restructure must take an extra, deliberate step.
- Generated rules for a messy project will describe a messy project.

**Follow-up**

- [strictness-levels.md](../01-concepts/strictness-levels.md) — `observe` level exists for this.
- Health observations in the project profile must be neutral in wording.
- V1 DoD includes a test asserting no source file changes during existing-project `init`.

## Revisit when

Users consistently choose `migrate` immediately after `adopt` — that would suggest the default
is adding a step rather than preventing harm.

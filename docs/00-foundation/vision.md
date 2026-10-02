# Vision

Status: accepted

## 1. The problem

AI coding agents are competent at _writing code_ and poor at _fitting into an engineering
context_. Concretely, on a real codebase they tend to:

- invent a structure instead of following the one that already exists;
- apply a generic "best practice" that contradicts a deliberate local convention;
- put business logic wherever the file they opened happens to be;
- skip the diagnosis step and patch symptoms;
- produce code that passes review for syntax and fails review for architecture;
- forget the project's rules the moment the context window rolls over.

Teams compensate by writing ever-longer `CLAUDE.md` / `AGENTS.md` / `.cursorrules` files by
hand. Those files are unversioned, unstructured, duplicated per repo, untested, and drift.

## 2. The product

A framework that produces **project-specific engineering instructions for AI agents**, derived
from an explicit, validated configuration — plus a library of reusable, actionable engineering
skills those instructions are composed from.

```text
Project reality (new choice OR detected from repo)
        ↓
Validated configuration  (.engineering/config.yaml)
        ↓
Skill resolution         (which rules apply to THIS project)
        ↓
AI adapter               (Claude / Codex / generic)
        ↓
Agent instructions the agent actually follows
```

## 3. Target users

| User                             | Need                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| Solo dev starting a project      | Pick an architecture once, have the agent respect it forever                          |
| Dev joining an existing codebase | Have the agent learn the repo's conventions instead of fighting them                  |
| Tech lead                        | Encode team standards once; every agent in the team inherits them                     |
| OSS maintainer                   | Give contributors (human and AI) a machine-readable definition of "how we build here" |
| Consultant / agency              | Carry a portable engineering standard across many client stacks                       |

## 4. Product principles

1. **The developer chooses the architecture. The framework never does.**
   Technology does not imply architecture. Express ≠ layered. TypeScript ≠ clean.
2. **An existing repository is authoritative.**
   The framework adapts to the repo; it does not reshape the repo to match itself.
   See [ADR-0002](../05-decisions/adr-0002-adopt-is-default-for-existing-projects.md).
3. **Rules must be actionable.**
   "Write clean code" is noise. "Do not name a variable `data` unless the surrounding five
   lines make its content obvious" is a rule.
4. **Configuration is the source of truth.**
   Detection fills configuration; it never overrides it.
5. **Tool-independent core.**
   Claude-specific and Codex-specific concerns live only in adapters.
6. **Non-destructive by default.**
   No command rewrites a user's source tree unless the user explicitly asked for a migration.
7. **Deterministic.**
   Same config + same version ⇒ byte-identical output.

## 5. What success looks like

**For a new project**

```bash
npx @engineering-skills/cli init
# choose: TypeScript / Express / PostgreSQL / Prisma / Feature+Clean / standard
```

→ valid config, correct skill set, generated agent instructions, generated structure,
re-runnable without diff noise.

**For an existing project**

```bash
cd some-5-year-old-repo
npx @engineering-skills/cli analyze
```

→ an honest profile of the stack, architecture, conventions and gaps — with confidence
scores — and generated instructions that tell the agent _"this project is layered; follow
`controllers/ services/ repositories/`; do not restructure."_

**For a migration**

```bash
eng-skills migrate --to feature-clean --strategy incremental
```

→ a per-module migration plan. Never a repo-wide rewrite.

## 6. Anti-vision

The framework must never become _"the tool that wants to refactor every repo it touches."_
If a user runs it on a working codebase and the codebase changes shape without being asked,
the product has failed regardless of how good the output architecture is.

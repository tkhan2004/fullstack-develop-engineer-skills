# Strictness Levels

Status: accepted

Strictness controls **how forcefully** resolved rules are stated to the agent. It never
changes _which_ architecture is in play.

```text
observe  →  minimal  →  standard  →  strict
 learn      follow     enforce+flag   reject
```

## 1. The four levels

### `observe` — "I am learning this project"

Default for **existing + adopt**, especially right after `analyze`.

- The agent MUST NOT change structure.
- The agent MUST infer conventions from the nearest existing code and mirror them.
- The agent MUST NOT introduce a new pattern, library, or abstraction without asking.
- Violations of framework rules are **not** reported unless they are security or correctness
  defects.

Generated instruction shape:

```md
You are working in an existing codebase. Learn its conventions before writing code.

Observed patterns in this project:
✓ Services contain business logic
✓ Controllers only handle HTTP concerns
✓ Repositories own all Prisma access
✓ Tests are colocated with modules (`*.test.ts`)
✓ Errors use the `AppError` class in `src/shared/errors`

When implementing, follow these patterns. If a requirement does not fit them, describe the
conflict instead of inventing a new pattern.
```

Asked to _"Add payment module"_, the agent produces a payment module shaped like the existing
order module — not a textbook one.

### `minimal` — "stay consistent, do not expand"

- Follow existing conventions.
- Avoid introducing unnecessary new patterns, dependencies, or abstraction layers.
- Rules act as guidance; deviations are allowed with a one-line justification in the response.

### `standard` — default for new projects

- Follow the configured architecture and the enabled engineering practices.
- **Flag** inconsistencies and boundary violations found while working, including pre-existing
  ones in files being touched.
- Do not fix unrelated violations unasked.

### `strict` — "boundaries are contracts"

- The agent MUST refuse to produce an implementation that violates a declared dependency rule,
  and MUST explain which rule and offer a compliant alternative.
- Applies to new code and to code it edits.
- Pre-existing violations are reported, not silently inherited as licence to add more.

Example generated rules at `strict` + `clean`:

```text
Domain code MUST NOT import infrastructure modules.
Application code MUST NOT import Prisma, Express, or any HTTP type.
HTTP controllers MUST NOT contain business logic.
Infrastructure implementations MUST depend on contracts defined in domain/application.
A violation is a blocking finding, not a style note.
```

## 2. Behaviour matrix

| Capability                          |          observe          |    minimal     |    standard     |            strict            |
| ----------------------------------- | :-----------------------: | :------------: | :-------------: | :--------------------------: |
| Mirror existing conventions         |        ✅ required        |  ✅ required   |  ✅ preferred   |         ✅ preferred         |
| Introduce new patterns              |       ❌ ask first        | ⚠️ discouraged | ✅ if justified | ✅ if architecture-compliant |
| Report rule violations              | security/correctness only |   on request   |    ✅ always    |          ✅ always           |
| Refuse non-compliant implementation |            ❌             |       ❌       |       ❌        |              ✅              |
| Propose refactors                   |            ❌             |       ❌       |  ⚠️ as a note   |         ✅ as a note         |
| Restructure directories             |            ❌             |       ❌       |       ❌        |     ❌ (migration only)      |

Note the last row: **no strictness level authorises restructuring.** Only `migrate` does.

## 3. Defaults by mode

| Mode     | Strategy  | Default strictness               |
| -------- | --------- | -------------------------------- |
| new      | —         | `standard`                       |
| existing | adopt     | `observe`                        |
| existing | recommend | `standard`                       |
| existing | migrate   | `standard` (target architecture) |

## 4. Escalation path

A healthy adoption looks like:

```text
day 0    analyze         → observe
week 1   conventions confirmed → minimal
month 1  team agrees on rules  → standard
later    boundaries matter     → strict
```

`eng-skills doctor` SHOULD suggest the next level when the project consistently passes the
current one.

## 5. Implementation notes

- Strictness is a property of `architecture.<target>.strictness` in config.
- Each skill may define per-level wording in its `skill.yaml`:

```yaml
strictness_overrides:
  observe: "Mirror the surrounding code. Do not introduce this pattern unprompted."
  strict: "This rule is blocking. Reject implementations that violate it."
```

- A skill with no overrides uses its default wording at every level.
- Strictness MUST NOT change skill _selection_ — only skill _tone_. Selection is driven by
  stack/architecture/practices. (Exception: a few `strict`-only checks in `doctor`.)

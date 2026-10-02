# Core Philosophy

Status: accepted

## 1. Five independent axes

Most tooling collapses these into one opinionated bundle. This framework keeps them
orthogonal — that separation _is_ the product.

```text
MODE            new | existing-adopt | existing-migrate
  ↓
STACK           language, runtime, framework, database, ORM, test runner
  ↓
ARCHITECTURE    layered | feature | clean | feature-clean | hexagonal | custom(detected)
  ↓
STRICTNESS      observe | minimal | standard | strict
  ↓
PRACTICES       clean code, SOLID, testing, security, error handling, performance, …
```

Any combination that is internally consistent MUST be expressible. The framework may
_warn_ about an unusual pairing; it MUST NOT forbid it.

```yaml
# a perfectly legal configuration
stack: { backend: { framework: express } }
architecture: { backend: { style: hexagonal, strictness: strict } }
```

### Forbidden inferences

| Never infer                  | Because                                                  |
| ---------------------------- | -------------------------------------------------------- |
| Express ⇒ layered            | Express is a routing library, not an architecture        |
| NestJS ⇒ clean               | NestJS modules are a DI mechanism, not a dependency rule |
| TypeScript ⇒ anything        | A language is not a structure                            |
| Monorepo ⇒ microservices     | Deployment topology is not code organisation             |
| Folder named `domain/` ⇒ DDD | Names are evidence, not proof — see detection confidence |

## 2. Configuration is the source of truth

```text
explicit config  >  stored project profile  >  detected conventions  >  framework defaults
```

Detection _proposes_. The user _accepts_. Configuration _decides_.
A detector MUST NOT write to `config.yaml` without passing through a user decision
(interactive prompt, or an explicit `--yes` / `--accept-detected` flag).

## 3. Existing code outranks generic best practice

> An existing project convention takes precedence over a generic best practice **unless**
> the convention causes a concrete architectural, security, correctness, or maintainability
> problem — and in that case the agent reports it rather than silently "fixing" it.

This single rule is what makes the framework safe to run on someone else's repository.

## 4. Diagnose before prescribing

For an unfamiliar repository the order is fixed:

```text
Scan → Understand → Detect → Map → Report → (only then) Act
```

The same order applies to debugging:

```text
Reproduce → Observe → Isolate → Hypothesise → Verify → Fix root cause → Regression test
```

## 5. Rules must be falsifiable

A rule belongs in a skill only if a reviewer can point at a diff and say "this violates it".

| Not a rule             | A rule                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| "Use meaningful names" | "A boolean MUST read as a predicate: `isActive`, `hasAccess`, `canRetry`"                                  |
| "Keep functions small" | "A function with more than one reason to fail SHOULD be split"                                             |
| "Follow SOLID"         | "A module that imports both an HTTP type and a SQL client violates the dependency rule for `application/`" |
| "Write tests"          | "Every business rule stated in the requirement MUST have one test naming that rule"                        |

## 6. Composition over duplication

Skills, architectures, stacks and presets compose. A preset is _only_ a predefined
configuration — it MUST NOT contain a second copy of any rule. If two skills need the same
paragraph, one references the other via `Interaction With Other Skills`.

## 7. Separation of artefacts

An architecture definition is five different things and MUST live in five files:

```text
architectures/clean/
├── manifest.yaml     machine-readable structure + dependency rules
├── SKILL.md          instructions for the agent
├── rules.md          human-readable rationale and trade-offs
├── tree/             generated directory template (new projects only)
└── examples/         good/bad code showing the boundary
```

Collapsing them produces a file nobody can maintain and the generator cannot reason about.

## 8. Non-destructive and deterministic

- `init`, `analyze`, `doctor`, `review`, `list` MUST NOT modify source files outside
  `.engineering/` and adapter output files.
- Only `migrate` and `init` on an empty/new project may create source directories, and only
  after explicit confirmation.
- Re-running generation with unchanged inputs MUST produce identical bytes: stable key
  order, no timestamps in content, no random identifiers, LF endings.

## 9. Honest uncertainty

Detection output always carries confidence. The framework says "feature-based, 63%,
boundaries unclear" — never "feature-based" with false certainty. Low confidence routes to
a question, not to a guess.

## 10. Tone toward the user's code

The framework diagnoses; it does not judge.

> ❌ "This architecture is bad."
> ✅ "Business logic appears in 7 controllers; 3 modules access Prisma directly. These
> weaken the service boundary. Suggested order of improvement: … (no change made)."

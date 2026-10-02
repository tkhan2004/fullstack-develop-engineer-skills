# Non-Goals (V1)

Status: accepted

Saying no explicitly is what keeps V1 shippable. Each item below is **deferred**, not
rejected forever; several are natural V2 work.

## Not building

| Non-goal                                   | Why                                                          | Nearest thing V1 does do                                 |
| ------------------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------- |
| A full static analyser                     | Years of work; duplicates ESLint/ts-morph/dependency-cruiser | `doctor` runs a small set of pluggable, heuristic checks |
| An automatic refactoring engine            | Unsafe without full type-aware rewriting                     | `migrate --plan` emits a human-executed plan             |
| Automatic architecture migration           | Directly contradicts the non-destructive principle           | Explicit, incremental, per-module, confirmed             |
| A code generator for every framework       | Unbounded scope                                              | Structure templates for 4 architectures + V1 stack only  |
| An AI provider integration                 | Ties the core to one vendor's API and billing                | `review` emits a context bundle any agent can consume    |
| Support for every language                 | Detection and rules are language-specific                    | TypeScript/JavaScript only in V1                         |
| IDE extension / GUI                        | Separate product surface                                     | CLI only                                                 |
| Kubernetes / cloud / deployment generation | Different problem domain                                     | —                                                        |
| A hosted registry for community skills     | Needs auth, moderation, versioning infra                     | Local + git-referenced skill packs                       |
| Team sync / shared config server           | Needs a backend                                              | Commit `.engineering/` to the repo                       |
| Auto-fixing code to satisfy rules          | Destructive                                                  | Report + explain                                         |

## Explicitly in scope despite looking big

- **Existing-project detection.** Non-negotiable: it is the differentiator.
  See [project-mode.md](../01-concepts/project-mode.md).
- **`custom` architecture manifests.** Without them, `adopt` is a lie.
- **Determinism tests.** Cheap now, impossible to retrofit.

## Guardrail

Before adding anything to V1, it must pass:

1. Does V1's [definition of done](../03-plan/v1-scope.md) fail without it?
2. Does it change a _contract_ (config schema, skill contract, manifest) that is painful to
   change later?

If both answers are "no", it goes to the backlog.

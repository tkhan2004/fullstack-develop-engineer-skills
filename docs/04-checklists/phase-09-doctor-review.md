# P9 — Doctor, Analyze Report, Review

**Entry** P5, P8 · **Exit** diagnostics are plugins; exit codes per spec; review bundle is scoped to the diff.

## Diagnostic framework

- [ ] `Diagnostic` and `Finding` interfaces in `packages/core`
- [ ] Registry with `--only` / `--skip` by id
- [ ] `appliesTo(ctx)` gating by config/profile
- [ ] Findings carry level, message, location, remediation, ruleId
- [ ] Adding a check requires no CLI-core change (prove it)

## V1 checks

- [ ] `config/valid` — schema validity
- [ ] `config/profile-stale` — profile commit ≠ HEAD
- [ ] `config/generated-stale` — lockfile vs. current resolution
- [ ] `architecture/structure-present` — declared directories exist (new/selected only)
- [ ] `architecture/dependency-rule` — import violations (advisory at standard, error at strict)
- [ ] `architecture/framework-leakage` — forbidden external imports per layer
- [ ] `typescript/strict-mode` — `strict: true`
- [ ] `testing/present` — test files exist
- [ ] `testing/integration-coverage` — routes without an integration test
- [ ] `security/validation-at-boundary` — unvalidated request input
- [ ] `security/authorization-consistency` — protected routes missing an authz check
- [ ] `quality/complexity` — oversized files/functions (heuristic, documented threshold)

Each check: unit test + a fixture that fails it + a fixture that passes it.

## Output

- [ ] Grouped, human-readable report with remediation lines
- [ ] `--json` stable schema
- [ ] `--fail-on warn|error`
- [ ] Exit codes: 0 clean · 1 findings per `--fail-on` · 2 invalid config
- [ ] Never modifies files
- [ ] Suggests the next strictness level when the project consistently passes

## `review`

- [ ] `git diff` resolution: `--base`, `--staged`, working tree
- [ ] Map changed paths → modules/layers
- [ ] Select applicable skills and their Review Checklists
- [ ] Include dependency rules relevant to the changed paths only
- [ ] Emit `review-context.md` (+ `--stdout`)
- [ ] No AI provider call in V1
- [ ] Graceful failure outside a git repository

## Non-destructiveness

- [ ] Test: `git status` clean after `doctor` and `review` on every fixture

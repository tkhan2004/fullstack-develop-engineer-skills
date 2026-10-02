# P5 — Detection Engine

**Entry** P4 · **Exit** every fixture repo lands in its expected confidence band; `analyze` writes only the profile.
Specs: [detection-engine.md](../01-concepts/detection-engine.md), [project-profile-schema.md](../02-specs/project-profile-schema.md)

## Scanner

- [x] Respects `.gitignore`
- [x] Hard-skips `node_modules`, `dist`, `build`, `coverage`, `.next`, `.turbo`
- [x] File-count cap (default 20 000) with a clear message when hit
- [x] Source-root detection (`src`, `app`, `lib`, package roots)
- [x] **Never executes project code**
- [ ] Performance: < 3 s on a 1000-file repo (benchmark in CI)

## Signals

- [x] Manifest signals: dependencies, versions, scripts
- [x] Config signals: tsconfig strictness, eslint rules, prettier
- [x] Directory signals: path + file count
- [x] Import graph: internal + external edges
- [x] Naming samples: identifiers, filenames, classes
- [x] Test signals: locations, naming, framework
- [x] Data signals: prisma schema, migrations, SQL
- [ ] Git signals: HEAD, churn (optional, degrade gracefully without git)

## Detectors

- [x] Stack: language, runtime, backend, frontend, database, ORM, test framework
- [x] Architecture: vocabulary (0.35) + import conformance (0.45) + composition (0.20)
- [x] Confidence formula includes the separation term vs. the runner-up
- [x] Fallback to `custom` below 0.60, with described structure
- [x] Conventions: naming, file naming, test placement, errors, validation, imports,
      exports, async style — each with a ratio and sample size
- [x] Conventions below ~0.65 ratio reported as `inconsistent`
- [x] Reference module selection (most complete, well-tested example per concern)
- [x] Health observations (neutral wording, counts, locations)
- [x] Maturity summary (detected/partial/missing — never a grade)
- [x] Gaps list

## Evidence discipline

- [x] Every claim has ≥ 1 evidence entry
- [x] Evidence paths relative, POSIX separators
- [x] A claim with empty evidence fails a unit test

## Profile output

- [x] Writer with stable key order and sorted arrays
- [x] `--deterministic` zeroes timestamps and durations
- [x] `--json` output
- [x] Staleness: record HEAD commit; consumers warn on mismatch

## Fixtures

- [x] `express-layered-clean` → layered ≥ 0.85
- [x] `express-layered-violations` → layered 0.60–0.84 + health findings
- [x] `nest-feature` → feature ≥ 0.85
- [x] `clean-strict` → clean ≥ 0.90
- [x] `feature-clean` → feature-clean ≥ 0.85
- [x] `ambiguous-mixed` → custom < 0.60
- [x] `empty` → mode new
- [x] `js-no-types` → language javascript
- [x] Snapshot per fixture, regenerated only with an explicit command

## Non-destructiveness

- [x] Test asserting `git status` is clean after `analyze` on every fixture

## Status notes

- Packages: `packages/detection` (scanner, detectors, profile) and the import graph from
  `packages/architecture-engine`. `eng-skills analyze` is wired into the CLI.
- Not done: the 3-second benchmark on a 1000-file repository is not asserted in CI (the whole
  fixture suite runs in well under a second, but no large-repo benchmark exists yet); git churn
  signals; `domain-logic-in-utils` observation; per-package monorepo discovery.
- Findings from running on this repository are recorded in
  [detection-engine.md §7](../01-concepts/detection-engine.md).

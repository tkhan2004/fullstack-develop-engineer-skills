# P5 — Detection Engine

**Entry** P4 · **Exit** every fixture repo lands in its expected confidence band; `analyze` writes only the profile.
Specs: [detection-engine.md](../01-concepts/detection-engine.md), [project-profile-schema.md](../02-specs/project-profile-schema.md)

## Scanner

- [ ] Respects `.gitignore`
- [ ] Hard-skips `node_modules`, `dist`, `build`, `coverage`, `.next`, `.turbo`
- [ ] File-count cap (default 20 000) with a clear message when hit
- [ ] Source-root detection (`src`, `app`, `lib`, package roots)
- [ ] **Never executes project code**
- [ ] Performance: < 3 s on a 1000-file repo (benchmark in CI)

## Signals

- [ ] Manifest signals: dependencies, versions, scripts
- [ ] Config signals: tsconfig strictness, eslint rules, prettier
- [ ] Directory signals: path + file count
- [ ] Import graph: internal + external edges
- [ ] Naming samples: identifiers, filenames, classes
- [ ] Test signals: locations, naming, framework
- [ ] Data signals: prisma schema, migrations, SQL
- [ ] Git signals: HEAD, churn (optional, degrade gracefully without git)

## Detectors

- [ ] Stack: language, runtime, backend, frontend, database, ORM, test framework
- [ ] Architecture: vocabulary (0.35) + import conformance (0.45) + composition (0.20)
- [ ] Confidence formula includes the separation term vs. the runner-up
- [ ] Fallback to `custom` below 0.60, with described structure
- [ ] Conventions: naming, file naming, test placement, errors, validation, imports,
      exports, async style — each with a ratio and sample size
- [ ] Conventions below ~0.65 ratio reported as `inconsistent`
- [ ] Reference module selection (most complete, well-tested example per concern)
- [ ] Health observations (neutral wording, counts, locations)
- [ ] Maturity summary (detected/partial/missing — never a grade)
- [ ] Gaps list

## Evidence discipline

- [ ] Every claim has ≥ 1 evidence entry
- [ ] Evidence paths relative, POSIX separators
- [ ] A claim with empty evidence fails a unit test

## Profile output

- [ ] Writer with stable key order and sorted arrays
- [ ] `--deterministic` zeroes timestamps and durations
- [ ] `--json` output
- [ ] Staleness: record HEAD commit; consumers warn on mismatch

## Fixtures

- [ ] `express-layered-clean` → layered ≥ 0.85
- [ ] `express-layered-violations` → layered 0.60–0.84 + health findings
- [ ] `nest-feature` → feature ≥ 0.85
- [ ] `clean-strict` → clean ≥ 0.90
- [ ] `feature-clean` → feature-clean ≥ 0.85
- [ ] `ambiguous-mixed` → custom < 0.60
- [ ] `empty` → mode new
- [ ] `js-no-types` → language javascript
- [ ] Snapshot per fixture, regenerated only with an explicit command

## Non-destructiveness

- [ ] Test asserting `git status` is clean after `analyze` on every fixture

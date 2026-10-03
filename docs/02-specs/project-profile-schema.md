# Spec — `.engineering/project-profile.yaml`

Status: draft

Machine-generated output of `eng-skills analyze`. **Never hand-edited** (edits belong in
`config.yaml`). Committed, so that reviewers can see how the agent understands the repo.

## 1. Shape

```yaml
version: 1

generated:
  at: "2026-10-01T10:04:11Z"
  by: "@engineering-skills/cli@0.3.0"
  commit: "a1b2c3d" # git HEAD when analysed, if available
  files_scanned: 412
  duration_ms: 1840

project:
  mode: existing
  root: .
  source_roots: [src]

stack:
  language:
    value: typescript
    confidence: 0.99
    evidence:
      - { path: tsconfig.json, detail: "strict: true", weight: 0.6 }
      - { path: "src/**/*.ts", detail: "318/320 source files", weight: 0.4 }
  backend:
    runtime: { value: node, confidence: 0.98, evidence: [...] }
    framework: { value: express, confidence: 0.95, evidence: [...] }
  database:
    engine: { value: postgresql, confidence: 0.92, evidence: [...] }
    orm: { value: prisma, confidence: 0.99, evidence: [...] }
  testing:
    framework: { value: vitest, confidence: 0.97, evidence: [...] }

architecture:
  backend:
    value: layered
    confidence: 0.91
    evidence:
      - { path: src/controllers, detail: "14 files", weight: 0.2 }
      - { path: src/services, detail: "16 files", weight: 0.2 }
      - { path: src/repositories, detail: "11 files", weight: 0.2 }
      - {
          path: "import-graph",
          detail: "18/20 controllers import services; 0 reverse",
          weight: 0.4,
        }
    alternatives:
      - { value: feature, confidence: 0.21 }
      - { value: custom, confidence: 0.15 }
    conformance: 0.93 # fraction of imports satisfying the style's rules

conventions:
  naming:
    variables: { value: camelCase, ratio: 0.96, sample_size: 1240 }
    files: { value: kebab-case, ratio: 0.88, sample_size: 320 }
    classes: { value: PascalCase, ratio: 1.00, sample_size: 42 }
  tests:
    placement: { value: colocated, ratio: 0.87, sample_size: 70 }
    naming: { value: "*.test.ts", ratio: 0.94 }
  errors:
    strategy:
      {
        value: custom-error-class,
        ratio: 0.81,
        detail: "AppError in src/shared/errors/app-error.ts",
      }
  validation:
    library: { value: zod, ratio: 0.72, detail: "used in 23/32 route handlers" }
  imports:
    style: { value: relative, ratio: 0.83 }
    aliases: []
  exports:
    style: { value: named, ratio: 0.91 }
  async:
    style: { value: async-await, ratio: 0.98 }

reference_modules: # the best in-repo examples for an agent to imitate
  - { concern: service, path: src/services/user.service.ts, reason: "most complete, well tested" }
  - {
      concern: controller,
      path: src/controllers/order.controller.ts,
      reason: "thin, validated, typed",
    }
  - {
      concern: repository,
      path: src/repositories/user.repository.ts,
      reason: "canonical Prisma usage",
    }
  - { concern: test, path: src/services/user.service.test.ts, reason: "project test style" }

observations: # information, not judgement
  - id: logic-in-controller
    severity: info
    count: 7
    locations: [src/controllers/report.controller.ts:42, ...]
    detail: "Controllers containing branching business rules"
  - id: orm-outside-data-layer
    severity: warning
    count: 3
    locations: [src/services/billing.service.ts:18, ...]
    detail: "Direct PrismaClient usage outside src/repositories"
  - id: domain-logic-in-utils
    severity: warning
    count: 2
    locations: [src/utils/pricing.ts, src/utils/tax.ts]
    detail: "Domain-specific logic inside a generic utility directory"

maturity: # detected | partial | missing — never a grade
  architecture: detected
  conventions: detected
  testing: partial
  security: partial
  documentation: partial
  observability: missing

gaps:
  - { area: testing, detail: "No integration tests for 12 of 18 routes" }
  - { area: security, detail: "Authorization checks inconsistent across admin routes" }
```

## 2. Rules

1. **Every claim carries evidence.** A claim with an empty `evidence` array is invalid output.
2. **Confidence is honest.** Never round 0.63 up to "detected".
3. **Observations are neutral.** Wording describes what exists; it does not grade the team.
4. **Deterministic.** Stable key order, sorted arrays, paths relative and POSIX-separated.
   Only `generated.at`/`duration_ms` may vary — and `--deterministic` MUST zero them for tests.
5. **Regenerable.** Deleting the file and re-running `analyze` on the same commit MUST
   reproduce it (modulo the fields above).
6. **Staleness.** If `generated.commit` ≠ current HEAD, consumers MUST warn.

## 3. Relationship to config

```text
analyze → project-profile.yaml  (what IS)
   ↓ user decision
init    → config.yaml           (what SHOULD BE)
   ↓
resolve → skills                (what the AGENT IS TOLD)
```

The profile never overrides config. When they disagree, `doctor` reports the drift.

## 4. Consumers

| Consumer       | Uses                                                           |
| -------------- | -------------------------------------------------------------- |
| `init`         | Pre-fills answers; proposes `adopt`                            |
| Skill resolver | `conventions`, `reference_modules` → project-conventions skill |
| Generators     | Project context block in agent instructions                    |
| `doctor`       | Baseline for drift and for `observations` → diagnostics        |
| `migrate`      | Module inventory and ordering input                            |

## 5. Notes from the implementation

- A convention below 65% carries `consistent: false`; the value is still the majority.
- `architecture.backend.structure` is always recorded (top-level directories with file counts, and
  discovered modules), so `custom` can describe the project even when the user rejects a detected
  style; `conformance` appears only for a named style.
- For `value: custom`, `confidence` means "how sure we are that no named style fits"
  (`1 − confidence of the closest style`, capped at 0.95).
- `alternatives[].confidence` uses the same formula as the winner, so the numbers are comparable.
- `generated.truncated: true` marks a scan that stopped at the file limit.
- `reference_modules` never lists a file that violates the detected architecture's rules.
- Golden profiles for every fixture live in `tests/fixtures/profiles/`; regenerate deliberately with
  `UPDATE_GOLDEN=1 pnpm test`.

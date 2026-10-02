# Detection Engine

Status: draft

Turns an existing repository into a [project profile](../02-specs/project-profile-schema.md).
Every claim it makes carries **evidence** and a **confidence** score.

```text
Repository → Scan → Signals → Detectors → Claims(+confidence,+evidence) → Profile → Report
```

## 1. Scan phase

Collect, without executing anything:

| Group     | Inputs                                                                                  |
| --------- | --------------------------------------------------------------------------------------- |
| Manifests | `package.json`, lockfiles, `tsconfig.json`, `jsconfig.json`                             |
| Tooling   | `.eslintrc*`, `eslint.config.*`, `.prettierrc*`, `.editorconfig`, `biome.json`          |
| Test      | `jest.config.*`, `vitest.config.*`, `playwright.config.*`, `**/*.{test,spec}.*`         |
| Data      | `prisma/schema.prisma`, `drizzle.config.*`, `**/migrations/**`, `*.sql`                 |
| Runtime   | `Dockerfile`, `docker-compose*.yml`, `.env.example`, `Procfile`                         |
| CI        | `.github/workflows/**`, `.gitlab-ci.yml`                                                |
| Docs      | `README*`, `CONTRIBUTING*`, `docs/**`, `ADR*`, `CLAUDE.md`, `AGENTS.md`, `.cursorrules` |
| Source    | directory tree under the detected source root, import graph, file naming                |
| VCS       | branch, last commit date, file churn (via `git log --numstat`, if available)            |

Hard limits: respect `.gitignore`; skip `node_modules`, `dist`, `build`, `coverage`, `.next`;
cap at a configurable file count (default 20 000) and parse depth; never run project scripts.

## 2. Signals

Raw observations, each cheap and independently testable:

```ts
type Signal =
  | { kind: "dependency"; name: string; version: string; dev: boolean }
  | { kind: "directory"; path: string; fileCount: number }
  | { kind: "file"; path: string }
  | { kind: "import"; from: string; to: string; external: boolean }
  | {
      kind: "naming";
      sample: string;
      style: "camelCase" | "kebab-case" | "PascalCase" | "snake_case";
    }
  | { kind: "config"; key: string; value: unknown; source: string };
```

## 3. Detectors

A detector is a pure function `Signal[] → Claim[]`.

```ts
interface Claim<T = unknown> {
  subject: string; // 'stack.backend.framework'
  value: T; // 'express'
  confidence: number; // 0..1
  evidence: Evidence[]; // at least one
  alternatives?: { value: T; confidence: number }[];
}
interface Evidence {
  path: string;
  detail: string;
  weight: number;
}
```

### 3.1 Stack detectors — high confidence, direct evidence

| Subject                    | Primary evidence                                                           | Typical confidence |
| -------------------------- | -------------------------------------------------------------------------- | ------------------ |
| `stack.language`           | `tsconfig.json` + `.ts` share of source files                              | 0.95+              |
| `stack.backend.framework`  | dependency `express` / `@nestjs/core` / `fastify` + app bootstrap file     | 0.9+               |
| `stack.frontend.framework` | `next` / `react` / `vue` dependency + `app/` or `pages/`                   | 0.9+               |
| `stack.database.engine`    | `prisma/schema.prisma` provider, `pg`/`mysql2` dependency, compose service | 0.85+              |
| `stack.database.orm`       | `prisma`, `drizzle-orm`, `typeorm`, `sequelize`                            | 0.95               |
| `stack.testing.framework`  | `vitest` / `jest` dependency + config file                                 | 0.95               |

### 3.2 Architecture detector — the hard one

Scoring combines three independent families of evidence; none alone is sufficient.

**a. Directory vocabulary** (weight 0.35)

| Style         | Marker directories                                                                      |
| ------------- | --------------------------------------------------------------------------------------- |
| layered       | `controllers`, `services`, `repositories`, `routes`, `middlewares`                      |
| feature       | `modules/*` or `features/*` each containing ≥ 2 of controller/service/repository/schema |
| clean         | `domain`, `application`, `infrastructure`, `presentation`                               |
| feature-clean | `modules/*/{domain,application,infrastructure,presentation}`                            |
| hexagonal     | `ports/{inbound,outbound}`, `adapters/{inbound,outbound}`                               |

**b. Import-graph conformance** (weight 0.45 — the strongest signal)

For each candidate style, compute the fraction of imports that satisfy the style's declared
`dependency_rules`:

```text
conformance = conforming_imports / total_internal_imports
```

A repo with `controllers/` and `services/` where 18 of 20 controller files import services and
_no_ service imports a controller is layered with high confidence. The same directories with
services importing controllers is `custom`, not layered.

**c. File-level composition** (weight 0.20)

Co-location patterns, suffix conventions (`*.service.ts`), index barrels, per-module tests.

**Final score**

```text
score(style) = 0.35·vocabulary + 0.45·conformance + 0.20·composition
confidence   = score(best) − 0.5·score(strongest unrelated competitor)
```

The separation term matters: two styles at 0.70 and 0.68 must _not_ yield 0.70 confidence.

**Fallback:** if `confidence(best) < 0.60`, emit `style: custom` with a _described_ structure
plus the ranked alternatives.

### 3.3 Convention detectors

| Subject                        | Method                                                        |
| ------------------------------ | ------------------------------------------------------------- |
| `conventions.naming.variables` | Majority style across identifiers in a sample of source files |
| `conventions.naming.files`     | Majority style across source filenames                        |
| `conventions.tests.placement`  | Colocated vs. `__tests__/` vs. top-level `tests/` — by ratio  |
| `conventions.errors`           | Presence and usage share of a custom error class              |
| `conventions.validation`       | `zod` / `joi` / `class-validator` usage at boundaries         |
| `conventions.async`            | async/await vs. promise chains vs. callbacks                  |
| `conventions.exports`          | named vs. default exports ratio                               |
| `conventions.imports`          | path aliases (`@/…`) vs. relative                             |

Every convention claim MUST record the ratio ("colocated 87%, 61/70 test files") — a
convention at 55% is not a convention, it is a coin flip, and MUST be reported as
`inconsistent`.

### 3.4 Health observations

Not scored, not judged — listed with counts and locations:

- business logic in controllers (controller files importing the ORM directly)
- ORM access outside the designated data layer
- domain-specific logic inside `shared/` or `utils/`
- modules reaching into another module's internals
- missing integration tests for routes that exist
- validation absent at an input boundary

Each becomes a `doctor` diagnostic later; at `analyze` time it is information only.

## 4. Confidence → behaviour

| Confidence | CLI                                | Config written               |
| ---------- | ---------------------------------- | ---------------------------- |
| ≥ 0.85     | "Detected X" + confirm             | `source: detected`           |
| 0.60–0.84  | Ranked choices, user must pick     | `source: confirmed`          |
| < 0.60     | Fallback to `custom`, offer manual | `source: manual` or `custom` |

Non-interactive runs (`--yes`) MUST accept only ≥ 0.85 claims and MUST fall back to `custom`
otherwise. They MUST NOT guess.

## 5. Output

```bash
eng-skills analyze
```

- writes `.engineering/project-profile.yaml` (deterministic, evidence included)
- writes nothing else
- prints the human report
- exit code `0` always (analysis is not a gate; `doctor` is)

## 6. Testing the detectors

`tests/fixtures/repos/` holds small synthetic repositories, one per expected outcome:

```text
fixtures/repos/
├── express-layered-clean/        → layered, ≥0.85
├── express-layered-violations/   → layered, 0.60–0.84 + health findings
├── nest-feature/                 → feature, ≥0.85
├── clean-strict/                 → clean, ≥0.9
├── feature-clean/                → feature-clean, ≥0.85
├── ambiguous-mixed/              → custom, <0.60
└── empty/                        → mode new
```

A detector change that moves a fixture across a threshold MUST update the fixture's expected
snapshot in the same commit. Snapshots are the regression suite for detection.

## 7. Implementation notes (P5)

Decisions made while building and running the detectors; the fixtures and golden profiles encode them.

- **Marker alternatives.** `detection.marker_directories` entries may be a list meaning "any of
  these" (`["src/modules/*", "src/features/*"]`). A NestJS fixture first scored 0.75 because two
  names for one concept were counted as two required markers.
- **Conformance is smoothed** with one pseudo-observation at 0.5 — `(conforming + 0.5)/(checked + 1)` —
  so two conforming imports are not treated as conclusive. With no rule-governed imports at all the
  value is 0.5: absence of counter-evidence, not proof.
- **Only rule-governed imports count**: cross-layer, cross-module, and external imports in layers
  that have `forbidden_imports`. Test files are excluded.
- **`custom` confidence** is `1 − confidence(best named)`, capped at 0.95: the framework never claims
  certainty that a structure is custom. The closest named styles are listed as alternatives, scored
  with the same formula. `conformance` is recorded only for a style we committed to.
- **Not project code, never scanned:** `node_modules`, build output, `.git`, and `fixtures`,
  `__fixtures__`, `testdata`. Found by analysing this repository, which "detected" Prisma from its
  own fixtures.
- **Reference modules never include a file with rule violations.** An agent imitates what it is shown;
  a concern with no safe example has none.
- **Observations** shipped: `logic-in-controller`, `orm-outside-data-layer`,
  `dependency-rule-violations`, `module-internals-access`, `framework-leakage`.
  `domain-logic-in-utils` and validation/authorization checks are deferred (they need type or
  semantic information a lightweight scanner does not have).
- **Source roots:** `src`, else `app`/`lib`/`server` with at least three source files. A repository
  without one abstains (no architecture claim). Monorepos are analysed one package at a time
  (`--cwd packages/<name>`).
- **Import extraction is a scanner, not a compiler** (see architecture-engine notes).

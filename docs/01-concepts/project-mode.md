# Project Mode — New vs. Existing

Status: accepted · Decided in [ADR-0001](../05-decisions/adr-0001-project-mode-is-first-class.md)
and [ADR-0002](../05-decisions/adr-0002-adopt-is-default-for-existing-projects.md)

> A framework that only knows how to _create_ projects is a boilerplate generator.
> The hard, valuable case is joining a codebase that already exists.

## 1. Three workflows, not one

```text
                        eng-skills
                             │
          ┌──────────────────┼──────────────────┐
          ↓                  ↓                  ↓
       CREATE             ADOPT             MIGRATE
    (new project)   (existing project)  (existing project,
          │                  │            explicit request)
          ↓                  ↓                  ↓
   choose architecture   detect & map     choose target arch
          ↓                  ↓                  ↓
   generate structure    preserve tree    incremental plan
          └──────────────────┼──────────────────┘
                             ↓
                     Project Profile
                             ↓
                     Skill Resolution
                             ↓
                     AI Instructions
```

They share the configuration model, the skill engine and the adapters — and nothing else.
Forcing them through one prompt flow is what produces a tool that refactors repos uninvited.

## 2. First question the CLI asks

```text
$ npx @engineering-skills/cli init

? What are you working with?
❯ New project          — empty or near-empty directory
  Existing project     — analyse what is already here
```

Default MUST be chosen by evidence, not by menu order:

| Repository state                        | Pre-selected answer |
| --------------------------------------- | ------------------- |
| No `package.json`, no `src/`, ≤ 3 files | New project         |
| Anything else                           | Existing project    |

If the directory is non-empty and the user picks **New project**, the CLI MUST warn and MUST
NOT overwrite existing files.

## 3. Flow — New project

```text
New project
   → select stack
   → select architecture
   → select strictness
   → select practices
   → resolve skills
   → generate structure      (confirmed, non-destructive)
   → generate config + agent instructions
```

Config written:

```yaml
version: 1
project:
  mode: new
stack:
  language: typescript
  backend: { runtime: node, framework: express }
  database: { engine: postgresql, orm: prisma }
architecture:
  backend:
    style: feature-clean
    source: selected
    strictness: standard
```

## 4. Flow — Existing project

```text
Existing project
   → scan repository
   → detect stack
   → detect architecture (with confidence + evidence)
   → detect conventions (naming, file names, test placement, error handling)
   → SHOW the analysis
   → ask for adoption strategy
   → generate project-specific skills + instructions
```

The **"show the analysis"** step is mandatory. The user must see what was found before
anything is written.

```text
Detected
────────────────────────────────
Backend     Express 4.19          ✔ evidence: package.json, src/app.ts
Language    TypeScript 5.4        ✔ evidence: tsconfig.json (strict: true)
Database    PostgreSQL / Prisma   ✔ evidence: prisma/schema.prisma

Architecture
────────────────────────────────
Layered                     91%
  evidence: src/controllers, src/services, src/repositories, src/routes
  controllers import services (18/20 files)
  no file in services imports from controllers

? How should Engineering Skills work with this project?
❯ Adopt existing architecture        (recommended)
  Recommend improvements without restructuring
  Migrate toward another architecture
```

### 4.1 Adoption strategies

| Strategy              | What the agent is told                                                                   | Writes to source tree?              |
| --------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------- |
| `adopt` **(default)** | Follow the existing structure and conventions. Do not restructure.                       | Never                               |
| `recommend`           | Follow existing structure; additionally report deviations and improvement opportunities. | Never                               |
| `migrate`             | Current architecture is X, target is Y; follow the migration plan, module by module.     | Only via explicit `migrate` command |

Config written for `adopt`:

```yaml
version: 1
project:
  mode: existing
architecture:
  backend:
    style: layered
    source: detected
    confidence: 0.91
    strictness: observe
adoption:
  strategy: adopt
```

### 4.2 What `adopt` tells the agent

```md
## Project Architecture

This project uses **Layered Architecture** (detected, confidence 0.91).

**Do not restructure the project.**

Follow the existing directories:

- `src/controllers` — HTTP handling only
- `src/services` — business logic
- `src/repositories`— data access
- `src/models` — data shapes
- `src/routes` — route registration

When adding functionality, mirror the closest existing module (`src/services/user.service.ts`
is the reference implementation for this project's service style).

If a requirement cannot be implemented inside this structure, report the conflict —
do not introduce a new structural concept.
```

## 5. When the architecture is unclear

Not every repo has a recognisable style. Example:

```text
src/
├── auth/
├── user/
├── order/
├── common/
├── database/
└── shared/
```

Honest output:

```text
Architecture
────────────────────────────────
Feature-based               63%
Modular monolith            42%
Custom                       ?

⚠ Architecture boundaries are not fully clear.
  - `common/` and `shared/` overlap in responsibility
  - `database/` is imported directly by 4 feature modules

? How would you like to proceed?
❯ Keep detected structure (custom)
  Define architecture manually
  Let the agent analyse further
```

Confidence thresholds (see [detection-engine.md](detection-engine.md)):

| Confidence | CLI behaviour                                  |
| ---------- | ---------------------------------------------- |
| ≥ 0.85     | Present as detected; one-key confirm           |
| 0.60–0.84  | Present ranked candidates; require a choice    |
| < 0.60     | Fall back to `custom`; offer manual definition |

## 6. `custom` — describing a project instead of classifying it

The catalogue is **not** closed to `layered | clean | hexagonal | feature`. Real repositories
often fit none of them. `custom` lets the framework _describe_ a project's architecture:

```yaml
architecture:
  style: custom
  source: detected
  structure:
    root: src
    modules:
      users: { path: src/users }
      orders: { path: src/orders }
      auth: { path: src/auth }
    shared:
      - { path: src/shared, role: utilities }
      - { path: src/common, role: cross-cutting }
    infrastructure:
      - { path: src/database, role: persistence }
  rules:
    dependency_direction: existing # observed, not imposed
    notes:
      - "Feature modules may import src/shared"
      - "src/database is imported directly by feature modules (observed, 4 occurrences)"
```

> The framework can describe the architecture of a project, instead of forcing a project into
> a predefined architecture.

## 7. The messy-repo case

A repo like this is normal, not a failure:

```text
src/
├── controllers/   services/   utils/      helpers/
├── managers/      common/     modules/    random/
```

The agent MUST NOT say _"this architecture is bad"_. It reports:

```text
Architecture Analysis
─────────────────────
Detected
- Feature-based modules under src/modules
- Shared service layer under src/services
- Legacy utility layers: utils/, helpers/, common/ (overlapping responsibilities)
- Mixed dependency directions

Observations
- Business logic present in 7 controllers
- 3 modules access Prisma directly, bypassing repositories
- src/utils contains domain-specific logic (pricing, tax)

Recommendation
- Preserve the current structure for now.
- Improve incrementally, starting with the highest-churn module.
- No changes have been made.
```

**Diagnose first. Migrate later. Only when asked.**

## 8. Migration

```bash
eng-skills migrate --to feature-clean --strategy incremental
```

```text
Current architecture    Layered
Target architecture     Feature + Clean

Migration strategy
❯ Incremental   (module by module, verified between steps)
  Full          (one pass — requires --force and a clean working tree)

Plan
1. users     → src/modules/users/{domain,application,infrastructure,presentation}
2. orders    → …
3. payments  → …

Between each step: tests MUST pass, boundary check MUST pass.
No files have been modified. Plan written to .engineering/migration-plan.yaml
```

Config after choosing migration:

```yaml
project:
  mode: existing
architecture:
  backend:
    current: layered
    target: feature-clean
    strictness: standard
migration:
  strategy: incremental
  status: planned
  modules:
    - { name: users, status: pending }
    - { name: orders, status: pending }
```

Rules:

- `migrate` MUST require a clean git working tree (or `--allow-dirty`).
- `migrate` MUST write a plan before touching anything.
- Applying a step MUST be a separate, confirmed action.
- Full migration MUST never be the default.

## 9. `analyze` → `init` handshake

```bash
eng-skills analyze     # read-only; writes .engineering/project-profile.yaml
eng-skills init        # notices the profile
```

```text
Existing engineering profile detected (generated 2026-10-01, 4 minutes ago).

? Use detected project configuration?
❯ Yes
  Review configuration
  Reconfigure from scratch
```

A stale profile (repo HEAD changed since generation) MUST be flagged.

## 10. Framework-level rule for every skill

Every `SKILL.md` that touches structure MUST contain this block rather than hard-coded paths:

```md
## Architecture Awareness

Determine the project's architecture, in this order:

1. Explicit `.engineering/config.yaml`
2. `.engineering/project-profile.yaml`
3. Observed repository conventions
4. Architecture detection

Do not introduce a different structure into an existing project unless a migration has been
explicitly requested.
```

A skill that says _"always create `src/domain`, `src/application`, `src/infrastructure`"_ is
a bug. See [skill-contract.md](../02-specs/skill-contract.md) §Anti-patterns.

## 11. Summary — three questions

| Situation             | The agent asks                                     | Framework answers by          |
| --------------------- | -------------------------------------------------- | ----------------------------- |
| Building from scratch | "What architecture should we use?"                 | Offering the catalogue        |
| Joining a project     | "What architecture does this project already use?" | Analysing first               |
| Restructuring         | "How do we migrate safely from A to B?"            | Producing an incremental plan |

These three MUST NOT share a workflow.

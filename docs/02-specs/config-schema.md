# Spec — `.engineering/config.yaml`

Status: draft · Validated with Zod at load time

The user-approved **source of truth**. Hand-editable. Committed to the repository.

## 1. Full shape

```yaml
version: 1 # schema version (integer, required)

project:
  mode: existing # new | existing              (required)
  name: acme-api # optional
  root: . # optional, default "."

adoption: # required when mode = existing
  strategy: adopt # adopt | recommend | migrate
  profile: .engineering/project-profile.yaml

stack:
  language: typescript # typescript | javascript
  package_manager: pnpm # npm | pnpm | yarn | bun
  backend:
    runtime: node
    framework: express # express | nestjs | fastify | none
    version: "4.19" # optional, informational
  frontend:
    framework: nextjs # nextjs | react | none
  database:
    engine: postgresql # postgresql | mysql | sqlite | mongodb | none
    orm: prisma # prisma | drizzle | typeorm | none
  testing:
    framework: vitest # vitest | jest | node:test | none
    e2e: playwright # optional

architecture:
  backend:
    style: feature-clean # layered|feature|clean|feature-clean|hexagonal|custom
    source: selected # selected | detected | confirmed | manual
    confidence: 0.91 # present only when source = detected
    strictness: standard # observe | minimal | standard | strict
    root: src # source root for this target
    custom: {} # required when style = custom (see §3)
  frontend:
    style: feature
    source: selected
    strictness: standard
    root: app

migration: # present only when adoption.strategy = migrate
  from: layered
  to: feature-clean
  strategy: incremental # incremental | full
  status: planned # planned | in-progress | complete
  plan: .engineering/migration-plan.yaml
  modules:
    - { name: users, status: pending }
    - { name: orders, status: pending }

engineering:
  clean_code: true
  solid: true
  design_patterns: false
  testing: true
  security: true
  error_handling: true
  performance: false
  observability: false
  caching: false

ai:
  adapters: [claude, generic] # claude | codex | cursor | generic
  output:
    claude: CLAUDE.md
    generic: .engineering/generated/INSTRUCTIONS.md
  mode: reference # reference | inline

overrides: # escape hatch, always wins
  skills:
    include: [engineering/observability]
    exclude: [quality/design-patterns]
  rules:
    - id: clean-code/max-function-length
      enabled: false
      reason: "Codebase convention; revisit after the Q4 refactor"
```

## 2. Field rules

| Field                          | Rule                                                              |
| ------------------------------ | ----------------------------------------------------------------- |
| `version`                      | MUST be a known schema version; unknown → error with upgrade hint |
| `project.mode`                 | MUST be set; cannot be changed by generation, only by the user    |
| `adoption`                     | MUST be present iff `project.mode = existing`                     |
| `architecture.*.style: custom` | MUST have a non-empty `custom` block                              |
| `architecture.*.confidence`    | MUST be present iff `source = detected`; range 0–1                |
| `migration`                    | MUST be present iff `adoption.strategy = migrate`                 |
| `migration.from`               | MUST differ from `migration.to`                                   |
| `engineering.*`                | Unknown keys → error listing valid keys                           |
| `overrides.rules[].reason`     | REQUIRED — disabling a rule without a reason is rejected          |

Cross-field validation (beyond per-field schema):

- `stack.database.orm: prisma` with `engine: none` → error.
- `architecture.frontend` present with `stack.frontend.framework: none` → warning.
- `strictness: strict` with `adoption.strategy: adopt` → warning: "strict enforcement on an
  adopted architecture will flag pre-existing code; `standard` is recommended".
- `project.mode: new` on a non-empty directory → warning at init time.

**Known limitation (P2):** cross-field rules run only after the structural schema passes, so a
config with both a bad enum value _and_ a missing `adoption` block reports the enum error first.
All structural errors are always reported together.

## 3. `custom` architecture block

```yaml
architecture:
  backend:
    style: custom
    source: detected
    strictness: observe
    custom:
      root: src
      modules:
        users: { path: src/users }
        orders: { path: src/orders }
      shared:
        - { path: src/shared, role: utilities }
        - { path: src/common, role: cross-cutting }
      infrastructure:
        - { path: src/database, role: persistence }
      rules:
        dependency_direction: existing # existing | declared
        declared: {} # used when dependency_direction = declared
        observed:
          - "feature modules import src/shared (12 occurrences)"
          - "src/database imported directly by 4 modules"
```

## 4. Error messages

Validation failures MUST be actionable: path, what was found, what is allowed, and a
suggestion when the edit distance is ≤ 2, or when the input extends a valid option with a
separator (`clean-archtecture` → `clean`; longest matching option wins).

```text
Invalid configuration: .engineering/config.yaml

architecture.backend.style
  Unknown architecture "clean-archtecture"
  Expected one of: layered, feature, clean, feature-clean, hexagonal, custom
  Did you mean: clean

adoption
  Required when project.mode is "existing"
  Add:
    adoption:
      strategy: adopt

2 errors. No files were written.
```

Rules: report **all** errors, not the first; never partially write output when validation
fails; exit code `2`.

## 5. Precedence

```text
CLI flags  >  overrides  >  config file  >  project profile  >  preset  >  defaults
```

A preset is merged _under_ the user's config — the user always wins.

## 6. Migration between schema versions

- Loader accepts `version: N-1` and auto-migrates in memory, printing a notice.
- `eng-skills upgrade` rewrites the file to the current version with a backup.
- Unknown future version → clear "upgrade the CLI" error, never a silent downgrade.

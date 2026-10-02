# Spec — Architecture Manifest

Status: draft

Architectures are **data**. The generator and the validator read manifests; they contain no
per-architecture `if` branches.

```ts
// ❌ never
if (architecture === "clean") {
  /* 500 lines */
}
if (architecture === "layered") {
  /* 500 lines */
}
```

## 1. Layout

```text
architectures/<name>/
├── manifest.yaml     machine-readable definition
├── SKILL.md          agent instructions for this architecture
├── rules.md          human rationale and trade-offs
├── tree/             directory/file template (new projects only)
│   ├── src/...
│   └── _module/      per-module template, for module-oriented styles
├── examples/
└── tests/
    ├── dependency-rules.test.ts
    └── generator.test.ts
```

## 2. `manifest.yaml`

```yaml
name: feature-clean
version: 1
title: Feature + Clean Architecture
description: Clean Architecture boundaries applied inside each feature module.

targets: [backend] # backend | frontend | shared

layers:
  - { id: domain, description: "Entities, value objects, repository contracts, domain errors" }
  - { id: application, description: "Use cases, DTOs, orchestration" }
  - { id: infrastructure, description: "Repository implementations, external services" }
  - { id: presentation, description: "HTTP controllers, routes, middleware, validators" }

dependency_rules:
  scope: module # module | global
  domain: { may_import: [] }
  application: { may_import: [domain] }
  presentation: { may_import: [application] }
  infrastructure: { may_import: [application, domain] }
  cross_module:
    allowed: false
    via: [shared, module-public-api]

forbidden_imports: # framework leakage rules
  domain:
    external: [express, "@nestjs/*", "@prisma/client", pg, http]
    reason: "The domain layer must remain framework-agnostic and independently testable."
  application:
    external: [express, "@prisma/client"]
    reason: "Use cases depend on contracts, not on infrastructure."

structure:
  root: src
  directories: [src/modules, src/shared, src/config]
  module:
    container: src/modules
    directories: [domain, application, infrastructure, presentation]

naming:
  module: kebab-case
  files: kebab-case
  use_case_suffix: ".use-case.ts"
  entity_suffix: ".entity.ts"

strictness:
  minimal: { enforce_dependency_rules: false, report: false }
  standard: { enforce_dependency_rules: false, report: true }
  strict: { enforce_dependency_rules: true, report: true, block: true }

compatible_stacks:
  backend: [express, nestjs, fastify]
  database: [postgresql, mysql, sqlite, mongodb]

skills: [architecture/architecture-principles, architecture/feature-clean]

trade_offs:
  benefits:
    - "Business rules isolated from frameworks and from other modules"
    - "High unit-testability of the domain"
    - "Modules can be extracted into services later"
  costs:
    - "Highest file count of the supported styles"
    - "Boilerplate per use case"
    - "Modules can drift in style without review discipline"
  not_recommended_when:
    - "Small CRUD service with few business rules"
    - "Prototype with a short expected lifetime"

detection: # hints for the detection engine
  marker_directories: ["src/modules/*/domain", "src/modules/*/application"]
  marker_files: ["**/*.use-case.ts"]
  min_confidence_markers: 2
```

## 3. Dependency rules semantics

- `may_import` lists **layer ids**, not paths. Resolution to paths is done via `structure`.
- An empty `may_import: []` means the layer may import nothing internal (it may still import
  the standard library and anything not in `forbidden_imports`).
- `scope: module` means the rules apply inside each module; cross-module imports are governed
  by `cross_module`.
- `forbidden_imports.external` supports glob patterns against package names.
- The checker MUST report the offending file, the import, the rule, and a suggested fix.

## 4. Tree templates

- `tree/` mirrors the generated structure literally.
- `tree/_module/` is instantiated once per module for module-oriented styles.
- Placeholders use `{{moduleName}}`, `{{ModuleName}}`, `{{module-name}}`.
- `.gitkeep` is emitted for otherwise-empty directories.
- Generation MUST be non-destructive: existing files are never overwritten; collisions are
  reported and skipped.
- Generation is skipped entirely when `project.mode = existing`.

## 5. The `custom` manifest

Generated at analyse time rather than shipped:

```yaml
name: custom
version: 1
source: detected
generated_from: .engineering/project-profile.yaml

structure:
  root: src
  modules: { users: { path: src/users }, orders: { path: src/orders } }
  shared: [{ path: src/shared, role: utilities }]

dependency_rules:
  mode: observed # observed | declared
  observed:
    - { from: "src/*", to: "src/shared", count: 12 }
    - { from: "src/*", to: "src/database", count: 4, note: "bypasses repository layer" }

tree: null # custom never generates structure
```

With `mode: observed`, `doctor` checks **consistency with observed behaviour**, not compliance
with an ideal. A new import that matches nothing previously observed is a note, not a failure.

## 6. Validation

- [ ] `name` matches directory
- [ ] every `dependency_rules` key is a declared layer id
- [ ] no layer may import itself transitively in a way that creates a cycle
- [ ] `structure.directories` cover every layer (or `structure.module.directories` do)
- [ ] `tree/` matches `structure` (no orphan directories)
- [ ] `skills[]` exist
- [ ] `trade_offs.benefits` and `.costs` are both non-empty — a one-sided manifest is rejected
- [ ] `detection.marker_*` do not collide with another architecture's unique markers

## 7. Adding a new architecture

No core code changes required:

1. `mkdir architectures/<name>` and write `manifest.yaml`.
2. Write `SKILL.md` and `rules.md` (including honest costs).
3. Add `tree/` if the style supports generation.
4. Add detection markers.
5. Add a fixture repo in `tests/fixtures/repos/`.
6. Add `dependency-rules.test.ts` and `generator.test.ts`.
7. Register in `architectures/index.yaml`.

If step 1–7 required editing the engine, the engine is not data-driven — fix the engine.

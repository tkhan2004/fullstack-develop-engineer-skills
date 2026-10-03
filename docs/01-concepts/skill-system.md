# Skill System

Status: draft

## 1. What a skill is

A skill is a **versioned, self-contained unit of engineering guidance** addressed to an AI
agent. It is not a prompt, not a template, not a code generator.

```text
skills/quality/clean-code/
├── skill.yaml        machine-readable metadata (id, applies_to, requires, conflicts)
├── SKILL.md          the instructions the agent receives
├── rules.md          rationale and trade-offs for humans (optional)
├── examples/         bad.ts / good.ts pairs
└── tests/            resolution + content assertions (optional)
```

Full contract: [skill-contract.md](../02-specs/skill-contract.md).

## 2. Taxonomy

```text
skills/
├── core/          always-on reasoning skills
│   ├── engineering-principles/
│   ├── project-onboarding/        ← existing-project analysis (was "project-awareness")
│   ├── requirements-analysis/
│   ├── problem-solving/
│   └── decision-making/
│
├── architecture/
│   ├── architecture-principles/
│   ├── layered/  feature/  clean/  feature-clean/  hexagonal/  custom/
│   ├── api-design/
│   └── scalability/
│
├── quality/
│   ├── clean-code/  solid/  design-patterns/  refactoring/  code-review/
│
├── backend/
│   ├── typescript/  nodejs/  express/  nestjs/
│
├── frontend/
│   ├── react/  nextjs/  accessibility/  ui-review/
│
├── database/
│   ├── sql/  postgresql/  prisma/  database-performance/
│
└── engineering/
    ├── testing/  security/  error-handling/  debugging/
    ├── performance/  observability/  caching/
```

Architecture skills live beside the architecture definitions in `architectures/<name>/SKILL.md`
and are _referenced_ from `skills/architecture/` rather than duplicated.

## 3. Resolution

Pure function, no I/O, no randomness:

```ts
resolve(config: EngineeringConfig, profile?: ProjectProfile): ResolvedSkillSet
```

### Inputs → outputs

```yaml
project: { mode: existing }
stack:
  {
    language: typescript,
    backend: { framework: express },
    database: { engine: postgresql, orm: prisma },
  }
architecture: { backend: { style: feature-clean, strictness: standard } }
engineering: { clean_code: true, testing: true, security: true, error_handling: true }
```

resolves to:

```text
core/engineering-principles          (always)
core/project-onboarding              (always; mandatory when mode=existing)
core/requirements-analysis           (always)
core/problem-solving                 (always)

architecture/architecture-principles  (always)
architecture/feature-clean            (from architecture.backend.style)

backend/typescript                    (from stack.language)
backend/nodejs                        (implied by backend.runtime)
backend/express                       (from stack.backend.framework)

database/sql                          (implied by database.engine)
database/postgresql                   (from stack.database.engine)
database/prisma                       (from stack.database.orm)

quality/clean-code                    (engineering.clean_code)
quality/code-review                   (always)

engineering/testing                   (engineering.testing)
engineering/security                  (engineering.security)
engineering/error-handling            (engineering.error_handling)
```

The user never configures skill dependencies by hand.

### Algorithm

```text
1. seed    = always-on core skills
2. select  = skills whose `applies_to` matches config/profile
3. expand  = transitively add `requires`
4. check   = fail on `conflicts_with` pairs, with an actionable message
5. order   = topological sort; ties broken by declared `priority`, then id
6. tone    = attach strictness-specific wording per skill
7. dedupe  = one skill id appears exactly once
```

Properties that MUST hold (and MUST be tested):

- **Deterministic** — same input, same ordered output, byte for byte.
- **Idempotent** — resolving a resolved set changes nothing.
- **Explainable** — every selected skill records _why_ (`selected_by: stack.backend.framework`).
- **Total** — an empty/minimal config still yields a valid set (core only).

## 4. `applies_to` matching

```yaml
# skills/backend/express/skill.yaml
id: backend/express
version: 1.0.0
applies_to:
  stack.backend.framework: [express]
requires: [backend/nodejs, backend/typescript]
priority: 50
```

Matching supports exact values, lists, `"*"`, and `!value` negation. Nothing more — a query
language here is over-engineering.

## 5. Composition rules

- A skill MUST NOT restate another skill's content; it references it in
  `## Interaction With Other Skills`.
- A technology skill MUST NOT assume an architecture. The Express skill reads
  `architecture.backend.style` and adapts its guidance; it never prescribes folders.
- An architecture skill MUST NOT assume a framework.
- A preset contains zero rules.

Violating any of these shows up as duplicated paragraphs in the generated output — a smell the
generator SHOULD detect and report in CI.

## 6. Ordering in generated output

```text
1. Project context      (mode, architecture, strictness, "do not restructure" where applicable)
2. Core reasoning       (onboarding → requirements → problem solving)
3. Architecture         (principles → the selected style)
4. Stack               (language → runtime → framework → database)
5. Quality             (clean code → SOLID → review)
6. Engineering         (testing → security → error handling → …)
```

Rationale: agents weight earlier context more heavily, so the non-negotiable project facts go
first and generic advice last.

## 7. Project-specific skills

For existing projects the generator emits one extra, locally-owned skill:

```text
.engineering/skills/project-conventions/SKILL.md
```

Built from the project profile — observed naming, error handling, test placement, reference
modules. It is generated once, then **owned by the user**: regeneration MUST diff and ask
before overwriting a file the user has edited.

## 8. Versioning

- Each skill carries a semver `version`.
- Content change that could alter agent behaviour → minor bump.
- `applies_to` / `requires` / id change → major bump.
- The resolved set is recorded in `.engineering/generated/lockfile.yaml` with skill ids and
  versions, so output drift is attributable.

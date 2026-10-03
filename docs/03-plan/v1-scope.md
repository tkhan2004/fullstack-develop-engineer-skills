# V1 Scope & Definition of Done

Status: accepted

## 1. In scope

### Stack

TypeScript · Node.js · Express · PostgreSQL · Prisma · React · Next.js · Vitest

### Architectures

`layered` · `feature` · `clean` · `feature-clean` · `custom`
(`hexagonal` is V1.1 — the manifest format must already support it.)

### Project modes

`new` · `existing/adopt` · `existing/recommend` · `existing/migrate --plan` (plan only)

### Strictness

`observe` · `minimal` · `standard` · `strict`

### Skills (V1 library)

```text
core/        engineering-principles · project-onboarding · requirements-analysis
             problem-solving · decision-making
architecture/architecture-principles · layered · feature · clean · feature-clean · custom
quality/     clean-code · solid · code-review · refactoring
backend/     typescript · nodejs · express
frontend/    react · nextjs · accessibility · ui-review
database/    sql · postgresql · prisma
engineering/ testing · security · error-handling · debugging
```

28 skills. Each must meet the [skill contract](../02-specs/skill-contract.md) — depth over
count; a shallow skill is worse than a missing one.

### CLI

`init` · `analyze` · `list` · `generate` · `doctor` · `review`

### Adapters

`claude` · `generic` · `codex`

### Presets

`pern-express` · `next-express` · `node-api`

## 2. Out of scope

See [non-goals.md](../00-foundation/non-goals.md).

## 3. Definition of Done

V1 ships when **all** of the following hold.

### A. New project

```bash
mkdir demo && cd demo
npx @engineering-skills/cli init
# TypeScript / Express / PostgreSQL / Prisma / Next.js / Feature+Clean / standard
# practices: clean code, SOLID, testing, security, error handling
```

- [ ] Configuration written and valid against the schema
- [ ] Architecture represented correctly in config and generated structure
- [ ] Correct skills resolved, in the documented order, each with a `selected_by` reason
- [ ] `CLAUDE.md` and generic instructions generated, project context first
- [ ] Architecture dependency rules present in the generated instructions
- [ ] Directory structure matches the `feature-clean` manifest
- [ ] Re-running `init`/`generate` is byte-identical (clean `git status`)

### B. Existing project

```bash
cd fixtures/repos/express-layered-clean
npx @engineering-skills/cli analyze
npx @engineering-skills/cli init   # → adopt
```

- [ ] Stack detected correctly with evidence
- [ ] Architecture detected as `layered`, confidence ≥ 0.85, with import-graph evidence
- [ ] Conventions detected with ratios (naming, test placement, error strategy)
- [ ] Reference modules identified
- [ ] **No source file created, modified or deleted** (verified by git status assertion)
- [ ] `adopt` is the pre-selected strategy
- [ ] Generated instructions contain "Do not restructure the project" and list the actual
      directories of this repo
- [ ] Strictness defaults to `observe`
- [ ] A `project-conventions` skill is generated from the profile

### C. Ambiguous project

```bash
cd fixtures/repos/ambiguous-mixed
npx @engineering-skills/cli analyze
```

- [ ] Confidence < 0.60 reported honestly, with ranked alternatives
- [ ] Falls back to `custom` with a described structure
- [ ] `--yes` refuses to guess and exits with a clear message
- [ ] Observations listed neutrally, no judgemental language

### D. Quality gates

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` green on Node 20 and 22
- [ ] Config validation: ≥ 20 valid + ≥ 20 invalid fixtures, each invalid case producing an
      actionable message
- [ ] Skill resolution: deterministic + idempotent, proven by test
- [ ] Architecture generation: per-architecture tests pass
- [ ] Detection: every fixture repo in its expected confidence band
- [ ] Adapters: snapshot tests, no drift
- [ ] Non-destructiveness: a test asserts `git status` is clean after `analyze`, `doctor`,
      `review`, `list`, and after `init` on an existing project
- [ ] Every skill passes contract validation in CI
- [ ] Every skill has ≥ 1 `sources[]` entry resolvable in `docs/sot/mapping/`

### E. Documentation

- [ ] README with install + 60-second quick start for both new and existing projects
- [ ] `docs/` complete and accurate (no spec describing unimplemented behaviour as shipped)
- [ ] Guides: custom skill, custom architecture, new adapter
- [ ] CONTRIBUTING with the skill authoring checklist
- [ ] CHANGELOG via changesets

### F. Release

- [ ] Published as `@engineering-skills/cli@0.1.0`
- [ ] `npx @engineering-skills/cli@latest init` works from a clean machine
- [ ] Repository tagged, release notes published

## 4. Explicitly acceptable V1 limitations

- `migrate` produces a plan only; it does not move files.
- `doctor` checks are heuristic, not type-aware.
- `review` prepares context; it calls no AI provider.
- Frontend architecture detection is shallow (framework + routing convention only).
- Monorepos are analysed as a single root unless `--root` is given.

Each of these MUST be stated in the README. A documented limitation is a feature boundary;
an undocumented one is a bug.

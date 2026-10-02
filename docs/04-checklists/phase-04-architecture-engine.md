# P4 — Architecture Engine

**Entry** P3 · **Exit** each architecture generates its documented tree; checker flags bad fixture, passes good one; generation idempotent and non-destructive.
Spec: [architecture-manifest.md](../02-specs/architecture-manifest.md)

## Manifest

- [ ] Zod schema for `manifest.yaml`
- [ ] Loader + registry scanning `architectures/*`
- [ ] Validation: layer ids consistent, no rule cycles, tree matches structure,
      `trade_offs.benefits` and `.costs` both non-empty, skills exist

## Architectures (data)

- [ ] `layered` — manifest, SKILL.md, rules.md, tree, examples
- [ ] `feature` — idem
- [ ] `clean` — idem
- [ ] `feature-clean` — idem
- [ ] `custom` — manifest schema only (generated at analyse time; no tree)
- [ ] `architectures/index.yaml` registry
- [ ] Each `rules.md` states costs as clearly as benefits

## Dependency checker

- [ ] Import-graph builder for TS/JS (ts-morph or a lightweight parser)
- [ ] Map file path → layer via `structure`
- [ ] Evaluate `may_import`
- [ ] Evaluate `forbidden_imports.external` (glob package matching)
- [ ] `scope: module` handling + `cross_module` rules
- [ ] Findings: file, line, import, violated rule, suggested fix
- [ ] Strictness behaviour: report at `standard`, block at `strict`

## Tree generator

- [ ] Template reader with `{{moduleName}}` variants
- [ ] Per-module instantiation for module-oriented styles
- [ ] `.gitkeep` for empty directories
- [ ] **Never overwrites**: collisions reported and skipped
- [ ] Skipped entirely when `mode = existing`
- [ ] Dry-run write plan

## Tests

- [ ] `architectures/<name>/tests/generator.test.ts` per architecture
- [ ] `architectures/<name>/tests/dependency-rules.test.ts` per architecture
- [ ] Known-good fixture: zero violations
- [ ] Known-bad fixture: exact expected violations
- [ ] Generating twice is a no-op
- [ ] Adding a new architecture requires no engine change (prove with a throwaway manifest)

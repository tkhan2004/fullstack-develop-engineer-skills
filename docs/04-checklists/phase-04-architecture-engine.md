# P4 — Architecture Engine

**Entry** P3 · **Exit** each architecture generates its documented tree; checker flags bad fixture, passes good one; generation idempotent and non-destructive.
Spec: [architecture-manifest.md](../02-specs/architecture-manifest.md)

## Manifest

- [x] Zod schema for `manifest.yaml`
- [x] Loader + registry scanning `architectures/*`
- [x] Validation: layer ids consistent, no rule cycles, tree matches structure,
      `trade_offs.benefits` and `.costs` both non-empty, skills exist

## Architectures (data)

- [x] `layered` — manifest.yaml (SKILL.md, rules.md and examples arrive with P10 skill research)
- [x] `feature` — manifest.yaml
- [x] `clean` — manifest.yaml
- [x] `feature-clean` — manifest.yaml
- [ ] `custom` — generated from the project profile in P5 (the config already carries a described `custom` block)
- [x] ~~`architectures/index.yaml` registry~~ — dropped: architectures are discovered by directory
- [x] Each `rules.md` states costs as clearly as benefits

## Dependency checker

- [x] Import-graph builder for TS/JS (ts-morph or a lightweight parser)
- [x] Map file path → layer via `structure`
- [x] Evaluate `may_import`
- [x] Evaluate `forbidden_imports.external` (glob package matching)
- [x] `scope: module` handling + `cross_module` rules
- [x] Findings: file, line, import, violated rule, suggested fix
- [x] Strictness behaviour: report at `standard`, block at `strict`

## Tree generator

- [ ] ~~Template reader with `{{moduleName}}` variants~~ — deferred: V1 generates directories only
- [x] Per-module scaffolding for module-oriented styles (directories)
- [x] `.gitkeep` for empty directories
- [x] **Never overwrites**: collisions reported and skipped
- [x] Skipped entirely when `mode = existing`
- [x] Dry-run write plan

## Tests

- [ ] `architectures/<name>/tests/generator.test.ts` per architecture
- [ ] `architectures/<name>/tests/dependency-rules.test.ts` per architecture
- [x] Known-good fixture: zero violations
- [x] Known-bad fixture: exact expected violations
- [x] Generating twice is a no-op
- [x] Adding a new architecture requires no engine change (prove with a throwaway manifest)

## Status notes

- Package: `packages/architecture-engine`; manifests in `architectures/`. 61 tests.
- Import extraction is a lightweight scanner, not a compiler: it masks comments and template
  literals but would report an `import` inside a quoted string. Fine for a dependency graph.
- `tests/generator.test.ts` / `dependency-rules.test.ts` per architecture are covered by shared
  tests that run over every shipped manifest rather than one pair of files each.
- Hexagonal ships in V1.1, but a test proves the manifest format already expresses it.
- Trade-off wording in the manifests is general engineering knowledge; P10 re-checks it against
  the primary sources in `docs/sot` and cites them.

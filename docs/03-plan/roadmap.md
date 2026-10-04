# Roadmap

Status: accepted

Eleven phases. Each has **entry criteria**, **deliverables**, **exit criteria**. Do not start
a phase whose entry criteria are unmet; do not declare one done without its exit gate.

Detailed task lists: [../04-checklists/](../04-checklists/README.md).

```text
P0  Bootstrap           ──┐
P1  Foundation            │  weeks 1–2
P2  Config engine       ──┘
P3  Skill engine        ──┐
P4  Architecture engine   │  weeks 3–4
P5  Detection engine    ──┘
P6  CLI init            ──┐
P7  AI adapters           │  weeks 5–6
P8  Generation          ──┘
P9  Doctor / analyze / review   week 7
P10 Skill content + docs + release   week 8
```

Timeline is indicative for one part-time maintainer; the gates are not.

---

## P0 — Bootstrap

**Entry** empty repository.
**Deliverables** git init, license (MIT), README, `docs/` (this folder), CoC, issue templates,
`.gitignore`, `.editorconfig`.
**Exit** a new contributor can read `docs/README.md` and know what to build and why.

## P1 — Foundation

**Entry** P0 done.
**Deliverables** pnpm workspace monorepo; TypeScript strict; ESLint + Prettier; Vitest;
tsup/tsc build; changesets; CI (lint + typecheck + test + build on Node 20/22); packages
`core`, `config`, `cli` as empty-but-wired units.
**Exit** `pnpm i && pnpm build && pnpm test && pnpm lint` green from a clean clone; CI green.

## P2 — Configuration engine

**Entry** P1.
**Deliverables** Zod schemas for config, loader/writer (YAML, stable key order), cross-field
validation, actionable error formatter with did-you-mean, defaults, preset merging,
precedence chain.
**Exit** ≥ 20 valid and ≥ 20 invalid fixtures pass; every invalid case produces a message
naming path + expected + suggestion; round-trip load→write is byte-stable.

## P3 — Skill engine

**Entry** P2.
**Deliverables** `skill.yaml` schema, loader, registry, `applies_to` matcher, `requires`
expansion, conflict detection, topological ordering, `selected_by` provenance, token
estimation.
**Exit** the reference config in [skill-system.md §3](../01-concepts/skill-system.md) resolves
to exactly the documented set, in the documented order; resolution proven deterministic and
idempotent by test; cycles and conflicts fail with readable errors.

## P4 — Architecture engine

**Entry** P3.
**Deliverables** manifest schema + loader; manifests for `layered`, `feature`, `clean`,
`feature-clean`, `custom`; tree templates; dependency-rule model; import-graph checker;
non-destructive tree generator.
**Exit** each architecture generates its documented tree; the checker flags a known-bad
fixture and passes a known-good one; generation is idempotent and never overwrites.

## P5 — Detection engine

**Entry** P4 (needs manifests for conformance scoring).
**Deliverables** scanner (gitignore-aware, bounded); signal extraction incl. import graph;
stack/architecture/convention detectors with confidence + evidence; health observations;
profile writer; fixture repos.
**Exit** every fixture in
[detection-engine.md §6](../01-concepts/detection-engine.md) lands in its expected confidence
band; `analyze` writes nothing but the profile; profile is deterministic under
`--deterministic`.

## P6 — CLI `init`

**Entry** P2, P3, P4, P5.
**Deliverables** command framework, interactive prompts for both modes, evidence-based mode
pre-selection, analysis report rendering, strategy selection, write plan + confirmation,
all flags, `--yes`, `--dry-run`.
**Exit** both golden paths work end-to-end on fixture repos; `--yes` refuses to guess below
0.85 confidence; no write occurs before confirmation; snapshot tests cover prompt flows.

## P7 — AI adapters

**Entry** P3 (canonical output needs resolution).
**Deliverables** canonical IR, adapter interface + registry, `claude`, `generic`, `codex`
adapters, generated-file markers, hash-based edit detection, managed blocks.
**Exit** snapshot tests per adapter; hand-edited generated file halts `generate`; content
outside managed blocks preserved; ordering matches
[ai-adapter-spec.md §6](../02-specs/ai-adapter-spec.md).

## P8 — Project generation

**Entry** P6, P7.
**Deliverables** `.engineering/` layout, `generate` command, lockfile, project/conventions
skill generation from the profile, `--check`.
**Exit** `generate && generate` → clean `git status`; `--check` fails on drift; lockfile
records skill ids + versions; regenerating a user-edited project skill asks first.

## P9 — Doctor / analyze report / review

**Entry** P5, P8.
**Deliverables** diagnostic plugin interface; checks for config validity, profile staleness,
dependency rules, TS strictness, test presence, obvious security gaps; `review` context
bundle from a git diff.
**Exit** diagnostics are registered, not hard-coded; exit codes per spec; `--json` stable;
`review` output includes only rules relevant to the changed paths.

## P10 — Skill content, docs, release

**Entry** P9.
**Deliverables** V1 skill library written to contract and sourced from `docs/sot`; user docs
(install, quick start, existing projects, architectures, custom skills, custom architectures,
adapters, contributing); examples; `0.1.0` release.
**Exit** [v1-scope.md](v1-scope.md) definition of done fully satisfied; every skill passes CI
validation; every skill has at least one `sources[]` entry traceable to the SoT.

---

## Post-V1 backlog

Hexagonal architecture · NestJS, Fastify, Drizzle, MySQL skills · `migrate` apply ·
Cursor/Windsurf adapters · frontend architecture detection · monorepo-aware analysis ·
community skill packs · VS Code extension.

## Cross-cutting rules

At the end of **every** phase: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`,
update the phase checklist, write an ADR for any non-obvious decision made, and report what
is implemented vs. remaining.

Never: implement a later phase's feature speculatively; add an abstraction without a second
concrete use; let a contract (schema, manifest, skill format) change without a version bump
and a migration note.

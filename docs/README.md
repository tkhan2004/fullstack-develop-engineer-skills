# Engineering Skills Framework — Documentation

> An open-source **engineering rule system** that teaches AI coding agents how to reason,
> structure, implement, review, debug and maintain software — according to the
> architecture and stack the _developer_ chooses, not the one the tool prefers.
>
> It is **not** a boilerplate generator.

Docs are written in English (the project is open-source / international).
Discussion and issues may be in Vietnamese.

---

## Where to start

| If you want to…                            | Read                                                                                                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Understand _why_ this exists               | [00-foundation/vision.md](00-foundation/vision.md)                                                                                                  |
| Understand the core mental model           | [00-foundation/philosophy.md](00-foundation/philosophy.md)                                                                                          |
| Understand new vs. existing projects       | [01-concepts/project-mode.md](01-concepts/project-mode.md)                                                                                          |
| Write or review a skill                    | [02-specs/skill-contract.md](02-specs/skill-contract.md) + [04-checklists/skill-authoring-checklist.md](04-checklists/skill-authoring-checklist.md) |
| Start building                             | [04-checklists/README.md](04-checklists/README.md)                                                                                                  |
| Know what is _out_ of scope                | [00-foundation/non-goals.md](00-foundation/non-goals.md)                                                                                            |
| Find reference material for writing skills | [sot/README.md](sot/README.md)                                                                                                                      |

---

## Map of this folder

```text
docs/
├── README.md                     ← you are here
│
├── 00-foundation/                WHY — stable, changes rarely
│   ├── vision.md                 product goal, target users, success criteria
│   ├── philosophy.md             the 4-layer model, core invariants
│   ├── non-goals.md              what V1 deliberately will not do
│   └── glossary.md               shared vocabulary (use these words everywhere)
│
├── 01-concepts/                  WHAT — the big ideas
│   ├── project-mode.md           create / adopt / migrate
│   ├── strictness-levels.md      observe / minimal / standard / strict
│   ├── architecture-catalog.md   layered, feature, clean, feature-clean, hexagonal, custom
│   ├── skill-system.md           skill taxonomy, resolution, composition
│   └── detection-engine.md       how an existing repo is analysed
│
├── 02-specs/                     HOW — contracts that code must satisfy
│   ├── config-schema.md          .engineering/config.yaml
│   ├── project-profile-schema.md .engineering/project-profile.yaml
│   ├── skill-contract.md         SKILL.md + skill.yaml
│   ├── architecture-manifest.md  architectures/<name>/manifest.yaml
│   ├── cli-spec.md               commands, flags, exit codes, UX rules
│   └── ai-adapter-spec.md        canonical output → Claude / Codex / generic
│
├── 03-plan/                      WHEN — sequencing
│   ├── roadmap.md                phases 0–10 with entry/exit criteria
│   ├── v1-scope.md               definition of done for V1
│   └── repository-structure.md   monorepo layout + growth rules
│
├── 04-checklists/                DO — tickable work items
│   ├── README.md                 master checklist / progress board
│   ├── phase-00..phase-10.md     per-phase task lists
│   ├── skill-authoring-checklist.md
│   └── release-checklist.md
│
├── 05-decisions/                 ADRs — decisions + the reasoning behind them
│   ├── README.md
│   ├── adr-template.md
│   └── adr-00XX-*.md
│
└── sot/                          SOURCE OF TRUTH — reference material library
    ├── README.md                 rules for using sources (incl. copyright)
    ├── INDEX.md                  curated bibliography per skill domain
    ├── mapping/                  source → skill traceability
    ├── notes/                    distilled, citable notes (committed)
    └── raw/                      your own copies of books/PDFs (NOT committed)
```

---

## Document conventions

- **Normative words** follow RFC 2119 style: **MUST**, **MUST NOT**, **SHOULD**, **MAY**.
- Every spec file has a `Status:` header — `draft` / `accepted` / `superseded`.
- Checklists use `- [ ]` / `- [x]`; keep them in sync with reality, not with intentions.
- Any non-obvious decision gets an ADR in `05-decisions/`; specs link to the ADR instead of
  re-arguing the decision.
- Vocabulary is defined once in [glossary.md](00-foundation/glossary.md). If a term is not
  there, it is not a term — add it or stop using it.

# Source of Truth (SoT) Library

The reference library the skill content is derived from. When a `SKILL.md` makes a claim,
this is where the claim comes from.

```text
docs/sot/
├── README.md            ← rules (read this first)
├── INDEX.md             curated bibliography, by domain, prioritised
├── mapping/             source → skill traceability
│   └── skill-source-map.md
├── notes/               distilled notes in OUR words — committed, citable
│   ├── _TEMPLATE.md
│   └── <topic>.md
├── books/               per-book working notes and reading status
├── standards/           RFCs, OWASP, 12-factor, SemVer, Conventional Commits
├── style-guides/        Google TS, Airbnb, framework style guides
├── papers/             academic / industry papers
├── framework-docs/      official docs excerpts, links, version notes
├── security/            OWASP, CWE, security-specific material
└── raw/                 YOUR copies of books/PDFs — GITIGNORED, never committed
```

## 1. Copyright rules — non-negotiable

This is an open-source repository. Reference material is mostly **not** ours.

| Rule                                   | Detail                                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Never commit copyrighted files**     | `docs/sot/raw/` is gitignored. Books, PDFs, scanned pages, paid-course material stay there, local only.                                     |
| **Never paste book text into a skill** | Skills contain _our_ rules, written in our words.                                                                                           |
| **Quote sparingly**                    | ≤ 25 words, in quotation marks, with author + title + location. One quote per note, not per paragraph.                                      |
| **Summaries must transform**           | A note is a distillation and an application, not a chapter in shorter form. If it reads like the original, rewrite it.                      |
| **Cite everything**                    | Every note lists its sources. Every skill lists its sources in `skill.yaml`.                                                                |
| **Respect licences**                   | OWASP (CC BY-SA), RFCs (IETF), Google style guides (CC BY) have terms — record the licence in the note and honour attribution requirements. |
| **No lyrics-style reconstruction**     | Do not assemble a work from excerpts across several notes.                                                                                  |

When unsure: write the idea from memory, in your own words, and cite where you learned it.

## 2. How a source becomes a skill

```text
source (book / RFC / docs)
   ↓   read
notes/<topic>.md             distilled, our words, cited
   ↓   extract
5–10 falsifiable rules
   ↓   write
skills/<category>/<name>/SKILL.md
   ↓   record
skill.yaml  sources: [{ sot: books/clean-code, topics: [naming] }]
   ↓   verify
mapping/skill-source-map.md  (CI checks every sources[] entry resolves here)
```

A rule that cannot be traced to either a source or a stated, reasoned project decision does
not belong in a skill.

## 3. Rules for notes

- One topic per file, named `<domain>-<topic>.md` (`quality-naming.md`, `security-authz.md`).
- Use [`notes/_TEMPLATE.md`](notes/_TEMPLATE.md).
- Record **where sources disagree** — that is the most valuable part. The skill must then take
  a position and say why.
- Record what is **outdated** (a 2008 recommendation that modern TypeScript makes irrelevant).
- Mark each extracted rule as `actionable` or `background`. Only `actionable` rules reach a
  skill.

## 4. Priorities

| Tier   | Meaning                                                 |
| ------ | ------------------------------------------------------- |
| **P1** | Required reading before writing the corresponding skill |
| **P2** | Read when deepening the skill                           |
| **P3** | Useful context; cite if it settles a dispute            |

See [INDEX.md](INDEX.md).

## 5. Adding a source

1. Put your copy (if any) in `raw/` — it stays local.
2. Add a row to [INDEX.md](INDEX.md): title, author, year, tier, which skills it feeds.
3. Create `notes/<topic>.md` from the template as you read.
4. Add the mapping row in [mapping/skill-source-map.md](mapping/skill-source-map.md).
5. Reference it from the skill's `skill.yaml` `sources[]`.

## 6. What this is not

- Not framework runtime input. The CLI never reads `docs/sot/`.
- Not a dumping ground for links. An entry without notes is a TODO, not a source.
- Not a reading list for its own sake. Every P1 entry must map to a skill.

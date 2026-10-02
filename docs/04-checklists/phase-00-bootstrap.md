# P0 — Bootstrap

**Entry** empty repository · **Exit** a contributor can read `docs/` and know what to build.

## Repository

- [x] `git init`; default branch `main`
- [x] `LICENSE` — MIT
- [x] `README.md` — one-paragraph pitch, status badge, link to `docs/README.md`
- [x] `.gitignore` — node, dist, coverage, `.DS_Store`, `docs/sot/raw/`
- [x] `.editorconfig` — LF, 2 spaces, final newline
- [x] `.gitattributes` — `* text=auto eol=lf`
- [ ] `CODE_OF_CONDUCT.md`
- [ ] `CONTRIBUTING.md` (stub; filled in P10)
- [x] `.github/ISSUE_TEMPLATE/{bug,skill-proposal,architecture-proposal}.md`
- [x] `.github/PULL_REQUEST_TEMPLATE.md` including the standing invariants

## Documentation

- [x] `docs/` structure created
- [x] Vision, philosophy, glossary, non-goals
- [x] Concepts: project mode, strictness, architecture catalog, skill system, detection
- [x] Specs: config, profile, skill contract, manifest, CLI, adapters
- [x] Plan: roadmap, V1 scope, repository structure
- [x] Checklists
- [x] ADRs 0001–0005
- [x] `docs/sot/` library scaffold + bibliography
- [ ] Decide docs language policy (English docs / Vietnamese discussion) — note it in README

## Naming

- [ ] npm scope available: `@engineering-skills` (or choose an alternative and update docs)
- [ ] CLI binary name decided: `eng-skills` (+ alias?)
- [ ] GitHub repository created, description and topics set

## Source of truth

- [x] Read [sot/README.md](../sot/README.md) and agree the copyright rules
- [ ] Add first reference materials (or mark the bibliography as the working set)
- [x] Confirm `docs/sot/raw/` is gitignored

# Master Checklist

Status: living document — update it as reality changes, not as intentions change.

## Progress board

| Phase | Name                  | Status | Checklist                                                          |
| :---: | --------------------- | :----: | ------------------------------------------------------------------ |
|  P0   | Bootstrap             |   🟡   | [phase-00-bootstrap.md](phase-00-bootstrap.md)                     |
|  P1   | Foundation            |   🟡   | [phase-01-foundation.md](phase-01-foundation.md)                   |
|  P2   | Configuration engine  |   🟡   | [phase-02-config-engine.md](phase-02-config-engine.md)             |
|  P3   | Skill engine          |   🟡   | [phase-03-skill-engine.md](phase-03-skill-engine.md)               |
|  P4   | Architecture engine   |   🟡   | [phase-04-architecture-engine.md](phase-04-architecture-engine.md) |
|  P5   | Detection engine      |   🟡   | [phase-05-detection-engine.md](phase-05-detection-engine.md)       |
|  P6   | CLI `init`            |   🟡   | [phase-06-cli-init.md](phase-06-cli-init.md)                       |
|  P7   | AI adapters           |   ⬜   | [phase-07-ai-adapters.md](phase-07-ai-adapters.md)                 |
|  P8   | Project generation    |   ⬜   | [phase-08-generation.md](phase-08-generation.md)                   |
|  P9   | Doctor / review       |   ⬜   | [phase-09-doctor-review.md](phase-09-doctor-review.md)             |
|  P10  | Skills, docs, release |   ⬜   | [phase-10-skills-docs-release.md](phase-10-skills-docs-release.md) |

Legend: ⬜ not started · 🟡 in progress · ✅ done · ⛔ blocked

Supporting checklists:

- [skill-authoring-checklist.md](skill-authoring-checklist.md) — per skill
- [architecture-authoring-checklist.md](architecture-authoring-checklist.md) — per architecture
- [release-checklist.md](release-checklist.md) — per release

## Per-phase exit ritual (all phases)

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] Phase checklist boxes reflect reality
- [ ] ADR written for every non-obvious decision made in the phase
- [ ] Docs updated where behaviour changed (no spec claiming unshipped behaviour)
- [ ] Short report: what was implemented, what remains, what surprised us

## Standing invariants — verify before every merge

- [ ] No command modifies source files outside the documented, confirmed cases
- [ ] Generation is deterministic (`generate && generate` → clean `git status`)
- [ ] No architecture inferred from a framework
- [ ] No skill hard-codes directory paths outside `architectures/**`
- [ ] Every detected claim carries evidence and confidence
- [ ] Adding a stack/architecture requires data changes only
- [ ] Core packages are free of Claude/Codex-specific code
- [ ] Error messages name the path, the problem, and the next action

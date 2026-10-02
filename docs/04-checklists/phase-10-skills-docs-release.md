# P10 — Skill Content, Docs, Release

**Entry** P9 · **Exit** [V1 definition of done](../03-plan/v1-scope.md) fully satisfied.

## Skill library (26 skills)

Each item: write → validate against the contract → test against a real task → review.
Use [skill-authoring-checklist.md](skill-authoring-checklist.md) per skill.

### core

- [ ] `engineering-principles`
- [ ] `project-onboarding` ← highest value; write first
- [ ] `requirements-analysis`
- [ ] `problem-solving`
- [ ] `decision-making`

### architecture

- [ ] `architecture-principles`
- [ ] `layered` · [ ] `feature` · [ ] `clean` · [ ] `feature-clean` · [ ] `custom`

### quality

- [ ] `clean-code` · [ ] `solid` · [ ] `code-review` · [ ] `refactoring`

### backend

- [ ] `typescript` · [ ] `nodejs` · [ ] `express`

### frontend

- [ ] `react` · [ ] `nextjs`

### database

- [ ] `sql` · [ ] `postgresql` · [ ] `prisma`

### engineering

- [ ] `testing` · [ ] `security` · [ ] `error-handling` · [ ] `debugging`

## Traceability

- [ ] Every skill has ≥ 1 `sources[]` entry
- [ ] `docs/sot/mapping/skill-source-map.md` complete
- [ ] No skill reproduces copyrighted text (see [sot/README.md](../sot/README.md))

## Validation of skill _behaviour_

For at least 5 high-value skills, run a real agent task with and without the skill:

- [ ] `project-onboarding` on an existing fixture repo
- [ ] `clean-code` on a deliberately messy module
- [ ] `security` on an endpoint with an IDOR
- [ ] `testing` on an untested business rule
- [ ] the selected architecture skill on a new feature request

Record before/after observations in `docs/sot/notes/skill-evaluations.md`. A skill that does
not change agent behaviour is not finished.

## Documentation

- [ ] README: pitch, install, 60-second quick start (new **and** existing project)
- [ ] Guide: working with an existing project (the differentiator — give it top billing)
- [ ] Guide: choosing an architecture
- [ ] Guide: strictness levels
- [ ] Guide: writing a custom skill
- [ ] Guide: adding a custom architecture
- [ ] Guide: adding an AI adapter
- [ ] Guide: CI usage (`generate --check`, `doctor --fail-on`)
- [ ] CONTRIBUTING with the authoring checklists
- [ ] Documented limitations section (from V1 scope §4)
- [ ] All docs reviewed against shipped behaviour — no aspirational claims

## Examples

- [ ] `examples/new-express-feature-clean/`
- [ ] `examples/existing-layered-adopt/`
- [ ] Each with the generated `.engineering/` committed, so readers see real output

## Release

- [ ] Changeset for `0.1.0`
- [ ] `npx @engineering-skills/cli@latest init` verified on a clean machine
- [ ] Tag + GitHub release notes
- [ ] Known limitations published in the release notes

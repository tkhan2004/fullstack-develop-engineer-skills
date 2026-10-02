# P6 — CLI `init`

**Entry** P2–P5 · **Exit** both golden paths work end-to-end; nothing written before confirmation.
Spec: [cli-spec.md](../02-specs/cli-spec.md)

## Framework

- [ ] Command parser (commander/clipanion/cac — pick one, document why in an ADR)
- [ ] `--help` for every command with examples
- [ ] `--version`
- [ ] Global flags: `--cwd`, `--no-color`, `--json`, `--verbose`
- [ ] `NO_COLOR` and non-TTY handling (no spinners, no ANSI)
- [ ] Ctrl-C → exit 130, no partial writes

## Mode detection

- [ ] Evidence-based pre-selection (empty dir → new; otherwise existing)
- [ ] Warn when `new` is chosen in a non-empty directory
- [ ] `--mode` flag override

## New-project flow

- [ ] Stack prompts (language, backend, frontend, database, ORM, tests)
- [ ] Architecture prompt showing trade-offs inline
- [ ] Strictness prompt with per-level descriptions
- [ ] Practices multi-select with sensible defaults
- [ ] Adapter selection
- [ ] Structure-generation confirmation (`--no-structure` to skip)

## Existing-project flow

- [ ] Reuse a fresh profile; re-analyse if stale or missing
- [ ] **Render the analysis report before any question about strategy**
- [ ] Strategy prompt with `adopt` pre-selected
- [ ] Confidence-driven prompts: ≥0.85 confirm · 0.60–0.84 choose · <0.60 custom/manual
- [ ] `migrate` sub-flow: target architecture + strategy, plan only
- [ ] Strictness defaults to `observe` for `adopt`

## Write safety

- [ ] Write plan printed (create/update/skip per path) before any write
- [ ] Confirmation required (skipped by `--yes`)
- [ ] `--dry-run` writes nothing
- [ ] Non-generated files never overwritten
- [ ] Nothing written outside `.engineering/` + adapter outputs + (new, confirmed) source tree
- [ ] Atomic-ish behaviour: on failure, no half-written config

## Non-interactive

- [ ] `--yes` accepts only confidence ≥ 0.85; otherwise fails with a clear message
- [ ] All prompts have flags
- [ ] `CI=true` does **not** imply `--yes`

## Re-run behaviour

- [ ] Existing config detected → keep / review / reconfigure
- [ ] Existing profile detected → use / review / regenerate

## Tests

- [ ] E2E on `empty` fixture → full new-project output
- [ ] E2E on `express-layered-clean` → adopt output, `git status` clean for source files
- [ ] E2E on `ambiguous-mixed` with `--yes` → fails, explains why
- [ ] Prompt-flow snapshots
- [ ] Exit codes per spec

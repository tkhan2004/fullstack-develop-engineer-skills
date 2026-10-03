# P6 — CLI `init`

**Entry** P2–P5 · **Exit** both golden paths work end-to-end; nothing written before confirmation.
Spec: [cli-spec.md](../02-specs/cli-spec.md)

## Framework

- [x] Command parser (commander/clipanion/cac — pick one, document why in an ADR)
- [x] `--help` for every command with examples
- [x] `--version`
- [ ] Global flags: `--cwd`, `--no-color`, `--json`, `--verbose`
- [x] `NO_COLOR` and non-TTY handling (no spinners, no ANSI)
- [x] Ctrl-C → exit 130, no partial writes

## Mode detection

- [x] Evidence-based pre-selection (empty dir → new; otherwise existing)
- [x] Warn when `new` is chosen in a non-empty directory
- [x] `--mode` flag override

## New-project flow

- [x] Stack prompts (language, backend, frontend, database, ORM, tests)
- [x] Architecture prompt showing trade-offs inline
- [x] Strictness prompt with per-level descriptions
- [x] Practices multi-select with sensible defaults
- [x] Adapter selection
- [x] Structure-generation confirmation (`--no-structure` to skip)

## Existing-project flow

- [x] Reuse a fresh profile; re-analyse if stale or missing
- [x] **Render the analysis report before any question about strategy**
- [x] Strategy prompt with `adopt` pre-selected
- [x] Confidence-driven prompts: ≥0.85 confirm · 0.60–0.84 choose · <0.60 custom/manual
- [x] `migrate` sub-flow: target architecture + strategy, plan only
- [x] Strictness defaults to `observe` for `adopt`

## Write safety

- [x] Write plan printed (create/update/skip per path) before any write
- [x] Confirmation required (skipped by `--yes`)
- [x] `--dry-run` writes nothing
- [x] Non-generated files never overwritten
- [x] Nothing written outside `.engineering/` + adapter outputs + (new, confirmed) source tree
- [x] Atomic-ish behaviour: on failure, no half-written config

## Non-interactive

- [x] `--yes` accepts only confidence ≥ 0.85; otherwise fails with a clear message
- [ ] All prompts have flags
- [x] `CI=true` does **not** imply `--yes`

## Re-run behaviour

- [x] Existing config detected → keep / review / reconfigure
- [ ] Existing profile detected → use / review / regenerate

## Tests

- [x] E2E on `empty` fixture → full new-project output
- [x] E2E on `express-layered-clean` → adopt output, `git status` clean for source files
- [x] E2E on `ambiguous-mixed` with `--yes` → fails, explains why
- [ ] Prompt-flow snapshots
- [x] Exit codes per spec

## Status notes

- Not done: global `--no-color`/`--json`/`--verbose` (each command takes `--cwd`; `analyze` takes `--json`);
  a flag for every prompt (practices have none); an explicit "review" choice for a stored profile
  (the report is always shown, and the choice is use or re-analyse); prompt-flow _snapshots_ (flows
  are asserted with a scripted prompter instead).
- The terminal prompt implementation is verified by a pty run of the built binary and the CI smoke
  test, not by unit tests.
- `init` stops at configuration and structure. Skill resolution and instruction files are P7/P8.
- Findings from running it: see git history for `feat(cli): add the init command`.

# P7 — AI Adapters

**Entry** P3 · **Exit** snapshot tests per adapter; hand-edited generated files halt generation.
Spec: [ai-adapter-spec.md](../02-specs/ai-adapter-spec.md)

## Canonical IR

- [x] `CanonicalOutput` type in `packages/core`
- [x] Builder: `(config, profile, resolvedSkills) → CanonicalOutput`
- [x] Project context block: mode, architecture, strictness, constraints
- [x] Hard constraints list ("Do not restructure the project.", etc.)
- [x] Reference modules section from the profile
- [x] Section ordering per spec §6
- [x] Lockfile data (skill ids + versions + `selectedBy`)
- [x] IR snapshot tests

## Adapter interface

- [x] `AiAdapter` interface + registry
- [x] `defaultOutputs()` declared per adapter; writes outside it are rejected
- [x] Options: `mode: reference|inline`, output path overrides

## Adapters

- [x] `generic` → `.engineering/generated/INSTRUCTIONS.md` (self-contained)
- [x] `claude` → `CLAUDE.md` (+ `.claude/skills/<id>/SKILL.md` in reference mode)
- [x] `codex` → `AGENTS.md` (inline, no references)
- [ ] (stretch) `cursor` → `.cursor/rules/*.mdc` with glob frontmatter

## File discipline

- [x] Generated-file header with version, source, regenerate command, content hash
- [x] Managed-block markers for user-owned files
- [x] Content outside managed blocks preserved byte-for-byte
- [x] Hash mismatch → stop, show diff, require `--force`
- [x] LF endings, trailing newline, no trailing whitespace

## Determinism

- [x] No timestamps in content
- [x] Stable ordering everywhere
- [x] Two consecutive generations → identical bytes
- [x] Snapshot tests per adapter on a fixture config

## Quality of output

- [x] First 500 tokens contain mode, architecture, strictness and the do-not list
- [x] Existing-project output names the repo's **actual** directories
- [x] No Claude/Codex-specific phrasing leaks into the IR or core
- [x] Total output size reported; warning past budget

## Status notes

- Packages: `packages/adapters` (file discipline, three adapters; knows only the canonical output) and
  `packages/generator` (builds the canonical output). Cursor is not implemented.
- The IR builder is covered by structured assertions rather than IR snapshots; adapters have file
  snapshots under `packages/adapters/src/__snapshots__`.
- "First 500 tokens" is asserted as the prohibition appearing within about 2000 characters.
- `defaultOutputs()` became `outputPaths(output, options)` because the Claude skill files depend on
  which skills resolved.

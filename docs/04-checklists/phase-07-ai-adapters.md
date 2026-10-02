# P7 — AI Adapters

**Entry** P3 · **Exit** snapshot tests per adapter; hand-edited generated files halt generation.
Spec: [ai-adapter-spec.md](../02-specs/ai-adapter-spec.md)

## Canonical IR

- [ ] `CanonicalOutput` type in `packages/core`
- [ ] Builder: `(config, profile, resolvedSkills) → CanonicalOutput`
- [ ] Project context block: mode, architecture, strictness, constraints
- [ ] Hard constraints list ("Do not restructure the project.", etc.)
- [ ] Reference modules section from the profile
- [ ] Section ordering per spec §6
- [ ] Lockfile data (skill ids + versions + `selectedBy`)
- [ ] IR snapshot tests

## Adapter interface

- [ ] `AiAdapter` interface + registry
- [ ] `defaultOutputs()` declared per adapter; writes outside it are rejected
- [ ] Options: `mode: reference|inline`, output path overrides

## Adapters

- [ ] `generic` → `.engineering/generated/INSTRUCTIONS.md` (self-contained)
- [ ] `claude` → `CLAUDE.md` (+ `.claude/skills/<id>/SKILL.md` in reference mode)
- [ ] `codex` → `AGENTS.md` (inline, no references)
- [ ] (stretch) `cursor` → `.cursor/rules/*.mdc` with glob frontmatter

## File discipline

- [ ] Generated-file header with version, source, regenerate command, content hash
- [ ] Managed-block markers for user-owned files
- [ ] Content outside managed blocks preserved byte-for-byte
- [ ] Hash mismatch → stop, show diff, require `--force`
- [ ] LF endings, trailing newline, no trailing whitespace

## Determinism

- [ ] No timestamps in content
- [ ] Stable ordering everywhere
- [ ] Two consecutive generations → identical bytes
- [ ] Snapshot tests per adapter on a fixture config

## Quality of output

- [ ] First 500 tokens contain mode, architecture, strictness and the do-not list
- [ ] Existing-project output names the repo's **actual** directories
- [ ] No Claude/Codex-specific phrasing leaks into the IR or core
- [ ] Total output size reported; warning past budget

# P2 — Configuration Engine

**Entry** P1 · **Exit** valid/invalid fixtures pass; every error is actionable; round-trip byte-stable.
Spec: [config-schema.md](../02-specs/config-schema.md)

## Schema

- [x] Zod schema for every block: `project`, `adoption`, `stack`, `architecture`, `migration`,
      `engineering`, `ai`, `overrides`
- [x] Discriminated unions where mode changes shape (`mode`, `strategy`, `style: custom`)
- [x] `version` handling: known versions, unknown-future error, previous-version auto-migrate
- [ ] ~~Inferred TypeScript types exported from `packages/core`~~ — deviation: types are inferred in `packages/config` (core stays dependency-free and holds only the vocabulary). Record in an ADR if it sticks.

## Cross-field validation

- [x] `adoption` required iff `mode = existing`
- [x] `custom` block required iff `style = custom`
- [x] `confidence` present iff `source = detected`, range 0–1
- [x] `migration` present iff `strategy = migrate`; `from ≠ to`
- [x] ORM without a database engine → error
- [x] `strict` + `adopt` → warning with rationale
- [x] `overrides.rules[].reason` required

## Loading & writing

- [x] YAML parse with position info for error reporting
- [x] Writer with stable key order, LF endings, trailing newline
- [x] Round-trip test: load → write → byte-identical
- [x] Missing file → clear "run `eng-skills init`" message

## Errors

- [x] Collect **all** errors, not the first
- [x] Format: path · found · expected · suggestion
- [x] Did-you-mean via edit distance ≤ 2
- [x] Never write output when validation fails
- [ ] Exit code 2 <!-- wired in P6 when commands exist -->

## Defaults, presets, precedence

- [x] Defaults per mode (strictness, strategy, adapters)
- [x] Preset loader; presets are config fragments with no rules
- [x] Presets: `pern-express`, `next-express`, `node-api`
- [x] Precedence implemented and tested:
      CLI flags > overrides > config > profile > preset > defaults

## Tests

- [x] ≥ 20 valid fixtures (every mode/strategy/architecture combination that matters)
- [x] ≥ 20 invalid fixtures, each asserting the message text
- [ ] Snapshot tests for error formatting
- [ ] Property test: any schema-valid object survives write → load unchanged

## Status notes

- 94 tests passing (25 valid, 31 invalid, round-trip, layers, presets, I/O).
- Not yet done: property-based round trip, snapshot-style error formatting, previous-version auto-migration (no previous version exists yet).
- Cross-field rules run after structural validation (documented in config-schema.md).

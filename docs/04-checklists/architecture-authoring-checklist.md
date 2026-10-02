# Architecture Authoring Checklist

For adding or changing an architecture in `architectures/<name>/`.
Spec: [architecture-manifest.md](../02-specs/architecture-manifest.md)

## 1. Justification

- [ ] This style is meaningfully different from the existing ones (not a renaming)
- [ ] There is a real project shape it serves better than any existing entry
- [ ] Its costs are known and can be stated honestly

## 2. `manifest.yaml`

- [ ] `name` matches the directory
- [ ] `layers` declared with descriptions
- [ ] `dependency_rules` reference declared layer ids only, no cycles
- [ ] `forbidden_imports` with a stated `reason` per layer
- [ ] `structure` (and `structure.module` for module-oriented styles)
- [ ] `naming` conventions
- [ ] `strictness` behaviour for minimal/standard/strict
- [ ] `compatible_stacks`
- [ ] `skills` exist
- [ ] `trade_offs.benefits`, `.costs`, `.not_recommended_when` all non-empty
- [ ] `detection.marker_*` unique enough not to collide with other styles

## 3. Content

- [ ] `SKILL.md` — agent instructions; no framework assumptions
- [ ] `rules.md` — rationale, trade-offs, when **not** to use it
- [ ] `tree/` matches `structure` exactly (or is absent for `custom`)
- [ ] `examples/` showing a correct and an incorrect boundary crossing

## 4. Detection

- [ ] Marker directories/files added
- [ ] Fixture repo in `tests/fixtures/repos/`
- [ ] Expected confidence band documented and asserted
- [ ] Does not degrade confidence for existing architectures (run the full fixture suite)

## 5. Tests

- [ ] `tests/generator.test.ts` — tree generation correct and idempotent
- [ ] `tests/dependency-rules.test.ts` — good fixture clean, bad fixture flagged
- [ ] Registered in `architectures/index.yaml`
- [ ] **No engine code changed** — if it was, the engine is not data-driven

## 6. Docs

- [ ] Added to [architecture-catalog.md](../01-concepts/architecture-catalog.md) with trade-offs
- [ ] Added to the CLI choice list with a one-line description
- [ ] Not described as superior to any other architecture

# Skill Behaviour Evaluations

Evidence that a skill changes agent behaviour. A skill without an entry here is unfinished.

## Format

### `<skill id>` — <date>

- **Fixture / repo**: `tests/fixtures/repos/<name>`
- **Task given**: "<the exact prompt>"
- **Without the skill**: what the agent produced (summary + the specific defect)
- **With the skill**: what changed
- **Verdict**: improved / no change / regressed
- **Action**: shipped / rewrite rules N, M / drop

---

<!-- Keep newest at the top. -->

### `core/project-onboarding` — 2026-10-04

- **Fixture / repo**: `tests/fixtures/repos/express-layered-clean`, after `init --yes` and `generate` (claude adapter) for the "with" copy; untouched copy for "without".
- **Task given**: "Add PATCH /orders/:id/cancel. An order that has already shipped cannot be cancelled and must produce an error. Implement it end to end, including a test for the business rule." The "with" agent was additionally told to read `CLAUDE.md` and the generated skills first.
- **Without the skill**: added the `status` field, repository methods, service rule and route. Also changed `OrderService` to constructor injection (a new pattern in this codebase, used only to make the test easier), validated the `:id` inline in the controller with a hand-thrown `AppError` instead of the project's validators layer, and added an `ORDER_STATUSES` runtime constant that nothing else in the project has.
- **With the skill**: same feature, but `OrderService` was left as it was (the test mocks the module instead), the id check went into `validators/` as a zod schema shaped like the existing `validateOrder`, and the two pre-existing problems it noticed (async handlers without `try/catch`, `userId` missing from the TS `Order`) were reported instead of fixed.
- **Verdict**: improved, modestly. The differences are exactly the ones the skill targets (no new pattern, follow the validation convention, report rather than fix).
- **Limits of this evidence**: one run per arm on a 20-file fixture, so it shows direction, not effect size. Both arms capable enough that most conventions were matched anyway. Neither arm ran `tsc` or the tests (no dependencies installed), so correctness of either output is unverified. Both still used `try/catch` + `next` in the new controller and both edited the Prisma schema; the skill did not change that and arguably should not have.
- **Action**: shipped. Repeat on a messier repo (mixed conventions) before relying on the Decision Rules for that case.

---

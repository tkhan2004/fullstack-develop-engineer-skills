## Project context

- **Project:** acme-api
- **Mode:** Existing project (adopt): follow what is already here
- **Architecture:** Layered (detected, 91% confidence) · strictness: observe
- **Stack:** Language: TypeScript · Runtime: Node.js · Backend: Express · Database: PostgreSQL · ORM: Prisma · Tests: Vitest

## Before you write code

- You are working in an existing codebase. Learn its conventions before writing code: mirror the nearest existing code, and do not introduce a new pattern, dependency or abstraction without asking.
- Do not restructure the project or introduce a different architecture.
- Follow the existing directories and mirror the closest existing module when adding code.
- Determine the project's architecture from, in order: `.engineering/config.yaml`, `.engineering/project-profile.yaml`, observed repository conventions, then detection. Do not introduce a different structure into an existing project unless a migration has been explicitly requested.

## How this project is organised

Source root: `src`

- `src/controllers` — Translates HTTP into service calls; no business rules
- `src/services` — Business logic and orchestration
- `src/repositories` — Data access; the only layer that talks to the ORM

## Conventions to mirror

- File names: kebab-case (observed in 100%)
- Tests: colocated with source (observed in 87%)

## Dependency rules

These describe how the code is organised today. Follow them for new code; do not enforce them on code you are not touching.

- `controllers` may import: `services`, `validators`, `models`
- `services` may import: `repositories`, `models`
- `repositories` may import: `models`
- `services` must not import: `express`

## Reference modules: imitate these

- **service:** `src/services/user.service.ts` — has a colocated test; 17 lines

## Engineering skills

Detailed rules live in these skills; use the ones that match the task.

- `eng-core-project-onboarding` — Project Onboarding: Learn an existing repository before changing it.
- `eng-quality-clean-code` — Clean Code: Naming, function and module rules.
# framework-docs/

Official documentation references for our V1 stack. **Version-sensitive** — record the version
you read, because this material ages fastest.

| File            | Source                       | Version read | Feeds               |
| --------------- | ---------------------------- | ------------ | ------------------- |
| `typescript.md` | typescriptlang.org           | 5.x          | backend/typescript  |
| `nodejs.md`     | nodejs.org/api               | 22 LTS       | backend/nodejs      |
| `express.md`    | expressjs.com                | 4.x / 5.x    | backend/express     |
| `prisma.md`     | prisma.io/docs               | —            | database/prisma     |
| `postgresql.md` | postgresql.org/docs          | 16/17        | database/postgresql |
| `react.md`      | react.dev                    | 19           | frontend/react      |
| `nextjs.md`     | nextjs.org/docs (App Router) | 15           | frontend/nextjs     |
| `vitest.md`     | vitest.dev                   | —            | engineering/testing |

Rule: when a framework's major version changes, the note is stale until re-read. Skills derived
from stale notes must be re-checked before release — an outdated framework rule is worse than
no rule, because the agent will follow it confidently.

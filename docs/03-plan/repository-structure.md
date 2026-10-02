# Repository Structure

Status: draft

> Do not create every directory below on day one. Start minimal; add a package only when a
> concrete responsibility justifies it. An empty package is a liability.

## 1. Target layout

```text
engineering-skills/
├── apps/
│   └── cli/                       @engineering-skills/cli — the only published binary
│       ├── src/
│       │   ├── presentation/      command definitions, prompts, renderers
│       │   ├── application/       command handlers / use cases
│       │   └── infrastructure/    filesystem, git, process
│       └── package.json
│
├── packages/
│   ├── core/                      domain types: Config, Profile, Skill, Architecture
│   ├── config/                    schema, loader, validator, presets, precedence
│   ├── skill-engine/              registry, matcher, resolver, token estimation
│   ├── architecture-engine/       manifest loader, dependency checker, tree generator
│   ├── detection/                 scanner, signals, detectors, profile writer
│   ├── generator/                 canonical IR, renderers, write planner
│   ├── adapters/                  claude | codex | cursor | generic
│   └── shared/                    result types, fs utils, yaml, logging
│
├── skills/                        canonical skill content (data, not code)
├── architectures/                 manifests, trees, examples (data, not code)
├── stacks/                        stack metadata + detection hints (data)
├── presets/                       predefined configurations (data)
│
├── examples/                      example projects using the framework
├── tests/
│   ├── fixtures/repos/            synthetic repos for detection tests
│   └── e2e/                       CLI end-to-end tests
├── docs/
├── package.json  pnpm-workspace.yaml  turbo.json(optional)
└── README.md  LICENSE  CONTRIBUTING.md  CHANGELOG.md
```

## 2. Dependency direction (enforced in CI)

```text
apps/cli
   ↓
generator → adapters
   ↓
skill-engine   architecture-engine   detection
   ↓               ↓                    ↓
            config  →  core  ←  shared
```

Rules:

- `core` depends on nothing but `shared`.
- No package imports `apps/cli`.
- No cycles. Enforced with `dependency-cruiser` or an equivalent check in CI — the project
  must obey the rules it sells.
- Technology-specific logic (Express, Prisma, Next) lives in `skills/` and `stacks/` **data**,
  never in engine code.

## 3. Growth rule

Start with three packages:

```text
packages/core      packages/config      apps/cli
```

Split out a new package only when **all** of:

1. a distinct responsibility exists, with its own vocabulary;
2. it has at least two consumers _or_ it must be testable in isolation;
3. its public surface can be described in one paragraph.

Otherwise, a folder inside an existing package is enough.

## 4. Data vs. code

| Belongs in `packages/` (code) | Belongs in `skills/`, `architectures/`, `stacks/`, `presets/` (data) |
| ----------------------------- | -------------------------------------------------------------------- |
| How to resolve skills         | Which skills exist and what they say                                 |
| How to read a manifest        | What `clean` architecture is                                         |
| How to score confidence       | Which directory names hint at `layered`                              |
| How to render output          | What the rule text is                                                |

Adding Fastify, Drizzle, MySQL, Vue or Svelte support MUST be a data change plus detection
hints — zero engine changes. If it is not, the engine is wrong.

## 5. Package manager & tooling

- **pnpm** workspaces (fast, strict, good monorepo defaults).
- **TypeScript** strict, `moduleResolution: bundler`, ESM-first with CJS build for the CLI.
- **Vitest** for unit + integration; a small e2e layer that runs the built binary.
- **tsup** for bundling the CLI; `tsc` for library type output.
- **changesets** for versioning.
- **ESLint + Prettier** — the repo is the first consumer of its own clean-code rules.

## 6. Naming conventions (this repo)

- Files: `kebab-case.ts`
- Types/classes: `PascalCase`
- Functions/variables: `camelCase`
- Test files: `*.test.ts`, colocated with the unit under test
- Skill ids / architecture names / config keys: `kebab-case`
- Config keys in YAML: `snake_case` for practice flags (`clean_code`), `kebab-case` nowhere —
  pick one per surface and never mix (see glossary).

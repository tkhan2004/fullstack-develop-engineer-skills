# Engineering Skills

An open-source **engineering rule system for AI coding agents**. It teaches agents how to
reason, structure, implement, review, debug and maintain software according to the
architecture and stack **you** choose — and, in an existing repository, according to the
architecture that is **already there**.

It is not a boilerplate generator.

> Status: pre-alpha. See [docs/](docs/README.md) for vision, specs, roadmap and checklists.

```text
new project       → choose architecture → generate structure + instructions
existing project  → analyze → detect → adopt (default) → instructions that match the repo
migration         → explicit, incremental, plan-first
```

## Develop

```bash
pnpm install
pnpm build && pnpm test && pnpm lint && pnpm typecheck
```

Requires Node ≥ 20 and pnpm 9.

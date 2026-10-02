# P1 — Foundation

**Entry** P0 done · **Exit** clean clone → `pnpm i && pnpm build && pnpm test && pnpm lint` green; CI green.

## Monorepo

- [x] `pnpm-workspace.yaml` covering `apps/*`, `packages/*`
- [x] Root `package.json` with scripts: `build`, `test`, `lint`, `typecheck`, `format`, `clean`
- [x] Node engine pinned (`>=20`), `.nvmrc`
- [x] `packageManager` field pinned

## TypeScript

- [x] `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
      `noImplicitOverride`, `isolatedModules`
- [x] Per-package `tsconfig.json` extending the base, with project references
- [x] Path aliases only where they earn it; no deep relative chains

## Packages (empty but wired)

- [x] `packages/core` — domain types only, zero runtime deps
- [x] `packages/config` — depends on `core`
- [x] `apps/cli` — depends on `config`, `core`
- [x] Each has: `package.json`, `tsconfig.json`, `src/index.ts`, one smoke test

## Tooling

- [x] ESLint flat config: TS rules, import ordering, no-floating-promises, no-cycle
- [x] Prettier + `.prettierignore`
- [x] Vitest workspace config; coverage reporter configured (no threshold gate yet)
- [x] `tsup` for the CLI bundle; shebang + `bin` entry
- [x] `dependency-cruiser` config encoding the package dependency direction
- [x] changesets initialised
- [ ] Optional: `turbo.json` if build times justify it (skip otherwise)

## CI

- [x] GitHub Actions: install (cached) → lint → typecheck → test → build
- [x] Matrix: Node 20, 22
- [x] Runs on push + PR
- [x] Fails on `dependency-cruiser` violations
- [ ] Status badge in README

## Verification

- [ ] Fresh clone on a clean machine: all scripts pass
- [x] `node dist/cli.js --help` prints usage
- [ ] No package has an unused dependency

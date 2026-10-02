# Release Checklist

## Pre-flight

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` green locally
- [ ] CI green on `main` for Node 20 and 22
- [ ] No `TODO`/`FIXME` in shipped code paths that affect behaviour
- [ ] All docs match shipped behaviour (no aspirational claims)
- [ ] Known limitations list current

## Invariants

- [ ] `analyze`, `doctor`, `review`, `list` leave `git status` clean
- [ ] `init` on an existing project touches no source file
- [ ] `generate && generate` → clean `git status`
- [ ] `generate --check` fails on drift
- [ ] `--yes` refuses to guess below 0.85 confidence
- [ ] Skill contract validation passes for every skill
- [ ] Architecture validation passes for every architecture
- [ ] Dependency-direction check passes for the monorepo

## Packaging

- [ ] Version bumped via changesets; CHANGELOG generated
- [ ] `files` field in `package.json` ships only what is needed (skills/architectures data included)
- [ ] `bin` entry works after a global install
- [ ] Package size sane (`npm pack --dry-run`)
- [ ] `engines` field accurate

## Smoke test on a clean machine

- [ ] `npx @engineering-skills/cli@latest init` in an empty directory
- [ ] Same on a real existing repository → adopt path, no source changes
- [ ] `analyze`, `doctor`, `generate --check`, `list` all behave

## Publish

- [ ] npm publish (public access)
- [ ] Git tag + GitHub release with notes and limitations
- [ ] README badges updated
- [ ] Announcement draft (if applicable)

## Post-release

- [ ] Install from npm in a fresh container and re-run the smoke test
- [ ] Open issues for anything deferred during the release
- [ ] Update the [master checklist](README.md) progress board

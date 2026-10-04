# Spec — CLI

Status: draft

```bash
npx @engineering-skills/cli init      # primary entry point
eng-skills <command> [options]        # after install
```

## 1. Commands

| Command          | V1  | Writes                                               | Purpose                                  |
| ---------------- | :-: | ---------------------------------------------------- | ---------------------------------------- |
| `init`           | ✅  | `.engineering/`, adapter files, (new only) structure | Configure a project                      |
| `analyze`        | ✅  | `.engineering/project-profile.yaml`                  | Read-only repository analysis            |
| `list`           | ✅  | —                                                    | Show skills / architectures / presets    |
| `generate`       | ✅  | `.engineering/generated/`, adapter files             | Re-generate from existing config         |
| `doctor`         | ✅  | —                                                    | Check project against its configuration  |
| `review`         | ✅  | `.engineering/generated/review-context.md`           | Prepare AI review context from a diff    |
| `migrate`        | ⏳  | `.engineering/migration-plan.yaml`                   | Plan an architecture migration           |
| `upgrade`        | ⏳  | `config.yaml`                                        | Migrate config to a newer schema version |
| `add` / `remove` | ⏳  | `config.yaml`                                        | Toggle skills/practices                  |

Commands marked ⏳ are scaffolded in V1 (flags parsed, clear "not implemented" exit) only if
their contract is already settled; otherwise they are omitted entirely.

## 2. `init`

```bash
eng-skills init
eng-skills init --preset pern-express
eng-skills init --mode existing --strategy adopt --yes
eng-skills init --backend express --database postgresql --architecture feature-clean \
                --strictness standard --adapters claude,generic --yes
```

Flow:

```text
detect project mode (pre-selected by evidence)
   ├── new       → stack → architecture → strictness → practices → adapters
   └── existing  → analyze (or reuse profile) → SHOW REPORT → strategy → strictness → adapters
                   └── strategy=migrate → target architecture → migration strategy
   ↓
resolve skills
   ↓
preview planned writes
   ↓
confirm
   ↓
write
```

| Flag                                                         | Meaning                                                                                                         |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `--yes`, `-y`                                                | Non-interactive. Accepts a detected architecture only at ≥ 0.85; otherwise **exits 3** (never guesses)          |
| `--architecture <style\|custom>`                             | Explicit choice; always wins over detection. The non-interactive way past a low-confidence detection            |
| `--mode`, `--strategy`, `--strictness`                       | Skip the matching question                                                                                      |
| `--migrate-to`, `--migration`                                | Target architecture and strategy for `--strategy migrate` (records a planned migration only)                    |
| `--language --backend --frontend --database --orm --testing` | Stack answers                                                                                                   |
| `--preset <name>`                                            | Initial answers; with `--yes` it needs no questions (an architecture must still come from the preset or a flag) |
| `--modules <list>`                                           | Feature modules to scaffold for module-oriented architectures                                                   |
| `--dry-run`                                                  | Print the plan, write nothing                                                                                   |
| `--force`                                                    | Replace an existing configuration (never source files)                                                          |
| `--no-structure`                                             | Skip directory generation on a new project                                                                      |
| `--adapters <list>`                                          | Comma-separated adapter ids                                                                                     |
| `--out <dir>`, `--cwd <dir>`                                 | Configuration directory (default `.engineering`) and project directory                                          |

Exit codes for `init`: `0` done, nothing to do, declined, or dry run · `2` invalid arguments or
configuration, or no terminal and no `--yes` · `3` `--yes` cannot proceed without guessing, or a
required value (language, architecture) could not be detected · `130` cancelled.

Rules:

- MUST print a write plan and ask before the first write (unless `--yes`/`--dry-run`).
- MUST NOT overwrite a non-generated file. Generated files carry a header marker.
- MUST NOT touch files outside `.engineering/`, the configured adapter outputs, and (new
  projects only, confirmed) the source tree.
- Re-running `init` on a configured project offers keep / review / reconfigure. With `--yes` it is a
  no-op that points at `--force`; an invalid configuration is reported, never silently replaced.
- The analysis report is shown **before** any question about the architecture or strategy.
- Practices have no flag yet; non-interactively the defaults apply.
- `init` configures; `generate` writes the instruction files.

## 3. `analyze`

```bash
eng-skills analyze [--json] [--output <path>] [--no-write] [--deterministic] [--max-files N] [--cwd <dir>]
```

Read-only except for the profile file. Exit `0` even when the repo looks unhealthy —
`analyze` reports, `doctor` judges.

`--no-write` analyses and reports without writing the profile; `--output` is relative to the analysed
directory; invalid arguments exit 2; reaching the file limit warns on stderr.

Human output: the report shape shown in
[project-mode.md §4](../01-concepts/project-mode.md). `--json` emits the profile for tooling.

## 4. `list`

```bash
eng-skills list skills [--category quality] [--applicable]
eng-skills list architectures [--detail]
eng-skills list presets
```

`--applicable` filters to what the current config resolves to, with the `selected_by` reason.

## 5. `generate`

Reads `.engineering/config.yaml` and the project profile, resolves the skills, and writes the
instruction files for the configured AI tools plus a lockfile. Deterministic:
`generate && generate` leaves a clean `git status`.

```bash
eng-skills generate [--check] [--dry-run] [--force] [--adapters claude,generic] [--out <dir>] [--cwd <dir>]
```

| Flag                | Meaning                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| `--check`           | Write nothing; exit `1` if any file would change. The CI guard against committed-but-stale instructions |
| `--dry-run`         | Show the plan, write nothing                                                                            |
| `--force`           | Replace hand-edited generated files and a hand-edited project skill                                     |
| `--adapters <list>` | Only these adapters                                                                                     |

Behaviour:

- **All or nothing.** If any file would overwrite something the user wrote or edited, nothing is
  written; the conflicts are listed and `--force` is the explicit way through (exit `1`).
- `CLAUDE.md` and `AGENTS.md` belong to the team: only a managed block in them changes.
- The project conventions skill is generated once for an existing project; a hand-edited copy is
  kept and used, and regenerating it needs `--force`.
- A missing or stale profile, an empty skill library or an over-budget skill set are warnings.
- No configuration or an invalid one exits `2` with how to fix it; a skill graph that cannot be
  resolved exits `3`.

## 6. `doctor`

```bash
eng-skills doctor [--json] [--fail-on warn|error] [--only <ids>] [--skip <ids>]
```

```text
Engineering Health Check                     feature-clean · standard · existing/adopt

Configuration
✔ .engineering/config.yaml valid
⚠ project profile is 14 commits old — run `eng-skills analyze`

Architecture
✔ Declared structure present
⚠ 3 imports violate the dependency rule (advisory at `standard`)
    src/modules/orders/domain/order.entity.ts:4
      imports @prisma/client — domain may not import infrastructure
      fix: depend on OrderRepository (domain/repositories/order.repository.ts)

Testing
⚠ No integration tests detected for 12 of 18 routes

Security
⚠ 4 admin routes lack an explicit authorization check

3 warnings, 0 errors.
```

Exit codes: `0` clean (warnings allowed), `1` errors or `--fail-on warn` tripped,
`2` invalid configuration.

Diagnostics are plugins:

```ts
interface Diagnostic {
  id: string; // 'architecture/dependency-rule'
  title: string;
  appliesTo(ctx: ProjectContext): boolean;
  run(ctx: ProjectContext): Promise<Finding[]>;
}
interface Finding {
  level: "info" | "warn" | "error";
  message: string;
  location?: { path: string; line?: number };
  remediation?: string;
  ruleId?: string;
}
```

Adding a check MUST NOT require touching CLI core.

## 7. `review`

```bash
eng-skills review [--base main] [--staged] [--output <path>] [--stdout]
```

```text
git diff → changed paths → affected layers/modules → applicable skills + rules
        → review context bundle
```

The bundle contains: the diff, the project context block, the review checklists of the
applicable skills, and the dependency rules relevant to the changed paths. V1 does **not**
call any AI provider — the bundle is piped into whichever agent the user runs.

## 8. UX rules

- **Fast**: `analyze` on a 1000-file repo SHOULD finish under 3 s; `init` with no analysis
  under 300 ms to first prompt.
- **Scriptable**: every interactive prompt has a flag; `--json` on every reporting command.
- **Non-destructive**: no command modifies source files except confirmed `init --mode new`
  structure generation and explicit `migrate` application.
- **Respect the environment**: `NO_COLOR`, non-TTY → no spinners/ANSI, `CI=true` → `--yes`
  semantics are _not_ implied (fail instead of guessing).
- **Honest progress**: no fake spinners; show what is being scanned.
- **Errors**: what failed, where, why, and the next command to run.

## 9. Exit codes

| Code | Meaning                                                              |
| ---- | -------------------------------------------------------------------- |
| 0    | Success                                                              |
| 1    | Command-specific failure (doctor findings, `generate --check` drift) |
| 2    | Invalid configuration or arguments                                   |
| 3    | Unsupported project state (e.g. `migrate` on a dirty working tree)   |
| 130  | Interrupted                                                          |

## 10. Telemetry

None in V1. No network calls at runtime beyond package installation.

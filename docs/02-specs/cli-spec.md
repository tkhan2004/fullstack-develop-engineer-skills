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

| Flag                | Meaning                                                                   |
| ------------------- | ------------------------------------------------------------------------- |
| `--yes`, `-y`       | Non-interactive; accept detected values with confidence ≥ 0.85, else fail |
| `--preset <name>`   | Start from a preset; other flags override it                              |
| `--dry-run`         | Print every planned write, change nothing                                 |
| `--force`           | Overwrite existing generated files (never source files)                   |
| `--no-structure`    | Skip directory generation on a new project                                |
| `--adapters <list>` | Comma-separated adapter ids                                               |
| `--out <dir>`       | Alternative output root (default `.engineering`)                          |

Rules:

- MUST print a write plan and ask before the first write (unless `--yes`/`--dry-run`).
- MUST NOT overwrite a non-generated file. Generated files carry a header marker.
- MUST NOT touch files outside `.engineering/`, the configured adapter outputs, and (new
  projects only, confirmed) the source tree.
- Re-running `init` on a configured project offers: keep / review / reconfigure.

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

Re-runs resolution and output from the existing config. Deterministic:
`generate && generate` leaves a clean `git status`.

```bash
eng-skills generate [--check] [--adapters claude] [--dry-run]
```

`--check` writes nothing and exits `1` if output would differ — the CI guard against
committed-but-stale instructions.

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

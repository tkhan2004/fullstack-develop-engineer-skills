# Glossary

Status: accepted — these are the only approved terms. Use them verbatim in code, CLI output,
config keys and docs.

| Term                      | Definition                                                                                                    | Notes / what it is **not**                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Skill**                 | A self-contained, versioned unit of engineering guidance: `SKILL.md` + `skill.yaml` + optional examples/tests | Not a prompt; not a code template                                     |
| **Skill set**             | The resolved, ordered collection of skills that applies to one project                                        | Output of the resolver                                                |
| **Skill resolution**      | Pure function: `(config, profile) → skill set`                                                                | Must be deterministic and side-effect free                            |
| **Stack**                 | Language, runtime, framework, database, ORM, test runner, package manager                                     | Carries no architectural meaning                                      |
| **Architecture style**    | A named code-organisation scheme with declared layers and dependency rules                                    | `layered`, `feature`, `clean`, `feature-clean`, `hexagonal`, `custom` |
| **Architecture manifest** | `architectures/<name>/manifest.yaml` — machine-readable layers, dependency rules, module structure            | The thing the engine reasons about                                    |
| **Dependency rule**       | A declaration of which layers a layer `may_import`                                                            | Enforced only at `strict`; advisory below                             |
| **Strictness**            | How forcefully rules are applied: `observe` / `minimal` / `standard` / `strict`                               | A property of the architecture config, not of a skill                 |
| **Project mode**          | `new` or `existing`                                                                                           | Set once at init; changing it is an explicit action                   |
| **Adoption strategy**     | For `existing`: `adopt`, `recommend`, or `migrate`                                                            | `adopt` is the default                                                |
| **Config**                | `.engineering/config.yaml` — user-approved source of truth                                                    | Hand-editable, schema-validated, committed                            |
| **Project profile**       | `.engineering/project-profile.yaml` — machine-generated analysis of the repo                                  | Regenerable, evidence-bearing, committed                              |
| **Detection**             | Reading a repository to produce a project profile                                                             | Proposes; never decides                                               |
| **Confidence**            | `0.0–1.0` score attached to every detected claim                                                              | Drives whether the CLI asks or assumes                                |
| **Evidence**              | The concrete files/paths/patterns that justified a detection                                                  | Every detected claim MUST carry evidence                              |
| **Custom architecture**   | A `style: custom` manifest _describing_ the repo's own structure                                              | The escape hatch that makes `adopt` real                              |
| **Adopt**                 | Follow the repository's existing structure and conventions                                                    | Default mode for existing projects                                    |
| **Migrate**               | Move from a current architecture toward a target one                                                          | Always explicit, always incremental by default                        |
| **Migration plan**        | Ordered, per-module steps with verification between steps                                                     | Produced by `migrate --plan`; never auto-applied                      |
| **Practice**              | A cross-cutting engineering concern toggled in config                                                         | clean code, SOLID, testing, security, …                               |
| **Preset**                | A named, predefined configuration                                                                             | Contains no rules of its own                                          |
| **AI adapter**            | Transforms the canonical resolved output into one agent's native format                                       | Claude / Codex / generic                                              |
| **Canonical output**      | Tool-independent intermediate representation of the resolved rules                                            | Adapters consume only this                                            |
| **Generated artefact**    | Any file the framework writes                                                                                 | Must be deterministic and marked as generated                         |
| **Diagnostic**            | One check run by `doctor`, producing pass / warn / fail + remediation                                         | Pluggable                                                             |
| **Review context**        | The bundle (diff + applicable rules + architecture) prepared by `review`                                      | Not an AI integration by itself                                       |
| **SoT**                   | Source of Truth library in `docs/sot/` — reference material skills are derived from                           | Not framework runtime input                                           |

## Reserved words — do not invent synonyms

- Say **architecture style**, not "pattern", "layout", "paradigm".
- Say **skill**, not "rule pack", "module", "plugin".
- Say **project profile**, not "report", "scan result", "metadata".
- Say **strictness**, not "level", "mode", "severity".
- Say **adopt**, not "respect", "preserve", "keep" (as a mode name).

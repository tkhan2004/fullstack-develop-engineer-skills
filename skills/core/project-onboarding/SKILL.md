# Project Onboarding

## Purpose

Prevents changes that are valid on their own but foreign to the repository: before editing, find out how this project already solves the problem in front of you, then solve it the same way.

## When This Skill Applies

- Before the first edit in a session on an existing project.
- Before adding a file, endpoint, module, dependency, test or configuration in an area you have not read this session.
- When the configuration or profile is missing, stale, or contradicts the code you are reading.

## Architecture Awareness

Determine the project's architecture, in this order:

1. Explicit `.engineering/config.yaml`
2. `.engineering/project-profile.yaml`
3. Observed repository conventions
4. Architecture detection

Do not introduce a different structure into an existing project unless a migration has been explicitly requested.

## Core Principles

1. What the team decided and wrote down outranks what the code does, which outranks what a detector inferred, which outranks your preference.
2. A new convention is a change to the project. A feature request does not authorize it.
3. Behaviour you cannot observe, you cannot safely change.
4. Two sources of the same rank that disagree are a finding to report, not a tie to break silently.
5. What you had to discover the hard way is worth writing down.

## Decision Rules

- If the configuration states an architecture or strictness, follow it even where the code differs, and report the difference.
- If only a profile exists, use its committed style and conventions. If the style is `custom` or low-confidence, follow the nearest sibling files instead.
- If conventions are mixed, follow the one used in the module you are editing and say that the repository is mixed.
- If the code you must change has no test, pin its current behaviour with a test first when a cheap test point exists. If none does, make the smallest change and state that it is untested.
- If a decision record covers the area, read it first. Do not reverse it without an explicit request.
- If you notice a problem outside your task, report it. Do not fix it in the same change.

## Do

1. Read in this order: configuration, profile, contributing and decision records, the scripts that run tests, lint and build, then the code.
2. Before creating a file, open at least two existing files of the same kind and copy their naming, imports, error handling, validation and exports.
3. Before adding a dependency, search the manifest for one that already does the job.
4. Before changing a function, find its callers and its tests.
5. Run the project's own test and lint commands before and after, and record any failures that existed before you started.
6. Name in the change description the conventions you matched and where you took them from.
7. Keep structural cleanup and behaviour changes in separate commits.

## Don't

1. Don't introduce a folder layout, naming style or pattern because you prefer it. It creates a second convention that every later change must choose between.
2. Don't rename, move or reformat code the task does not need. It buries the real change and hides behaviour changes in noise.
3. Don't trust a stale profile over the code in front of you. Following outdated detection reproduces what the project already abandoned.
4. Don't remove or "fix" odd-looking behaviour before checking its callers, tests and history. Something may depend on it.
5. Don't treat a feature request as approval to migrate or restructure.
6. Don't call a change safe when no test exercised it.

## Examples

`examples/bad.ts` invents its own error style in a codebase whose functions return a `Result`; callers now need a `try`/`catch` for this one function. `examples/good.ts` returns the same `Result` shape as its neighbours, so no caller changes.

## Review Checklist

- Does each new file have the shape of its siblings: naming, imports, error handling, validation, exports?
- Does the diff add a dependency, pattern or directory that did not exist before? If so, was it requested?
- Does the diff touch lines the task did not need?
- Is every behaviour change covered by a test, or explicitly declared untested?
- Does the description say which conventions were matched and where they came from?
- Were contradictions between configuration, profile and code reported?

## Interaction With Other Skills

- Runs before the others. The generated `project/conventions` skill holds this project's specific conventions and wins on any style question raised here.
- `architecture/*` skills define structure; this skill only requires that you follow it.
- `quality/refactoring` governs cleanup that is requested separately; `engineering/testing` governs test design.

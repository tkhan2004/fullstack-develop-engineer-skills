# ADR-0006 — Prompts behind an interface; Node's own argument parser

- **Status**: accepted
- **Date**: 2026-10-03

## Context

`init` is interactive, and its correctness (never write before confirmation, never guess below the
confidence threshold, never touch source files) is the product's main safety promise. Two choices
shape how testable and how heavy the CLI is: how arguments are parsed, and how questions are asked.

A related contradiction also needed settling: two documents said that `--yes` on a low-confidence
detection should "fall back to custom", while the definition of done said it should "refuse to
guess and exit with a clear message".

## Options considered

### Arguments

- **A. A CLI framework (commander, clipanion, cac).** Pros: subcommand help, completion. Cons: a
  dependency and a second vocabulary for two commands.
- **B. `node:util` `parseArgs`.** Pros: zero dependencies, strict mode rejects unknown flags,
  supports negation (`--no-structure`). Cons: no generated help or subcommands; we write usage text.

### Prompts

- **C. Call a prompt library directly from the flow.** Pros: least code. Cons: flows become
  untestable without a pseudo-terminal, which is exactly where the safety promises live.
- **D. A `Prompter` interface with a terminal implementation (`@clack/prompts`, MIT) and a scripted
  implementation for tests.** Pros: every flow is tested end to end; a flow that asks an unscripted
  question fails the test; the hook on each question lets a test inspect the world at that moment
  (for example, that nothing is on disk when the user is asked to confirm).
- **E. Hand-rolled readline prompts.** Cons: arrow-key selection and multi-select need raw terminal
  handling; not worth owning.

### `--yes` below the confidence threshold

- **F. Fall back to `custom`.** Cons: picks an answer on the user's behalf.
- **G. Exit 3 and list the explicit options.** Pros: the user decides; CI scripts fail loudly instead
  of encoding a guess.

## Decision

- Use **`parseArgs`** (B) until subcommand count or help needs justify a framework.
- Put prompts behind **`Prompter`** (D), implemented with `@clack/prompts`, used only when stdin and
  stdout are a TTY. Without a TTY and without `--yes`, `init` exits 2.
- `--yes` accepts a detected architecture only at confidence ≥ 0.85; otherwise it **exits 3** (G).
  `--architecture <style>` and `--architecture custom` are the explicit, non-interactive answers.

## Consequences

**Positive** — safety promises are asserted by tests, not by hope; a small dependency surface; CI
behaviour is explicit.
**Negative** — usage text is hand-written and must be kept in step with the flags; the terminal
implementation itself is covered by a pty smoke test and the CI binary smoke test rather than unit tests.
**Follow-up** — `doctor`, `review` and `generate` reuse `parseArgs`; revisit a framework if the
command count passes about six.

## Revisit when

Help and completion become a support burden, or `@clack/prompts` stops being maintained.

# Architecture Decision Records

A decision gets an ADR when it is **hard to reverse**, **non-obvious**, or likely to be
re-litigated. Specs then link to the ADR instead of re-arguing it.

| #                                                          | Decision                                     | Status   |
| ---------------------------------------------------------- | -------------------------------------------- | -------- |
| [0001](adr-0001-project-mode-is-first-class.md)            | Project Mode is a first-class concept        | accepted |
| [0002](adr-0002-adopt-is-default-for-existing-projects.md) | `adopt` is the default for existing projects | accepted |
| [0003](adr-0003-architecture-independent-of-stack.md)      | Architecture is independent of stack         | accepted |
| [0004](adr-0004-data-driven-architectures.md)              | Architectures are data, not code             | accepted |
| [0005](adr-0005-custom-architecture-support.md)            | `custom` architecture is a V1 requirement    | accepted |

Template: [adr-template.md](adr-template.md). Number sequentially, never reuse a number.
Superseding an ADR means writing a new one and marking the old `superseded by NNNN` —
never editing history.

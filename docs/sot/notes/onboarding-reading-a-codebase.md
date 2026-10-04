---
topic: onboarding-reading-a-codebase
sources:
  - {
      id: books/working-effectively-with-legacy-code,
      chapters: "2, 13, 17 (change algorithm, characterization tests)",
      licence: "copyrighted — notes only",
    }
  - {
      id: books/software-engineering-at-google,
      chapters: "3 (Knowledge Sharing)",
      licence: "free HTML (abseil.io) — notes only",
    }
  - {
      id: standards/google-eng-practices,
      section: "reviewer/standard, reviewer/looking-for",
      licence: "CC BY 3.0",
    }
  - {
      id: articles/documenting-architecture-decisions,
      section: "Nygard 2011",
      licence: "article — notes only",
    }
  - { id: articles/strangler-fig-application, section: "Fowler", licence: "article — notes only" }
feeds_skills: [core/project-onboarding]
status: reviewed
updated: 2026-10-04
---

# Reading a codebase before changing it

## 1. Core ideas (in my own words)

An agent that starts editing an existing repository knows nothing the team knows. The expensive
mistakes are not wrong syntax; they are _locally valid_ code that disagrees with how the project
already does the same thing: a second error style, a second validation library, a new folder
convention. Each is individually defensible and collectively erodes the codebase. The cure is
procedural: find out how the project does it, then do it that way.

Evidence has a natural order of authority. What the team _decided and wrote down_ (configuration,
decision records, contributing docs) outranks what the code _currently does_, which outranks what a
detector _infers_, which outranks the agent's own preference. When two sources of the same rank
disagree, that is a finding to report, not a tie to break silently.

Feathers frames legacy code as code without a safety net, and the safe route as "cover, then
modify": identify what you will change, find where its behaviour can be observed, make it testable
with the smallest possible dependency break, pin current behaviour with characterization tests
(assert what the code does today, even if odd), and only then change it. The point for an agent is
that "I improved this while I was there" is exactly the behaviour change nobody asked for.

Google's review guidance gives the tie-break for style: a written style guide is authoritative;
where no rule exists, consistency with the surrounding code is a legitimate request as long as it
does not harm code health. It also says to judge a change in the context of the whole file and
system, not just the changed lines — which is the same instruction in reverse for the author.

Knowledge-sharing research at Google adds a human point that transfers directly: what a newcomer
learns should be written down while the gaps are still fresh. For an agent this means: when you had
to discover a convention by reading code, say so in the change description, and when the repo has no
record of an important decision, propose recording it rather than guessing again next time.

Decision records (Nygard) exist so a newcomer is not forced to choose between blindly accepting and
blindly reversing a past decision. Their presence is therefore high-value onboarding evidence:
read them before proposing to change anything they cover. Large-scale change is a separate,
explicit activity — the strangler-fig pattern replaces a system incrementally beside the old one
rather than by rewrite — and never a side effect of a feature request.

## 2. Extracted rules

| #   | Rule                                                                                                          | Type       | Source                 |
| --- | ------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------- |
| 1   | Authority order: written decisions > observed code > inferred detection > own preference.                     | actionable | Google eng-practices   |
| 2   | Where no written rule exists, match the surrounding code unless doing so harms code health.                   | actionable | Google eng-practices   |
| 3   | Read the neighbours of the file you will change (siblings, callers, tests) before writing.                    | actionable | Google eng-practices   |
| 4   | Do not change behaviour you cannot observe; pin it with a characterization test first.                        | actionable | Feathers               |
| 5   | Change set: identify change points → find test points → break dependencies minimally → test → change.         | actionable | Feathers               |
| 6   | Read decision records before touching what they cover; do not reverse a decision without stating its context. | actionable | Nygard                 |
| 7   | Replacing a structure is its own task, done incrementally; a feature request is not authorization to migrate. | actionable | Fowler (strangler fig) |
| 8   | Record conventions discovered the hard way so the next newcomer does not rediscover them.                     | actionable | SWE at Google ch. 3    |
| 9   | Mixed conventions in the repo are a fact to report; follow the one used in the area you are editing.          | actionable | own design (detection) |
| 10  | Not knowing is acceptable and should be stated; guessing silently is not.                                     | background | SWE at Google ch. 3    |

## 3. Where sources disagree

| Question                         | Source A says                                                         | Source B says                                                | Our position + why                                                                                                                                                                          |
| -------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consistency vs. improvement      | Google: consistency is acceptable when no rule exists, if not harmful | Clean-code culture: leave the code cleaner than you found it | Improve only inside the lines you are already changing, and never by introducing a second convention. Cleaning elsewhere is a separate commit and a separate request (Beck, _Tidy First?_). |
| Write tests before touching code | Feathers: always characterize first                                   | Reality: some code cannot be tested without a risky refactor | Characterize when a test point exists at reasonable cost; otherwise state the risk, make the smallest change, and say it is untested. Never claim safety that was not established.          |

## 4. What is outdated

Feathers' dependency-breaking catalogue is written for C++/Java/C#. In TypeScript, most seams are
function parameters or module boundaries and need none of the heavier techniques; the _algorithm_
transfers, the catalogue mostly does not.

## 5. Quotes (≤ 25 words each, max one per note)

> "On matters of style, the style guide is the absolute authority." — Google, _Code Review Developer Guide_, reviewer/standard

## 6. Open questions

- None blocking. The `observe`/`strict` wording is a project decision (ADR-0003), not from a source.

## 7. Applied in

- `skills/core/project-onboarding/SKILL.md` — rules 1–9

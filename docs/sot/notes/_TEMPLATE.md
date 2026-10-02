---
topic: <domain>-<topic> # e.g. quality-naming
sources:
  - {
      id: books/a-philosophy-of-software-design,
      chapters: "4, 5",
      licence: "copyrighted — notes only",
    }
  - { id: standards/owasp-top-10, section: "A01", licence: "CC BY-SA 4.0" }
feeds_skills: [quality/clean-code]
status: draft # draft | reviewed | applied
updated: 2026-10-01
---

# <Topic>

## 1. Core ideas (in my own words)

Three to seven paragraphs. Never paraphrase sentence-by-sentence — explain the idea as you
would to a colleague, in terms of _our_ framework.

## 2. Extracted rules

Mark each `actionable` (reaches a skill) or `background` (context only).

| #   | Rule                                                   | Type       | Source      |
| --- | ------------------------------------------------------ | ---------- | ----------- |
| 1   | A function whose name needs "and" is doing two things. | actionable | APoSD ch. 4 |
| 2   | Deep modules hide more than they expose.               | background | APoSD ch. 4 |

## 3. Where sources disagree

| Question        | Source A says                                | Source B says                                                              | Our position + why                                                                                                                                  |
| --------------- | -------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Function length | Clean Code: very short, extract aggressively | APoSD: over-extraction creates shallow modules and raises total complexity | Favour APoSD: split on _responsibility_, not line count. Clean Code's limits were written before modern IDE navigation and encourage fragmentation. |

## 4. What is outdated

Note anything the source got right for its time but which our stack or era invalidates.

## 5. Quotes (≤ 25 words each, max one per note)

> "<short quote>" — Author, _Title_, ch. N

## 6. Open questions

Things to resolve before the skill is final.

## 7. Applied in

- `skills/<category>/<name>/SKILL.md` — rules 1, 3, 4

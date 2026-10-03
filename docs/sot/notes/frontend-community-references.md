---
topic: frontend-community-references
sources:
  - {
      id: community/ui-ux-pro-max-skill,
      url: "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill",
      licence: "MIT",
      read: "2026-10-03",
    }
  - {
      id: community/taste-skill,
      url: "https://github.com/Leonxlnx/taste-skill",
      licence: "MIT",
      read: "2026-10-03",
    }
  - {
      id: standards/wcag-2-2,
      url: "https://www.w3.org/TR/WCAG22/",
      licence: "W3C document licence",
      read: "2026-10-03",
    }
feeds_skills: [frontend/react, frontend/nextjs, frontend/accessibility, frontend/ui-review]
status: draft
updated: 2026-10-03
---

# Frontend community references: UI UX Pro Max and Taste Skill

Two popular community skill repositories for AI-generated frontends. This note records what they
are, what we may learn from them, and what we deliberately do not take. It follows the rule in
[../README.md](../README.md): popularity is not authority, and every rule that reaches a skill must
trace to a primary source or a stated project decision.

## 1. What they are

|              | UI UX Pro Max                                                                                                       | Taste Skill                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Repository   | `nextlevelbuilder/ui-ux-pro-max-skill`                                                                              | `Leonxlnx/taste-skill`                                                                                |
| Licence      | MIT                                                                                                                 | MIT                                                                                                   |
| Shape        | A searchable local database (CSV: styles, palettes, fonts, guidelines) queried by Python scripts, plus a skill file | A family of `SKILL.md` files (design taste, redesign, minimalist, brutalist, image-to-code, …)        |
| Aim          | Generate a design system from a brief, then apply stack-specific guidance                                           | Stop "templated" AI interfaces; read the brief, choose a direction, ship non-generic UI               |
| Stated scope | Many UI stacks, web and mobile                                                                                      | Landing pages, portfolios, redesigns; explicitly not dashboards, data tables or multi-step product UI |
| Install path | npm CLI that runs Python scripts, or a Claude plugin marketplace                                                    | Plugin marketplace or copying skill files                                                             |

Both repositories were confirmed as the canonical owners' repositories. Search results also surface
many forks and look-alikes under other accounts; none of those are used here.

## 2. Assessment against our standards

Our bar (see [../INDEX.md](../INDEX.md)): primary sources first; rules must be falsifiable; skills
must not assume a stack; the developer chooses.

| Question                   | UI UX Pro Max                                                                            | Taste Skill                                                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Authority                  | Community, very widely used; no external review                                          | Community, very widely used; no external review                                                                                        |
| Falsifiable rules present? | Yes: contrast, targets, focus, motion preference, layout shift, viewport, base type size | Yes: contrast, reduced motion, Core Web Vitals thresholds, animate only compositor properties, no scroll listeners, form label pattern |
| Unverifiable claims        | Counts of styles, palettes and "reasoning profiles" cannot be audited                    | The author states some of its strongest bans are observations, not measured results                                                    |
| Assumes a stack            | Mostly neutral, with per-stack guidance                                                  | Strongly: Tailwind, a specific motion library, GSAP, named icon sets and fonts                                                         |
| Fit with our scope         | Product UI and design systems: relevant                                                  | Marketing pages: partly out of scope                                                                                                   |
| Runtime model              | Scripts and a data set the agent must query                                              | Static instruction files                                                                                                               |

Conclusion: they are useful as **maps of what to check**, not as **sources of what is true**. Where
a rule is objective we cite the standard behind it, not the repository.

## 3. What we adopt (the ideas, re-derived from primary sources)

1. **Rank checks by consequence.** Both order rules so accessibility and interaction outrank taste.
   We do the same: correctness and accessibility rules use MUST; aesthetic guidance never does.
2. **State the interpretation before building.** Taste Skill's "design read" (one sentence on who
   the interface is for and what it should feel like) is the UI form of our
   `core/requirements-analysis`. A frontend skill should require it for new screens and skip it
   for edits inside an existing design system.
3. **A pre-flight checklist that can fail.** A short list a reviewer can answer from a diff or a
   screenshot, which is exactly what `eng-skills review` consumes.
4. **Respect the existing design system.** Existing project conventions outrank generic taste. This
   is the same adopt-first rule that governs architecture ([ADR-0002](../../05-decisions/adr-0002-adopt-is-default-for-existing-projects.md)).

## 4. What we do not adopt

- **Specific libraries, fonts, palettes, icon sets or style bans** (a named animation library, a
  banned icon set, a banned punctuation mark). They are taste, they are stack choices, and they
  would break "technology does not imply a decision".
- **Their databases of styles and palettes.** Unauditable, and not rules.
- **Dials as framework features.** Variance, motion and density settings are a good idea for a
  design tool; here they would be speculative config. Recorded as backlog, not scheduled.
- **Anything we cannot trace to a primary source or a stated decision.**

MIT permits reuse with attribution, but we are not copying text: the value is the structure above,
and the content must stand on primary sources.

## 5. A correction worth recording

An automated summary of one of these repositories claimed a 44×44 px touch target "exceeds the WCAG
minimum" and attributed 48×48 px to APCA. Checked against W3C:

| Criterion                                | Level | Requirement                                                                                                                     |
| ---------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------- |
| WCAG 2.2 SC 2.5.8 Target Size (Minimum)  | AA    | Pointer targets at least **24×24 CSS px**, with exceptions (spacing, equivalent control, inline, user-agent control, essential) |
| WCAG 2.2 SC 2.5.5 Target Size (Enhanced) | AAA   | At least **44×44 CSS px**                                                                                                       |

APCA is a contrast method, not a target-size rule. So a skill must say: targets MUST meet 24×24
(AA) and SHOULD reach 44×44 for primary touch controls (AAA and common mobile platform guidance).
Stating "44px is required" would be wrong; stating nothing would drop a useful rule.

## 6. Extracted rules (candidates for frontend skills)

| #   | Rule                                                                                         | Type       | Primary source to cite          |
| --- | -------------------------------------------------------------------------------------------- | ---------- | ------------------------------- |
| 1   | Normal text contrast ≥ 4.5:1, large text ≥ 3:1                                               | actionable | WCAG 2.2 SC 1.4.3               |
| 2   | Every interactive element is keyboard operable and has a visible focus indicator             | actionable | WCAG 2.2 SC 2.1.1, 2.4.7        |
| 3   | Pointer targets ≥ 24×24 CSS px (AA); primary touch targets SHOULD be ≥ 44×44                 | actionable | WCAG 2.2 SC 2.5.8, 2.5.5        |
| 4   | Icon-only controls have an accessible name                                                   | actionable | WCAG 2.2 SC 4.1.2               |
| 5   | Honour `prefers-reduced-motion`                                                              | actionable | WCAG 2.2 SC 2.3.3 (AAA), MDN    |
| 6   | Do not rely on hover for essential actions                                                   | actionable | WCAG 2.2 SC 1.4.13, 2.5.x       |
| 7   | CLS < 0.1, LCP ≤ 2.5 s, INP ≤ 200 ms at the 75th percentile                                  | actionable | web.dev Core Web Vitals         |
| 8   | Animate compositor-friendly properties; avoid layout-triggering ones                         | actionable | web.dev / MDN                   |
| 9   | Do not disable zoom; content reflows at 320 CSS px without horizontal scroll                 | actionable | WCAG 2.2 SC 1.4.4, 1.4.10       |
| 10  | Form fields have visible labels, associated programmatically, with errors identified in text | actionable | WCAG 2.2 SC 1.3.1, 3.3.1, 3.3.2 |
| 11  | Match the existing design system before introducing new tokens                               | actionable | project decision (adopt-first)  |
| 12  | Choice of fonts, palette and visual style                                                    | background | none: taste, brief-dependent    |

Each "actionable" row above must be re-verified against the cited criterion text before it enters a
skill; the table is a work list, not a source.

## 7. Open questions

- ~~Should `frontend/accessibility` and `frontend/ui-review` join the V1 skill set?~~ Decided yes (2026-10-03): added to V1 scope.
- Should Core Web Vitals thresholds be pinned to a version of the standard? They have changed
  before (FID was replaced by INP).

## 8. Applied in

Nothing yet. Planned for P10: `frontend/accessibility`, `frontend/ui-review`, and the review checklists of
`frontend/react` and `frontend/nextjs`.

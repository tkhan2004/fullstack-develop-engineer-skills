# Bibliography — Curated Source Index

Tiers: **P1** required before writing the skill · **P2** read to deepen it · **P3** context /
tie-breaker.

Legend for _Access_: 📕 book (buy/borrow, store in `raw/`) · 🌐 free online · 📄 standard/spec.

> Nothing here is committed as source text. See [README.md](README.md) §1.

---

## 1. Engineering principles & craft

→ feeds `core/engineering-principles`, `core/decision-making`, `quality/clean-code`

| Tier | Source                                          | Author / Org               |    Access    | Why it matters here                                                                                                                               |
| :--: | ----------------------------------------------- | -------------------------- | :----------: | ------------------------------------------------------------------------------------------------------------------------------------------------- |
|  P1  | **A Philosophy of Software Design** (2nd ed.)   | John Ousterhout            |      📕      | The best available treatment of complexity, deep vs. shallow modules, information hiding. Directly shapes module-boundary rules.                  |
|  P1  | **The Pragmatic Programmer** (20th Anniversary) | Hunt & Thomas              |      📕      | Orthogonality, DRY (correctly defined as knowledge duplication), tracer bullets, decision-making under uncertainty.                               |
|  P1  | **Clean Code**                                  | Robert C. Martin           |      📕      | The naming and function chapters. Use critically — several chapters (comments, class size dogma) are contested; record the disagreement in notes. |
|  P2  | **Code Complete** (2nd ed.)                     | Steve McConnell            |      📕      | Encyclopaedic; good on construction-level decisions and defensive programming.                                                                    |
|  P2  | **Software Engineering at Google**              | Winters, Manshreck, Wright | 🌐 free HTML | Scale-driven engineering: code review, testing culture, deprecation, "Beyoncé rule".                                                              |
|  P2  | **Tidy First?**                                 | Kent Beck                  |      📕      | When to clean vs. when to ship; small structural changes as a separate activity from behaviour change.                                            |
|  P3  | **The Art of Readable Code**                    | Boswell & Foucher          |      📕      | Short, practical, example-dense; good source of concrete naming rules.                                                                            |
|  P3  | **Accelerate**                                  | Forsgren, Humble, Kim      |      📕      | Evidence linking engineering practice to outcomes; useful for justifying rules.                                                                   |

## 2. Clean code, refactoring, SOLID, patterns

→ `quality/clean-code`, `quality/solid`, `quality/refactoring`, `quality/design-patterns`

| Tier | Source                                                   | Author / Org                    | Access | Why                                                                                                         |
| :--: | -------------------------------------------------------- | ------------------------------- | :----: | ----------------------------------------------------------------------------------------------------------- |
|  P1  | **Refactoring** (2nd ed., JS examples)                   | Martin Fowler                   |   📕   | The code-smell catalogue is the backbone of a refactoring skill; JS edition fits our stack.                 |
|  P1  | **refactoring.com catalog**                              | Fowler                          |   🌐   | Free catalogue of named refactorings — cite by name in skills.                                              |
|  P1  | **SOLID — original papers / Agile Software Development** | Robert C. Martin                | 📕/🌐  | Go to the source definitions rather than blog restatements; the ISP and DIP definitions are widely mangled. |
|  P2  | **Design Patterns** (GoF)                                | Gamma, Helm, Johnson, Vlissides |   📕   | Canonical vocabulary. Skill must warn against pattern-first design.                                         |
|  P2  | **Head First Design Patterns** (2nd ed.)                 | Freeman et al.                  |   📕   | More digestible; good for the "when NOT to use it" framing.                                                 |
|  P2  | **Patterns of Enterprise Application Architecture**      | Fowler                          |   📕   | Repository, Unit of Work, Service Layer, Active Record — the exact vocabulary our architectures use.        |
|  P3  | **Refactoring Guru**                                     | —                               |   🌐   | Quick reference for pattern/refactoring names. Verify against primary sources.                              |

## 3. Architecture

→ `architecture/*`, all architecture manifests

| Tier | Source                                                        | Author / Org          | Access | Why                                                                                                         |
| :--: | ------------------------------------------------------------- | --------------------- | :----: | ----------------------------------------------------------------------------------------------------------- |
|  P1  | **Clean Architecture**                                        | Robert C. Martin      |   📕   | The dependency rule, boundaries, and the layer definitions our `clean` manifest encodes.                    |
|  P1  | **Hexagonal Architecture** (original article + 2024 revision) | Alistair Cockburn     |   🌐   | Ports/adapters from the author; most blog versions distort it.                                              |
|  P1  | **Fundamentals of Software Architecture**                     | Richards & Ford       |   📕   | Architecture characteristics, trade-off analysis — the source for our "no architecture is superior" stance. |
|  P1  | **Domain-Driven Design Distilled**                            | Vaughn Vernon         |   📕   | Bounded contexts and module boundaries without the 500-page commitment.                                     |
|  P2  | **Learning Domain-Driven Design**                             | Vlad Khononov         |   📕   | Modern, pragmatic DDD; excellent on choosing _how much_ architecture a subdomain deserves.                  |
|  P2  | **Domain-Driven Design** (blue book)                          | Eric Evans            |   📕   | Primary source for entities, value objects, aggregates, repositories.                                       |
|  P2  | **Software Architecture: The Hard Parts**                     | Ford, Richards et al. |   📕   | Decomposition, data ownership, distributed trade-offs — input for migration guidance.                       |
|  P2  | **Building Evolutionary Architectures**                       | Ford, Parsons, Kua    |   📕   | Fitness functions ≈ our `doctor` checks; architecture as something verified continuously.                   |
|  P3  | **Monolith to Microservices**                                 | Sam Newman            |   📕   | Incremental migration patterns (strangler fig) — directly applicable to `migrate --incremental`.            |
|  P3  | **Presentation Domain Data Layering**                         | Fowler                |   🌐   | Short, clear argument about layering trade-offs.                                                            |

## 4. Testing

→ `engineering/testing`

| Tier | Source                                                | Author / Org                 | Access | Why                                                                                        |
| :--: | ----------------------------------------------------- | ---------------------------- | :----: | ------------------------------------------------------------------------------------------ |
|  P1  | **Unit Testing: Principles, Practices and Patterns**  | Vladimir Khorikov            |   📕   | The clearest modern treatment: the four pillars, London vs. Classical, what _not_ to mock. |
|  P1  | **Test Driven Development: By Example**               | Kent Beck                    |   📕   | The red-green-refactor loop from the source.                                               |
|  P1  | **Practical Test Pyramid**                            | Ham Vocke (martinfowler.com) |   🌐   | Free, concrete, framework-agnostic test-level definitions.                                 |
|  P2  | **Growing Object-Oriented Software, Guided by Tests** | Freeman & Pryce              |   📕   | Outside-in TDD; where test design and architecture meet.                                   |
|  P2  | **xUnit Test Patterns**                               | Gerard Meszaros              |   📕   | Canonical test-smell vocabulary (fragile test, obscure test, erratic test).                |
|  P2  | **Software Engineering at Google** — testing chapters | Google                       |   🌐   | Test sizes (small/medium/large) are a better axis than unit/integration; worth adopting.   |
|  P3  | **Vitest / Playwright docs**                          | —                            |   🌐   | Tool-specific idioms for our V1 stack.                                                     |

## 5. Security

→ `engineering/security`

| Tier | Source                             | Author / Org    |   Access    | Why                                                                                                   |
| :--: | ---------------------------------- | --------------- | :---------: | ----------------------------------------------------------------------------------------------------- |
|  P1  | **OWASP Top 10** (current edition) | OWASP           | 🌐 CC BY-SA | The baseline threat list; map each item to a concrete rule.                                           |
|  P1  | **OWASP Cheat Sheet Series**       | OWASP           |     🌐      | Per-topic, implementation-level guidance (authn, authz, input validation, file upload, SSRF).         |
|  P1  | **OWASP API Security Top 10**      | OWASP           |     🌐      | BOLA/IDOR and broken object-property authorization — the defects agents produce most often.           |
|  P1  | **OWASP ASVS**                     | OWASP           |     📄      | Verification requirements written as checkable statements — ideal raw material for falsifiable rules. |
|  P2  | **NIST SP 800-63B**                | NIST            |     📄      | Authoritative password/authentication guidance; kills several persistent myths.                       |
|  P2  | **CWE Top 25**                     | MITRE           |     🌐      | Weakness taxonomy; use CWE ids in findings for traceability.                                          |
|  P2  | **OWASP Proactive Controls**       | OWASP           |     🌐      | Positive framing ("do this") rather than threat framing.                                              |
|  P3  | **The Tangled Web**                | Michał Zalewski |     📕      | Deep browser security model; background for XSS/CSRF rules.                                           |

## 6. Databases, SQL, PostgreSQL

→ `database/sql`, `database/postgresql`, `database/prisma`, `database-performance`

| Tier | Source                                                   | Author / Org         | Access  | Why                                                                                     |
| :--: | -------------------------------------------------------- | -------------------- | :-----: | --------------------------------------------------------------------------------------- |
|  P1  | **PostgreSQL official documentation**                    | PostgreSQL           |   🌐    | Indexing, transactions, isolation, locking, EXPLAIN — primary source, version-specific. |
|  P1  | **Use The Index, Luke!** / **SQL Performance Explained** | Markus Winand        | 🌐 / 📕 | The best explanation of index usage and why queries do not use them.                    |
|  P1  | **Designing Data-Intensive Applications**                | Martin Kleppmann     |   📕    | Transactions, isolation levels, consistency — the conceptual backbone.                  |
|  P2  | **PostgreSQL Wiki — "Don't Do This"**                    | PostgreSQL community |   🌐    | Concrete anti-patterns, directly convertible into Don't rules.                          |
|  P2  | **Prisma documentation**                                 | Prisma               |   🌐    | N+1 behaviour, transactions, migrations, connection pooling in our V1 ORM.              |
|  P2  | **Database Internals**                                   | Alex Petrov          |   📕    | Storage and index internals; background for performance rules.                          |
|  P3  | **SQL Antipatterns**                                     | Bill Karwin          |   📕    | Schema-design anti-patterns with fixes.                                                 |

## 7. TypeScript & Node.js

→ `backend/typescript`, `backend/nodejs`

| Tier | Source                             | Author / Org         |  Access  | Why                                                                                             |
| :--: | ---------------------------------- | -------------------- | :------: | ----------------------------------------------------------------------------------------------- |
|  P1  | **TypeScript Handbook**            | Microsoft            |    🌐    | Primary source for compiler options, narrowing, generics.                                       |
|  P1  | **Effective TypeScript** (2nd ed.) | Dan Vanderkam        |    📕    | 83 specific, actionable items — format closest to what a skill should contain.                  |
|  P1  | **Node.js API documentation**      | Node.js              |    🌐    | Errors, streams, async behaviour, process lifecycle.                                            |
|  P2  | **Node.js Best Practices**         | Yoni Goldberg et al. |    🌐    | Large, opinionated, well-cited; mine it for error handling and project-structure rules.         |
|  P2  | **Google TypeScript Style Guide**  | Google               | 🌐 CC BY | Naming and structure decisions with stated rationale.                                           |
|  P2  | **Total TypeScript** articles      | Matt Pocock          |    🌐    | Modern patterns, especially around inference and generics.                                      |
|  P3  | **The Twelve-Factor App**          | Heroku               |    🌐    | Config, dependencies, logs, processes — still the clearest statement for service configuration. |

## 8. Express / HTTP / API design

→ `backend/express`, `architecture/api-design`

| Tier | Source                                                    | Author / Org       | Access | Why                                                                      |
| :--: | --------------------------------------------------------- | ------------------ | :----: | ------------------------------------------------------------------------ |
|  P1  | **Express documentation** incl. production best practices | Express            |   🌐   | Middleware ordering, error middleware, security and performance notes.   |
|  P1  | **RFC 9457 — Problem Details for HTTP APIs**              | IETF               |   📄   | Standard error-response shape; adopt it instead of inventing one.        |
|  P1  | **Google API Improvement Proposals (AIPs)**               | Google             |   🌐   | Resource naming, pagination, partial updates, long-running operations.   |
|  P2  | **Zalando RESTful API Guidelines**                        | Zalando            |   🌐   | Extremely concrete, rule-numbered — a model for how to phrase API rules. |
|  P2  | **Microsoft REST API Guidelines**                         | Microsoft          |   🌐   | Versioning, pagination, filtering conventions.                           |
|  P2  | **RFC 9110 — HTTP Semantics**                             | IETF               |   📄   | Authoritative status-code and method semantics.                          |
|  P3  | **OpenAPI Specification**                                 | OpenAPI Initiative |   📄   | Contract-first vocabulary.                                               |

## 9. React / Next.js

→ `frontend/react`, `frontend/nextjs`

| Tier | Source                                            | Author / Org          | Access | Why                                                                                      |
| :--: | ------------------------------------------------- | --------------------- | :----: | ---------------------------------------------------------------------------------------- |
|  P1  | **react.dev** (Learn + Reference)                 | Meta                  |   🌐   | Current mental model: "You Might Not Need an Effect", state ownership, derived state.    |
|  P1  | **Next.js documentation** (App Router)            | Vercel                |   🌐   | Server vs. client components, caching, revalidation, server actions — version-sensitive. |
|  P2  | **TanStack Query docs**                           | Tanner Linsley et al. |   🌐   | The clearest articulation of server state vs. client state.                              |
|  P2  | **Kent C. Dodds — state colocation, composition** | Kent C. Dodds         |   🌐   | Component-boundary and state-placement rules.                                            |
|  P3  | **Web Vitals**                                    | Google                |   🌐   | Performance targets for frontend rules.                                                  |

### 9b. Accessibility, UX and performance of the interface (proposed, see note)

→ `frontend/accessibility`, `frontend/ui-review` (proposed; not yet in V1 scope)

| Tier | Source                                            | Author / Org         | Access | Why                                                                                                                                                                                           |
| :--: | ------------------------------------------------- | -------------------- | :----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  P1  | **WCAG 2.2** (and the _Understanding_ documents)  | W3C WAI              |   🌐   | The authority for every objective accessibility rule: contrast, keyboard, focus, target size (2.5.8 AA = 24 px; 2.5.5 AAA = 44 px), reflow.                                                   |
|  P1  | **WAI-ARIA Authoring Practices Guide**            | W3C WAI              |   🌐   | Correct patterns and keyboard behaviour for widgets; prevents "ARIA everywhere".                                                                                                              |
|  P1  | **Core Web Vitals**                               | web.dev (Google)     |   🌐   | Thresholds and measurement for LCP, INP, CLS. Versioned: re-check on each release.                                                                                                            |
|  P2  | **MDN Web Docs** (CSS, ARIA, media queries)       | Mozilla              |   🌐   | Reference for `prefers-reduced-motion`, viewport, compositor-friendly animation.                                                                                                              |
|  P2  | **10 Usability Heuristics**                       | Nielsen Norman Group |   🌐   | Widely cited UX heuristics; use as review prompts, not as hard rules.                                                                                                                         |
|  P3  | **UI UX Pro Max Skill** (`nextlevelbuilder`, MIT) | community            |   🌐   | Useful map of check categories ranked by consequence. Unauditable data sets; **not a source of truth**. See [notes/frontend-community-references.md](notes/frontend-community-references.md). |
|  P3  | **Taste Skill** (`Leonxlnx`, MIT)                 | community            |   🌐   | Useful "state the design read first" step and a failable pre-flight checklist. Stack- and taste-specific; **not a source of truth**. Same note.                                               |

## 10. Error handling, resilience, debugging

→ `engineering/error-handling`, `engineering/debugging`, `core/problem-solving`

| Tier | Source                                                    | Author / Org   | Access | Why                                                                                         |
| :--: | --------------------------------------------------------- | -------------- | :----: | ------------------------------------------------------------------------------------------- |
|  P1  | **Debugging: The 9 Indispensable Rules**                  | David J. Agans |   📕   | The debugging method our problem-solving skill encodes.                                     |
|  P1  | **Node.js error handling guidance** (docs + Joyent guide) | Node / Joyent  |   🌐   | Operational vs. programmer errors — the distinction every error-handling rule rests on.     |
|  P1  | **Release It!** (2nd ed.)                                 | Michael Nygard |   📕   | Stability patterns: timeouts, circuit breakers, bulkheads; failure modes to design against. |
|  P2  | **Why Programs Fail**                                     | Andreas Zeller |   📕   | Systematic debugging, delta debugging, scientific method applied to defects.                |
|  P2  | **Google SRE Book** — postmortems                         | Google         |   🌐   | Blameless root-cause analysis; informs how findings are worded.                             |
|  P3  | **RFC 9457**                                              | IETF           |   📄   | How errors leave the process boundary.                                                      |

## 11. Observability & performance

→ `engineering/observability`, `engineering/performance`, `engineering/caching`

| Tier | Source                                                          | Author / Org                | Access | Why                                                                        |
| :--: | --------------------------------------------------------------- | --------------------------- | :----: | -------------------------------------------------------------------------- |
|  P1  | **Observability Engineering**                                   | Majors, Fong-Jones, Miranda |   📕   | Structured events, high cardinality, why dashboards are not observability. |
|  P1  | **OpenTelemetry documentation**                                 | CNCF                        |   🌐   | Vendor-neutral traces/metrics/logs vocabulary.                             |
|  P2  | **Systems Performance** (2nd ed.)                               | Brendan Gregg               |   📕   | USE method, methodology over tool trivia.                                  |
|  P2  | **Google SRE Book / Workbook**                                  | Google                      |   🌐   | SLIs, SLOs, error budgets — what "good performance" means operationally.   |
|  P3  | **Caching strategies** (AWS/Cloudflare docs, Fowler's writings) | —                           |   🌐   | Cache invalidation, TTL, stale-while-revalidate.                           |

## 12. Requirements & product reasoning

→ `core/requirements-analysis`

| Tier | Source                          | Author / Org      | Access | Why                                                                                   |
| :--: | ------------------------------- | ----------------- | :----: | ------------------------------------------------------------------------------------- |
|  P1  | **Specification by Example**    | Gojko Adzic       |   📕   | Turning requirements into concrete, testable examples — exactly what an agent needs.  |
|  P1  | **Writing Effective Use Cases** | Alistair Cockburn |   📕   | Main success scenario, extensions, failure conditions — a ready-made checklist.       |
|  P2  | **User Story Mapping**          | Jeff Patton       |   📕   | Finding the implied and the missing.                                                  |
|  P2  | **Impact Mapping**              | Gojko Adzic       |   📕   | Connecting a requirement to the outcome it serves; useful for "should we build this?" |
|  P3  | **BDD / Gherkin docs**          | Cucumber          |   🌐   | Given/When/Then as a requirement-clarification device, not a test framework mandate.  |

## 13. Code review

→ `quality/code-review`

| Tier | Source                                         | Author / Org    |  Access  | Why                                                                                         |
| :--: | ---------------------------------------------- | --------------- | :------: | ------------------------------------------------------------------------------------------- |
|  P1  | **Google Engineering Practices — Code Review** | Google          | 🌐 CC BY | The standard of "is this better than what's there", reviewer/author guides, review speed.   |
|  P1  | **Conventional Comments**                      | —               |    🌐    | A grammar for review feedback (`praise:`, `nit:`, `issue:`) — adopt it for `review` output. |
|  P2  | **Modern Code Review: A Case Study at Google** | Sadowski et al. | 📄 paper | Evidence on what review actually catches.                                                   |
|  P3  | **SmartBear code review research**             | SmartBear       |    🌐    | Review size and defect-detection limits (~400 LOC, ~60 min).                                |

## 14. AI agent instruction design

→ framework output format, adapters, skill phrasing

| Tier | Source                                                | Author / Org | Access | Why                                                                                   |
| :--: | ----------------------------------------------------- | ------------ | :----: | ------------------------------------------------------------------------------------- |
|  P1  | **Claude Code documentation & best practices**        | Anthropic    |   🌐   | `CLAUDE.md` conventions, skills, what agents actually read and follow.                |
|  P1  | **AGENTS.md convention**                              | community    |   🌐   | The emerging cross-tool instruction file our `codex`/`generic` adapters target.       |
|  P2  | **Cursor rules documentation**                        | Cursor       |   🌐   | `.mdc` frontmatter and glob-scoped rules for the Cursor adapter.                      |
|  P2  | **Anthropic prompt engineering docs**                 | Anthropic    |   🌐   | Ordering, specificity, and instruction-following behaviour — informs output ordering. |
|  P3  | **Writing for developers / technical writing guides** | Google       |   🌐   | Plain, imperative instruction style.                                                  |

## 15. Standards & conventions (quick reference)

| Tier | Source                                    | Access | Used for                                   |
| :--: | ----------------------------------------- | :----: | ------------------------------------------ |
|  P1  | **RFC 2119 / RFC 8174** — MUST/SHOULD/MAY |   📄   | Normative language in every spec and skill |
|  P1  | **Semantic Versioning 2.0.0**             |   📄   | Skill, manifest and package versioning     |
|  P1  | **Conventional Commits**                  |   🌐   | Commit convention + changelog generation   |
|  P2  | **Keep a Changelog**                      |   🌐   | CHANGELOG format                           |
|  P2  | **The Twelve-Factor App**                 |   🌐   | Configuration and environment rules        |
|  P2  | **EditorConfig spec**                     |   🌐   | Cross-editor formatting                    |
|  P3  | **CommonMark**                            |   📄   | Markdown we generate must be portable      |

---

## Reading order for V1

```text
week 1   A Philosophy of Software Design · Effective TypeScript · OWASP Top 10 + API Top 10
week 2   Clean Architecture · Fundamentals of Software Architecture (ch. on trade-offs)
week 3   Unit Testing Principles (Khorikov) · Practical Test Pyramid
week 4   Refactoring catalog · Google Code Review guide · Conventional Comments
week 5   PostgreSQL docs (indexes, transactions, EXPLAIN) · Use The Index Luke
week 6   react.dev (Learn) · Next.js App Router docs · TanStack Query
week 7   Debugging 9 Rules · Node error handling · Release It (stability patterns)
week 8   Specification by Example · Writing Effective Use Cases
```

Each week: read → write `notes/<topic>.md` → extract rules → write the skill → run the
[behaviour test](../04-checklists/skill-authoring-checklist.md#8-behaviour-test-do-not-skip).

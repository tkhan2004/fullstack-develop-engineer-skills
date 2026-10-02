# Architecture Catalog

Status: draft

The framework ships architecture definitions as **data**, not as code branches. Each entry is
a directory under `architectures/` with a manifest, a skill, rules, a tree template and
examples — see [architecture-manifest.md](../02-specs/architecture-manifest.md).

> The framework documents trade-offs. It MUST NOT declare one architecture universally
> superior.

## Catalogue

| Style           |   V1    | Best fit                                                 | Main cost                                                                                |
| --------------- | :-----: | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `layered`       |   ✅    | CRUD-heavy services, small teams, familiar to everyone   | Business logic drifts into services-as-god-objects; horizontal changes touch every layer |
| `feature`       |   ✅    | Multiple independent domains, parallel teams             | Shared code placement is a recurring argument; cross-feature flows need a convention     |
| `clean`         |   ✅    | Domain-heavy, long-lived, testable core                  | Ceremony; many files per use case; over-abstraction risk                                 |
| `feature-clean` |   ✅    | Large domain-heavy apps with distinct bounded contexts   | Highest file count; needs discipline to avoid per-module divergence                      |
| `hexagonal`     | ⏳ V1.1 | Multiple inbound/outbound adapters (HTTP + queue + cron) | Port/adapter naming overhead for simple apps                                             |
| `custom`        |   ✅    | Any existing repo that matches none of the above         | No generated tree; rules are descriptive, not prescriptive                               |

`custom` is required in V1 — without it, `adopt` cannot be honest.

---

## layered

```text
src/
├── controllers/   services/      repositories/
├── models/        routes/        middlewares/
├── validators/    config/        app.ts
```

```text
Controller → Service → Repository → Database
```

Dependency rules:

```yaml
dependency_rules:
  controllers: { may_import: [services, validators, middlewares, models] }
  services: { may_import: [repositories, models] }
  repositories: { may_import: [models] }
  models: { may_import: [] }
```

Common failure modes the skill must catch: business logic in controllers; controllers calling
repositories directly; services importing `express` types.

---

## feature

```text
src/
├── modules/
│   ├── users/   user.controller.ts  user.service.ts  user.repository.ts  user.schema.ts
│   ├── orders/  …
│   └── auth/    …
├── shared/      infrastructure/     config/        app.ts
```

Rules: a module MUST NOT import another module's internals; cross-module communication goes
through the other module's public surface (`index.ts`) or an application-level service.
`shared/` MUST NOT contain domain-specific logic — that is the single most common decay.

---

## clean

```text
src/
├── domain/        entities/ value-objects/ repositories/ errors/
├── application/   use-cases/ dto/ services/
├── infrastructure/database/ repositories/ external-services/
├── presentation/  http/{controllers,routes,middleware,validators}
└── config/  main.ts
```

```yaml
dependency_rules:
  domain: { may_import: [] }
  application: { may_import: [domain] }
  presentation: { may_import: [application] }
  infrastructure: { may_import: [application, domain] }
```

Domain MUST NOT depend on Express, NestJS, Prisma, PostgreSQL, HTTP, or any framework type.
Infrastructure implements interfaces declared by inner layers (dependency inversion).

---

## feature-clean

```text
src/
├── modules/
│   ├── users/  domain/ application/ infrastructure/ presentation/
│   └── orders/ domain/ application/ infrastructure/ presentation/
├── shared/
└── main.ts
```

Clean's dependency rules apply **within** each module; modules are isolated from each other.
Appropriate for larger domain-heavy applications; overkill for a 6-endpoint service.

---

## hexagonal (V1.1)

```text
src/
├── domain/  application/
├── ports/   inbound/ outbound/
├── adapters/inbound/ outbound/
└── main.ts
```

Choose over `clean` when the same use case is driven by several inbound mechanisms
(HTTP, queue consumer, CLI, scheduler) or targets several interchangeable outbound systems.

---

## custom

No tree template. The manifest **describes** what exists:

```yaml
name: custom
source: detected
structure:
  root: src
  modules: { users: { path: src/users }, orders: { path: src/orders } }
  shared: [{ path: src/shared, role: utilities }]
rules:
  dependency_direction: existing
  observed:
    - "feature modules import src/shared (12 occurrences)"
    - "src/database imported directly by 4 modules"
```

Generated instructions are descriptive ("this project does X") rather than prescriptive
("you must do X"). `doctor` checks consistency against _observed_ rules, not ideal ones.

---

## Choosing (guidance the CLI may show)

```text
Few domains, mostly CRUD, small team            → layered
Several independent domains, parallel teams     → feature
Complex business rules, long-lived, high test   → clean
Both of the above at scale                      → feature-clean
Many inbound/outbound integrations              → hexagonal
Existing repo that matches none of these        → custom
```

Rule for the CLI: present trade-offs, pre-select a sensible default, never gate progress on
the "right" answer.

/** Test builders: a known-good base config plus small mutations. */

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export const newProject = (): Obj => ({
  version: 1,
  project: { mode: "new", name: "demo" },
  stack: {
    language: "typescript",
    package_manager: "pnpm",
    backend: { runtime: "node", framework: "express" },
    frontend: { framework: "nextjs" },
    database: { engine: "postgresql", orm: "prisma" },
    testing: { framework: "vitest" },
  },
  architecture: {
    backend: { style: "feature-clean", source: "selected", strictness: "standard" },
  },
});

export const existingProject = (): Obj => ({
  version: 1,
  project: { mode: "existing" },
  adoption: { strategy: "adopt", profile: ".engineering/project-profile.yaml" },
  stack: {
    language: "typescript",
    backend: { runtime: "node", framework: "express" },
    database: { engine: "postgresql", orm: "prisma" },
  },
  architecture: {
    backend: { style: "layered", source: "detected", confidence: 0.91, strictness: "observe" },
  },
});

export const customStyle = (): Obj => ({
  style: "custom",
  source: "detected",
  confidence: 0.55,
  strictness: "observe",
  custom: {
    root: "src",
    modules: { users: { path: "src/users" }, orders: { path: "src/orders" } },
    shared: [{ path: "src/shared", role: "utilities" }],
    rules: { dependency_direction: "existing", observed: ["feature modules import src/shared"] },
  },
});

export const migrating = (): Obj => {
  const config = existingProject();
  config["adoption"] = { strategy: "migrate" };
  config["architecture"].backend = {
    style: "layered",
    source: "confirmed",
    confidence: 0.72,
    strictness: "standard",
  };
  config["migration"] = {
    from: "layered",
    to: "feature-clean",
    strategy: "incremental",
    status: "planned",
    modules: [{ name: "users", status: "pending" }],
  };
  return config;
};

export function mutate(base: Obj, change: (draft: Obj) => void): Obj {
  const draft = structuredClone(base);
  change(draft);
  return draft;
}

import { claim, combineEvidence, type Claim, type Evidence } from "./claims.js";
import { isSourceFile, isTestFile, parseLooseJson, type Snapshot } from "./snapshot.js";

export interface PackageInfo {
  /** dependencies + devDependencies + peerDependencies, name → version range. */
  readonly dependencies: Readonly<Record<string, string>>;
  readonly raw: Readonly<Record<string, unknown>> | undefined;
}

export function readPackage(snapshot: Snapshot): PackageInfo {
  const raw = parseLooseJson(snapshot.text("package.json"));
  const dependencies: Record<string, string> = {};
  for (const key of ["dependencies", "devDependencies", "peerDependencies"]) {
    const block = raw?.[key];
    if (typeof block === "object" && block !== null) {
      for (const [name, version] of Object.entries(block)) dependencies[name] = String(version);
    }
  }
  return { dependencies, raw };
}

export interface StackDetection {
  readonly language?: Claim;
  readonly packageManager?: Claim;
  readonly runtime?: Claim;
  readonly backendFramework?: Claim;
  readonly frontendFramework?: Claim;
  readonly databaseEngine?: Claim;
  readonly orm?: Claim;
  readonly testFramework?: Claim;
}

interface Candidate {
  readonly value: string;
  readonly evidence: readonly Evidence[];
}

/** Highest-confidence candidate wins; the rest become alternatives. */
function pick(candidates: readonly Candidate[]): Claim | undefined {
  const scored = candidates
    .filter((c) => c.evidence.length > 0)
    .map((c) => ({ ...c, confidence: combineEvidence(c.evidence) }))
    .sort((a, b) => b.confidence - a.confidence || a.value.localeCompare(b.value));
  const [best, ...rest] = scored;
  if (!best) return undefined;
  return claim(
    best.value,
    best.evidence,
    rest.map((r) => ({ value: r.value, confidence: r.confidence })),
  );
}

const dep = (deps: PackageInfo["dependencies"], name: string, weight: number): Evidence[] =>
  name in deps
    ? [{ path: "package.json", detail: `dependency "${name}" ${deps[name]}`, weight }]
    : [];

const firstMatch = (snapshot: Snapshot, test: RegExp): string | undefined =>
  snapshot.find(test)[0]?.path;

const sourceTexts = (snapshot: Snapshot) =>
  snapshot.find((p) => isSourceFile(p) && !isTestFile(p)).filter((f) => f.text !== undefined);

function mentioning(snapshot: Snapshot, pattern: RegExp): string | undefined {
  return sourceTexts(snapshot).find((f) => pattern.test(f.text as string))?.path;
}

function detectLanguage(snapshot: Snapshot): Claim | undefined {
  const sources = snapshot.find((p) => isSourceFile(p));
  const ts = sources.filter((f) => /\.[cm]?tsx?$/.test(f.path)).length;
  const share = sources.length === 0 ? 0 : ts / sources.length;
  const tsconfig = snapshot.has("tsconfig.json");

  if (tsconfig || share >= 0.5) {
    const strict = parseLooseJson(snapshot.text("tsconfig.json"))?.["compilerOptions"];
    const strictFlag =
      typeof strict === "object" &&
      strict !== null &&
      (strict as Record<string, unknown>)["strict"] === true;
    const evidence: Evidence[] = [];
    if (tsconfig)
      evidence.push({
        path: "tsconfig.json",
        detail: strictFlag ? "strict: true" : "present",
        weight: 0.6,
      });
    if (sources.length > 0)
      evidence.push({
        path: "**/*.ts",
        detail: `${ts}/${sources.length} source files`,
        weight: share * 0.9,
      });
    return evidence.length > 0 ? claim("typescript", evidence) : undefined;
  }
  if (sources.length > 0) {
    return claim("javascript", [
      {
        path: "**/*.js",
        detail: `${sources.length - ts}/${sources.length} source files`,
        weight: (1 - share) * 0.9,
      },
      ...(snapshot.has("package.json")
        ? [{ path: "package.json", detail: "present, no tsconfig.json", weight: 0.3 }]
        : []),
    ]);
  }
  return undefined;
}

function detectPackageManager(snapshot: Snapshot, pkg: PackageInfo): Claim | undefined {
  const lockfiles: [string, string][] = [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["package-lock.json", "npm"],
    ["bun.lockb", "bun"],
    ["bun.lock", "bun"],
  ];
  const candidates = new Map<string, Evidence[]>();
  const add = (value: string, e: Evidence) =>
    candidates.set(value, [...(candidates.get(value) ?? []), e]);

  for (const [file, manager] of lockfiles)
    if (snapshot.has(file)) add(manager, { path: file, detail: "lockfile", weight: 0.9 });
  const declared = pkg.raw?.["packageManager"];
  if (typeof declared === "string")
    add(declared.split("@")[0] as string, {
      path: "package.json",
      detail: `packageManager "${declared}"`,
      weight: 0.9,
    });

  return pick([...candidates].map(([value, evidence]) => ({ value, evidence })));
}

function detectRuntime(snapshot: Snapshot, pkg: PackageInfo): Claim | undefined {
  if (!snapshot.has("package.json")) return undefined;
  const engines = pkg.raw?.["engines"];
  const evidence: Evidence[] = [
    { path: "package.json", detail: "Node package manifest", weight: 0.7 },
  ];
  if (typeof engines === "object" && engines !== null && "node" in engines) {
    evidence.push({
      path: "package.json",
      detail: `engines.node "${String((engines as Record<string, unknown>)["node"])}"`,
      weight: 0.5,
    });
  }
  evidence.push(...dep(pkg.dependencies, "@types/node", 0.4));
  return claim("node", evidence);
}

function detectBackend(snapshot: Snapshot, pkg: PackageInfo): Claim | undefined {
  const d = pkg.dependencies;
  const candidate = (
    value: string,
    depName: string,
    bootstrap: RegExp,
    bootstrapLabel: string,
  ): Candidate => {
    const evidence = dep(d, depName, 0.85);
    const file = evidence.length > 0 ? mentioning(snapshot, bootstrap) : undefined;
    if (file) evidence.push({ path: file, detail: bootstrapLabel, weight: 0.6 });
    return { value, evidence };
  };
  return pick([
    candidate("express", "express", /\bexpress\s*\(\s*\)/, "creates an express app"),
    candidate("nestjs", "@nestjs/core", /NestFactory\.create/, "bootstraps with NestFactory"),
    candidate("fastify", "fastify", /\b(?:Fastify|fastify)\s*\(/, "creates a fastify instance"),
  ]);
}

function detectFrontend(snapshot: Snapshot, pkg: PackageInfo): Claim | undefined {
  const d = pkg.dependencies;
  const next = dep(d, "next", 0.9);
  const nextConfig = firstMatch(snapshot, /^next\.config\.[cm]?[jt]s$/);
  if (next.length > 0 && nextConfig)
    next.push({ path: nextConfig, detail: "Next.js config", weight: 0.6 });

  const react = dep(d, "react", 0.8);
  const jsx = snapshot.find(/\.[jt]sx$/);
  if (react.length > 0 && jsx.length > 0)
    react.push({
      path: jsx[0]?.path as string,
      detail: `${jsx.length} JSX/TSX files`,
      weight: 0.4,
    });

  return pick([
    { value: "nextjs", evidence: next },
    { value: "react", evidence: next.length > 0 ? [] : react },
  ]);
}

function detectDatabase(snapshot: Snapshot, pkg: PackageInfo): { engine?: Claim; orm?: Claim } {
  const d = pkg.dependencies;
  const engines = new Map<string, Evidence[]>();
  const add = (value: string, e: Evidence | Evidence[]) =>
    engines.set(value, [...(engines.get(value) ?? []), ...(Array.isArray(e) ? e : [e])]);

  const schema = snapshot.find(/(?:^|\/)schema\.prisma$/)[0];
  const provider = /datasource\s+\w+\s*\{[^}]*provider\s*=\s*"(\w+)"/.exec(schema?.text ?? "")?.[1];
  const prismaEngine: Record<string, string> = {
    postgresql: "postgresql",
    postgres: "postgresql",
    mysql: "mysql",
    sqlite: "sqlite",
    mongodb: "mongodb",
  };
  if (schema && provider && prismaEngine[provider]) {
    add(prismaEngine[provider] as string, {
      path: schema.path,
      detail: `datasource provider "${provider}"`,
      weight: 0.95,
    });
  }
  for (const [name, engine] of [
    ["pg", "postgresql"],
    ["postgres", "postgresql"],
    ["mysql2", "mysql"],
    ["better-sqlite3", "sqlite"],
    ["sqlite3", "sqlite"],
    ["mongodb", "mongodb"],
    ["mongoose", "mongodb"],
  ] as const) {
    add(engine, dep(d, name, 0.85));
  }
  for (const file of snapshot.find(/(?:^|\/)docker-compose[^/]*\.ya?ml$/)) {
    for (const [pattern, engine] of [
      [/image:\s*["']?postgres/i, "postgresql"],
      [/image:\s*["']?mysql/i, "mysql"],
      [/image:\s*["']?mongo/i, "mongodb"],
    ] as const) {
      if (pattern.test(file.text ?? ""))
        add(engine, {
          path: file.path,
          detail: `compose service uses a ${engine} image`,
          weight: 0.8,
        });
    }
  }

  const orms = pick([
    {
      value: "prisma",
      evidence: [
        ...dep(d, "prisma", 0.8),
        ...dep(d, "@prisma/client", 0.95),
        ...(schema ? [{ path: schema.path, detail: "Prisma schema", weight: 0.9 }] : []),
      ],
    },
    { value: "drizzle", evidence: dep(d, "drizzle-orm", 0.95) },
    { value: "typeorm", evidence: dep(d, "typeorm", 0.95) },
  ]);

  const engine = pick([...engines].map(([value, evidence]) => ({ value, evidence })));
  return { ...(engine ? { engine } : {}), ...(orms ? { orm: orms } : {}) };
}

function detectTesting(snapshot: Snapshot, pkg: PackageInfo): Claim | undefined {
  const d = pkg.dependencies;
  const vitest = [...dep(d, "vitest", 0.85)];
  const vitestConfig = firstMatch(snapshot, /(?:^|\/)vitest\.config\.[cm]?[jt]s$/);
  if (vitestConfig) vitest.push({ path: vitestConfig, detail: "Vitest config", weight: 0.7 });

  const jest = [...dep(d, "jest", 0.85)];
  const jestConfig = firstMatch(snapshot, /(?:^|\/)jest\.config\.[cm]?[jt]s$/);
  if (jestConfig) jest.push({ path: jestConfig, detail: "Jest config", weight: 0.7 });
  if (pkg.raw && "jest" in pkg.raw)
    jest.push({ path: "package.json", detail: 'top-level "jest" key', weight: 0.7 });

  const nodeTest = snapshot
    .find((p) => isTestFile(p) && isSourceFile(p))
    .find((f) => /from\s+["']node:test["']/.test(f.text ?? ""));
  return pick([
    { value: "vitest", evidence: vitest },
    { value: "jest", evidence: jest },
    {
      value: "node:test",
      evidence: nodeTest
        ? [{ path: nodeTest.path, detail: 'imports "node:test"', weight: 0.9 }]
        : [],
    },
  ]);
}

export function detectStack(snapshot: Snapshot): StackDetection {
  const pkg = readPackage(snapshot);
  const database = detectDatabase(snapshot, pkg);
  const parts = {
    language: detectLanguage(snapshot),
    packageManager: detectPackageManager(snapshot, pkg),
    runtime: detectRuntime(snapshot, pkg),
    backendFramework: detectBackend(snapshot, pkg),
    frontendFramework: detectFrontend(snapshot, pkg),
    databaseEngine: database.engine,
    orm: database.orm,
    testFramework: detectTesting(snapshot, pkg),
  };
  return Object.fromEntries(
    Object.entries(parts).filter(([, v]) => v !== undefined),
  ) as StackDetection;
}

import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { loadManifests } from "@engineering-skills/architecture-engine";
import { runInit } from "../application/init/flow.js";
import { OptionError, parseInitOptions, type RawInitFlags } from "../application/init/options.js";
import { GENERATOR, type Context } from "../context.js";
import { resolveDataDir } from "../infrastructure/data-dir.js";

export const INIT_USAGE = `Usage: eng-skills init [options]

Configure a project. Asks what you are working with, then:
  new project       choose a stack and architecture; generates the directory structure
  existing project  analyses the repository first and adopts what is already there
                    (nothing is restructured unless you choose to migrate)

Nothing is written before the planned changes are shown and confirmed.

Options:
  --yes, -y               Non-interactive. Only accepts a detected architecture at 85%+
                          confidence; otherwise pass --architecture explicitly
  --dry-run               Show the planned changes and write nothing
  --force                 Replace an existing configuration
  --preset <name>         Start from a preset (pern-express, next-express, node-api)
  --mode <new|existing>   Skip the first question
  --strategy <adopt|recommend|migrate>   Existing projects (default: adopt)
  --migrate-to <style>    Target architecture when --strategy migrate
  --migration <incremental|full>
  --architecture <style>  layered | feature | clean | feature-clean | custom
  --strictness <observe|minimal|standard|strict>
  --language --backend --frontend --database --orm --testing <value>
  --adapters <list>       claude,codex,generic
  --modules <list>        Feature modules to scaffold (module-oriented architectures)
  --no-structure          Do not generate directories for a new project
  --name <name>           Project name
  --out <dir>             Configuration directory (default .engineering)
  --cwd <dir>             Project directory (default: current directory)
  -h, --help              Show this help
`;

const OPTIONS = {
  yes: { type: "boolean", short: "y" },
  "dry-run": { type: "boolean" },
  force: { type: "boolean" },
  structure: { type: "boolean" },
  preset: { type: "string" },
  mode: { type: "string" },
  strategy: { type: "string" },
  "migrate-to": { type: "string" },
  migration: { type: "string" },
  architecture: { type: "string" },
  strictness: { type: "string" },
  language: { type: "string" },
  backend: { type: "string" },
  frontend: { type: "string" },
  database: { type: "string" },
  orm: { type: "string" },
  testing: { type: "string" },
  adapters: { type: "string" },
  modules: { type: "string" },
  name: { type: "string" },
  out: { type: "string" },
  cwd: { type: "string" },
  help: { type: "boolean", short: "h" },
} as const;

export async function runInitCommand(argv: readonly string[], ctx: Context): Promise<number> {
  let values: RawInitFlags & { help?: boolean | undefined; cwd?: string | undefined };
  try {
    values = parseArgs({
      args: [...argv],
      strict: true,
      allowNegative: true,
      options: OPTIONS,
    }).values;
  } catch (cause) {
    ctx.err(`${(cause as Error).message}\n\n${INIT_USAGE}`);
    return 2;
  }
  if (values.help) {
    ctx.out(INIT_USAGE);
    return 0;
  }

  let options;
  try {
    options = parseInitOptions(values, resolve(ctx.cwd, values.cwd ?? "."));
  } catch (cause) {
    if (cause instanceof OptionError) {
      ctx.err(`${cause.message}\n`);
      return 2;
    }
    throw cause;
  }

  const dataDir = resolveDataDir(ctx.dataDir);
  const manifests = await loadManifests(resolve(dataDir, "architectures"));
  if (!manifests.ok) {
    ctx.err(`Could not load the architecture definitions:\n${manifests.error.join("\n")}\n`);
    return 3;
  }

  return runInit(options, {
    prompter: ctx.prompter,
    out: ctx.out,
    err: ctx.err,
    color: ctx.color,
    manifests: manifests.value,
    presetsDir: resolve(dataDir, "presets"),
    generator: GENERATOR,
  });
}

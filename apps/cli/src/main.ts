import { runAnalyze } from "./commands/analyze.js";
import { runGenerate } from "./commands/generate.js";
import { runInitCommand } from "./commands/init.js";
import { VERSION, type Context } from "./context.js";

export { VERSION };
export type { Context };

const USAGE = `eng-skills ${VERSION}

Usage: eng-skills <command> [options]

Commands:
  init       Configure a project: new (choose an architecture) or existing (adopt what is there)
  analyze    Analyse an existing repository (read-only) and write its project profile
  generate   Generate instruction files for your AI tools from the configuration

More commands arrive phase by phase (see docs/03-plan/roadmap.md).

Options:
  -h, --help       Show this help
  -v, --version    Show the version
`;

const COMMANDS: Readonly<
  Record<string, (argv: readonly string[], ctx: Context) => Promise<number>>
> = {
  init: runInitCommand,
  analyze: runAnalyze,
  generate: runGenerate,
};

/** Entry point with injected I/O so behaviour is testable without spawning a process. */
export async function main(argv: readonly string[], ctx: Context): Promise<number> {
  const [first, ...rest] = argv;
  if (first === "-v" || first === "--version") {
    ctx.out(`${VERSION}\n`);
    return 0;
  }
  if (first === undefined || first === "-h" || first === "--help") {
    ctx.out(USAGE);
    return 0;
  }
  const command = COMMANDS[first];
  if (!command) {
    ctx.err(`Unknown command "${first}". Run \`eng-skills --help\`.\n`);
    return 2;
  }
  return command(rest, ctx);
}

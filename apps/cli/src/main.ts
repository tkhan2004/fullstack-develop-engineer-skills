export interface Io {
  readonly out: (text: string) => void;
  readonly err: (text: string) => void;
}

export const VERSION = "0.0.0";

const USAGE = `eng-skills ${VERSION}

Usage: eng-skills <command> [options]

Commands are added phase by phase (see docs/03-plan/roadmap.md).

Options:
  -h, --help       Show this help
  -v, --version    Show the version
`;

/** Entry point with injected I/O so behaviour is testable without spawning a process. */
export function main(argv: readonly string[], io: Io): number {
  const [first] = argv;
  if (first === "-v" || first === "--version") {
    io.out(`${VERSION}\n`);
    return 0;
  }
  if (first === undefined || first === "-h" || first === "--help") {
    io.out(USAGE);
    return 0;
  }
  io.err(`Unknown command "${first}". Run \`eng-skills --help\`.\n`);
  return 2;
}

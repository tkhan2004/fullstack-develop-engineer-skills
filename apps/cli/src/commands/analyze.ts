import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { loadManifests } from "@engineering-skills/architecture-engine";
import {
  DEFAULT_PROFILE_PATH,
  analyzeRepository,
  writeProfile,
} from "@engineering-skills/detection";
import { GENERATOR, type Context } from "../context.js";
import { resolveDataDir } from "../infrastructure/data-dir.js";
import { renderReport } from "../presentation/report.js";

export const ANALYZE_USAGE = `Usage: eng-skills analyze [options]

Read-only analysis of an existing repository. Detects the stack, architecture and conventions
with confidence and evidence, and writes ${DEFAULT_PROFILE_PATH}. Nothing else is written.

Options:
  --json               Print the profile as JSON instead of the report
  --output <path>      Profile path, relative to the analysed directory
  --no-write           Analyse and report, but write no file
  --deterministic      Zero the timestamp and duration (reproducible output)
  --max-files <n>      Stop scanning after n files (default 20000)
  --cwd <dir>          Directory to analyse (default: current directory)
  -h, --help           Show this help
`;

export async function runAnalyze(argv: readonly string[], ctx: Context): Promise<number> {
  let values: ReturnType<typeof parse>["values"];
  try {
    values = parse(argv).values;
  } catch (cause) {
    ctx.err(`${(cause as Error).message}\n\n${ANALYZE_USAGE}`);
    return 2;
  }
  if (values.help) {
    ctx.out(ANALYZE_USAGE);
    return 0;
  }

  const maxFiles = values["max-files"] === undefined ? undefined : Number(values["max-files"]);
  if (maxFiles !== undefined && (!Number.isInteger(maxFiles) || maxFiles < 1)) {
    ctx.err(`--max-files must be a positive integer, got "${values["max-files"]}".\n`);
    return 2;
  }

  const root = resolve(ctx.cwd, values.cwd ?? ".");
  const manifests = await loadManifests(resolve(resolveDataDir(ctx.dataDir), "architectures"));
  if (!manifests.ok) {
    ctx.err(`Could not load the architecture definitions:\n${manifests.error.join("\n")}\n`);
    return 3;
  }

  const analysis = await analyzeRepository(root, {
    architectures: manifests.value,
    generator: GENERATOR,
    deterministic: values.deterministic ?? false,
    ...(maxFiles ? { scan: { maxFiles } } : {}),
  });

  let wrote: string | undefined;
  if (values.write !== false)
    wrote = await writeProfile(root, analysis.profile, values.output ?? DEFAULT_PROFILE_PATH);

  if (analysis.profile.generated.truncated) {
    ctx.err(
      `Warning: scanning stopped at the file limit; results may be incomplete (use --max-files).\n`,
    );
  }
  ctx.out(
    values.json
      ? `${JSON.stringify(analysis.profile, null, 2)}\n`
      : renderReport(analysis.profile, { color: ctx.color, wrote }),
  );
  return 0;
}

function parse(argv: readonly string[]) {
  return parseArgs({
    args: [...argv],
    strict: true,
    allowNegative: true,
    options: {
      json: { type: "boolean" },
      output: { type: "string" },
      write: { type: "boolean" },
      deterministic: { type: "boolean" },
      "max-files": { type: "string" },
      cwd: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
}

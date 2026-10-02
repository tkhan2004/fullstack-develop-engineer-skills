import { CONFIG_SCHEMA_VERSION, err, ok, type Result } from "@engineering-skills/core";
import { LineCounter, isMap, isNode, parseDocument, type Document } from "yaml";
import type { ConfigIssue } from "./issue.js";
import { lintConfig } from "./lint.js";
import { mapZodError } from "./map-issues.js";
import { configSchema, type EngineeringConfig } from "./schema.js";

export interface ParsedConfig {
  readonly config: EngineeringConfig;
  readonly warnings: readonly ConfigIssue[];
}

export type ConfigResult = Result<ParsedConfig, readonly ConfigIssue[]>;

const versionError = (version: unknown): ConfigIssue | undefined => {
  if (version === undefined)
    return { level: "error", path: "version", message: "Required field is missing" };
  if (typeof version === "number" && version > CONFIG_SCHEMA_VERSION) {
    return {
      level: "error",
      path: "version",
      message: `Config schema version ${version} is newer than this CLI supports (${CONFIG_SCHEMA_VERSION}). Upgrade @engineering-skills/cli.`,
    };
  }
  return undefined;
};

/** Validate an already-parsed value. */
export function parseConfig(input: unknown): ConfigResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return err([{ level: "error", path: "", message: "Configuration must be a YAML mapping" }]);
  }

  const early = versionError((input as Record<string, unknown>)["version"]);
  if (early) return err([early]);

  const result = configSchema.safeParse(input);
  if (!result.success) return err(mapZodError(result.error));
  return ok({ config: result.data, warnings: lintConfig(result.data) });
}

/** Find the 1-based line of a dotted path, falling back to the nearest existing ancestor. */
function lineOf(doc: Document.Parsed, lineCounter: LineCounter, path: string): number | undefined {
  const segments = path === "" ? [] : path.split(".");
  for (let end = segments.length; end >= 0; end--) {
    const node = end === 0 ? doc.contents : doc.getIn(segments.slice(0, end), true);
    if (isNode(node) && node.range) {
      return isMap(node) && end === 0 ? 1 : lineCounter.linePos(node.range[0]).line;
    }
  }
  return undefined;
}

/** Parse YAML text and validate it, attaching source line numbers to issues. */
export function parseConfigText(text: string): ConfigResult {
  const lineCounter = new LineCounter();
  const doc = parseDocument(text, { lineCounter, prettyErrors: false });

  if (doc.errors.length > 0) {
    return err(
      doc.errors.map((error) => ({
        level: "error" as const,
        path: "",
        message: `YAML syntax error: ${error.message.split("\n")[0] ?? error.message}`,
        line: error.linePos?.[0].line ?? 1,
      })),
    );
  }

  const result = parseConfig(doc.toJS());
  if (result.ok) return result;

  const withLines = result.error.map((issue) => {
    const line = lineOf(doc, lineCounter, issue.path);
    return line === undefined ? issue : { ...issue, line };
  });
  return err(withLines);
}

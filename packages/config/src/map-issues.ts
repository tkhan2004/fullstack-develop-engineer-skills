import type { ZodError, ZodIssue } from "zod";
import type { ConfigIssue } from "./issue.js";
import { suggest } from "./suggest.js";
import { UNKNOWN_KEY_PREFIX } from "./schema.js";

const LABELS: Record<string, string> = {
  style: "architecture",
  strictness: "strictness level",
  mode: "project mode",
  strategy: "strategy",
  engine: "database engine",
  orm: "ORM",
  framework: "framework",
  language: "language",
  adapters: "adapter",
};

const toPath = (segments: readonly (string | number)[]) => segments.join(".");

function label(segments: readonly (string | number)[]): string {
  // Array elements have numeric segments; name the field that owns them instead.
  const named = segments.filter((segment) => typeof segment === "string");
  const last = String(named[named.length - 1] ?? "value");
  return LABELS[last] ?? last;
}

function mapIssue(issue: ZodIssue): ConfigIssue {
  const path = toPath(issue.path);
  const base = { level: "error", path } as const;

  switch (issue.code) {
    case "invalid_enum_value": {
      const received = String(issue.received);
      const suggestion = suggest(received, issue.options.map(String));
      return {
        ...base,
        message: `Unknown ${label(issue.path)} "${received}"`,
        expected: issue.options.map(String),
        ...(suggestion ? { suggestion } : {}),
      };
    }
    case "unrecognized_keys": {
      if (issue.message.startsWith(UNKNOWN_KEY_PREFIX)) {
        const { key, valid, suggestion } = JSON.parse(
          issue.message.slice(UNKNOWN_KEY_PREFIX.length),
        ) as {
          key: string;
          valid: string[];
          suggestion?: string;
        };
        const where = path ? ` in "${path}"` : "";
        return {
          ...base,
          path: path ? `${path}.${key}` : key,
          message: `Unknown key "${key}"${where}`,
          expected: valid,
          ...(suggestion ? { suggestion } : {}),
        };
      }
      return { ...base, message: issue.message };
    }
    case "invalid_type":
      if (issue.received === "undefined") return { ...base, message: "Required field is missing" };
      return { ...base, message: `Expected ${issue.expected}, received ${issue.received}` };
    case "invalid_literal":
      return {
        ...base,
        message: `Expected ${JSON.stringify(issue.expected)}, received ${JSON.stringify(issue.received)}`,
      };
    default:
      return { ...base, message: issue.message };
  }
}

/** One config issue per Zod issue; unrecognized-keys with several keys are split. */
export function mapZodError(error: ZodError): ConfigIssue[] {
  return error.issues.flatMap((issue) => {
    if (
      issue.code === "unrecognized_keys" &&
      issue.keys.length > 1 &&
      issue.message.startsWith(UNKNOWN_KEY_PREFIX)
    ) {
      const { valid } = JSON.parse(issue.message.slice(UNKNOWN_KEY_PREFIX.length)) as {
        valid: string[];
      };
      return issue.keys.map((key) =>
        mapIssue({
          ...issue,
          keys: [key],
          message:
            UNKNOWN_KEY_PREFIX + JSON.stringify({ key, valid, suggestion: suggest(key, valid) }),
        }),
      );
    }
    return [mapIssue(issue)];
  });
}

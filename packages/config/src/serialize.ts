import { stringify } from "yaml";
import type { EngineeringConfig } from "./schema.js";

/**
 * Canonical YAML: key order follows the schema (Zod preserves shape order), LF endings,
 * trailing newline, no line folding. load → serialize is byte-stable.
 */
export function serializeConfig(config: EngineeringConfig): string {
  return stringify(config, { lineWidth: 0, sortMapEntries: false, indent: 2 });
}

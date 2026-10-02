import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Where the framework's data (architectures, presets, skills) lives.
 * Published build: `<dist>/data`, copied there by tsup. Development: the repository root.
 */
export function resolveDataDir(override?: string): string {
  if (override) return override;
  const here = dirname(fileURLToPath(import.meta.url));
  const bundled = join(here, "data");
  if (existsSync(join(bundled, "architectures"))) return bundled;
  return join(here, "..", "..", "..", "..");
}

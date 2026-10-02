import { lstat, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import ignore from "ignore";
import { createSnapshot, type Snapshot, type SnapshotFile } from "./snapshot.js";

/** Never descended into, regardless of .gitignore. */
export const ALWAYS_SKIPPED_DIRECTORIES: ReadonlySet<string> = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  ".cache",
  ".nuxt",
  ".svelte-kit",
  ".output",
  ".vercel",
]);

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".prisma",
  ".sql",
  ".md",
]);
const TEXT_BASENAMES = new Set([".env.example", "Dockerfile", ".editorconfig", ".nvmrc"]);

export interface ScanOptions {
  /** Stop after this many files (default 20 000). */
  readonly maxFiles?: number;
  /** Do not read files larger than this (default 256 KiB). */
  readonly maxFileBytes?: number;
}

const extensionOf = (name: string) => {
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "" : name.slice(dot);
};

/**
 * Read a directory into a snapshot. Respects the root .gitignore, skips build output and
 * dependencies, does not follow symlinks, and never executes anything.
 */
export async function scanDirectory(root: string, options: ScanOptions = {}): Promise<Snapshot> {
  const maxFiles = options.maxFiles ?? 20_000;
  const maxFileBytes = options.maxFileBytes ?? 256 * 1024;

  const matcher = ignore();
  try {
    matcher.add(await readFile(join(root, ".gitignore"), "utf8"));
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code !== "ENOENT") throw cause;
  }

  const files: SnapshotFile[] = [];
  let truncated = false;

  async function walk(relDir: string): Promise<void> {
    const entries = await readdir(join(root, relDir), { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (truncated) return;
      if (entry.isSymbolicLink()) continue;
      const rel = relDir === "" ? entry.name : `${relDir}/${entry.name}`;

      if (entry.isDirectory()) {
        if (ALWAYS_SKIPPED_DIRECTORIES.has(entry.name) || matcher.ignores(`${rel}/`)) continue;
        await walk(rel);
      } else if (entry.isFile()) {
        if (matcher.ignores(rel)) continue;
        if (files.length >= maxFiles) {
          truncated = true;
          return;
        }
        const { size } = await lstat(join(root, rel));
        const readable =
          size <= maxFileBytes &&
          (TEXT_EXTENSIONS.has(extensionOf(entry.name)) || TEXT_BASENAMES.has(entry.name));
        files.push({
          path: rel,
          size,
          text: readable ? await readFile(join(root, rel), "utf8") : undefined,
        });
      }
    }
  }

  await walk("");
  return createSnapshot(files, { truncated });
}

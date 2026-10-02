import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Absolute path of a synthetic repository under tests/fixtures/repos. */
export const fixturePath = (name: string) =>
  join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
    "tests",
    "fixtures",
    "repos",
    name,
  );

export const ARCHITECTURES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "architectures",
);

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, normalize } from "node:path";

/** A project-relative path that stays inside the project. */
function inside(root: string, path: string): string {
  if (isAbsolute(path) || normalize(path).startsWith(".."))
    throw new Error(`Refusing a path outside the project: ${path}`);
  return join(root, path);
}

/** Read a project-relative file; undefined when it does not exist. */
export const readProjectFile =
  (root: string) =>
  async (path: string): Promise<string | undefined> => {
    try {
      return await readFile(inside(root, path), "utf8");
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw cause;
    }
  };

/** Write via a temporary sibling and a rename, so a failure never leaves a half-written file. */
export async function writeAtomically(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.tmp-${process.pid}`;
  await writeFile(temp, content, "utf8");
  await rename(temp, path);
}

export const writeProjectFile = (root: string) => (path: string, content: string) =>
  writeAtomically(inside(root, path), content);

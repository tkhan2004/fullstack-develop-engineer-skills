import { execFile } from "node:child_process";
import { realpath } from "node:fs/promises";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * Short HEAD commit when `root` is itself the top level of a git repository, else undefined.
 * Runs only the git binary (never project code) and degrades silently without git.
 */
export async function readGitCommit(root: string): Promise<string | undefined> {
  try {
    const options = { cwd: root, timeout: 5000 };
    const [top, head] = await Promise.all([
      run("git", ["rev-parse", "--show-toplevel"], options),
      run("git", ["rev-parse", "--short=7", "HEAD"], options),
    ]);
    return (await realpath(top.stdout.trim())) === (await realpath(root))
      ? head.stdout.trim()
      : undefined;
  } catch {
    return undefined;
  }
}

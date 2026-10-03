import { main } from "./main.js";
import { clackPrompter } from "./infrastructure/clack-prompter.js";

const interactive = Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY);

process.exitCode = await main(process.argv.slice(2), {
  out: (text) => process.stdout.write(text),
  err: (text) => process.stderr.write(text),
  cwd: process.cwd(),
  color: Boolean(process.stdout.isTTY) && !process.env["NO_COLOR"],
  ...(interactive ? { prompter: clackPrompter } : {}),
});

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { err, type Result } from "@engineering-skills/core";
import type { ConfigIssue } from "./issue.js";
import { parseConfigText, type ParsedConfig } from "./parse.js";
import { serializeConfig } from "./serialize.js";
import type { EngineeringConfig } from "./schema.js";

export const DEFAULT_CONFIG_PATH = ".engineering/config.yaml";

export async function loadConfigFile(
  path: string,
): Promise<Result<ParsedConfig, readonly ConfigIssue[]>> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") {
      return err([
        {
          level: "error",
          path: "",
          message: `No configuration found at ${path}. Run \`eng-skills init\` to create one.`,
        },
      ]);
    }
    throw cause;
  }
  return parseConfigText(text);
}

export async function writeConfigFile(path: string, config: EngineeringConfig): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, serializeConfig(config), "utf8");
}

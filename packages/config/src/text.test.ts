import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { stringify } from "yaml";
import { formatIssues } from "./format.js";
import { customStyle, existingProject, migrating, mutate, newProject } from "./fixtures.js";
import { loadConfigFile, writeConfigFile } from "./io.js";
import { parseConfig, parseConfigText } from "./parse.js";
import { serializeConfig } from "./serialize.js";

const unwrap = (input: unknown) => {
  const result = parseConfig(input);
  if (!result.ok) throw new Error(formatIssues(result.error, "fixture"));
  return result.value.config;
};

describe("round trip", () => {
  const inputs = {
    new: newProject(),
    existing: existingProject(),
    custom: mutate(existingProject(), (c) => {
      c["architecture"].backend = customStyle();
    }),
    migrating: migrating(),
  };

  it.each(Object.entries(inputs))(
    "%s: serialize → parse → serialize is byte-identical",
    (_name, input) => {
      const first = serializeConfig(unwrap(input));
      const reparsed = parseConfigText(first);
      if (!reparsed.ok) throw new Error(formatIssues(reparsed.error, "round trip"));
      expect(serializeConfig(reparsed.value.config)).toBe(first);
    },
  );

  it("emits keys in schema order regardless of input order", () => {
    const scrambled = {
      architecture: newProject()["architecture"],
      stack: newProject()["stack"],
      project: newProject()["project"],
      version: 1,
    };
    const keys = Object.keys(unwrap(scrambled));
    expect(keys.indexOf("version")).toBeLessThan(keys.indexOf("project"));
    expect(keys.indexOf("project")).toBeLessThan(keys.indexOf("stack"));
    expect(keys.indexOf("stack")).toBeLessThan(keys.indexOf("architecture"));
  });

  it("ends with exactly one newline and uses LF", () => {
    const text = serializeConfig(unwrap(newProject()));
    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
    expect(text).not.toContain("\r");
  });
});

describe("parseConfigText", () => {
  it("reports YAML syntax errors with a line number", () => {
    const result = parseConfigText("version: 1\nproject: [unclosed\n");
    if (result.ok) throw new Error("expected failure");
    expect(result.error[0]?.message).toContain("YAML syntax error");
    expect(result.error[0]?.line).toBeGreaterThan(0);
  });

  it("attaches the line of the offending key", () => {
    const text = stringify(
      mutate(newProject(), (c) => {
        c["architecture"].backend.style = "clean-archtecture";
      }),
    );
    const result = parseConfigText(text);
    if (result.ok) throw new Error("expected failure");
    const issue = result.error.find((i) => i.path === "architecture.backend.style");
    expect(issue?.line).toBe(text.split("\n").findIndex((l) => l.includes("style:")) + 1);
  });

  it("falls back to the nearest existing ancestor for missing keys", () => {
    const text = stringify(
      mutate(existingProject(), (c) => {
        delete c["adoption"];
      }),
    );
    const result = parseConfigText(text);
    if (result.ok) throw new Error("expected failure");
    expect(result.error[0]?.path).toBe("adoption");
    expect(result.error[0]?.line).toBe(1);
  });

  it("produces the documented message layout", () => {
    const text = stringify(
      mutate(newProject(), (c) => {
        c["architecture"].backend.style = "clean-archtecture";
      }),
    );
    const result = parseConfigText(text);
    if (result.ok) throw new Error("expected failure");
    const rendered = formatIssues(result.error, ".engineering/config.yaml");
    expect(rendered).toContain("Invalid configuration: .engineering/config.yaml");
    expect(rendered).toContain('Unknown architecture "clean-archtecture"');
    expect(rendered).toContain(
      "Expected one of: layered, feature, clean, feature-clean, hexagonal, custom",
    );
    expect(rendered).toContain("Did you mean: clean");
    expect(rendered).toContain("1 error. No files were written.");
  });
});

describe("file I/O", () => {
  it("returns an actionable error when the config does not exist", async () => {
    const result = await loadConfigFile(join(tmpdir(), "definitely-missing", "config.yaml"));
    if (result.ok) throw new Error("expected failure");
    expect(result.error[0]?.message).toContain("eng-skills init");
  });

  it("writes and reloads a config", async () => {
    const dir = await mkdtemp(join(tmpdir(), "eng-skills-"));
    try {
      const path = join(dir, ".engineering", "config.yaml");
      const config = unwrap(newProject());
      await writeConfigFile(path, config);
      const reloaded = await loadConfigFile(path);
      if (!reloaded.ok) throw new Error("expected ok");
      expect(reloaded.value.config).toEqual(config);
      expect(await readFile(path, "utf8")).toBe(serializeConfig(config));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

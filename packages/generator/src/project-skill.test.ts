import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectGeneratedFile } from "@engineering-skills/adapters";
import { loadManifests } from "@engineering-skills/architecture-engine";
import { analyzeRepository, type Profile } from "@engineering-skills/detection";
import {
  createSkill,
  parseSkillManifest,
  validateSkillContract,
} from "@engineering-skills/skill-engine";
import { beforeAll, describe, expect, it } from "vitest";
import { PROJECT_SKILL_ID, renderProjectSkill } from "./project-skill.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const META = { version: "0.0.0", source: ".engineering/project-profile.yaml" };
const profiles: Record<string, Profile> = {};
const FIXTURES = [
  "express-layered-clean",
  "express-layered-violations",
  "clean-strict",
  "feature-clean",
  "nest-feature",
  "ambiguous-mixed",
];

beforeAll(async () => {
  const manifests = await loadManifests(join(repoRoot, "architectures"));
  if (!manifests.ok) throw new Error("manifests");
  for (const name of [...FIXTURES, "js-no-types", "empty"]) {
    profiles[name] = (
      await analyzeRepository(join(repoRoot, "tests", "fixtures", "repos", name), {
        architectures: manifests.value,
        generator: "t",
        deterministic: true,
        commit: undefined,
      })
    ).profile;
  }
});

function asSkill(profile: Profile) {
  const rendered = renderProjectSkill(profile, META);
  if (!rendered) throw new Error("no skill rendered");
  const manifest = parseSkillManifest(rendered.skillYaml, "skill.yaml");
  if (!manifest.ok) throw new Error(JSON.stringify(manifest.error));
  return {
    rendered,
    skill: createSkill(
      manifest.value,
      rendered.skillMd,
      "project",
      ".engineering/skills/conventions",
    ),
  };
}

describe("the generated project skill", () => {
  it.each(FIXTURES)("%s: satisfies the skill contract with no errors", (name) => {
    const { skill } = asSkill(profiles[name] as Profile);
    const problems = validateSkillContract(skill).filter((p) => p.level === "error");
    expect(problems, JSON.stringify(problems)).toEqual([]);
    expect(skill.manifest.id).toBe(PROJECT_SKILL_ID);
    expect(skill.manifest.category).toBe("project");
  });

  it("applies to existing projects only", () => {
    const { skill } = asSkill(profiles["express-layered-clean"] as Profile);
    expect(skill.manifest.applies_to).toEqual({ "project.mode": ["existing"] });
    expect(skill.manifest.priority).toBe(5);
  });

  it("turns observed conventions into rules a reviewer can check", () => {
    const { skill } = asSkill(profiles["express-layered-clean"] as Profile);
    const text = skill.body;
    expect(text).toContain("- Name files in kebab-case. (observed in 100%)");
    expect(text).toContain("- Put a test next to the code it tests. (observed in 100%)");
    expect(text).toContain(
      "- Throw the project's custom error class (AppError in src/utils/app-error.ts). (observed in 100%)",
    );
    expect(text).toContain("- Validate input at the boundary with zod. (observed in 100%)");
    expect(text).toContain("- Do not add a second validation library; the project uses zod.");
    expect(text).toContain("- Do not introduce promise chains.");
    expect(text).toContain("- Is new input validated with zod?");
  });

  it("points at reference modules that exist, never at a violating one", () => {
    const { skill } = asSkill(profiles["express-layered-violations"] as Profile);
    expect(skill.body).toContain("- service: `src/services/order.service.ts`");
    expect(skill.body).not.toContain("src/controllers/order.controller.ts");
  });

  it("uses framework terms for a NestJS project", () => {
    const { skill } = asSkill(profiles["nest-feature"] as Profile);
    expect(skill.body).toContain("Name test files `*.spec.*`.");
    expect(skill.body).toContain("class-validator");
  });

  it("leaves out conventions that are not consistent", () => {
    const base = profiles["express-layered-clean"] as Profile;
    const profile: Profile = {
      ...base,
      conventions: {
        ...base.conventions,
        naming: { files: { value: "kebab-case", ratio: 0.55, sample_size: 9, consistent: false } },
      },
    };
    const { skill } = asSkill(profile);
    expect(skill.body).not.toContain("Name files in kebab-case");
  });

  it("states the generic fallback when there is nothing to list", () => {
    const base = profiles["express-layered-clean"] as Profile;
    const profile: Profile = { ...base, conventions: { naming: {}, tests: {} } };
    const { skill } = asSkill(profile);
    expect(skill.body).toContain("- Mirror the nearest existing module.");
    expect(skill.body).toContain("- Does the change mirror the nearest existing module?");
  });

  it("is not generated when nothing consistent or exemplary was observed", () => {
    expect(renderProjectSkill(profiles["empty"] as Profile, META)).toBeUndefined();
  });

  it("is a generated file: pristine, deterministic, and detects a hand edit", () => {
    const { rendered } = asSkill(profiles["clean-strict"] as Profile);
    expect(inspectGeneratedFile(rendered.skillMd)).toBe("pristine");
    expect(renderProjectSkill(profiles["clean-strict"] as Profile, META)).toEqual(rendered);
    expect(inspectGeneratedFile(rendered.skillMd.replace("Keep new code", "Keep my code"))).toBe(
      "edited",
    );
  });

  it("does not use promotional or tool-specific phrasing", () => {
    const { skill } = asSkill(profiles["express-layered-clean"] as Profile);
    expect(skill.body).not.toMatch(/best practices|as an AI|as Claude/i);
  });
});

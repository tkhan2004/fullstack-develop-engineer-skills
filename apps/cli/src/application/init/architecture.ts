import type { ArchitectureManifest } from "@engineering-skills/architecture-engine";
import type { Layer } from "@engineering-skills/config";
import type { ArchitectureSource } from "@engineering-skills/core";
import type { Profile } from "@engineering-skills/detection";
import { displayName } from "../../presentation/names.js";
import type { Prompter } from "../prompter.js";
import { customBlockFromProfile } from "./answers.js";
import type { InitOptions } from "./options.js";

export interface ArchitectureDecision {
  readonly style: string;
  readonly source: ArchitectureSource;
  readonly confidence?: number;
  readonly custom?: Layer;
}

export type Decision =
  | { readonly ok: true; readonly decision: ArchitectureDecision }
  | { readonly ok: false; readonly code: 2 | 3; readonly message: string };

/** At or above this a detected architecture is presented for one-key confirmation. */
export const CONFIRM_THRESHOLD = 0.85;
/** Below this the structure is described instead of classified. */
export const CLASSIFY_THRESHOLD = 0.6;

const pct = (n: number) => `${Math.round(n * 100)}%`;

export const styleOptions = (manifests: readonly ArchitectureManifest[]) =>
  manifests.map((m) => ({
    value: m.name,
    label: displayName(m.name),
    hint: `cost: ${m.trade_offs.costs[0] ?? ""}`,
  }));

/** Why we will not proceed without asking, and exactly how to answer explicitly. */
function refuse(
  profile: Profile,
  manifests: readonly ArchitectureManifest[],
  found: string,
): Decision {
  const names = manifests.map((m) => m.name).join(" | ");
  return {
    ok: false,
    code: 3,
    message:
      `${found}\n` +
      `--yes will not guess an architecture. Re-run interactively, or choose explicitly:\n` +
      `  --architecture <${names}>   the style you know this project uses\n` +
      `  --architecture custom      describe the structure as it is (nothing is restructured)\n`,
  };
}

/**
 * Decide the architecture of an existing project from detection, asking only as much as the
 * confidence warrants (docs/01-concepts/project-mode.md §5). Never guesses non-interactively.
 */
export async function decideExistingArchitecture(input: {
  readonly profile: Profile;
  readonly options: InitOptions;
  readonly prompter: Prompter | undefined;
  readonly manifests: readonly ArchitectureManifest[];
}): Promise<Decision> {
  const { profile, options, prompter, manifests } = input;
  const detected = profile.architecture?.backend;
  const custom = (source: ArchitectureSource, confidence?: number): Decision => ({
    ok: true,
    decision: {
      style: "custom",
      source,
      ...(confidence === undefined ? {} : { confidence }),
      custom: customBlockFromProfile(profile),
    },
  });
  const named = new Set(manifests.map((m) => m.name));

  // An explicit choice always wins.
  if (options.architecture !== undefined) {
    if (options.architecture === "custom") return custom("manual");
    if (!named.has(options.architecture)) {
      return {
        ok: false,
        code: 2,
        message: `--architecture: unknown style "${options.architecture}". Expected one of: ${[...named].join(", ")}, custom.\n`,
      };
    }
    const agrees = detected?.value === options.architecture;
    return {
      ok: true,
      decision: {
        style: options.architecture,
        source: agrees ? "confirmed" : "manual",
        ...(agrees ? { confidence: detected.confidence } : {}),
      },
    };
  }

  const askManual = async (): Promise<Decision> => {
    const style = await (prompter as Prompter).select({
      id: "architecture-manual",
      message: "Which architecture does this project follow?",
      options: [
        ...styleOptions(manifests),
        { value: "custom", label: "Custom", hint: "describe the structure as it is" },
      ],
      initial: detected && detected.value !== "custom" ? detected.value : "custom",
    });
    return style === "custom"
      ? custom("manual")
      : { ok: true, decision: { style, source: "manual" } };
  };

  if (!detected) {
    const found = "No source root was found, so the architecture could not be detected.";
    if (!prompter || options.yes) return refuse(profile, manifests, found);
    return askManual();
  }

  const isNamed = detected.value !== "custom";

  if (isNamed && detected.confidence >= CONFIRM_THRESHOLD) {
    if (options.yes || !prompter) {
      return {
        ok: true,
        decision: { style: detected.value, source: "detected", confidence: detected.confidence },
      };
    }
    const accept = await prompter.confirm({
      id: "architecture-accept",
      message: `Detected ${displayName(detected.value)} architecture (${pct(detected.confidence)}). Use it?`,
      initial: true,
    });
    return accept
      ? {
          ok: true,
          decision: { style: detected.value, source: "detected", confidence: detected.confidence },
        }
      : askManual();
  }

  if (isNamed && detected.confidence >= CLASSIFY_THRESHOLD) {
    const found = `Detected ${displayName(detected.value)} at ${pct(detected.confidence)}: likely, but not certain.`;
    if (options.yes || !prompter) return refuse(profile, manifests, found);
    const ranked = [
      { value: detected.value, confidence: detected.confidence },
      ...(detected.alternatives ?? []).filter((a) => named.has(a.value)),
    ];
    const choice = await prompter.select({
      id: "architecture-choose",
      message: "Detected architecture:",
      options: [
        ...ranked.map((r) => ({
          value: r.value,
          label: `${displayName(r.value)}  ${pct(r.confidence)}`,
        })),
        { value: "custom", label: "Custom", hint: "keep the structure as it is" },
      ],
      initial: detected.value,
    });
    if (choice === "custom") return custom("manual");
    const picked = ranked.find((r) => r.value === choice);
    return {
      ok: true,
      decision: {
        style: choice,
        source: "confirmed",
        ...(picked ? { confidence: picked.confidence } : {}),
      },
    };
  }

  // Unclear: custom, or a named style below the classification threshold.
  const closest = (detected.alternatives ?? [])
    .filter((a) => named.has(a.value))
    .map((a) => `${displayName(a.value)} ${pct(a.confidence)}`)
    .join(", ");
  const found = `Architecture boundaries are not fully clear${closest ? ` (closest: ${closest})` : ""}.`;
  if (options.yes || !prompter) return refuse(profile, manifests, found);
  const choice = await prompter.select({
    id: "architecture-unclear",
    message: `${found} How would you like to proceed?`,
    options: [
      {
        value: "keep",
        label: "Keep detected structure",
        hint: "described as custom; nothing is restructured",
      },
      { value: "manual", label: "Define architecture manually" },
      {
        value: "analyze",
        label: "Let the AI analyse further",
        hint: "recorded as custom; the agent will study the repository",
      },
    ],
    initial: "keep",
  });
  return choice === "manual" ? askManual() : custom("detected", detected.confidence);
}

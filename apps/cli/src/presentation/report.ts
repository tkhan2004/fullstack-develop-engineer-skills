import type { Profile } from "@engineering-skills/detection";
import { displayName } from "./names.js";

export interface ReportOptions {
  readonly color: boolean;
  /** Path the profile was written to, if it was. */
  readonly wrote?: string | undefined;
}

const RULE = "─".repeat(28);
const pct = (n: number) => `${Math.round(n * 100)}%`;

type Claim = NonNullable<Profile["stack"]["language"]>;
type Conv = NonNullable<Profile["conventions"]["naming"]["variables"]>;

export function renderReport(profile: Profile, options: ReportOptions): string {
  const paint = (code: number, text: string) =>
    options.color ? `\u001b[${code}m${text}\u001b[0m` : text;
  const ok = (text: string) => `${paint(32, "✔")} ${text}`;
  const warn = (text: string) => `${paint(33, "⚠")} ${text}`;
  const dim = (text: string) => paint(2, text);
  const lines: string[] = [paint(1, "Engineering Project Analysis"), RULE, ""];

  const stackClaims: (Claim | undefined)[] = [
    profile.stack.language,
    profile.stack.backend?.runtime,
    profile.stack.backend?.framework,
    profile.stack.frontend?.framework,
    profile.stack.database?.engine,
    profile.stack.database?.orm,
    profile.stack.package_manager,
  ];
  lines.push(paint(1, "Stack"));
  const shown = stackClaims.filter((c): c is Claim => c !== undefined);
  if (shown.length === 0) lines.push(`  ${dim("nothing detected")}`);
  for (const c of shown)
    lines.push(`  ${ok(`${displayName(c.value).padEnd(24)} ${dim(pct(c.confidence))}`)}`);
  const tests = profile.stack.testing?.framework;
  lines.push("");

  const arch = profile.architecture?.backend;
  lines.push(paint(1, "Architecture"));
  if (!arch) {
    lines.push(`  ${dim("no source root found")}`);
  } else if (arch.value === "custom") {
    lines.push(
      `  ${warn(`${displayName(arch.value)}  ${dim(`confidence ${pct(arch.confidence)}`)}`)}`,
    );
    lines.push(`    ${warn("Architecture boundaries are not fully clear.")}`);
    for (const alt of arch.alternatives ?? [])
      lines.push(`    ${dim(`closest: ${displayName(alt.value)} ${pct(alt.confidence)}`)}`);
    const dirs = arch.structure?.directories
      .map((d) => d.path.replace(`${arch.structure?.root}/`, ""))
      .join(", ");
    if (dirs) lines.push(`    ${dim(`structure: ${dirs}`)}`);
  } else {
    lines.push(
      `  ${ok(`${displayName(arch.value).padEnd(24)} ${dim(`confidence ${pct(arch.confidence)}`)}`)}`,
    );
    for (const e of arch.evidence.slice(0, 5)) lines.push(`    ${dim(`${e.path}: ${e.detail}`)}`);
    for (const alt of (arch.alternatives ?? []).slice(0, 2))
      lines.push(`    ${dim(`also considered: ${displayName(alt.value)} ${pct(alt.confidence)}`)}`);
  }
  lines.push("");

  lines.push(paint(1, "Testing"));
  if (tests) lines.push(`  ${ok(displayName(tests.value))}`);
  if (profile.maturity.testing === "missing") lines.push(`  ${warn("No tests detected")}`);
  else if (profile.maturity.testing === "partial")
    lines.push(`  ${warn("Integration tests limited")}`);
  else if (!tests) lines.push(`  ${ok("Tests present")}`);
  lines.push("");

  const conv = profile.conventions;
  const rows: [string, Conv | undefined][] = [
    ["Variable naming", conv.naming.variables],
    ["File naming", conv.naming.files],
    ["Class naming", conv.naming.classes],
    ["Test placement", conv.tests.placement],
    ["Error handling", conv.errors?.strategy],
    ["Validation", conv.validation?.library],
    ["Imports", conv.imports?.style],
    ["Exports", conv.exports?.style],
    ["Async style", conv.async?.style],
  ];
  const known = rows.filter(([, c]) => c !== undefined) as [
    string,
    { value: string; ratio: number; consistent?: false },
  ][];
  lines.push(paint(1, "Conventions"));
  if (known.length === 0) lines.push(`  ${dim("none detected")}`);
  for (const [label, c] of known) {
    const text = `${label.padEnd(16)} ${displayName(c.value)} ${dim(`(${pct(c.ratio)})`)}`;
    lines.push(`  ${c.consistent === false ? warn(`${text} ${dim("inconsistent")}`) : ok(text)}`);
  }
  lines.push("");

  if (profile.observations.length > 0) {
    lines.push(paint(1, "Observations"));
    for (const o of profile.observations) {
      lines.push(
        `  ${o.severity === "warning" ? warn(`${o.count}× ${o.detail}`) : `${dim("·")} ${o.count}× ${o.detail}`}`,
      );
      for (const location of o.locations.slice(0, 3)) lines.push(`      ${dim(location)}`);
      if (o.locations.length > 3) lines.push(`      ${dim(`… and ${o.count - 3} more`)}`);
    }
    lines.push("");
  }

  lines.push(paint(1, "Engineering maturity"), RULE);
  for (const [area, value] of Object.entries(profile.maturity)) {
    lines.push(
      `${(area.charAt(0).toUpperCase() + area.slice(1) + ":").padEnd(16)} ${value.charAt(0).toUpperCase() + value.slice(1)}`,
    );
  }
  if (profile.gaps.length > 0) {
    lines.push("", paint(1, "Gaps"));
    for (const g of profile.gaps) lines.push(`  ${warn(`${g.area}: ${g.detail}`)}`);
  }
  if (profile.reference_modules.length > 0) {
    lines.push("", paint(1, "Reference modules"));
    for (const r of profile.reference_modules) lines.push(`  ${r.concern.padEnd(11)} ${r.path}`);
  }
  if (options.wrote) lines.push("", `Generated: ${options.wrote}`);
  else lines.push("", dim("No files were written."));
  return `${lines.join("\n")}\n`;
}

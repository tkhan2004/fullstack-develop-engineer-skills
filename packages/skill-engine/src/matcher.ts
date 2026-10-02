export type PatternValue = string | number | boolean;

/** Read a dotted path (`stack.backend.framework`) from a config-shaped value. */
export function lookup(source: unknown, path: string): unknown {
  let current = source;
  for (const key of path.split(".")) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Does `actual` satisfy a list of accepted values?
 * - exact match (compared as strings, so `true` matches `true`)
 * - `"*"` matches any present value
 * - `"!value"` rejects that value; an absent value passes a negation-only list
 * Nothing more: a query language here would be over-engineering.
 */
export function matchesPatterns(actual: unknown, patterns: readonly PatternValue[]): boolean {
  const text = actual === undefined || actual === null ? undefined : String(actual);
  const negated = patterns.flatMap((p) =>
    typeof p === "string" && p.startsWith("!") ? [p.slice(1)] : [],
  );
  const positive = patterns
    .filter((p) => !(typeof p === "string" && p.startsWith("!")))
    .map(String);

  if (text !== undefined && negated.includes(text)) return false;
  if (positive.length === 0) return true;
  if (text === undefined) return false;
  return positive.some((p) => p === "*" || p === text);
}

/**
 * Evaluate an `applies_to` block (all keys must match). Returns the reason the skill was
 * selected (`stack.backend.framework=express`), or undefined when it does not apply.
 */
export function matchAppliesTo(
  appliesTo: Readonly<Record<string, readonly PatternValue[]>>,
  config: unknown,
): string | undefined {
  const keys = Object.keys(appliesTo).sort();
  for (const key of keys) {
    if (!matchesPatterns(lookup(config, key), appliesTo[key] ?? [])) return undefined;
  }
  const first = keys[0];
  return first === undefined ? undefined : `${first}=${String(lookup(config, first) ?? "(unset)")}`;
}

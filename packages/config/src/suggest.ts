/** "Did you mean" support for actionable validation errors. */

export function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0] as number;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = prev[j] as number;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      prev[j] = Math.min(above + 1, (prev[j - 1] as number) + 1, diagonal + cost);
      diagonal = above;
    }
  }
  return prev[b.length] as number;
}

/**
 * Closest valid option, or undefined if nothing is plausibly what the user meant.
 * Matches by small edit distance, or by the longest option that the input extends with a
 * separator ("clean-archtecture" → "clean").
 */
export function suggest(received: string, options: readonly string[]): string | undefined {
  const needle = received.toLowerCase();

  const byDistance = options
    .map((option) => ({ option, distance: editDistance(needle, option.toLowerCase()) }))
    .sort((x, y) => x.distance - y.distance)[0];
  if (byDistance && byDistance.distance <= 2) return byDistance.option;

  const prefixes = options
    .filter(
      (option) =>
        needle.startsWith(`${option.toLowerCase()}-`) ||
        needle.startsWith(`${option.toLowerCase()}_`),
    )
    .sort((x, y) => y.length - x.length);
  return prefixes[0];
}

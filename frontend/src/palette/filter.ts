/**
 * Subsequence matching with a light preference for matches that start a word
 * and for runs of adjacent characters, so "sa" ranks "Save" above "Save As".
 */
export function score(query: string, text: string): number | null {
  if (!query) return 0;

  const q = query.toLowerCase();
  const t = text.toLowerCase();

  let ti = 0;
  let total = 0;
  let run = 0;

  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found === -1) return null;

    const startsWord = found === 0 || /[\s\-_/.]/.test(t[found - 1]!);
    run = found === ti ? run + 1 : 0;

    total += 1 + run * 2 + (startsWord ? 3 : 0) - Math.min(found - ti, 6) * 0.1;
    ti = found + 1;
  }

  // Shorter titles win ties, so exact-ish matches float to the top.
  return total - text.length * 0.01;
}

export type Scored<T> = { item: T; score: number };

export function rank<T>(
  query: string,
  items: T[],
  textOf: (item: T) => string,
): T[] {
  const scored: Scored<T>[] = [];
  items.forEach((item) => {
    const s = score(query, textOf(item));
    if (s !== null) scored.push({ item, score: s });
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}

export type SharedStemEntry = {
  staffIndex: number;
  entryIndex: number;
  /** The element's own `id`, or null. */
  id: string | null;
  sharedStemFor: string | null;
};

export type SharedStemPair = {
  a: { staffIndex: number; entryIndex: number };
  b: { staffIndex: number; entryIndex: number };
};

export type SharedStemResolution = {
  pairs: SharedStemPair[];
  warnings: string[];
};

/**
 * Pairs the two ends of each `shared-stem-for` — both hands occasionally
 * playing the same beat simultaneously in otherwise single-part writing,
 * joined by one real stem instead of each drawing its own. Same `id`-lookup
 * shape as `rules/arpeggioRules.ts#resolveArpeggioSpans` (pure,
 * unit-testable, since jsdom's ResizeObserver polyfill never fires, so
 * measure.ts's real render path only executes in browser tests).
 *
 * A pair is formed only by an explicit `shared-stem-for="<id>"` matching
 * another element's `id`; two elements with no such reference never join.
 * Each element is an endpoint of at most one pair — a `shared-stem-for`
 * that references an element already paired is rejected so a stem never
 * branches from a shared notehead. Any failure produces a warning and no
 * pair — both elements then keep drawing their own local stem.
 */
export function resolveSharedStemPairs(
  entries: readonly SharedStemEntry[]
): SharedStemResolution {
  const warnings: string[] = [];
  const pairs: SharedStemPair[] = [];
  const byId = new Map<string, SharedStemEntry>();
  for (const entry of entries) {
    if (entry.id !== null) {
      byId.set(entry.id, entry);
    }
  }
  const paired = new Set<SharedStemEntry>();

  for (const entry of entries) {
    if (entry.sharedStemFor === null) {
      continue;
    }
    const other = byId.get(entry.sharedStemFor);
    if (!other || other === entry) {
      warnings.push(
        `shared-stem-for="${entry.sharedStemFor}" matches no other element; drawing its own local stem instead`
      );
      continue;
    }
    if (paired.has(other) || paired.has(entry)) {
      warnings.push(
        `shared-stem-for="${entry.sharedStemFor}" reuses an element already paired with another shared stem; drawing its own local stem instead`
      );
      continue;
    }
    if (other.staffIndex === entry.staffIndex) {
      warnings.push(
        `shared-stem-for="${entry.sharedStemFor}" points to an element on the same staff; a shared stem joins two staves`
      );
      continue;
    }
    pairs.push({
      a: { staffIndex: entry.staffIndex, entryIndex: entry.entryIndex },
      b: { staffIndex: other.staffIndex, entryIndex: other.entryIndex },
    });
    paired.add(entry);
    paired.add(other);
  }

  return { pairs, warnings };
}

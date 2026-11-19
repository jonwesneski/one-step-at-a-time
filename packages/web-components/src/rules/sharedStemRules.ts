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
 * Pairs the two ends of each `shared-stem-for="<id>"`. Each element ends at
 * most one pair, so a reference to an already-paired element is rejected. A
 * failure warns and both elements keep their own stems.
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

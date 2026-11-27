import { StaffGroupType } from '../types/theory';

export type StaffGroupEntry = {
  group: StaffGroupType | null;
  groupId: string | null;
};

export type StaffGroupSpan = {
  // Index of the first staff in the span within the measure's staff children.
  index: number;
  // Number of consecutive staves the connector joins: one for a bracket around
  // one instrument, otherwise at least two.
  count: number;
  group: StaffGroupType;
};

export type StaffGroupResolution = {
  groups: StaffGroupSpan[];
  warnings: string[];
};

/**
 * The gaps, as upper and lower staff index, that barlines run through: between
 * the staves of a group, but not between two vocal staves, where lyrics stand.
 */
export function connectedBarlineGaps(
  groups: readonly StaffGroupSpan[],
  isVocal: readonly boolean[]
): [number, number][] {
  return groups.flatMap(({ index, count }) =>
    Array.from({ length: count - 1 }, (_, i): [number, number] => [
      index + i,
      index + i + 1,
    ]).filter(([upper, lower]) => !(isVocal[upper] && isVocal[lower]))
  );
}

// Resolves which staves should be joined by a brace/bracket connector.
//
// group="grand" always pairs positionally with the immediate next sibling
// (groupId is ignored) — a warning with no span is produced if there's no
// next sibling, or if that sibling also declares its own group (ambiguous;
// the sibling's own turn is still evaluated separately so one bad pairing
// doesn't cascade). group="bracket" either shares a groupId across a
// contiguous run (the same groupId reappearing in a second non-contiguous run
// is a warning for that second run), or with no groupId pairs positionally
// like group="grand". A bracket that joins no other staff (a run of one, no
// next sibling, or a next sibling with its own group) encloses its staff
// alone; a brace always joins two staves of one instrument.
export function resolveStaffGroups(
  entries: StaffGroupEntry[]
): StaffGroupResolution {
  const groups: StaffGroupSpan[] = [];
  const warnings: string[] = [];
  const closedGroupIds = new Set<string>();

  let i = 0;
  while (i < entries.length) {
    const { group, groupId } = entries[i];

    if (!group) {
      i++;
      continue;
    }

    if (group === 'bracket' && groupId) {
      let j = i + 1;
      while (
        j < entries.length &&
        entries[j].group === 'bracket' &&
        entries[j].groupId === groupId
      ) {
        j++;
      }
      const count = j - i;

      if (closedGroupIds.has(groupId)) {
        warnings.push(
          `staff with group="bracket" group-id="${groupId}" reappears in a separate, non-contiguous run; skipping connector`
        );
      } else {
        groups.push({ index: i, count, group: 'bracket' });
      }

      closedGroupIds.add(groupId);
      i = j;
      continue;
    }

    // Positional pairing: `group="grand"`, or `group="bracket"` with no
    // `groupId`.
    if (
      group === 'bracket' &&
      (i + 1 >= entries.length || entries[i + 1].group)
    ) {
      groups.push({ index: i, count: 1, group });
      i++;
      continue;
    }

    if (i + 1 >= entries.length) {
      warnings.push(
        `staff with group="${group}" has no next sibling to pair with; skipping connector`
      );
      i++;
      continue;
    }

    const next = entries[i + 1];
    if (next.group) {
      warnings.push(
        `staff with group="${group}" is followed by a staff that also declares group="${next.group}"; ambiguous pairing (the second staff should not set its own group), skipping connector`
      );
      i++;
      continue;
    }

    groups.push({ index: i, count: 2, group });
    i++;
  }

  return { groups, warnings };
}

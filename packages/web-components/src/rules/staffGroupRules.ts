import { StaffGroupType } from '../types/theory';

export type StaffGroupPair = {
  // Index of the first staff in the pair within the measure's staff children.
  // The second staff is always at `index + 1`.
  index: number;
  group: StaffGroupType;
};

export type StaffGroupResolution = {
  pairs: StaffGroupPair[];
  warnings: string[];
};

/**
 * Resolves which staves should be joined by a brace/bracket connector.
 * Membership is always implicit: a staff with `group` set pairs with its
 * immediate next sibling — no shared name needed.
 *
 * - A grouped staff with no next sibling produces a warning, no pair.
 * - A grouped staff whose next sibling also declares `group` produces a
 *   warning, no pair — ambiguous (the second staff is trying to start its
 *   own pairing before the first one completed). The next sibling's own
 *   attempt is still evaluated on its own turn, so one bad pairing doesn't
 *   cascade-fail the rest of the measure.
 */
export function resolveStaffGroupPairs(
  groups: (StaffGroupType | null)[]
): StaffGroupResolution {
  const pairs: StaffGroupPair[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < groups.length; i++) {
    const groupValue = groups[i];
    if (!groupValue) {
      continue;
    }

    if (i + 1 >= groups.length) {
      warnings.push(
        `staff with group="${groupValue}" has no next sibling to pair with; skipping connector`
      );
      continue;
    }

    const nextGroupValue = groups[i + 1];
    if (nextGroupValue) {
      warnings.push(
        `staff with group="${groupValue}" is followed by a staff that also declares group="${nextGroupValue}"; ambiguous pairing (the second staff should not set its own group), skipping connector`
      );
      continue;
    }

    pairs.push({ index: i, group: groupValue });
  }

  return { pairs, warnings };
}

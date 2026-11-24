import {
  BREATH_MARK_INK_GAP_PX,
  BREATH_MARK_STAFF_GAP_PX,
} from '../utils/notationDimensions';

/**
 * A breath mark sits in the gap after its note: centred between the note's
 * right edge (dots included) and the next entry's left edge, or the end of
 * the bar.
 */
export function breathMarkCenterX({
  noteRightX,
  nextLeftX,
}: {
  noteRightX: number;
  nextLeftX: number;
}): number {
  return (noteRightX + Math.max(noteRightX, nextLeftX)) / 2;
}

/**
 * A breath mark's bottom edge: just above the stave, or above any ink under
 * it (a high note, a beam across the gap, a label, a bracket).
 */
export function breathMarkBottomY({
  staffTopLineY,
  inkTopYs,
}: {
  staffTopLineY: number;
  inkTopYs: readonly (number | null)[];
}): number {
  let bottom = staffTopLineY - BREATH_MARK_STAFF_GAP_PX;
  for (const inkTopY of inkTopYs) {
    if (inkTopY !== null) {
      bottom = Math.min(bottom, inkTopY - BREATH_MARK_INK_GAP_PX);
    }
  }
  return bottom;
}

/**
 * The indices with a breath mark that a slur carries on past: a slur's start
 * or any note inside it. A slur is complete legato and a breath mark a break
 * in the sound, so the two contradict; at the slur's end a breath is fine.
 */
export function breathMarkIndicesInsideSlurs(
  hasBreathMark: readonly boolean[],
  slurs: readonly { startIndex: number; endIndex: number }[]
): number[] {
  const inside = new Set<number>();
  for (const { startIndex, endIndex } of slurs) {
    for (
      let i = Math.min(startIndex, endIndex);
      i < Math.max(startIndex, endIndex);
      i++
    ) {
      if (hasBreathMark[i]) {
        inside.add(i);
      }
    }
  }
  return [...inside].sort((a, b) => a - b);
}

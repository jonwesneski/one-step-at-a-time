import { STAFF_Y_STEP } from '../utils/notationDimensions';
import {
  ADJACENT_NOTE_X_DISPLACEMENT_PX,
  NOTEHEAD_WIDTH_PX,
} from '../utils/svgCreator/note';

export type NoteDisplacement = {
  noteIndex: number;
  xOffset: number;
};

/** Left and right edges (px) of a head in its undisplaced place. */
export type HeadExtent = { left: number; right: number };

/**
 * How far right (px) a head a step from another moves to stand beside it: to
 * where the other one ends, two ellipses overlapping by the stem between them.
 */
export function adjacentHeadOffset(
  left: HeadExtent,
  right: HeadExtent
): number {
  return Math.max(
    ADJACENT_NOTE_X_DISPLACEMENT_PX,
    left.right -
      right.left -
      (NOTEHEAD_WIDTH_PX - ADJACENT_NOTE_X_DISPLACEMENT_PX)
  );
}

/**
 * Compute which notes in a chord need to be displaced horizontally to avoid
 * notehead overlap when adjacent notes (one diatonic step apart) share a stem.
 *
 * Scan from the stem note outward. If note[i] is adjacent to note[i-1] AND
 * note[i-1] was not displaced → displace note[i]. Produces the alternating
 * pattern: C(normal)→D(displaced)→E(normal)→F(displaced).
 *
 * Stem-up: displaced notes shift right. Stem-down: left. Each clears the
 * undisplaced heads a step from it; without `headExtents`, by an ellipse's
 * width.
 */
export function computeAdjacentDisplacements(
  staffYCoordinates: readonly number[],
  stemUp: boolean,
  headExtents: readonly HeadExtent[] = []
): NoteDisplacement[] {
  if (staffYCoordinates.length <= 1) {
    return [];
  }

  // Sort indices: stem-up → descending Y (largest first = lowest pitch = stem note first)
  //               stem-down → ascending Y (smallest first = highest pitch = stem note first)
  const indices = Array.from({ length: staffYCoordinates.length }, (_, i) => i);
  indices.sort((a, b) =>
    stemUp
      ? staffYCoordinates[b] - staffYCoordinates[a]
      : staffYCoordinates[a] - staffYCoordinates[b]
  );

  const isAdjacent = (a: number, b: number): boolean =>
    Math.abs(staffYCoordinates[a] - staffYCoordinates[b]) === STAFF_Y_STEP;
  const displaced = new Set<number>();
  for (let i = 1; i < indices.length; i++) {
    if (
      isAdjacent(indices[i], indices[i - 1]) &&
      !displaced.has(indices[i - 1])
    ) {
      displaced.add(indices[i]);
    }
  }

  return indices
    .filter((index) => displaced.has(index))
    .map((noteIndex) => {
      const own = headExtents[noteIndex];
      const offsets = indices
        .filter(
          (other) => !displaced.has(other) && isAdjacent(other, noteIndex)
        )
        .map((other) => {
          const beside = headExtents[other];
          if (!own || !beside) {
            return ADJACENT_NOTE_X_DISPLACEMENT_PX;
          }
          return stemUp
            ? adjacentHeadOffset(beside, own)
            : adjacentHeadOffset(own, beside);
        });
      const offset = Math.max(ADJACENT_NOTE_X_DISPLACEMENT_PX, ...offsets);
      return { noteIndex, xOffset: stemUp ? offset : -offset };
    });
}

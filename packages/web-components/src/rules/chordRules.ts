import { ADJACENT_NOTE_X_DISPLACEMENT_PX } from '../utils/svgCreator/note';
import { STAFF_Y_STEP } from '../utils/notationDimensions';

export type NoteDisplacement = {
  noteIndex: number;
  xOffset: number;
};

/**
 * Compute which notes in a chord need to be displaced horizontally to avoid
 * notehead overlap when adjacent notes (one diatonic step apart) share a stem.
 *
 * Scan from the stem note outward. If note[i] is adjacent to note[i-1] AND
 * note[i-1] was not displaced → displace note[i]. Produces the alternating
 * pattern: C(normal)→D(displaced)→E(normal)→F(displaced).
 *
 * Stem-up: displaced note shifts right (+8px). Stem-down: left (-8px).
 */
export function computeAdjacentDisplacements(
  staffYCoordinates: number[],
  stemUp: boolean
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

  const displacements: NoteDisplacement[] = [];
  const xOffset = stemUp
    ? ADJACENT_NOTE_X_DISPLACEMENT_PX
    : -ADJACENT_NOTE_X_DISPLACEMENT_PX;

  let prevWasDisplaced = false;
  for (let i = 1; i < indices.length; i++) {
    const prevY = staffYCoordinates[indices[i - 1]];
    const currY = staffYCoordinates[indices[i]];
    const isAdjacent = Math.abs(currY - prevY) === STAFF_Y_STEP;

    if (isAdjacent && !prevWasDisplaced) {
      displacements.push({ noteIndex: indices[i], xOffset });
      prevWasDisplaced = true;
    } else {
      prevWasDisplaced = false;
    }
  }

  return displacements;
}

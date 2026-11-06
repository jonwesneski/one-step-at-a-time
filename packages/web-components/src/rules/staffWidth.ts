import {
  AVG_LYRIC_CHAR_WIDTH_PX,
  LEADING_NOTE_GAP_PX,
  MIN_NOTE_WIDTH,
} from '../utils/notationDimensions';
import { NOTE_SVG_WIDTH } from '../utils/svgCreator/note';

/**
 * Sizing of the staff/measure box itself — the min and preferred widths that
 * feed <music-measure>'s flex. Where each entry sits *within* that width is
 * rules/spacingRules.ts.
 *
 * Every staff reports two widths:
 *  - a strut min width — the collision floor, becomes the measure's CSS min-width
 *    so noteheads never overlap however narrow the container gets;
 *  - a natural width — strut plus the total beat-proportional slack the entries
 *    want, becomes the measure's flex-basis and flex-grow (kept equal) so
 *    measures on a row share width in proportion to their musical content.
 */

/**
 * What a staff's strut min width and natural width were summed from, for its
 * widest voice. A vocal staff re-scores these against its lyrics.
 */
export type StaffStrutInputs = {
  noteCount: number;
  firstElementLeftwardWidth: number;
  extraLeftwardWidth: number;
  clefChangeWidth: number;
  extraRightwardWidth: number;
  totalSlackWeight: number;
};

/**
 * Smallest distance (px) between one entry's x and the next's, however narrow
 * the staff. An entry reaching left of its own box, or following one that
 * reserves room to its right, has to clear the previous entry's whole box;
 * anything else may tuck under it, down to MIN_NOTE_WIDTH.
 */
export function computeMinimumEntryAdvance(
  tailFollowerRoom: number,
  leftwardWidth: number,
  previousRightwardFootprint: number
): number {
  const tuckedAdvance = MIN_NOTE_WIDTH + tailFollowerRoom;
  if (leftwardWidth <= 0 && previousRightwardFootprint <= 0) {
    return tuckedAdvance;
  }
  return Math.max(
    tuckedAdvance,
    NOTE_SVG_WIDTH + previousRightwardFootprint + leftwardWidth
  );
}

/**
 * Strut min width for a classical staff measure (no lyrics).
 *
 * minWidth = describeEndX + leadingGap + firstElementLeftwardWidth
 *          + extraLeftwardWidth + noteCount × MIN_NOTE_WIDTH + clefChangeWidth
 *
 * leadingGap (LEADING_NOTE_GAP_PX, only when there are notes) keeps the first
 * entry off the clef/key/time area.
 *
 * A tupleted entry counts whole in noteCount: #spaceElements() floors it at
 * MIN_NOTE_WIDTH like any other. Only its spacing slack is ratio-scaled.
 *
 * firstElementLeftwardWidth ensures the measure is wide enough when the first
 * element is shifted right to clear its leftward overhang (accidental and/or
 * grace notes) from the describe area. extraLeftwardWidth reserves room for
 * the grace-note overhangs of the remaining elements. Together they guarantee
 * that proportionalWidth in #spaceElements() is never negative, preventing
 * noteheads from bleeding into adjacent measures.
 *
 * clefChangeWidth reserves room for any mid-stream <music-clef> markers,
 * which occupy horizontal space but are excluded from noteCount (they don't
 * consume beat duration).
 */
export function calculateStaffMinWidth(
  describeEndX: number,
  noteCount: number,
  firstElementLeftwardWidth = 0,
  extraLeftwardWidth = 0,
  clefChangeWidth = 0,
  extraRightwardWidth = 0
): number {
  return (
    describeEndX +
    (noteCount > 0 ? LEADING_NOTE_GAP_PX : 0) +
    firstElementLeftwardWidth +
    extraLeftwardWidth +
    noteCount * MIN_NOTE_WIDTH +
    clefChangeWidth +
    extraRightwardWidth
  );
}

/**
 * Strut min width for a vocal staff measure, accounting for both note spacing
 * and lyric character width.
 *
 * minWidth = describeEndX + leadingGap + firstElementLeftwardWidth
 *          + extraLeftwardWidth
 *          + max(noteCount × MIN_NOTE_WIDTH + clefChangeWidth
 *                  + extraRightwardWidth,
 *                lyricCharCount × AVG_LYRIC_CHAR_WIDTH_PX)
 */
export function calculateStaffVocalMinWidth(
  describeEndX: number,
  noteCount: number,
  lyricCharCount: number,
  firstElementLeftwardWidth = 0,
  extraLeftwardWidth = 0,
  clefChangeWidth = 0,
  extraRightwardWidth = 0
): number {
  const noteMinWidth =
    noteCount * MIN_NOTE_WIDTH + clefChangeWidth + extraRightwardWidth;
  const lyricMinWidth = lyricCharCount * AVG_LYRIC_CHAR_WIDTH_PX;
  return (
    describeEndX +
    (noteCount > 0 ? LEADING_NOTE_GAP_PX : 0) +
    firstElementLeftwardWidth +
    extraLeftwardWidth +
    Math.max(noteMinWidth, lyricMinWidth)
  );
}

/**
 * Strut min width for a guitar tab staff measure. Guitar tab has no accidentals,
 * lyrics, or key signatures — only entry-count-driven spacing applies.
 */
export function calculateGuitarTabMinWidth(
  describeEndX: number,
  noteCount: number
): number {
  return (
    describeEndX +
    (noteCount > 0 ? LEADING_NOTE_GAP_PX : 0) +
    noteCount * MIN_NOTE_WIDTH
  );
}

/**
 * Natural (preferred) width for a classical or guitar tab staff measure: the
 * strut min width plus the total beat-proportional slack its entries want
 * beyond it. `totalSlackWeight` comes from computeSpacingWeights() in
 * rules/spacingRules.ts.
 */
export function calculateStaffNaturalWidth(
  minWidth: number,
  totalSlackWeight: number
): number {
  return minWidth + totalSlackWeight;
}

/**
 * Natural width for a vocal staff measure: whichever is larger of the
 * note-driven natural width (strut + slack) and the lyric-driven width.
 */
export function calculateStaffVocalNaturalWidth(
  describeEndX: number,
  noteCount: number,
  lyricCharCount: number,
  totalSlackWeight: number,
  firstElementLeftwardWidth = 0,
  extraLeftwardWidth = 0,
  clefChangeWidth = 0,
  extraRightwardWidth = 0
): number {
  const base =
    describeEndX +
    (noteCount > 0 ? LEADING_NOTE_GAP_PX : 0) +
    firstElementLeftwardWidth +
    extraLeftwardWidth;
  const noteNatural =
    base +
    noteCount * MIN_NOTE_WIDTH +
    clefChangeWidth +
    extraRightwardWidth +
    totalSlackWeight;
  const lyricNatural = base + lyricCharCount * AVG_LYRIC_CHAR_WIDTH_PX;
  return Math.max(noteNatural, lyricNatural);
}

/**
 * The `flex` shorthand for a measure whose duration-weighted natural width is
 * `naturalWidth`: grow and basis both equal it, so a row of measures ends up
 * distributed as naturalWidth_i ÷ Σ naturalWidth × rowWidth (a lone measure
 * fills the row, equal measures split it evenly). The measure's CSS min-width is
 * set separately from the strut so it can still shrink below this when crowded.
 */
export function measureFlexValue(naturalWidth: number): string {
  const rounded = Math.round(naturalWidth);
  return `${rounded} 1 ${rounded}px`;
}

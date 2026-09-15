import {
  AVG_LYRIC_CHAR_WIDTH_PX,
  LEADING_NOTE_GAP_PX,
  MIN_NOTE_WIDTH,
} from '../utils/notationDimensions';

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
 * Strut min width for a classical staff measure (no lyrics).
 *
 * minWidth = describeEndX + leadingGap + firstElementLeftwardWidth
 *          + extraLeftwardWidth + noteCount × MIN_NOTE_WIDTH + clefChangeWidth
 *
 * leadingGap (LEADING_NOTE_GAP_PX, only when there are notes) keeps the first
 * entry off the clef/key/time area.
 *
 * noteCount may be fractional when the measure contains tuplets — each tuplet
 * note contributes (normal/actual) rather than 1.0, matching the reduced
 * horizontal footprint used in #spaceElements().
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
 *          + max(noteCount × MIN_NOTE_WIDTH,
 *                lyricCharCount × AVG_LYRIC_CHAR_WIDTH_PX)
 */
export function calculateStaffVocalMinWidth(
  describeEndX: number,
  noteCount: number,
  lyricCharCount: number,
  firstElementLeftwardWidth = 0,
  extraLeftwardWidth = 0
): number {
  const noteMinWidth = noteCount * MIN_NOTE_WIDTH;
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
  extraLeftwardWidth = 0
): number {
  const base =
    describeEndX +
    (noteCount > 0 ? LEADING_NOTE_GAP_PX : 0) +
    firstElementLeftwardWidth +
    extraLeftwardWidth;
  const noteNatural = base + noteCount * MIN_NOTE_WIDTH + totalSlackWeight;
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

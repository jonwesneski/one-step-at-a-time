import {
  AVG_LYRIC_CHAR_WIDTH_PX,
  COMPOSITION_MAX_WIDTH_PX,
  MIN_NOTE_WIDTH,
  SCORED_MIN_FLEX_GROW,
} from '../utils/notationDimensions';

/**
 * Calculates the minimum pixel width for a classical staff measure (no lyrics).
 *
 * minWidth = describeEndX + firstNoteAccidentalWidth + noteCount × MIN_NOTE_WIDTH
 *
 * noteCount may be fractional when the measure contains tuplets — each tuplet
 * note contributes (normal/actual) rather than 1.0, matching the reduced
 * horizontal footprint used in #spaceElements().
 *
 * firstNoteAccidentalWidth ensures the measure is wide enough when the first
 * note is shifted right to clear its accidental from the describe area.
 * This guarantees that proportionalWidth in #spaceElements() is never negative,
 * preventing noteheads from bleeding into adjacent measures.
 */
export function calculateStaffMinWidth(
  describeEndX: number,
  noteCount: number,
  firstNoteAccidentalWidth = 0
): number {
  return describeEndX + firstNoteAccidentalWidth + noteCount * MIN_NOTE_WIDTH;
}

/**
 * Calculates the minimum pixel width for a vocal staff measure, accounting for
 * both note spacing and lyric character width.
 *
 * minWidth = describeEndX + max(noteCount × MIN_NOTE_WIDTH,
 *                               lyricCharCount × AVG_LYRIC_CHAR_WIDTH_PX)
 */
export function calculateStaffVocalMinWidth(
  describeEndX: number,
  noteCount: number,
  lyricCharCount: number,
  firstNoteAccidentalWidth = 0
): number {
  const noteMinWidth = noteCount * MIN_NOTE_WIDTH;
  const lyricMinWidth = lyricCharCount * AVG_LYRIC_CHAR_WIDTH_PX;
  return (
    describeEndX +
    firstNoteAccidentalWidth +
    Math.max(noteMinWidth, lyricMinWidth)
  );
}

/**
 * Calculates the minimum pixel width for a guitar tab staff measure.
 * Guitar tab has no accidentals, lyrics, or key signatures — only
 * note-count-driven spacing applies.
 */
export function calculateGuitarTabMinWidth(
  describeEndX: number,
  noteCount: number
): number {
  return describeEndX + noteCount * MIN_NOTE_WIDTH;
}

/**
 * Maps a minimum width (px) to a CSS flex-grow value.
 *
 * Scales as minWidth / COMPOSITION_MAX_WIDTH_PX, clamped to
 * [SCORED_MIN_FLEX_GROW, 1.0]. Empty measures (no staves have reported a
 * minWidth yet) continue to use MIN_FLEX_GROW via CSS default in measure.ts.
 */
export function minWidthToFlexGrow(minWidth: number): number {
  return Math.min(
    1.0,
    Math.max(SCORED_MIN_FLEX_GROW, minWidth / COMPOSITION_MAX_WIDTH_PX)
  );
}

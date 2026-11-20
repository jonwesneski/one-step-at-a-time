import type { BarlineType, MeasureEndBarline } from '../types/theory';
import {
  BARLINE_LINE_GAP_PX,
  BARLINE_THICK_PX,
  BARLINE_THIN_PX,
  MID_BAR_BARLINE_PADDING_PX,
  REPEAT_DOT_GAP_PX,
  REPEAT_DOT_RADIUS_PX,
  STAFF_LINE_SPACING,
  STAFF_LINE_START,
  STAFF_LINE_THICKNESS_PX,
} from '../utils/notationDimensions';

/**
 * A measure's end barline as drawn: `repeat-end-thin` is the left half of a
 * back-to-back repeat (dots and thin line; the next bar draws the shared
 * thick line), `none` leaves the next bar's start repeat to replace it.
 */
export type ResolvedEndBarline = MeasureEndBarline | 'repeat-end-thin' | 'none';

/**
 * How a measure draws its start repeat: `full` after its clef/key/time area,
 * `shared-thick` with the thick line centred on the barline it replaces.
 */
export type StartRepeatMode = 'none' | 'full' | 'shared-thick';

export type BarlinePieceKind = 'thin' | 'thick' | 'dots';

/** One line or dot pair of a barline glyph, from the glyph's left edge. */
export type BarlinePiece = { kind: BarlinePieceKind; x: number; width: number };

const PIECE_WIDTH: Record<BarlinePieceKind, number> = {
  thin: BARLINE_THIN_PX,
  thick: BARLINE_THICK_PX,
  dots: REPEAT_DOT_GAP_PX + REPEAT_DOT_RADIUS_PX * 2,
};

const PIECES: Record<BarlineType | 'repeat-end-thin', BarlinePieceKind[]> = {
  single: ['thin'],
  double: ['thin', 'thin'],
  final: ['thin', 'thick'],
  'repeat-start': ['thick', 'thin', 'dots'],
  'repeat-end': ['dots', 'thin', 'thick'],
  'repeat-both': ['dots', 'thin', 'thick', 'thin', 'dots'],
  'repeat-end-thin': ['dots', 'thin'],
};

/**
 * A barline glyph's lines and dots, left to right. Dots sit
 * `REPEAT_DOT_GAP_PX` from the thin line beside them; lines are
 * `BARLINE_LINE_GAP_PX` apart.
 */
export function barlinePieces(
  type: BarlineType | ResolvedEndBarline
): BarlinePiece[] {
  if (type === 'none') {
    return [];
  }
  const kinds = PIECES[type];
  const pieces: BarlinePiece[] = [];
  let x = 0;
  kinds.forEach((kind, index) => {
    const previous = kinds[index - 1];
    if (previous !== undefined && previous !== 'dots' && kind !== 'dots') {
      x += BARLINE_LINE_GAP_PX;
    }
    pieces.push({ kind, x, width: PIECE_WIDTH[kind] });
    x += PIECE_WIDTH[kind];
  });
  return pieces;
}

export function barlineGlyphWidth(
  type: BarlineType | ResolvedEndBarline
): number {
  const pieces = barlinePieces(type);
  const last = pieces[pieces.length - 1];
  return last === undefined ? 0 : last.x + last.width;
}

/** Horizontal room a mid-bar `<music-barline>` takes in the note stream. */
export function midBarBarlineSlotWidth(type: BarlineType): number {
  return barlineGlyphWidth(type) + MID_BAR_BARLINE_PADDING_PX * 2;
}

/**
 * How far an end barline's glyph sits left of the staff's right edge. The left
 * half of a back-to-back repeat clears the next bar's thick line, which is
 * centred on that edge.
 */
export function endBarlineInset(type: ResolvedEndBarline): number {
  return type === 'repeat-end-thin'
    ? BARLINE_THICK_PX / 2 + BARLINE_LINE_GAP_PX
    : 0;
}

/**
 * Extra room an end barline needs inside the staff beyond the plain 1px
 * barline every measure already has.
 */
export function endBarlineReserve(type: ResolvedEndBarline): number {
  return (
    Math.max(0, barlineGlyphWidth(type) - BARLINE_THIN_PX) +
    endBarlineInset(type)
  );
}

/**
 * The end barline a measure takes: a Fine bar is the actual end of the piece
 * and takes a final barline; a bar that jumps (D.C./D.S.) is only the written
 * end and takes a thin double barline. An authored barline always wins.
 */
export function resolveEndBarline(input: {
  authored: MeasureEndBarline | null;
  fine: boolean;
  jump: boolean;
}): { barline: MeasureEndBarline; warning: string | null } {
  const { authored, fine, jump } = input;
  const expected: MeasureEndBarline | null = fine
    ? 'final'
    : jump
    ? 'double'
    : null;
  if (authored === null) {
    return { barline: expected ?? 'single', warning: null };
  }
  if (expected === null || authored === expected) {
    return { barline: authored, warning: null };
  }
  return {
    barline: authored,
    warning: fine
      ? `a Fine bar takes a final barline, not "${authored}"`
      : `the written end before a jump takes a thin double barline, not "${authored}"`,
  };
}

export type JunctionInput = {
  /** The earlier bar's end barline. */
  outgoing: MeasureEndBarline;
  incomingRepeatStart: boolean;
  /** The later bar draws clef/key/time glyphs before its notes. */
  incomingHasStartGlyphs: boolean;
  sameRow: boolean;
  doubleBarBeforeRepeat: boolean;
};

export type JunctionResult = {
  outgoing: ResolvedEndBarline;
  incomingStartRepeat: StartRepeatMode;
};

/**
 * What two adjacent bars draw where they meet. A start repeat replaces a
 * plain barline it touches, and shares its thick line with an end repeat
 * (thin–thick–thin); with clef/key/time glyphs between them, or at a row
 * start, it follows the glyphs instead.
 */
export function resolveBarlineJunction(input: JunctionInput): JunctionResult {
  const {
    outgoing,
    incomingRepeatStart,
    incomingHasStartGlyphs,
    sameRow,
    doubleBarBeforeRepeat,
  } = input;
  if (!incomingRepeatStart) {
    return { outgoing, incomingStartRepeat: 'none' };
  }
  if (!sameRow) {
    return {
      outgoing:
        doubleBarBeforeRepeat && outgoing === 'single' ? 'double' : outgoing,
      incomingStartRepeat: 'full',
    };
  }
  if (incomingHasStartGlyphs) {
    return { outgoing, incomingStartRepeat: 'full' };
  }
  if (outgoing === 'single') {
    return { outgoing: 'none', incomingStartRepeat: 'shared-thick' };
  }
  if (outgoing === 'repeat-end') {
    return { outgoing: 'repeat-end-thin', incomingStartRepeat: 'shared-thick' };
  }
  return { outgoing, incomingStartRepeat: 'full' };
}

export type RepeatEvent = {
  kind: 'start' | 'end';
  measureIndex: number;
  /** 0 at a bar's start barline, the marker's beat mid-bar, the capacity at its end barline. */
  beatInBar: number;
  /** Whole-note fraction the bar's metre holds. */
  barCapacity: number;
  /** Ending group the end repeat closes an ending of; null outside endings. */
  endingGroup: number | null;
};

/** A repeated section; a null start repeats from the beginning. */
export type RepeatSpan = { start: RepeatEvent | null; end: RepeatEvent };

const BEAT_EPSILON = 1e-9;

/**
 * Pairs every end repeat with the start it returns to: the latest start
 * since the previous end, the piece's beginning for the first end, or the
 * start an earlier ending of the same group returned to.
 */
export function resolveRepeatSpans(events: readonly RepeatEvent[]): {
  spans: RepeatSpan[];
  warnings: string[];
} {
  const spans: RepeatSpan[] = [];
  const warnings: string[] = [];
  const groupStarts = new Map<number, RepeatEvent | null>();
  let openStart: RepeatEvent | null = null;
  let lastEnd: RepeatEvent | null = null;
  for (const event of events) {
    if (event.kind === 'start') {
      if (openStart !== null) {
        warnings.push(
          `repeat start in bar ${
            event.measureIndex + 1
          } follows an unclosed repeat start in bar ${
            openStart.measureIndex + 1
          }; the earlier one is ignored`
        );
      }
      openStart = event;
      continue;
    }
    let start: RepeatEvent | null;
    if (event.endingGroup !== null && groupStarts.has(event.endingGroup)) {
      start = groupStarts.get(event.endingGroup) ?? null;
    } else if (openStart !== null) {
      start = openStart;
    } else if (lastEnd === null) {
      start = null;
    } else {
      warnings.push(
        `end repeat in bar ${
          event.measureIndex + 1
        } has no start repeat after the previous end repeat in bar ${
          lastEnd.measureIndex + 1
        }; add repeat-start`
      );
      start = { ...lastEnd, kind: 'start' };
    }
    if (event.endingGroup !== null && !groupStarts.has(event.endingGroup)) {
      groupStarts.set(event.endingGroup, start);
    }
    spans.push({ start, end: event });
    openStart = null;
    lastEnd = event;
  }
  return { spans, warnings };
}

/**
 * A repeated section must hold whole bars: where it starts in its bar and
 * where it ends in its bar add up to a full bar.
 */
export function repeatPickupWarning(span: RepeatSpan): string | null {
  const { start, end } = span;
  const capacity = end.barCapacity;
  const startOffset = start === null ? 0 : start.beatInBar % capacity;
  const endOffset = end.beatInBar % capacity;
  const difference = Math.abs(startOffset - endOffset);
  if (difference < BEAT_EPSILON || capacity - difference < BEAT_EPSILON) {
    return null;
  }
  const from =
    start === null ? 'the beginning' : `bar ${start.measureIndex + 1}`;
  return `the repeat from ${from} to bar ${
    end.measureIndex + 1
  } doesn't hold whole bars: the beats before its start and after its end must add up to one bar`;
}

/** Where a barline runs and where its repeat dots sit, in staff px. */
export type BarlineVerticalSpan = {
  top: number;
  bottom: number;
  dotYs: [number, number];
};

/**
 * A barline spans from the top edge of the top stave line to the bottom edge
 * of the bottom one. Repeat dots sit in the two spaces either side of the
 * staff's centre: spaces 2 and 3 of five lines, 2 and 4 of six.
 */
export function barlineVerticalSpan(lineCount: number): BarlineVerticalSpan {
  const height = (lineCount - 1) * STAFF_LINE_SPACING;
  const middle = STAFF_LINE_START + height / 2 + STAFF_LINE_THICKNESS_PX / 2;
  const dotOffset = STAFF_LINE_SPACING * (lineCount % 2 === 1 ? 0.5 : 1);
  return {
    top: STAFF_LINE_START - STAFF_LINE_THICKNESS_PX,
    bottom: STAFF_LINE_START + height + STAFF_LINE_THICKNESS_PX,
    dotYs: [middle - dotOffset, middle + dotOffset],
  };
}

import type {
  DurationType,
  NoteheadType,
  UnpitchedPlacement,
} from '../types/theory';
import {
  STAFF_BOTTOM_LINE_Y,
  STAFF_TOP_LINE_Y,
  STAFF_Y_STEP,
} from '../utils/notationDimensions';
import {
  durationToBase,
  isOpenDuration,
  isStemlessDuration,
} from './theoryConsts';

// Drawn outline of a head; a `normal` one keeps the ellipse, except a
// semibreve or longer.
export type NoteheadGlyph =
  | 'whole'
  | 'x'
  | 'circle-x'
  | 'diamond-black'
  | 'diamond-white'
  | 'diamond-white-wide'
  | 'triangle-up-black'
  | 'triangle-up-white'
  | 'triangle-down-black'
  | 'triangle-down-white';

export function resolveNoteheadGlyph(
  notehead: NoteheadType,
  duration: DurationType
): NoteheadGlyph | null {
  switch (notehead) {
    case 'normal':
      return isStemlessDuration(duration) ? 'whole' : null;
    case 'x':
      // A cross inside an open oval would obscure the white space, so half
      // and longer durations circle the cross instead.
      return isOpenDuration(duration) ? 'circle-x' : 'x';
    case 'x-plain':
      return 'x';
    case 'none':
      return null;
    case 'diamond':
      if (isStemlessDuration(duration)) {
        return 'diamond-white-wide';
      }
      return durationToBase[duration] === 'half'
        ? 'diamond-white'
        : 'diamond-black';
    case 'diamond-white':
      return isStemlessDuration(duration)
        ? 'diamond-white-wide'
        : 'diamond-white';
    case 'triangle-up':
      return isOpenDuration(duration)
        ? 'triangle-up-white'
        : 'triangle-up-black';
    case 'triangle-down':
      return isOpenDuration(duration)
        ? 'triangle-down-white'
        : 'triangle-down-black';
  }
}

export const isTriangle = (notehead: NoteheadType | null): boolean =>
  notehead === 'triangle-up' || notehead === 'triangle-down';

// The stem always leaves the base, away from the point.
export function forcedStemUp(notehead: NoteheadType | null): boolean | null {
  if (notehead === 'triangle-up') {
    return false;
  }
  if (notehead === 'triangle-down') {
    return true;
  }
  return null;
}

export const isHeadless = (notehead: NoteheadType | null): boolean =>
  notehead === 'none';

// A triangle has no defined pitch and a headless stem no head to mark: no
// ledger lines, no accidental.
export const suppressesLedgerLines = (notehead: NoteheadType | null): boolean =>
  isTriangle(notehead) || isHeadless(notehead);
export const suppressesAccidental = suppressesLedgerLines;

/** A semibreve or longer has no stem, so without a head nothing is drawn. */
export function headlessDurationWarning(
  notehead: NoteheadType,
  duration: DurationType
): string | null {
  return isHeadless(notehead) && isStemlessDuration(duration)
    ? `notehead="none" with duration="${duration}" draws nothing: a headless note needs a stem.`
    : null;
}

export function triangleDurationWarning(
  notehead: NoteheadType,
  duration: DurationType
): string | null {
  if (!isTriangle(notehead) || !isStemlessDuration(duration)) {
    return null;
  }
  return `notehead="${notehead}" with duration="${duration}": two tied half notes read more clearly than a stemless triangle.`;
}

// A triangle stands for one undefined extreme pitch, so it can't be one tone
// of a chord or a grace note; it falls back to normal there. Callers warn
// when the attribute is set (see triangleUnsupportedWarning) rather than on
// every render.
const withoutTriangle = (notehead: NoteheadType | null): NoteheadType | null =>
  isTriangle(notehead) ? 'normal' : notehead;

// A grace note without a head means nothing either.
const graceNoteheadOf = (notehead: NoteheadType | null): NoteheadType | null =>
  isHeadless(notehead) ? 'normal' : withoutTriangle(notehead);

export function graceNoteheadWarning(
  noteheads: readonly (NoteheadType | null)[]
): string | null {
  return noteheads.some(isHeadless)
    ? 'grace-notehead="none" is not supported: a grace note needs its head; drawing a normal notehead.'
    : triangleUnsupportedWarning(noteheads, 'a grace note');
}

export function triangleUnsupportedWarning(
  noteheads: readonly (NoteheadType | null)[],
  context: string
): string | null {
  const triangle = noteheads.find(isTriangle);
  return triangle
    ? `notehead="${triangle}" is not supported on ${context}; drawing a normal notehead.`
    : null;
}

export function resolveChordToneNoteheads(
  chordNotehead: NoteheadType | null,
  toneNoteheads: readonly (NoteheadType | null)[]
): NoteheadType[] {
  const fallback = withoutTriangle(chordNotehead) ?? 'normal';
  return toneNoteheads.map((tone) => withoutTriangle(tone) ?? fallback);
}

export function resolveGraceNoteheads(
  graceNoteheads: readonly (NoteheadType | null)[],
  graceCount: number
): NoteheadType[] {
  return Array.from(
    { length: graceCount },
    (_, i) => graceNoteheadOf(graceNoteheads[i] ?? null) ?? 'normal'
  );
}

export type TrianglePlacementEntry =
  // A rest: ends the run a following triangle is placed against.
  | { kind: 'break' }
  | { kind: 'pitched'; headYs: readonly number[]; stemTipY: number | null }
  | {
      kind: 'triangle';
      notehead: 'triangle-up' | 'triangle-down';
      // Tied from the immediately preceding entry (a triangle with tie="start").
      tiedFromPrevious: boolean;
    };

// Staff-Y of each triangle, keyed by entry index. An isolated triangle sits a
// fixed distance outside the stave; one following a run of pitched entries
// also clears everything in that run. A tied triangle keeps the Y of the
// triangle it is tied from.
export function resolveTriangleStaffYs(
  entries: readonly TrianglePlacementEntry[],
  staff: {
    topLineY: number;
    bottomLineY: number;
    outsideStaffPx: number;
    runClearancePx: number;
  }
): Map<number, number> {
  const ys = new Map<number, number>();
  let run: Extract<TrianglePlacementEntry, { kind: 'pitched' }>[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.kind === 'break') {
      run = [];
      continue;
    }
    if (entry.kind === 'pitched') {
      run.push(entry);
      continue;
    }

    const previous = entries[i - 1];
    const previousY = ys.get(i - 1);
    if (
      entry.tiedFromPrevious &&
      previous?.kind === 'triangle' &&
      previous.notehead === entry.notehead &&
      previousY !== undefined
    ) {
      ys.set(i, previousY);
      run = [];
      continue;
    }

    const runExtents = run.flatMap((pitched) =>
      pitched.stemTipY === null
        ? [...pitched.headYs]
        : [...pitched.headYs, pitched.stemTipY]
    );
    if (entry.notehead === 'triangle-up') {
      ys.set(
        i,
        Math.min(
          staff.topLineY - staff.outsideStaffPx,
          ...runExtents.map((y) => y - staff.runClearancePx)
        )
      );
    } else {
      ys.set(
        i,
        Math.max(
          staff.bottomLineY + staff.outsideStaffPx,
          ...runExtents.map((y) => y + staff.runClearancePx)
        )
      );
    }
    run = [];
  }
  return ys;
}

// Staff-Y of a stem's tip, null when there's no stem. The stem starts at the
// head farthest from the tip, and an unbeamed chord's stem also spans its
// spread (matches createChordSvg's effective extension).
export function resolveStemTipY({
  headYs,
  stemUp,
  stemless,
  noFlags,
  stemExtensionPx,
  baseStemLengthPx,
  flagExtensionPx,
}: {
  headYs: readonly number[];
  stemUp: boolean;
  stemless: boolean;
  noFlags: boolean;
  stemExtensionPx: number;
  baseStemLengthPx: number;
  flagExtensionPx: number;
}): number | null {
  if (stemless || headYs.length === 0) {
    return null;
  }
  const lowestHeadY = Math.max(...headYs);
  const highestHeadY = Math.min(...headYs);
  const extension = noFlags
    ? stemExtensionPx
    : stemExtensionPx + (lowestHeadY - highestHeadY) + flagExtensionPx;
  const length = baseStemLengthPx + extension;
  return stemUp ? lowestHeadY - length : highestHeadY + length;
}

/**
 * Where an unpitched sound sits: in the space just above the top line or below
 * the bottom one, or at its written position.
 */
export function resolveUnpitchedStaffY(
  placement: UnpitchedPlacement,
  writtenStaffY: number
): number {
  switch (placement) {
    case 'top':
      return STAFF_TOP_LINE_Y - STAFF_Y_STEP;
    case 'bottom':
      return STAFF_BOTTOM_LINE_Y + STAFF_Y_STEP;
    case 'written':
      return writtenStaffY;
  }
}

/** Warnings for an `unpitched` note, one per attribute that doesn't apply. */
export function unpitchedWarnings(input: {
  value: string | null;
  placement: UnpitchedPlacement | null;
  notehead: NoteheadType | null;
  ignored: readonly string[];
}): string[] {
  const { value, placement, notehead, ignored } = input;
  if (value === null) {
    return [];
  }
  if (placement === null) {
    return [
      `unpitched="${value}" isn't top, bottom or written; drawing the note at its pitch`,
    ];
  }
  if (isTriangle(notehead)) {
    return [
      `unpitched is ignored on notehead="${notehead}", which places itself`,
    ];
  }
  return ignored.map(
    (name) => `${name} is ignored on an unpitched note, which has no pitch`
  );
}

import type { DurationType, NoteheadType } from '../types/theory';

// Drawn outline for a non-`normal` notehead; `normal` keeps the ellipse.
export type NoteheadGlyph =
  | 'x'
  | 'circle-x'
  | 'diamond-black'
  | 'diamond-white'
  | 'diamond-white-wide'
  | 'triangle-up-black'
  | 'triangle-up-white'
  | 'triangle-down-black'
  | 'triangle-down-white';

const isOpenDuration = (duration: DurationType): boolean =>
  duration === 'half' || duration === 'whole' || duration === 'double-whole';

const isStemlessDuration = (duration: DurationType): boolean =>
  duration === 'whole' || duration === 'double-whole';

export function resolveNoteheadGlyph(
  notehead: NoteheadType,
  duration: DurationType
): NoteheadGlyph | null {
  switch (notehead) {
    case 'normal':
      return null;
    case 'x':
      // A cross inside an open oval would obscure the white space, so half
      // and longer durations circle the cross instead.
      return isOpenDuration(duration) ? 'circle-x' : 'x';
    case 'diamond':
      if (isStemlessDuration(duration)) {
        return 'diamond-white-wide';
      }
      return duration === 'half' ? 'diamond-white' : 'diamond-black';
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

// A triangle has no defined pitch: no ledger lines, no accidental.
export const suppressesLedgerLines = isTriangle;
export const suppressesAccidental = isTriangle;

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
    (_, i) => withoutTriangle(graceNoteheads[i] ?? null) ?? 'normal'
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

// Extra stem length (px) so a triangle's stem, drawn from a head outside the
// stave, reaches the middle line.
export function triangleStemExtensionPx(
  headY: number,
  stemUp: boolean,
  middleY: number,
  stemLengthPx: number
): number {
  const tipY = stemUp ? headY - stemLengthPx : headY + stemLengthPx;
  return Math.max(0, stemUp ? tipY - middleY : middleY - tipY);
}

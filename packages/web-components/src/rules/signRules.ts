import type { NoteSign } from '../types/theory';
import { NOTE_SIGNS } from '../utils/consts';
import {
  SIGN_CIRCLE_DIAMETER_PX,
  SIGN_CROSS_SIZE_PX,
  SIGN_GAP_PX,
  SIGN_LEVEL_TOLERANCE_PX,
  SIGN_STAFF_CLEARANCE_PX,
} from '../utils/notationDimensions';

const VALID_SIGNS = new Set<string>(NOTE_SIGNS);

/**
 * The signs of a comma-separated `sign` list, nearest the note first; unknown
 * entries are dropped. Null when nothing is left.
 */
export function parseSigns(value: string | null): NoteSign[] | null {
  if (value === null) {
    return null;
  }
  const signs = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry): entry is NoteSign => VALID_SIGNS.has(entry));
  return signs.length === 0 ? null : signs;
}

/** A warning for the entries of a `sign` list that aren't signs. */
export function signWarning(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const unknown = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => !VALID_SIGNS.has(entry));
  if (unknown.length === 0) {
    return null;
  }
  return `sign: ignoring ${unknown
    .map((entry) => `"${entry}"`)
    .join(', ')}; use ${NOTE_SIGNS.join(', ')}, comma-separated.`;
}

/** Height (px) of one sign's ink. */
export const signHeightPx = (sign: NoteSign): number =>
  sign === 'plus' || sign === 'cross'
    ? SIGN_CROSS_SIZE_PX
    : SIGN_CIRCLE_DIAMETER_PX;

/** Centre offsets (px, upward from the stack's bottom) of each sign. */
export function signCenterOffsets(signs: readonly NoteSign[]): number[] {
  const offsets: number[] = [];
  let bottom = 0;
  for (const sign of signs) {
    const height = signHeightPx(sign);
    offsets.push(bottom + height / 2);
    bottom += height + SIGN_GAP_PX;
  }
  return offsets;
}

/** Height (px) of a stack of signs. */
export function signStackHeightPx(signs: readonly NoteSign[]): number {
  return signs.length === 0
    ? 0
    : signs.reduce((sum, sign) => sum + signHeightPx(sign), 0) +
        (signs.length - 1) * SIGN_GAP_PX;
}

export type SignStackInput = {
  /** Topmost Y of the note's own ink: its head, or its stem, beam and tremolo. */
  inkTopY: number;
  /** An articulation drawn above the head (stem down), or null. */
  articulation: { topY: number; bottomY: number } | null;
  staffTopLineY: number;
};

export type SignStackPlacement = {
  /** Y of the stack's bottom edge. */
  bottomY: number;
  /** How far (px) an articulation above the head moves up to stand under the signs. */
  articulationLiftPx: number;
};

/**
 * Where a note's signs go (Y grows downward): above its ink and above the
 * stave. An articulation above the head stays nearest the note and, when the
 * signs must clear the stave, moves out with them (`±`, a tenuto under a plus).
 */
export function signStackPlacement({
  inkTopY,
  articulation,
  staffTopLineY,
}: SignStackInput): SignStackPlacement {
  const aboveStave = staffTopLineY - SIGN_STAFF_CLEARANCE_PX;
  if (articulation === null) {
    return {
      bottomY: Math.min(inkTopY - SIGN_GAP_PX, aboveStave),
      articulationLiftPx: 0,
    };
  }
  const articulationLiftPx = Math.max(0, articulation.bottomY - aboveStave);
  return {
    bottomY:
      Math.min(articulation.topY - articulationLiftPx, inkTopY) - SIGN_GAP_PX,
    articulationLiftPx,
  };
}

/**
 * Lines up the signs of neighbouring notes: each run of consecutive signed
 * entries (null breaks a run) whose bottoms lie within
 * SIGN_LEVEL_TOLERANCE_PX of the next is raised to its highest.
 */
export function levelSignRows(
  bottoms: readonly (number | null)[]
): (number | null)[] {
  const levelled = [...bottoms];
  let start = 0;
  while (start < levelled.length) {
    if (levelled[start] === null) {
      start++;
      continue;
    }
    let end = start;
    while (
      end + 1 < levelled.length &&
      bottoms[end + 1] !== null &&
      Math.abs((bottoms[end + 1] as number) - (bottoms[end] as number)) <
        SIGN_LEVEL_TOLERANCE_PX
    ) {
      end++;
    }
    const highest = Math.min(...(levelled.slice(start, end + 1) as number[]));
    for (let index = start; index <= end; index++) {
      levelled[index] = highest;
    }
    start = end + 1;
  }
  return levelled;
}

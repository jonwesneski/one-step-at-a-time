import {
  ChordElementType,
  NoteChordOrRestElementType,
  NoteElementType,
} from '../types/elements';
import { BeamsBuilder } from '../utils';
import { MUSIC_CHORD_NODE, MUSIC_NOTE_NODE } from '../utils/consts';
import {
  MIDDLE_STAFF_Y,
  STAFF_BOTTOM_LINE_Y,
  STAFF_TOP_LINE_Y,
  STAFF_Y_STEP,
} from '../utils/notationDimensions';

export type LedgerLineWidth = 'single' | 'double';
export type LedgerLine = { staffY: number; widthType: LedgerLineWidth };

/**
 * Compute ledger lines needed for a set of staffYCoordinates (single note or chord).
 *
 * Width rules (per-region, above or below the staff):
 * - If no adjacent pair exists in the region: all single width
 * - If an adjacent pair exists:
 *   - Outermost note on a line (Y % 10 === 0): all ledger lines in the region are double
 *   - Outermost note in a space (Y % 10 === 5): innermost ledger line is single; outer are double
 */
export function computeLedgerLines(
  staffYCoordinates: number[],
  _stemUp: boolean
): LedgerLine[] {
  const result: LedgerLine[] = [];

  result.push(...computeRegionLedgerLines(staffYCoordinates, 'above'));
  result.push(...computeRegionLedgerLines(staffYCoordinates, 'below'));

  return result;
}

function computeRegionLedgerLines(
  staffYCoordinates: number[],
  region: 'above' | 'below'
): LedgerLine[] {
  const isAbove = region === 'above';

  const regionNotes = staffYCoordinates.filter((y) =>
    isAbove ? y < STAFF_TOP_LINE_Y : y > STAFF_BOTTOM_LINE_Y
  );
  if (regionNotes.length === 0) {
    return [];
  }

  const outermostY = isAbove
    ? Math.min(...regionNotes)
    : Math.max(...regionNotes);

  const ledgerPositions = collectLedgerPositions(regionNotes, isAbove);
  if (ledgerPositions.length === 0) {
    return [];
  }

  const hasAdjacentPair = regionNotes.some((y) =>
    regionNotes.some(
      (other) => other !== y && Math.abs(other - y) === STAFF_Y_STEP
    )
  );

  if (!hasAdjacentPair) {
    return ledgerPositions.map((lY) => ({ staffY: lY, widthType: 'single' }));
  }

  const outermostOnLine = outermostY % (STAFF_Y_STEP * 2) === 0;

  if (outermostOnLine) {
    return ledgerPositions.map((lY) => ({ staffY: lY, widthType: 'double' }));
  }

  // Outermost is in a space: innermost ledger line is single, others are double
  const innermostLedgerY = isAbove
    ? Math.max(...ledgerPositions)
    : Math.min(...ledgerPositions);

  return ledgerPositions.map((lY) => ({
    staffY: lY,
    widthType: lY === innermostLedgerY ? 'single' : 'double',
  }));
}

function collectLedgerPositions(
  regionNotes: number[],
  isAbove: boolean
): number[] {
  const positionSet = new Set<number>();
  const lineSpacing = STAFF_Y_STEP * 2; // 10 — distance between adjacent staff lines

  for (const staffY of regionNotes) {
    if (isAbove) {
      // Positions from just above the top staff line down to the note (inclusive if on a line)
      for (
        let lY = STAFF_TOP_LINE_Y - lineSpacing;
        lY >= staffY;
        lY -= lineSpacing
      ) {
        positionSet.add(lY);
      }
    } else {
      // Positions from just below the bottom staff line up to the note (inclusive if on a line)
      for (
        let lY = STAFF_BOTTOM_LINE_Y + lineSpacing;
        lY <= staffY;
        lY += lineSpacing
      ) {
        positionSet.add(lY);
      }
    }
  }

  return Array.from(positionSet).sort((a, b) => a - b);
}

export function determineStemDirections(
  elements: NoteChordOrRestElementType[],
  beamsBuilder: BeamsBuilder,
  noteStaffYCoords: ReadonlyMap<NoteElementType, number>,
  chordStaffYCoords: ReadonlyMap<ChordElementType, number[]>
): boolean[] {
  const stemDirections = new Array<boolean>(elements.length).fill(true);
  const processed = new Set<number>();

  for (let i = 0; i < elements.length; i++) {
    if (processed.has(i)) {
      continue;
    }
    const groupIndices = beamsBuilder.beamGroupFor(i);
    if (groupIndices) {
      const allYs = groupIndices.flatMap((idx) =>
        getStaffYs(elements[idx], noteStaffYCoords, chordStaffYCoords)
      );
      const stemUp = stemUpForYs(allYs);
      for (const idx of groupIndices) {
        stemDirections[idx] = stemUp;
        processed.add(idx);
      }
    } else {
      stemDirections[i] = stemUpForYs(
        getStaffYs(elements[i], noteStaffYCoords, chordStaffYCoords)
      );
      processed.add(i);
    }
  }

  return stemDirections;
}

const getStaffYs = (
  element: NoteChordOrRestElementType,
  noteStaffYCoords: ReadonlyMap<NoteElementType, number>,
  chordStaffYCoords: ReadonlyMap<ChordElementType, number[]>
): number[] => {
  if (element.nodeName === MUSIC_NOTE_NODE) {
    const noteElement = element as NoteElementType;
    return [noteStaffYCoords.get(noteElement) ?? 0];
  }
  if (element.nodeName === MUSIC_CHORD_NODE) {
    const chordElement = element as ChordElementType;
    return chordStaffYCoords.get(chordElement) ?? [];
  }
  return [];
};

const stemUpForYs = (ys: number[]): boolean => {
  let maxDist = -1;
  let stemUp = true;
  for (const y of ys) {
    const dist = Math.abs(y - MIDDLE_STAFF_Y);
    if (dist > maxDist) {
      maxDist = dist;
      stemUp = y > MIDDLE_STAFF_Y;
    }
  }
  return stemUp;
};

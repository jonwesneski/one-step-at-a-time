import {
  ChordElementType,
  NoteChordOrRestElementType,
  NoteElementType,
} from '../types/elements';
import { BeamsBuilder } from '../utils';
import { MUSIC_CHORD_NODE, MUSIC_NOTE_NODE } from '../utils/consts';
import { MIDDLE_STAFF_Y } from '../utils/notationDimensions';

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

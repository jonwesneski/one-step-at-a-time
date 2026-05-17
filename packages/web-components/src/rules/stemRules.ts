import {
  ChordElementType,
  NoteElementType,
  NoteOrChordElementType,
} from '../types/elements';
import { Letter, LetterNote, Octave } from '../types/theory';
import { BeamsBuilder } from '../utils';
import { MUSIC_NOTE_NODE } from '../utils/consts';
import { MIDDLE_STAFF_Y } from '../utils/notationDimensions';

export function determineStemDirections(
  elements: NoteOrChordElementType[],
  beamsBuilder: BeamsBuilder,
  noteToYCoordinate: (
    note: LetterNote | Letter | 'rest',
    octave?: Octave
  ) => number
): boolean[] {
  const stemDirections = new Array<boolean>(elements.length).fill(true);
  const processed = new Set<number>();

  const getStaffYs = (element: NoteOrChordElementType): number[] => {
    if (element.nodeName === MUSIC_NOTE_NODE) {
      const noteElement = element as NoteElementType;
      return [
        noteToYCoordinate(noteElement.note, noteElement.octave ?? undefined),
      ];
    }
    return (element as ChordElementType).notes.map((note) =>
      noteToYCoordinate(note.value, note.octave ?? undefined)
    );
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

  for (let i = 0; i < elements.length; i++) {
    if (processed.has(i)) {
      continue;
    }
    const groupIndices = beamsBuilder.beamGroupFor(i);
    if (groupIndices) {
      const allYs = groupIndices.flatMap((idx) => getStaffYs(elements[idx]));
      const stemUp = stemUpForYs(allYs);
      for (const idx of groupIndices) {
        stemDirections[idx] = stemUp;
        processed.add(idx);
      }
    } else {
      stemDirections[i] = stemUpForYs(getStaffYs(elements[i]));
      processed.add(i);
    }
  }

  return stemDirections;
}

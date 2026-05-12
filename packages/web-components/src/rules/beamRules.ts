import {
  ChordElementType,
  NoteElementType,
  NoteOrChordElementType,
} from '../types/elements';
import {
  BeatsInMeasure,
  BeatTypeInMeasure,
  DurationType,
  Letter,
  LetterNote,
  Octave,
} from '../types/theory';
import {
  BeamsBuilder,
  NOTE_Y_HEAD_OFFSET_STEM_DOWN,
  NOTE_Y_HEAD_OFFSET_STEM_UP,
  type NoteYPosition,
} from '../utils';
import { MIDDLE_STAFF_Y, STAFF_Y_PADDING } from '../utils/notationDimensions';
import { MUSIC_CHORD_NODE, MUSIC_NOTE_NODE } from '../utils/consts';
import { durationToFlagCountMap } from '../utils/theoryConsts';

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

export function buildBeamsRenderer(
  elements: NoteOrChordElementType[],
  timeSig: [BeatsInMeasure, BeatTypeInMeasure],
  noteToYCoordinate: (
    note: LetterNote | Letter | 'rest',
    octave?: Octave
  ) => number
): {
  beamsBuilder: BeamsBuilder;
  beamRenderer: ReturnType<BeamsBuilder['buildRenderer']>;
  stemDirections: boolean[];
} {
  const beamsBuilder = new BeamsBuilder(elements, timeSig);
  const stemDirections = determineStemDirections(
    elements,
    beamsBuilder,
    noteToYCoordinate
  );

  const noteYPositions: (NoteYPosition | null)[] = elements.map(
    (element, i) => {
      if (!beamsBuilder.isBeamed(i)) {
        return null;
      }
      const stemUp = stemDirections[i];
      const yHeadOffset = stemUp
        ? NOTE_Y_HEAD_OFFSET_STEM_UP
        : NOTE_Y_HEAD_OFFSET_STEM_DOWN;

      if (element.nodeName === MUSIC_NOTE_NODE) {
        const noteElement = element as NoteElementType;
        return {
          y:
            STAFF_Y_PADDING +
            noteToYCoordinate(
              noteElement.note,
              noteElement.octave ?? undefined
            ) -
            yHeadOffset,
          stemUp,
        };
      }

      const chordElement = element as ChordElementType;
      const staffYCoordinates = chordElement.notes.map((note) =>
        noteToYCoordinate(note.value, note.octave ?? undefined)
      );
      const extremalStaffY = stemUp
        ? Math.max(...staffYCoordinates)
        : Math.min(...staffYCoordinates);

      const beamCount =
        durationToFlagCountMap.get(chordElement.duration as DurationType) ?? 1;
      const NOTEHEAD_BEAM_CLEAR = 7.2 + beamCount * 12;
      const nonExtStaffYs = staffYCoordinates.filter(
        (y) => y !== extremalStaffY
      );

      let chordClearanceY: number | undefined;
      if (nonExtStaffYs.length > 0) {
        chordClearanceY = stemUp
          ? Math.min(...nonExtStaffYs) - NOTEHEAD_BEAM_CLEAR
          : Math.max(...nonExtStaffYs) + NOTEHEAD_BEAM_CLEAR;
      }

      return {
        y: STAFF_Y_PADDING + extremalStaffY - yHeadOffset,
        stemUp,
        chordClearanceY,
      };
    }
  );

  return {
    beamsBuilder,
    beamRenderer: beamsBuilder.buildRenderer(noteYPositions),
    stemDirections,
  };
}

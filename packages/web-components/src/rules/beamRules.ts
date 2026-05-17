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
import { MUSIC_NOTE_NODE } from '../utils/consts';
import { STAFF_Y_PADDING } from '../utils/notationDimensions';
import { durationToFlagCountMap } from '../utils/theoryConsts';
import { determineStemDirections } from './stemRules';

export { determineStemDirections };

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

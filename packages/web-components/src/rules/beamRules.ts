import {
  ChordElementType,
  NoteChordOrRestElementType,
  NoteElementType,
  TupletElementType,
} from '../types/elements';
import {
  BeatsInMeasure,
  BeatTypeInMeasure,
  DurationType,
} from '../types/theory';
import {
  BeamsBuilder,
  NOTE_Y_HEAD_OFFSET_STEM_DOWN,
  NOTE_Y_HEAD_OFFSET_STEM_UP,
  type NoteYPosition,
} from '../utils';
import { MUSIC_NOTE_NODE } from '../utils/consts';
import { STAFF_Y_PADDING } from '../utils/notationDimensions';
import { determineStemDirections } from './staffNoteRules';
import { durationToFactor, durationToFlagCountMap } from './theoryConsts';
import { parseTupletRatio } from './tupletRules';

export function buildBeamsRenderer(
  elements: NoteChordOrRestElementType[],
  timeSig: [BeatsInMeasure, BeatTypeInMeasure],
  noteStaffYCoords: ReadonlyMap<NoteElementType, number>,
  chordStaffYCoords: ReadonlyMap<ChordElementType, number[]>,
  tupletsByIndex: ReadonlyMap<number, TupletElementType[]>
): {
  beamsBuilder: BeamsBuilder;
  beamRenderer: ReturnType<BeamsBuilder['buildRenderer']>;
  stemDirections: boolean[];
} {
  const elementDurationFactors = elements.map((element, i) => {
    const dur = element.duration as DurationType;
    const ancestors = tupletsByIndex.get(i);
    if (ancestors !== undefined) {
      const innermostTuplet = ancestors[ancestors.length - 1];
      const { actual, normal } = parseTupletRatio(innermostTuplet.ratio);
      return durationToFactor[dur] * (normal / actual);
    }
    return durationToFactor[dur];
  });
  const beamsBuilder = new BeamsBuilder(
    elements,
    timeSig,
    elementDurationFactors
  );
  const stemDirections = determineStemDirections(
    elements,
    beamsBuilder,
    noteStaffYCoords,
    chordStaffYCoords
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
        const flagCount =
          durationToFlagCountMap.get(noteElement.duration as DurationType) ?? 1;
        return {
          y:
            STAFF_Y_PADDING +
            (noteStaffYCoords.get(noteElement) ?? 0) -
            yHeadOffset,
          stemUp,
          flagCount,
        };
      }

      const chordElement = element as ChordElementType;
      const staffYCoordinates = chordStaffYCoords.get(chordElement) ?? [];
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
        flagCount: beamCount,
      };
    }
  );

  return {
    beamsBuilder,
    beamRenderer: beamsBuilder.buildRenderer(noteYPositions),
    stemDirections,
  };
}

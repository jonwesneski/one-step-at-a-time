import {
  ArpeggioGroupPlacement,
  NoteChordOrRestElementType,
  TremoloGroupPlacement,
  TupletElementType,
} from '../types/elements';
import { BeatsInMeasure, BeatTypeInMeasure } from '../types/theory';
import { computeTremoloScaleByIndex, durationContribution } from './beatRules';
import { factorToDuration } from './theoryConsts';

export type MeasureFitResult = {
  allowedElementCount: number;
  error: string | null;
};

/**
 * Determines how many leading elements fit within the measure's total
 * duration, accounting for tuplet-scaled duration contributions. Elements
 * from the returned count onward do not fit and should not be rendered.
 *
 * `<music-arpeggio>` run notes (a written-out arpeggiated chord) do not consume
 * measure duration — only the group's target chord/note does. If the target
 * overflows, the whole group is dropped (never a run whose target didn't fit).
 * A `<music-tremolo>` fits or drops as a whole too, its members each counting
 * their share of the written value.
 */
export function computeAllowedElementCount(
  elements: NoteChordOrRestElementType[],
  timeSig: [BeatsInMeasure, BeatTypeInMeasure],
  tupletsByIndex: ReadonlyMap<number, TupletElementType[]>,
  arpeggioGroups: readonly ArpeggioGroupPlacement[] = [],
  tremoloGroups: readonly TremoloGroupPlacement[] = []
): MeasureFitResult {
  const [beatsInMeasure, beatType] = timeSig;
  const measureDuration = beatsInMeasure / beatType;

  const runIndexSet = new Set<number>(
    arpeggioGroups.flatMap((group) => group.runIndices)
  );
  const groupFirstIndexByMember = new Map<number, number>();
  for (const group of arpeggioGroups) {
    const first = Math.min(...group.runIndices, group.targetIndex);
    for (const index of [...group.runIndices, group.targetIndex]) {
      groupFirstIndexByMember.set(index, first);
    }
  }
  for (const { memberIndices } of tremoloGroups) {
    for (const index of memberIndices) {
      groupFirstIndexByMember.set(index, memberIndices[0]);
    }
  }
  const tremoloScaleByIndex = computeTremoloScaleByIndex(tremoloGroups);

  let beatOffset = 0;
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const contribution = durationContribution(
      element,
      i,
      tupletsByIndex,
      runIndexSet,
      tremoloScaleByIndex
    );

    if (beatOffset + contribution > measureDuration + 1e-9) {
      const error = `no more room for note(s); remaining duration is "${
        factorToDuration.get(measureDuration - beatOffset) ??
        measureDuration - beatOffset
      }", tried to add "${element.duration}"`;
      return {
        allowedElementCount: groupFirstIndexByMember.get(i) ?? i,
        error,
      };
    }

    beatOffset += contribution;
  }

  return { allowedElementCount: elements.length, error: null };
}

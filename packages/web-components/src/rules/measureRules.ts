import {
  NoteChordOrRestElementType,
  TupletElementType,
} from '../types/elements';
import {
  BeatsInMeasure,
  BeatTypeInMeasure,
  DurationType,
} from '../types/theory';
import { durationToFactor, factorToDuration } from './theoryConsts';
import { parseTupletRatio } from './tupletRules';

export type MeasureFitResult = {
  allowedElementCount: number;
  error: string | null;
};

/**
 * Determines how many leading elements fit within the measure's total
 * duration, accounting for tuplet-scaled duration contributions. Elements
 * from the returned count onward do not fit and should not be rendered.
 */
export function computeAllowedElementCount(
  elements: NoteChordOrRestElementType[],
  timeSig: [BeatsInMeasure, BeatTypeInMeasure],
  tupletsByIndex: ReadonlyMap<number, TupletElementType[]>
): MeasureFitResult {
  const [beatsInMeasure, beatType] = timeSig;
  const measureDuration = beatsInMeasure / beatType;

  let beatOffset = 0;
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const duration = element.duration as DurationType;
    const tupletAncestors = tupletsByIndex.get(i);
    const innermostTuplet =
      tupletAncestors !== undefined
        ? tupletAncestors[tupletAncestors.length - 1]
        : undefined;
    const durationContribution =
      innermostTuplet !== undefined
        ? (() => {
            const { actual, normal } = parseTupletRatio(innermostTuplet.ratio);
            return durationToFactor[duration] * (normal / actual);
          })()
        : durationToFactor[duration];

    if (beatOffset + durationContribution > measureDuration) {
      const error = `no more room for note(s); remaining duration is "${
        factorToDuration.get(measureDuration - beatOffset) ??
        measureDuration - beatOffset
      }", tried to add "${duration}"`;
      return { allowedElementCount: i, error };
    }

    beatOffset += durationContribution;
  }

  return { allowedElementCount: elements.length, error: null };
}

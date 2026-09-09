import {
  ArpeggioGroupPlacement,
  NoteChordOrRestElementType,
  TupletElementType,
} from '../types/elements';
import {
  BeatsInMeasure,
  BeatTypeInMeasure,
  DurationType,
} from '../types/theory';
import { durationToFactor, factorToDuration } from './theoryConsts';
import { parseTupletRatio, resolveInnermostTuplet } from './tupletRules';

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
 */
export function computeAllowedElementCount(
  elements: NoteChordOrRestElementType[],
  timeSig: [BeatsInMeasure, BeatTypeInMeasure],
  tupletsByIndex: ReadonlyMap<number, TupletElementType[]>,
  arpeggioGroups: readonly ArpeggioGroupPlacement[] = []
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

  let beatOffset = 0;
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const duration = element.duration as DurationType;
    const innermostTuplet = resolveInnermostTuplet(tupletsByIndex, i);
    const durationContribution = runIndexSet.has(i)
      ? 0
      : innermostTuplet !== undefined
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
      return {
        allowedElementCount: groupFirstIndexByMember.get(i) ?? i,
        error,
      };
    }

    beatOffset += durationContribution;
  }

  return { allowedElementCount: elements.length, error: null };
}

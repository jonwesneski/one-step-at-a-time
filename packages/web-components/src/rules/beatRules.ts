import { TupletElementType } from '../types/elements';
import { DurationType } from '../types/theory';
import { durationToFactor } from './theoryConsts';
import { parseTupletRatio, resolveInnermostTuplet } from './tupletRules';

/**
 * How much of a measure's total duration (as a whole-note fraction) one entry
 * consumes. A tupleted entry contributes its ratio-scaled duration (e.g. a
 * triplet eighth contributes 2/3 of a plain eighth's duration); an
 * `<music-arpeggio>` run note contributes zero — the run itself consumes no
 * beat time, only its target chord/note does.
 *
 * Single source of truth for "how much beat-time does this entry occupy",
 * shared by bar-fit (measureRules.ts), beam grouping (beamRules.ts), and
 * horizontal spacing (spacingRules.ts) — previously computed three times with
 * the same logic. Takes a structural `{ duration }` shape (matching
 * spacingRules.ts's computeSpacingWeights) rather than the note/chord/rest
 * union so guitar tab's simpler element type can reuse it too.
 */
export function durationContribution(
  element: { readonly duration: DurationType },
  index: number,
  tupletsByIndex: ReadonlyMap<number, TupletElementType[]>,
  arpeggioRunIndices: ReadonlySet<number> = new Set()
): number {
  if (arpeggioRunIndices.has(index)) {
    return 0;
  }
  const innermostTuplet = resolveInnermostTuplet(tupletsByIndex, index);
  if (innermostTuplet !== undefined) {
    const { actual, normal } = parseTupletRatio(innermostTuplet.ratio);
    return durationToFactor[element.duration] * (normal / actual);
  }
  return durationToFactor[element.duration];
}

/**
 * Cumulative whole-note-fraction offset at which each entry starts, relative
 * to the start of the measure (offsets[0] is always 0). Depends only on the
 * entries before it — appending a new entry never changes an earlier entry's
 * offset. Used by spacingRules.ts to position each entry as a fraction of the
 * measure's fixed beat capacity (from the time signature), not of the
 * current entry count.
 */
export function computeBeatOffsets(
  elements: ReadonlyArray<{ readonly duration: DurationType }>,
  tupletsByIndex: ReadonlyMap<number, TupletElementType[]>,
  arpeggioRunIndices: ReadonlySet<number> = new Set()
): number[] {
  const offsets: number[] = [];
  let offset = 0;
  for (let i = 0; i < elements.length; i++) {
    offsets.push(offset);
    offset += durationContribution(
      elements[i],
      i,
      tupletsByIndex,
      arpeggioRunIndices
    );
  }
  return offsets;
}

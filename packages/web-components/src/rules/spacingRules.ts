import { DurationType } from '../types/theory';
import { MIN_NOTE_WIDTH, PIXELS_PER_BEAT } from '../utils/notationDimensions';
import { durationToFactor } from './theoryConsts';

/**
 * Two separate concerns:
 * 1. Position (`computeMeasureProportionalOffsets`): an entry's beat-offset
 *    over the measure's fixed beat capacity, scaled by the available width.
 * 2. Sizing preference (`computeSpacingWeights`): how wide a measure would
 *    like to be given how busy it is; it doesn't move entries.
 */

// ─── Position ───────────────────────────────────────────────────────────────

/**
 * Per-entry x-offset (px): `beatOffsets[i] / measureCapacity ×
 * availableWidth`. Neither depends on entry count, so appending never moves an
 * earlier entry. Callers layer collision clamps on top.
 */
export function computeMeasureProportionalOffsets(
  beatOffsets: readonly number[],
  measureCapacity: number,
  availableWidth: number
): number[] {
  if (measureCapacity <= 0) {
    return beatOffsets.map(() => 0);
  }
  const width = Math.max(0, availableWidth);
  return beatOffsets.map(
    (beatOffset) => (beatOffset / measureCapacity) * width
  );
}

// ─── Sizing preference ──────────────────────────────────────────────────────

export interface SpacingWeights {
  /**
   * Per-entry slack (px) beyond the MIN_NOTE_WIDTH strut, parallel to
   * `entries`, floored at 0. Excludes the strut, which staffWidth.ts adds.
   */
  weights: number[];
  /** Σ of `weights` — the measure's total slack beyond its strut. */
  totalWeight: number;
}

/**
 * Slack (px) beyond the MIN_NOTE_WIDTH strut for every entry: its own
 * duration × PIXELS_PER_BEAT minus the strut, scaled by
 * `tupletScaleByIndex.get(i)` (normal/actual) when tupleted, floored at 0.
 * Feeds only the measure's sizing *preference* (staffWidth.ts) — not entry
 * position, which is computeMeasureProportionalOffsets above.
 */
export function computeSpacingWeights(
  entries: ReadonlyArray<{ readonly duration: DurationType }>,
  tupletScaleByIndex: ReadonlyMap<number, number> = new Map()
): SpacingWeights {
  let totalWeight = 0;
  const weights = entries.map((entry, i) => {
    const factor = durationToFactor[entry.duration];
    const scale = tupletScaleByIndex.get(i) ?? 1;
    const weight =
      Math.max(0, factor * PIXELS_PER_BEAT - MIN_NOTE_WIDTH) * scale;
    totalWeight += weight;
    return weight;
  });
  return { weights, totalWeight };
}

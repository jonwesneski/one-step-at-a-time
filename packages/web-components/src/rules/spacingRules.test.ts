import { DurationType } from '../types/theory';
import { MIN_NOTE_WIDTH, PIXELS_PER_BEAT } from '../utils/notationDimensions';
import {
  computeMeasureProportionalOffsets,
  computeSpacingWeights,
} from './spacingRules';
import { durationToFactor } from './theoryConsts';

const entries = (...durations: DurationType[]): { duration: DurationType }[] =>
  durations.map((duration) => ({ duration }));

describe('computeSpacingWeights (sizing preference)', () => {
  it('returns empty results for no entries', () => {
    expect(computeSpacingWeights([])).toEqual({ weights: [], totalWeight: 0 });
  });

  it('gives equal weights to same-duration entries', () => {
    const { weights, totalWeight } = computeSpacingWeights(
      entries('quarter', 'quarter', 'quarter')
    );
    const expectedWeight =
      durationToFactor.quarter * PIXELS_PER_BEAT - MIN_NOTE_WIDTH;
    expect(weights).toEqual([expectedWeight, expectedWeight, expectedWeight]);
    expect(totalWeight).toBeCloseTo(3 * expectedWeight);
  });

  it('a whole note gets more slack than an eighth note', () => {
    const { weights } = computeSpacingWeights(entries('eighth', 'whole'));
    expect(weights[1]).toBeGreaterThan(weights[0]);
  });

  it('totalWeight is the sum of the per-entry weights', () => {
    const { weights, totalWeight } = computeSpacingWeights(
      entries('half', 'quarter', 'eighth', 'whole')
    );
    expect(totalWeight).toBeCloseTo(weights.reduce((a, b) => a + b, 0));
  });

  it('scales a tupleted entry by its normal/actual factor', () => {
    const triplet = new Map([
      [0, 2 / 3],
      [1, 2 / 3],
      [2, 2 / 3],
    ]);
    const plain = computeSpacingWeights(entries('quarter', 'quarter'));
    const tripled = computeSpacingWeights(
      entries('quarter', 'quarter', 'quarter'),
      triplet
    );
    // three triplet quarters occupy the slack of two straight quarters
    expect(tripled.totalWeight).toBeCloseTo(plain.totalWeight);
  });

  it('floors slack at 0 for durations shorter than MIN_NOTE_WIDTH worth of beats', () => {
    const { weights } = computeSpacingWeights(
      entries('hundredtwentyeighth', 'sixtyfourth')
    );
    expect(weights[0]).toBe(0);
    expect(weights[1]).toBe(0);
  });

  it('an entry weight is independent of how many other entries exist', () => {
    const alone = computeSpacingWeights(entries('quarter'));
    const withMore = computeSpacingWeights(
      entries('quarter', 'sixteenth', 'whole')
    );
    expect(withMore.weights[0]).toBeCloseTo(alone.weights[0]);
  });
});

describe('computeMeasureProportionalOffsets (position)', () => {
  it('starts the first entry at zero offset', () => {
    const offsets = computeMeasureProportionalOffsets([0, 0.25, 0.5], 1, 800);
    expect(offsets[0]).toBe(0);
  });

  it('positions an entry as its fraction of the fixed measure capacity, scaled by available width', () => {
    // 2 quarter notes in 4/4 (capacity = 1.0 whole note): note 2 starts at
    // beat 1 of 4, i.e. beatOffset 0.25 of capacity 1.0 -> 25% of the width
    const beatOffsets = [0, 0.25];
    const offsets = computeMeasureProportionalOffsets(beatOffsets, 1, 800);
    expect(offsets[0]).toBe(0);
    expect(offsets[1]).toBeCloseTo(0.25 * 800);
  });

  it('a full measure spreads its entries across the entire available width', () => {
    // 4 quarter notes exactly filling a 4/4 measure: beats 0, 0.25, 0.5, 0.75
    const beatOffsets = [0, 0.25, 0.5, 0.75];
    const offsets = computeMeasureProportionalOffsets(beatOffsets, 1, 2000);
    expect(offsets).toEqual([0, 500, 1000, 1500]);
  });

  it('scales proportionally with available width (resize reflows)', () => {
    const beatOffsets = [0, 0.25, 0.5, 0.75];
    const wide = computeMeasureProportionalOffsets(beatOffsets, 1, 2000);
    const narrow = computeMeasureProportionalOffsets(beatOffsets, 1, 800);
    for (let i = 1; i < wide.length; i++) {
      expect(narrow[i] / wide[i]).toBeCloseTo(800 / 2000);
    }
  });

  it('is append-only: earlier offsets never change when a new entry is added, holding capacity and width fixed', () => {
    const before = computeMeasureProportionalOffsets([0, 0.25], 1, 800);
    const after = computeMeasureProportionalOffsets([0, 0.25, 0.5], 1, 800);
    expect(after.slice(0, before.length)).toEqual(before);
  });

  it('is independent of how many other entries exist, unlike distributing among current entries', () => {
    // the core original bug: 2 quarter notes should land at 25%, not 50%
    const offsets = computeMeasureProportionalOffsets([0, 0.25], 1, 800);
    expect(offsets[1]).toBeCloseTo(0.25 * 800);
    expect(offsets[1]).not.toBeCloseTo(0.5 * 800);
  });

  it('returns all zeros when measure capacity is zero (degenerate guard)', () => {
    expect(computeMeasureProportionalOffsets([0, 0.25], 0, 800)).toEqual([
      0, 0,
    ]);
  });

  it('returns an empty array for no entries', () => {
    expect(computeMeasureProportionalOffsets([], 1, 800)).toEqual([]);
  });

  it('floors a negative available width at 0 (e.g. before real layout settles)', () => {
    expect(computeMeasureProportionalOffsets([0, 0.25], 1, -50)).toEqual([
      0, 0,
    ]);
  });
});

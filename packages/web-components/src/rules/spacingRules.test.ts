import { DurationType } from '../types/theory';
import { MIN_NOTE_WIDTH, PIXELS_PER_BEAT } from '../utils/notationDimensions';
import {
  columnOffsetAt,
  computeColumnOffsets,
  computeMeasureProportionalOffsets,
  computeRoomAfterEntries,
  computeSpacingWeights,
  computeUncrowdedWidth,
  layOutBar,
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
    // 2 quarter notes land at 25%, not 50%
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

describe('computeMeasureProportionalOffsets — limits', () => {
  it('changes nothing while no limit is passed', () => {
    expect(
      computeMeasureProportionalOffsets([0, 0.25, 0.5], 1, 400, [
        { beat: 0.5, offset: 200 },
      ])
    ).toEqual([0, 100, 200]);
  });

  it('squeezes the beats before a limit in proportion and spreads the rest', () => {
    expect(
      computeMeasureProportionalOffsets([0, 0.25, 0.5, 0.75], 1, 400, [
        { beat: 0.5, offset: 100 },
      ])
    ).toEqual([0, 50, 100, 250]);
  });

  it('passes no limit, and never runs backwards', () => {
    const limits = [
      { beat: 0.25, offset: 90 },
      { beat: 0.5, offset: 60 },
      { beat: 0.75, offset: 200 },
    ];
    const offsets = computeMeasureProportionalOffsets(
      [0, 0.25, 0.5, 0.75],
      1,
      400,
      limits
    );
    limits.forEach(({ offset }, i) =>
      expect(offsets[i + 1]).toBeLessThanOrEqual(offset)
    );
    expect([...offsets].sort((a, b) => a - b)).toEqual(offsets);
    expect(
      computeMeasureProportionalOffsets([0.5], 1, 400, [
        { beat: 0.5, offset: -50 },
      ])
    ).toEqual([0]);
  });
});

describe('computeRoomAfterEntries', () => {
  it('sums the room to the end of the bar', () => {
    const { roomAfter, columns } = computeRoomAfterEntries([
      { beatOffsets: [0, 0.5, 0.75], rooms: [20, 30, 25], lead: 0 },
    ]);
    expect(roomAfter).toEqual([[75, 55, 25]]);
    expect(columns).toEqual([
      { beat: 0, roomAfter: 75 },
      { beat: 0.5, roomAfter: 55 },
      { beat: 0.75, roomAfter: 25 },
    ]);
  });

  it('gives a beat the most any voice needs, and earlier beats no less', () => {
    const { roomAfter, columns } = computeRoomAfterEntries([
      { beatOffsets: [0, 0.5], rooms: [20, 25], lead: 0 },
      { beatOffsets: [0.5, 0.75], rooms: [40, 30], lead: 0 },
    ]);
    expect(roomAfter).toEqual([
      [90, 70],
      [70, 30],
    ]);
    expect(columns[0]).toEqual({ beat: 0, roomAfter: 90 });
  });

  it('keeps entries on one beat apart', () => {
    expect(
      computeRoomAfterEntries([
        { beatOffsets: [0, 0, 0.5], rooms: [20, 20, 25], lead: 0 },
      ]).roomAfter
    ).toEqual([[65, 45, 25]]);
  });
});

describe('computeColumnOffsets', () => {
  it('keeps a beat at its place unless an entry before it is in the way', () => {
    expect(
      computeColumnOffsets(
        [{ beatOffsets: [0, 0.25, 0.5], rooms: [20, 60, 20], lead: 0 }],
        (beat) => beat * 200
      )
    ).toEqual([
      { beat: 0, offset: 0 },
      { beat: 0.25, offset: 50 },
      { beat: 0.5, offset: 110 },
    ]);
  });

  it('moves a beat for every voice when one of them is pushed', () => {
    const columns = computeColumnOffsets(
      [
        { beatOffsets: [0, 0.25], rooms: [80, 20], lead: 0 },
        { beatOffsets: [0, 0.25, 0.5], rooms: [20, 40, 20], lead: 12 },
      ],
      (beat) => beat * 100
    );
    expect(columnOffsetAt(columns, 0)).toBe(12);
    expect(columnOffsetAt(columns, 0.25)).toBe(92);
    expect(columnOffsetAt(columns, 0.5)).toBe(132);
  });

  it('clears a whole run of entries on one beat', () => {
    const columns = computeColumnOffsets(
      [{ beatOffsets: [0, 0, 0, 0.5], rooms: [20, 20, 20, 20], lead: 0 }],
      () => 0
    );
    expect(columnOffsetAt(columns, 0.5)).toBe(60);
  });
});

describe('layOutBar', () => {
  const busyStart = {
    beatOffsets: [0, 0.125, 0.25, 0.375, 0.5],
    rooms: [20, 20, 20, 20, 25],
    lead: 0,
  };
  const busyEnd = {
    beatOffsets: [0, 0.5, 0.625, 0.75, 0.875],
    rooms: [20, 20, 20, 20, 25],
    lead: 0,
  };

  it('needs the room of both halves, whichever staff each is on', () => {
    const { requiredWidth } = layOutBar([busyStart, busyEnd], [], 1, 0);
    expect(requiredWidth).toBe(165);
    expect(layOutBar([busyStart], [], 1, 0).requiredWidth).toBe(105);
  });

  it('holds every beat in its required width, in the same place for both', () => {
    const { columns, requiredWidth } = layOutBar(
      [busyStart, busyEnd],
      [],
      1,
      165
    );
    expect(columnOffsetAt(columns, 0.5)).toBe(80);
    expect(columnOffsetAt(columns, 0.875)).toBe(requiredWidth - 25);
  });

  it('moves nothing when the last entry of an evenly filled bar is added', () => {
    const evenly = (count: number) => ({
      beatOffsets: Array.from({ length: count }, (_, i) => i / 8),
      rooms: Array.from({ length: count }, (_, i) => (i < count - 1 ? 20 : 25)),
      lead: 0,
    });
    const { requiredWidth, uncrowdedWidth } = layOutBar([evenly(8)], [], 1, 0);
    expect(uncrowdedWidth).toBe(requiredWidth);
    const full = layOutBar([evenly(8)], [], 1, requiredWidth).columns;
    const before = layOutBar([evenly(7)], [], 1, requiredWidth).columns;
    expect(full.slice(0, 7)).toEqual(before);
  });
});

describe('computeUncrowdedWidth', () => {
  const columns = [
    { beat: 0, roomAfter: 90 },
    { beat: 0.5, roomAfter: 60 },
    { beat: 0.75, roomAfter: 40 },
  ];

  it('is the least width at which no limit moves a beat', () => {
    const width = computeUncrowdedWidth(columns, 1);
    const offsetsAt = (available: number) =>
      computeMeasureProportionalOffsets(
        columns.map(({ beat }) => beat),
        1,
        available,
        columns.map(({ beat, roomAfter }) => ({
          beat,
          offset: available - roomAfter,
        }))
      );
    expect(width).toBe(160);
    expect(offsetsAt(width)).toEqual([0, 80, 120]);
    expect(offsetsAt(width - 20)[2]).toBeLessThan(0.75 * (width - 20));
  });

  it('ignores beats past the end of the bar', () => {
    expect(computeUncrowdedWidth([{ beat: 1, roomAfter: 40 }], 1)).toBe(0);
  });
});

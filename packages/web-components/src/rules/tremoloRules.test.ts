import type { DurationType, TremoloValue } from '../types/theory';
import {
  BASE_STEM_LENGTH_PX,
  BEAM_THICKNESS_PX,
  FLAG_STEM_STEP_PX,
  STAFF_BOTTOM_LINE_Y,
  STAFF_LINE_SPACING,
  STAFF_TOP_LINE_Y,
  TREMOLO_STEM_OVERSHOOT_PX,
  TREMOLO_STROKE_END_CLEARANCE_PX,
  TREMOLO_STROKE_HEAD_CLEARANCE_PX,
  TREMOLO_STROKE_RISE_PX,
  TREMOLO_STROKE_STEP_PX,
  TREMOLO_STROKE_THICKNESS_PX,
  TREMOLO_TAIL_ROOM_PX,
} from '../utils/notationDimensions';
import {
  beamedTremoloMinimumStemPx,
  resolveStrokeCount,
  resolveStrokePlacement,
  STAFF_BAND,
  stemEndingFor,
  tremoloStemFloorPx,
  tremoloStrokeCountWarning,
  unbeamedTremoloStemExtensionPx,
} from './tremoloRules';

// Treble staff-Ys.
const G5 = 25;
const D5 = 40;
const C5 = 45;
const B4 = 50;
const F4 = 65;
const E4 = 70;
const A3 = 90;

const HALF_HEIGHT = (TREMOLO_STROKE_THICKNESS_PX + TREMOLO_STROKE_RISE_PX) / 2;
const STAVE_LINES = [0, 1, 2, 3, 4].map(
  (line) => STAFF_TOP_LINE_Y + line * STAFF_LINE_SPACING
);

const onStaveLine = (y: number) =>
  STAVE_LINES.some((line) => Math.abs(line - y) < 1e-6);

describe('resolveStrokeCount', () => {
  it.each<[TremoloValue, DurationType, number]>([
    [2, 'quarter', 2],
    [1, 'eighth', 1],
    ['unmeasured', 'whole', 3],
    ['unmeasured', 'quarter', 3],
    ['unmeasured', 'dotted-quarter', 3],
    ['unmeasured', 'eighth', 2],
    ['unmeasured', 'dotted-eighth', 2],
    ['unmeasured', 'sixteenth', 1],
    ['unmeasured', 'thirtysecond', 1],
  ])('%s on a %s draws %i strokes', (value, duration, expected) => {
    expect(resolveStrokeCount(value, duration)).toBe(expected);
  });
});

describe('tremoloStrokeCountWarning', () => {
  it('warns past five beams in all', () => {
    expect(tremoloStrokeCountWarning(2, 'sixtyfourth')).toContain('128th');
  });

  it('stays quiet up to five beams', () => {
    expect(tremoloStrokeCountWarning(4, 'quarter')).toBeNull();
    expect(tremoloStrokeCountWarning(1, 'sixtyfourth')).toBeNull();
  });
});

describe('stemEndingFor', () => {
  it('is plain without tails, a tail unbeamed and a beam beamed', () => {
    expect(stemEndingFor('half', false)).toEqual({ kind: 'plain' });
    expect(stemEndingFor('dotted-eighth', false)).toEqual({
      kind: 'tail',
      flagCount: 1,
    });
    expect(stemEndingFor('sixteenth', true)).toEqual({
      kind: 'beam',
      beamCount: 2,
    });
  });
});

describe('resolveStrokePlacement', () => {
  it('centres one stroke on the stave line nearest the stem end, lengthening the stem to it', () => {
    const placement = resolveStrokePlacement({
      headY: E4,
      stemUp: true,
      strokeCount: 1,
      staff: STAFF_BAND,
      stemLengthPx: BASE_STEM_LENGTH_PX,
      ending: { kind: 'plain' },
      canLengthenStem: true,
    });
    expect(placement.centerYs).toEqual([D5]);
    expect(placement.stemFloorPx).toBeCloseTo(
      E4 - D5 + HALF_HEIGHT + TREMOLO_STEM_OVERSHOOT_PX
    );
  });

  it('keeps one stroke on the outer stave line when the stem runs past the stave', () => {
    const placement = resolveStrokePlacement({
      headY: C5,
      stemUp: false,
      strokeCount: 1,
      staff: STAFF_BAND,
      stemLengthPx: BASE_STEM_LENGTH_PX,
      ending: { kind: 'plain' },
      canLengthenStem: true,
    });
    expect(placement.centerYs).toEqual([STAFF_BOTTOM_LINE_Y]);
    expect(placement.stemFloorPx).toBeLessThanOrEqual(BASE_STEM_LENGTH_PX);
  });

  it('draws the same strokes on the stem it sized', () => {
    const sizing = resolveStrokePlacement({
      headY: E4,
      stemUp: true,
      strokeCount: 1,
      staff: STAFF_BAND,
      stemLengthPx: BASE_STEM_LENGTH_PX,
      ending: { kind: 'plain' },
      canLengthenStem: true,
    });
    const drawn = resolveStrokePlacement({
      headY: E4,
      stemUp: true,
      strokeCount: 1,
      staff: STAFF_BAND,
      stemLengthPx: sizing.stemFloorPx,
      ending: { kind: 'plain' },
      canLengthenStem: false,
    });
    expect(drawn.centerYs).toEqual(sizing.centerYs);
  });

  it('centres two strokes on a stave line', () => {
    const { centerYs } = resolveStrokePlacement({
      headY: E4,
      stemUp: true,
      strokeCount: 2,
      staff: STAFF_BAND,
      stemLengthPx: BASE_STEM_LENGTH_PX,
      ending: { kind: 'plain' },
      canLengthenStem: true,
    });
    expect(onStaveLine((centerYs[0] + centerYs[1]) / 2)).toBe(true);
  });

  it('keeps three strokes a space from the head’s centre, lengthening the stem past the outermost', () => {
    const { centerYs, stemFloorPx } = resolveStrokePlacement({
      headY: G5,
      stemUp: false,
      strokeCount: 3,
      staff: STAFF_BAND,
      stemLengthPx: BASE_STEM_LENGTH_PX,
      ending: { kind: 'plain' },
      canLengthenStem: true,
    });
    expect(centerYs).toHaveLength(3);
    expect(centerYs[1] - centerYs[0]).toBeCloseTo(TREMOLO_STROKE_STEP_PX);
    const innerEdge = centerYs[0] - HALF_HEIGHT;
    expect(innerEdge - G5).toBeGreaterThanOrEqual(
      TREMOLO_STROKE_HEAD_CLEARANCE_PX - 1e-6
    );
    expect(stemFloorPx).toBeGreaterThan(BASE_STEM_LENGTH_PX);
    expect(G5 + stemFloorPx).toBeCloseTo(
      centerYs[2] + HALF_HEIGHT + TREMOLO_STEM_OVERSHOOT_PX
    );
  });

  it('keeps a ledger note’s strokes inside the stave', () => {
    const { centerYs } = resolveStrokePlacement({
      headY: A3,
      stemUp: true,
      strokeCount: 3,
      staff: STAFF_BAND,
      stemLengthPx: A3 - B4,
      ending: { kind: 'plain' },
      canLengthenStem: true,
    });
    for (const y of centerYs) {
      expect(y).toBeGreaterThanOrEqual(STAFF_TOP_LINE_Y);
      expect(y).toBeLessThanOrEqual(STAFF_BOTTOM_LINE_Y);
    }
  });

  it('puts a semibreve’s strokes a space past its head on the notional stem side', () => {
    const { centerYs, stemFloorPx } = resolveStrokePlacement({
      headY: F4,
      stemUp: true,
      strokeCount: 3,
      staff: STAFF_BAND,
      stemLengthPx: null,
      ending: { kind: 'plain' },
      canLengthenStem: true,
    });
    expect(centerYs[0]).toBeCloseTo(
      F4 - TREMOLO_STROKE_HEAD_CLEARANCE_PX - HALF_HEIGHT
    );
    expect(centerYs[2]).toBeLessThan(centerYs[0]);
    expect(stemFloorPx).toBe(0);
  });

  it('snaps to nothing standalone', () => {
    const { centerYs } = resolveStrokePlacement({
      headY: 0,
      stemUp: true,
      strokeCount: 1,
      staff: null,
      stemLengthPx: BASE_STEM_LENGTH_PX,
      ending: { kind: 'plain' },
      canLengthenStem: true,
    });
    expect(centerYs[0]).toBeCloseTo(
      -(BASE_STEM_LENGTH_PX - TREMOLO_STEM_OVERSHOOT_PX - HALF_HEIGHT)
    );
  });

  it('keeps strokes on a drawn stem too short for them', () => {
    const stemLengthPx = 30;
    const { centerYs } = resolveStrokePlacement({
      headY: 0,
      stemUp: false,
      strokeCount: 3,
      staff: null,
      stemLengthPx,
      ending: { kind: 'plain' },
      canLengthenStem: false,
    });
    expect(centerYs[2] + HALF_HEIGHT).toBeCloseTo(
      stemLengthPx - TREMOLO_STEM_OVERSHOOT_PX
    );
  });

  it('clears a tail’s root, letting one stroke sit on the line next to the head', () => {
    const { centerYs, stemFloorPx } = resolveStrokePlacement({
      headY: E4,
      stemUp: true,
      strokeCount: 1,
      staff: STAFF_BAND,
      stemLengthPx: BASE_STEM_LENGTH_PX,
      ending: { kind: 'tail', flagCount: 2 },
      canLengthenStem: true,
    });
    expect(centerYs[0]).toBe(E4 - TREMOLO_STROKE_HEAD_CLEARANCE_PX);
    expect(stemFloorPx).toBeCloseTo(
      TREMOLO_STROKE_HEAD_CLEARANCE_PX +
        HALF_HEIGHT +
        TREMOLO_TAIL_ROOM_PX +
        FLAG_STEM_STEP_PX
    );
  });
});

describe('tremoloStemFloorPx', () => {
  it('is 0 without strokes', () => {
    expect(
      tremoloStemFloorPx({
        headY: E4,
        stemUp: true,
        strokeCount: 0,
        staff: STAFF_BAND,
        stemLengthPx: BASE_STEM_LENGTH_PX,
        ending: { kind: 'plain' },
      })
    ).toBe(0);
  });
});

describe('unbeamedTremoloStemExtensionPx', () => {
  it('leaves a stem without a tremolo alone', () => {
    expect(
      unbeamedTremoloStemExtensionPx({
        tremolo: null,
        duration: 'quarter',
        headYs: [E4],
        stemUp: true,
        staff: STAFF_BAND,
        stemExtensionPx: 3,
      })
    ).toBe(3);
  });

  it('lengthens a stem to carry its strokes', () => {
    expect(
      unbeamedTremoloStemExtensionPx({
        tremolo: 3,
        duration: 'quarter',
        headYs: [G5],
        stemUp: false,
        staff: STAFF_BAND,
        stemExtensionPx: 0,
      })
    ).toBeGreaterThan(0);
  });

  it('never shortens a stem', () => {
    expect(
      unbeamedTremoloStemExtensionPx({
        tremolo: 1,
        duration: 'quarter',
        headYs: [C5],
        stemUp: false,
        staff: STAFF_BAND,
        stemExtensionPx: 0,
      })
    ).toBe(0);
  });

  it('measures a chord from its head nearest the open end', () => {
    const chord = unbeamedTremoloStemExtensionPx({
      tremolo: 3,
      duration: 'quarter',
      headYs: [G5, E4],
      stemUp: false,
      staff: STAFF_BAND,
      stemExtensionPx: 0,
    });
    const nearestHead = unbeamedTremoloStemExtensionPx({
      tremolo: 3,
      duration: 'quarter',
      headYs: [E4],
      stemUp: false,
      staff: STAFF_BAND,
      stemExtensionPx: 0,
    });
    expect(chord).toBe(nearestHead);
  });

  it('ignores a stemless note', () => {
    expect(
      unbeamedTremoloStemExtensionPx({
        tremolo: 3,
        duration: 'whole',
        headYs: [F4],
        stemUp: true,
        staff: STAFF_BAND,
        stemExtensionPx: 0,
      })
    ).toBe(0);
  });
});

describe('beamedTremoloMinimumStemPx', () => {
  it('is undefined without a tremolo', () => {
    expect(
      beamedTremoloMinimumStemPx({
        tremolo: null,
        duration: 'eighth',
        nearestHeadY: E4,
        stemUp: true,
      })
    ).toBeUndefined();
  });

  it('reaches past the strokes, the clearance and the beam', () => {
    const minimum = beamedTremoloMinimumStemPx({
      tremolo: 1,
      duration: 'eighth',
      nearestHeadY: E4,
      stemUp: true,
    });
    const { centerYs } = resolveStrokePlacement({
      headY: E4,
      stemUp: true,
      strokeCount: 1,
      staff: STAFF_BAND,
      stemLengthPx: minimum ?? 0,
      ending: { kind: 'beam', beamCount: 1 },
      canLengthenStem: false,
    });
    expect(minimum).toBeCloseTo(
      E4 -
        centerYs[0] +
        HALF_HEIGHT +
        TREMOLO_STROKE_END_CLEARANCE_PX +
        BEAM_THICKNESS_PX
    );
  });
});

import type { DurationType, TremoloValue } from '../types/theory';
import {
  BASE_STEM_LENGTH_PX,
  BEAM_THICKNESS_PX,
  FLAG_STEM_STEP_PX,
  STAFF_BOTTOM_LINE_Y,
  STAFF_LINE_SPACING,
  STAFF_TOP_LINE_Y,
  STEM_CROSS_END_INSET_PX,
  STEM_CROSS_SIZE_PX,
  STEM_MULTIPHONIC_HEIGHT_PX,
  TREMOLO_BEAM_MAX_LENGTH_PX,
  TREMOLO_BEAM_MIN_LENGTH_PX,
  TREMOLO_BEAM_STEM_GAP_PX,
  TREMOLO_STEM_OVERSHOOT_PX,
  TREMOLO_STROKE_END_CLEARANCE_PX,
  TREMOLO_STROKE_HEAD_CLEARANCE_PX,
  TREMOLO_STROKE_RISE_PX,
  TREMOLO_STROKE_STEP_PX,
  TREMOLO_STROKE_THICKNESS_PX,
  TREMOLO_TAIL_ROOM_PX,
} from '../utils/notationDimensions';
import {
  acceptsBeamAttach,
  articulationRepeatCount,
  articulationRepeatCountWarning,
  articulationRepeatWarning,
  beamedTremoloMinimumStemPx,
  canPlaceTremoloBetween,
  drawnTremoloTuplet,
  flutterLabelConsistencyWarning,
  MAX_ARTICULATION_REPEATS,
  repetitionCount,
  resolveBetweenTremoloBeams,
  resolveStrokeCount,
  resolveStrokePlacement,
  resolveTremoloGroupLayout,
  STAFF_BAND,
  stemEndingFor,
  stemlessTremoloReachPx,
  stemMarkHalfHeightPx,
  TREMOLO_NUMERAL_EXTENT_PX,
  tremoloBeamCounts,
  tremoloConsistencyWarnings,
  tremoloDetachedSpan,
  tremoloInkPastStemPx,
  tremoloStemFloorPx,
  tremoloStrokeCountWarning,
  tremoloTupletWarning,
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

describe('repetitionCount', () => {
  it.each<[DurationType, number, number | null, number]>([
    ['quarter', 2, null, 4],
    ['quarter', 1, null, 2],
    ['half', 1, null, 4],
    ['whole', 1, null, 8],
    ['dotted-quarter', 1, null, 3],
    ['eighth', 1, null, 2],
    ['half', 1, 6, 6],
    ['quarter', 1, 3, 3],
  ])(
    'a %s with %i stroke(s) and numeral %s stands for %i notes',
    (duration, strokes, tuplet, expected) => {
      expect(repetitionCount(duration, strokes, tuplet)).toBe(expected);
    }
  );
});

describe('drawnTremoloTuplet', () => {
  it('draws a numeral only with a measured stroke count', () => {
    expect(drawnTremoloTuplet(1, 3)).toBe(3);
    expect(drawnTremoloTuplet('unmeasured', 3)).toBeNull();
    expect(drawnTremoloTuplet(null, 3)).toBeNull();
    expect(drawnTremoloTuplet(2, null)).toBeNull();
  });

  it('warns about a numeral it won’t draw', () => {
    expect(tremoloTupletWarning(null, 6)).toContain('tremolo-tuplet="6"');
    expect(tremoloTupletWarning('unmeasured', 6)).not.toBeNull();
    expect(tremoloTupletWarning(1, 6)).toBeNull();
    expect(tremoloTupletWarning(null, null)).toBeNull();
  });
});

describe('articulationRepeatCount', () => {
  const base = {
    articulationRepeat: true,
    articulation: 'staccato' as const,
    tremolo: 2 as const,
    tuplet: null,
    duration: 'quarter' as const,
  };

  it('repeats once per repetition', () => {
    expect(articulationRepeatCount(base)).toBe(4);
    expect(articulationRepeatCount({ ...base, tremolo: 1, tuplet: 3 })).toBe(3);
  });

  it('draws once without the attribute, a measured tremolo or a length mark', () => {
    expect(
      articulationRepeatCount({ ...base, articulationRepeat: false })
    ).toBe(1);
    expect(articulationRepeatCount({ ...base, tremolo: 'unmeasured' })).toBe(1);
    expect(articulationRepeatCount({ ...base, articulation: 'accent' })).toBe(
      1
    );
  });

  it('draws once when the row would be too long to write out', () => {
    expect(
      articulationRepeatCount({ ...base, tuplet: MAX_ARTICULATION_REPEATS })
    ).toBe(MAX_ARTICULATION_REPEATS);
    expect(
      articulationRepeatCount({ ...base, tuplet: MAX_ARTICULATION_REPEATS + 1 })
    ).toBe(1);
    expect(articulationRepeatCountWarning({ ...base, tuplet: 1000 })).toContain(
      '1000 repetitions'
    );
    expect(
      articulationRepeatCountWarning({
        ...base,
        tuplet: MAX_ARTICULATION_REPEATS,
      })
    ).toBeNull();
  });

  it('repeats the length mark of an accented articulation', () => {
    expect(
      articulationRepeatCount({ ...base, articulation: 'marcato-tenuto' })
    ).toBe(4);
  });

  it('explains why it draws once', () => {
    expect(articulationRepeatWarning('staccato', null)).not.toBeNull();
    expect(articulationRepeatWarning('fermata', 2)).toContain('fermata');
    expect(articulationRepeatWarning('accent-portato', 2)).toBeNull();
  });
});

describe('tremoloConsistencyWarnings', () => {
  const input = {
    tremolo: null,
    tuplet: 3,
    articulationRepeat: true,
    articulation: 'staccato' as const,
    duration: 'quarter' as const,
    label: null,
    inTremoloGroup: false,
  };

  it('checks only what the changed attribute affects', () => {
    expect(
      tremoloConsistencyWarnings({ ...input, changed: 'duration' })
    ).toHaveLength(0);
    expect(
      tremoloConsistencyWarnings({ ...input, changed: 'tremolo-tuplet' })
    ).toHaveLength(1);
    expect(
      tremoloConsistencyWarnings({ ...input, changed: 'articulation-repeat' })
    ).toHaveLength(1);
  });

  it('warns about too long a row when the numeral changes', () => {
    expect(
      tremoloConsistencyWarnings({
        ...input,
        tremolo: 1,
        tuplet: 1000,
        changed: 'tremolo-tuplet',
      })
    ).toEqual([expect.stringContaining('1000 repetitions')]);
  });

  it('checks everything when nothing changed', () => {
    expect(
      tremoloConsistencyWarnings({ ...input, changed: null })
    ).toHaveLength(2);
  });

  it('checks a flutter label when the label or the tremolo changes', () => {
    const flutter = {
      ...input,
      articulationRepeat: false,
      label: 'flz' as const,
    };
    expect(
      tremoloConsistencyWarnings({ ...flutter, changed: 'tremolo-label' })
    ).toEqual([expect.stringContaining('single-note tremolo')]);
    expect(
      tremoloConsistencyWarnings({ ...flutter, changed: 'tremolo' })
    ).toHaveLength(2);
    expect(
      tremoloConsistencyWarnings({ ...flutter, changed: 'duration' })
    ).toHaveLength(0);
  });
});

describe('flutterLabelConsistencyWarning', () => {
  it('needs a single-note tremolo under a flutter label', () => {
    for (const label of ['flz', 'flt', 'frull'] as const) {
      expect(flutterLabelConsistencyWarning(label, null, false)).toContain(
        'single-note tremolo'
      );
      expect(
        flutterLabelConsistencyWarning(label, 'unmeasured', false)
      ).toBeNull();
    }
  });

  it('warns about a flutter label on a <music-tremolo> member', () => {
    expect(flutterLabelConsistencyWarning('flz', 3, true)).toContain(
      'single-note tremolo'
    );
  });

  it('warns about an ordinary label on a tremolo note', () => {
    for (const label of ['ord', 'nat', 'norm'] as const) {
      expect(
        flutterLabelConsistencyWarning(label, 'unmeasured', false)
      ).toContain('remove the tremolo');
      expect(flutterLabelConsistencyWarning(label, null, false)).toBeNull();
    }
  });

  it('leaves trem. and non trem. to the tremolo rules', () => {
    expect(flutterLabelConsistencyWarning('trem', null, false)).toBeNull();
    expect(flutterLabelConsistencyWarning('non-trem', 2, false)).toBeNull();
    expect(flutterLabelConsistencyWarning(null, null, false)).toBeNull();
  });
});

describe('tremolo ink past the stem', () => {
  it('is the numeral on a stemmed note', () => {
    expect(
      tremoloInkPastStemPx({
        tremolo: 1,
        tuplet: 3,
        duration: 'quarter',
        headY: E4,
        stemUp: true,
      })
    ).toBe(TREMOLO_NUMERAL_EXTENT_PX);
    expect(
      tremoloInkPastStemPx({
        tremolo: 1,
        tuplet: null,
        duration: 'quarter',
        headY: E4,
        stemUp: true,
      })
    ).toBe(0);
  });

  it('measures a stemless head’s strokes and numeral', () => {
    const plain = stemlessTremoloReachPx({
      tremolo: 3,
      tuplet: null,
      duration: 'whole',
      headY: F4,
      stemUp: true,
    });
    const numbered = stemlessTremoloReachPx({
      tremolo: 3,
      tuplet: 12,
      duration: 'whole',
      headY: F4,
      stemUp: true,
    });
    expect(plain).toBeGreaterThan(0);
    expect(numbered - plain).toBeCloseTo(TREMOLO_NUMERAL_EXTENT_PX);
    expect(
      tremoloInkPastStemPx({
        tremolo: 3,
        tuplet: 12,
        duration: 'whole',
        headY: F4,
        stemUp: true,
      })
    ).toBeCloseTo(Math.max(0, numbered - BASE_STEM_LENGTH_PX));
  });
});

describe('tremoloBeamCounts', () => {
  it.each<[DurationType, 'all' | 'outer' | null, number, number]>([
    ['whole', null, 0, 3],
    ['quarter', null, 0, 3],
    ['half', null, 0, 3],
    ['half', 'all', 3, 3],
    ['half', 'outer', 1, 3],
    ['dotted-half', 'outer', 1, 3],
    ['eighth', null, 1, 4],
    ['sixteenth', null, 2, 5],
  ])(
    'a %s tremolo with beam-attach %s attaches %i of %i beams',
    (duration, beamAttach, attached, total) => {
      expect(tremoloBeamCounts(duration, 3, beamAttach)).toEqual({
        attached,
        total,
      });
    }
  );

  it('only lets minims choose which beams attach', () => {
    expect(acceptsBeamAttach('half')).toBe(true);
    expect(acceptsBeamAttach('dotted-half')).toBe(true);
    expect(acceptsBeamAttach('quarter')).toBe(false);
  });
});

describe('canPlaceTremoloBetween', () => {
  it('needs an octave or more between the nearest heads', () => {
    const G4 = 60;
    const G5 = 25;
    const F5 = 30;
    expect(canPlaceTremoloBetween([G4], [G5])).toBe(true);
    expect(canPlaceTremoloBetween([G4], [F5])).toBe(false);
  });
});

describe('resolveTremoloGroupLayout', () => {
  const pair = (attached: number, total: number, gap = 50) =>
    resolveTremoloGroupLayout({
      members: [
        { stemX: 0, nearestHeadY: F4 },
        { stemX: gap, nearestHeadY: F4 },
      ],
      stemUp: true,
      attached,
      total,
    });

  it("steps a cue group's beams at ¾", () => {
    const full = pair(1, 3);
    const cue = resolveTremoloGroupLayout({
      members: [
        { stemX: 0, nearestHeadY: F4 },
        { stemX: 50, nearestHeadY: F4 },
      ],
      stemUp: true,
      attached: 1,
      total: 3,
      scale: 0.75,
    });
    expect(cue.levelOffset).toBeCloseTo(0.75 * full.levelOffset);
  });

  it('draws every beam, detached ones stopping short of both stems', () => {
    const { beams } = pair(0, 3);
    expect(beams).toHaveLength(3);
    for (const beam of beams) {
      expect(beam.x1).toBeCloseTo(TREMOLO_BEAM_STEM_GAP_PX);
      expect(beam.x2).toBeCloseTo(50 - TREMOLO_BEAM_STEM_GAP_PX);
    }
  });

  it('runs attached beams stem to stem and stacks the rest inside them', () => {
    const { beams, levelOffset } = pair(1, 3);
    expect(beams[0].x1).toBe(0);
    expect(beams[0].x2).toBe(50);
    expect(beams[1].x1).toBeGreaterThan(0);
    expect(beams[1].top1 - beams[0].top1).toBeCloseTo(levelOffset);
  });

  it('caps a long detached beam and centres it', () => {
    const { beams } = pair(0, 3, 300);
    expect(beams[0].x2 - beams[0].x1).toBeCloseTo(TREMOLO_BEAM_MAX_LENGTH_PX);
    expect((beams[0].x1 + beams[0].x2) / 2).toBeCloseTo(150);
  });

  it('puts the primary beam at each stem where the stems end', () => {
    const { primaryTops, beams } = pair(0, 3);
    expect(primaryTops).toHaveLength(2);
    expect(primaryTops[0]).toBeLessThan(F4);
    expect(beams[0].top1).toBeGreaterThanOrEqual(
      Math.min(...primaryTops) - 1e-6
    );
  });

  it('centres detached beams on the middle note of three, and between the middle two of four', () => {
    const layout = (xs: number[]) =>
      resolveTremoloGroupLayout({
        members: xs.map((stemX) => ({ stemX, nearestHeadY: F4 })),
        stemUp: true,
        attached: 0,
        total: 3,
      }).beams[0];
    const three = layout([0, 40, 120]);
    expect((three.x1 + three.x2) / 2).toBeCloseTo(40);
    const four = layout([0, 40, 80, 120]);
    expect((four.x1 + four.x2) / 2).toBeCloseTo(60);
  });
});

describe('resolveBetweenTremoloBeams', () => {
  it('stacks the beams on the line between the heads, sloping with it but no steeper than a short beam', () => {
    const beams = resolveBetweenTremoloBeams({
      from: { edgeX: 0, centerY: 60 },
      to: { edgeX: 40, centerY: 25 },
      strokes: 3,
    });
    expect(beams).toHaveLength(3);
    const middle = beams[1];
    expect((middle.top1 + middle.top2) / 2 + BEAM_THICKNESS_PX / 2).toBeCloseTo(
      42.5
    );
    expect(middle.top2).toBeLessThan(middle.top1);
    expect(middle.top1 - middle.top2).toBeLessThanOrEqual(
      STAFF_LINE_SPACING + 1e-6
    );
  });
});

describe('tremoloDetachedSpan', () => {
  it('keeps a minimum length between stems too close for the usual gap', () => {
    const { x1, x2 } = tremoloDetachedSpan([0, 12]);
    expect(x2 - x1).toBeCloseTo(TREMOLO_BEAM_MIN_LENGTH_PX);
    expect((x1 + x2) / 2).toBeCloseTo(6);
  });

  it('never reaches past the stems', () => {
    const { x1, x2 } = tremoloDetachedSpan([0, 4]);
    expect(x1).toBeGreaterThanOrEqual(0);
    expect(x2).toBeLessThanOrEqual(4);
  });
});

describe('a stem cross', () => {
  const cross = (
    input: Partial<Parameters<typeof resolveStrokePlacement>[0]> = {}
  ) =>
    resolveStrokePlacement({
      headY: E4,
      stemUp: true,
      strokeCount: 0,
      staff: STAFF_BAND,
      stemLengthPx: BASE_STEM_LENGTH_PX,
      ending: { kind: 'plain' },
      canLengthenStem: true,
      stemMark: 'cross',
      ...input,
    });

  it('stands a space in from a plain stem’s end, without lengthening it', () => {
    const placement = cross();
    expect(placement.centerYs).toEqual([]);
    expect(placement.markCenterY).toBeCloseTo(
      E4 - BASE_STEM_LENGTH_PX + STEM_CROSS_END_INSET_PX
    );
    expect(placement.stemFloorPx).toBeCloseTo(BASE_STEM_LENGTH_PX);
  });

  it('keeps clear of a tail’s root and the beams', () => {
    const plain = cross().markCenterY ?? 0;
    const tailed = cross({ ending: { kind: 'tail', flagCount: 1 } });
    const beamed = cross({ ending: { kind: 'beam', beamCount: 2 } });
    expect(tailed.markCenterY).toBeGreaterThan(plain);
    expect(beamed.markCenterY).toBeGreaterThan(plain);
    expect(E4 - BASE_STEM_LENGTH_PX + TREMOLO_TAIL_ROOM_PX).toBeLessThanOrEqual(
      (tailed.markCenterY ?? 0) - STEM_CROSS_SIZE_PX / 2
    );
  });

  it('lengthens a stem too short for it, or stays on one already drawn', () => {
    const short = 15;
    const lengthened = cross({ stemLengthPx: short });
    expect(lengthened.stemFloorPx).toBeGreaterThan(short);
    expect(E4 - (lengthened.markCenterY ?? 0)).toBeGreaterThan(
      STEM_CROSS_SIZE_PX
    );
    const drawn = cross({ stemLengthPx: short, canLengthenStem: false });
    expect(E4 - (drawn.markCenterY ?? 0)).toBeLessThan(short);
  });

  it('goes between tremolo strokes and the head', () => {
    const placement = cross({ strokeCount: 2, headY: C5, stemUp: false });
    const [first] = placement.centerYs;
    expect(placement.markCenterY).toBeGreaterThan(C5);
    expect(placement.markCenterY).toBeLessThan(first - HALF_HEIGHT);
    expect(
      first -
        HALF_HEIGHT -
        ((placement.markCenterY ?? 0) + STEM_CROSS_SIZE_PX / 2)
    ).toBeGreaterThan(0);
  });

  it('takes a stemless head’s notional stem side and counts as its ink', () => {
    const placement = cross({ stemLengthPx: null, stemUp: false, headY: C5 });
    expect(placement.markCenterY).toBeGreaterThan(C5);
    expect(
      stemlessTremoloReachPx({
        tremolo: null,
        stemMark: 'cross',
        tuplet: null,
        duration: 'whole',
        headY: C5,
        stemUp: false,
      })
    ).toBeCloseTo((placement.markCenterY ?? 0) - C5 + STEM_CROSS_SIZE_PX / 2);
  });

  it('makes a beamed or unbeamed stem long enough', () => {
    expect(
      unbeamedTremoloStemExtensionPx({
        tremolo: null,
        stemMark: 'cross',
        duration: 'sixteenth',
        headYs: [E4],
        stemUp: true,
        staff: STAFF_BAND,
        stemExtensionPx: 0,
      })
    ).toBeGreaterThan(0);
    expect(
      beamedTremoloMinimumStemPx({
        tremolo: null,
        stemMark: 'cross',
        duration: 'sixteenth',
        nearestHeadY: E4,
        stemUp: true,
      })
    ).toBeGreaterThan(0);
    expect(
      beamedTremoloMinimumStemPx({
        tremolo: null,
        duration: 'sixteenth',
        nearestHeadY: E4,
        stemUp: true,
      })
    ).toBeUndefined();
  });
});

describe('a multiphonic M through the stem', () => {
  const placed = (
    stemMark: 'cross' | 'multiphonic',
    input: Partial<Parameters<typeof resolveStrokePlacement>[0]> = {}
  ) =>
    resolveStrokePlacement({
      headY: E4,
      stemUp: true,
      strokeCount: 0,
      staff: STAFF_BAND,
      stemLengthPx: BASE_STEM_LENGTH_PX,
      ending: { kind: 'plain' },
      canLengthenStem: true,
      stemMark,
      ...input,
    });

  it('leaves as much plain stem past it as the cross does', () => {
    const extra =
      stemMarkHalfHeightPx('multiphonic') - stemMarkHalfHeightPx('cross');
    expect(placed('multiphonic').markCenterY).toBeCloseTo(
      (placed('cross').markCenterY ?? 0) + extra
    );
    expect(placed('multiphonic').stemFloorPx).toBeCloseTo(BASE_STEM_LENGTH_PX);
  });

  it('keeps its taller ink clear of the head, lengthening a short stem further', () => {
    const half = stemMarkHalfHeightPx('multiphonic');
    expect(half).toBeCloseTo(STEM_MULTIPHONIC_HEIGHT_PX / 2);
    const multiphonic = placed('multiphonic', { stemLengthPx: 15 });
    const cross = placed('cross', { stemLengthPx: 15 });
    expect(multiphonic.stemFloorPx).toBeGreaterThan(cross.stemFloorPx);
    expect(E4 - (multiphonic.markCenterY ?? 0) - half).toBeGreaterThan(0);
  });

  it('counts as a stemless head’s ink by its own height', () => {
    expect(
      stemlessTremoloReachPx({
        tremolo: null,
        stemMark: 'multiphonic',
        tuplet: null,
        duration: 'whole',
        headY: C5,
        stemUp: false,
      })
    ).toBeGreaterThan(
      stemlessTremoloReachPx({
        tremolo: null,
        stemMark: 'cross',
        tuplet: null,
        duration: 'whole',
        headY: C5,
        stemUp: false,
      })
    );
  });
});

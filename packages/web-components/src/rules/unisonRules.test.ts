import type { AccidentalType, BaseDurationType } from '../types/theory';
import {
  ACCIDENTAL_SYMBOL_WIDTH,
  DIAGONAL_STEM_JOIN_CLEARANCE_PX,
  FLAG_STEM_STEP_PX,
  PRONG_LIFT_PX,
  UNISON_STEM_CLEARANCE_PX,
} from '../utils/notationDimensions';
import {
  accidentalChromaticRank,
  canShareNotehead,
  groupUnisonPlacements,
  headClassOf,
  resolveAlteredSingleStemGroup,
  resolveUnisonDiagonal,
  resolveUnisonPair,
  resolveUnisonStemGroups,
  UnisonGroupPlacement,
  UnisonPartInput,
} from './unisonRules';
import type { VoiceDirection } from './voiceRules';

const HEAD_LEFT = 11;
const HEAD_RIGHT = 20;

function part(
  voiceNumber: 1 | 2 | 3,
  direction: VoiceDirection,
  duration: BaseDurationType,
  overrides: Partial<UnisonPartInput> = {}
): UnisonPartInput {
  return {
    voiceNumber,
    direction,
    duration,
    dotCount: 0,
    pitchAccidental: null,
    shownAccidental: null,
    isChord: false,
    geometry: {
      headLeftX: HEAD_LEFT,
      headRightX: HEAD_RIGHT,
      stemX: direction === 'up' ? HEAD_RIGHT : HEAD_LEFT,
      dotsRightEdgeX: null,
    },
    ...overrides,
  };
}

describe('headClassOf', () => {
  it.each<[BaseDurationType, string]>([
    ['double-whole', 'stemless'],
    ['whole', 'stemless'],
    ['half', 'open'],
    ['quarter', 'black'],
    ['eighth', 'black'],
    ['hundredtwentyeighth', 'black'],
  ])('%s is %s', (duration, expected) => {
    expect(headClassOf(duration)).toBe(expected);
  });
});

describe('canShareNotehead', () => {
  it.each<[BaseDurationType, BaseDurationType, boolean]>([
    ['quarter', 'quarter', true],
    ['half', 'half', true],
    ['quarter', 'eighth', true],
    ['sixteenth', 'quarter', true],
    ['half', 'quarter', false],
    ['whole', 'whole', false],
    ['quarter', 'whole', false],
    ['half', 'whole', false],
  ])('%s with %s -> %s', (upper, lower, expected) => {
    expect(canShareNotehead(part(1, 'up', upper), part(2, 'down', lower))).toBe(
      expected
    );
  });

  it('shares a head between a chord and a note, but never between two chords', () => {
    expect(
      canShareNotehead(
        part(1, 'up', 'quarter', { isChord: true }),
        part(2, 'down', 'quarter')
      )
    ).toBe(true);
    expect(
      canShareNotehead(
        part(1, 'up', 'quarter', { isChord: true }),
        part(2, 'down', 'quarter', { isChord: true })
      )
    ).toBe(false);
  });

  it('never shares parts that stem the same way', () => {
    expect(
      canShareNotehead(part(1, 'up', 'quarter'), part(3, 'up', 'quarter'))
    ).toBe(false);
  });

  it.each<[string, Partial<UnisonPartInput>]>([
    ['a different accidental', { pitchAccidental: 'sharp' }],
    ['a different dot count', { dotCount: 1 }],
  ])('does not share across %s', (__, overrides) => {
    expect(
      canShareNotehead(
        part(1, 'up', 'quarter'),
        part(2, 'down', 'quarter', overrides)
      )
    ).toBe(false);
  });
});

describe('resolveUnisonPair', () => {
  it('lands the down-stem head on the up-stem head and omits it', () => {
    const layout = resolveUnisonPair(
      part(1, 'up', 'quarter'),
      part(2, 'down', 'quarter')
    );
    expect(layout.mode).toBe('shared-head');
    expect(layout.leftOffsetPx).toBe(0);
    expect(layout.rightOffsetPx).toBe(0);
    expect(layout.omitsHeadVoiceNumber).toBe(2);
  });

  it('moves the down-stem head by the difference between the head centres', () => {
    const down = part(2, 'down', 'quarter', {
      geometry: {
        headLeftX: HEAD_LEFT + 2,
        headRightX: HEAD_RIGHT + 2,
        stemX: HEAD_LEFT + 2,
        dotsRightEdgeX: null,
      },
    });
    const layout = resolveUnisonPair(part(1, 'up', 'quarter'), down);
    expect(layout.rightOffsetPx).toBe(-2);
  });

  it('keeps the upper part on the beat and clears its head for an unshared pair', () => {
    const layout = resolveUnisonPair(
      part(1, 'up', 'half'),
      part(2, 'down', 'quarter')
    );
    expect(layout.mode).toBe('separate-stems');
    expect(layout.leftOffsetPx).toBe(0);
    expect(layout.rightOffsetPx).toBe(
      HEAD_RIGHT + UNISON_STEM_CLEARANCE_PX - HEAD_LEFT
    );
    expect(layout.omitsHeadVoiceNumber).toBeNull();
  });

  it('lands a note on a chord’s head, and omits the note’s head', () => {
    const chordHead = part(1, 'up', 'quarter', {
      isChord: true,
      headCenterX: 30,
    });
    const note = part(2, 'down', 'quarter');
    const layout = resolveUnisonPair(chordHead, note);
    expect(layout.mode).toBe('shared-head');
    expect(layout.omitsHeadVoiceNumber).toBe(2);
    expect(layout.leftOffsetPx).toBe(0);
    expect(layout.rightOffsetPx).toBe(30 - (HEAD_LEFT + HEAD_RIGHT) / 2);
  });

  it('keeps a chord’s own head when the chord is the lower voice', () => {
    const note = part(1, 'up', 'quarter');
    const chordHead = part(2, 'down', 'quarter', {
      isChord: true,
      headCenterX: 30,
    });
    const layout = resolveUnisonPair(note, chordHead);
    expect(layout.omitsHeadVoiceNumber).toBe(1);
    expect(layout.rightOffsetPx).toBe(0);
    expect(layout.leftOffsetPx).toBe(30 - (HEAD_LEFT + HEAD_RIGHT) / 2);
  });

  it('is stemless for two semibreves, with the same clearance', () => {
    const layout = resolveUnisonPair(
      part(1, 'up', 'whole'),
      part(2, 'down', 'whole')
    );
    expect(layout.mode).toBe('stemless');
    expect(layout.rightOffsetPx).toBe(
      HEAD_RIGHT + UNISON_STEM_CLEARANCE_PX - HEAD_LEFT
    );
  });

  it('clears the stem of a stemmed part from a semibreve beside it', () => {
    const layout = resolveUnisonPair(
      part(1, 'up', 'quarter'),
      part(2, 'down', 'whole')
    );
    expect(layout.rightOffsetPx + HEAD_LEFT).toBeGreaterThanOrEqual(
      HEAD_RIGHT + UNISON_STEM_CLEARANCE_PX
    );
  });

  it('puts the right part’s accidental between the two heads', () => {
    const accidental: AccidentalType = 'sharp';
    const layout = resolveUnisonPair(
      part(1, 'up', 'quarter'),
      part(2, 'down', 'quarter', {
        pitchAccidental: accidental,
        shownAccidental: accidental,
      })
    );
    expect(layout.mode).toBe('separate-stems');
    expect(layout.rightOffsetPx).toBe(
      HEAD_RIGHT +
        UNISON_STEM_CLEARANCE_PX +
        ACCIDENTAL_SYMBOL_WIDTH[accidental]
    );
  });

  it('adds no width for a right part whose accidental is not drawn', () => {
    const plain = resolveUnisonPair(
      part(1, 'up', 'half'),
      part(2, 'down', 'quarter', { pitchAccidental: 'sharp' })
    );
    expect(plain.rightOffsetPx).toBe(
      HEAD_RIGHT + UNISON_STEM_CLEARANCE_PX - HEAD_LEFT
    );
  });

  it('treats the lower voice number as the left part regardless of argument order', () => {
    const layout = resolveUnisonPair(
      part(2, 'down', 'half'),
      part(1, 'up', 'quarter')
    );
    expect(layout.leftVoiceNumber).toBe(1);
  });
});

describe('accidentalChromaticRank', () => {
  it('orders double-flat to double-sharp, with no accidental as natural', () => {
    const types: (AccidentalType | null)[] = [
      'double-sharp',
      'sharp',
      null,
      'flat',
      'double-flat',
      'natural',
    ];
    const sorted = [...types].sort(
      (a, b) => accidentalChromaticRank(a) - accidentalChromaticRank(b)
    );
    expect(sorted[0]).toBe('double-flat');
    expect(sorted[1]).toBe('flat');
    expect(sorted[4]).toBe('sharp');
    expect(sorted[5]).toBe('double-sharp');
    expect(accidentalChromaticRank(null)).toBe(
      accidentalChromaticRank('natural')
    );
  });
});

describe('resolveUnisonStemGroups', () => {
  function placement(
    voiceNumber: 1 | 2 | 3,
    duration: BaseDurationType,
    pitchAccidental: AccidentalType | null = null,
    staffY = 60,
    isChord = false
  ): UnisonGroupPlacement {
    return {
      voiceNumber,
      localIndex: 0,
      staffYCoordinates: [staffY],
      unison: {
        duration,
        pitchAccidental,
        shownAccidental: pitchAccidental,
        isChord,
      },
    };
  }

  it('shares the stem of the one stemmed part with its stemless partners', () => {
    const groups = resolveUnisonStemGroups([
      placement(1, 'quarter'),
      placement(2, 'whole', 'sharp'),
      placement(3, 'whole', 'flat'),
    ]);
    expect(groups).toEqual([
      {
        kind: 'single-stem',
        staffY: 60,
        owner: { voiceNumber: 1, localIndex: 0 },
        others: [
          { voiceNumber: 2, localIndex: 0 },
          { voiceNumber: 3, localIndex: 0 },
        ],
      },
    ]);
  });

  it('gives stemless parts that differ by accidental a bracket', () => {
    const groups = resolveUnisonStemGroups([
      placement(1, 'whole'),
      placement(2, 'whole', 'sharp'),
    ]);
    expect(groups.map((group) => group.kind)).toEqual(['stemless-cluster']);
  });

  it('lets a chord part join at the staff position it shares', () => {
    const chordPart: UnisonGroupPlacement = {
      voiceNumber: 1,
      localIndex: 0,
      staffYCoordinates: [50, 60],
      unison: {
        duration: 'quarter',
        pitchAccidental: null,
        shownAccidental: null,
        isChord: true,
      },
    };
    expect(
      resolveUnisonStemGroups([chordPart, placement(2, 'whole', 'sharp')])
    ).toMatchObject([{ kind: 'single-stem', staffY: 60 }]);
  });

  it.each<[string, UnisonGroupPlacement[]]>([
    ['two plain semibreves', [placement(1, 'whole'), placement(2, 'whole')]],
    [
      'two stemmed parts',
      [placement(1, 'quarter'), placement(2, 'quarter', 'sharp')],
    ],
    [
      'parts on different positions',
      [placement(1, 'quarter', null, 60), placement(2, 'whole', null, 65)],
    ],
  ])('draws nothing for %s', (__, placements) => {
    expect(resolveUnisonStemGroups(placements)).toEqual([]);
  });
});

describe('groupUnisonPlacements', () => {
  const at = (...staffYCoordinates: number[]) => ({ staffYCoordinates });

  it('groups parts by a shared staff position, topmost first', () => {
    const a = at(50, 60);
    const b = at(60);
    const c = at(50);
    const groups = groupUnisonPlacements([a, b, c]);
    expect([...groups.keys()]).toEqual([50]);
    expect(groups.get(50)).toEqual([a, c]);
  });

  it('puts a part in only the first group it joins', () => {
    const a = at(50, 60);
    const b = at(60);
    const c = at(50);
    const d = at(60);
    const groups = groupUnisonPlacements([a, b, c, d]);
    expect(groups.get(50)).toEqual([a, c]);
    expect(groups.get(60)).toEqual([b, d]);
  });
});

describe('resolveUnisonDiagonal', () => {
  const base = {
    stemX: 20,
    flagCount: 0,
    headFarEdgeX: 50,
    headCenterY: 60,
    headHalfHeight: 4,
  };

  it('leaves an up-stem below its tip, past the join clearance, and ends at the head’s upper edge', () => {
    const segment = resolveUnisonDiagonal({
      ...base,
      stemUp: true,
      stemTipY: 20,
    });
    expect(segment).toEqual({
      fromX: 20,
      fromY: 20 + DIAGONAL_STEM_JOIN_CLEARANCE_PX,
      toX: 50,
      toY: 56,
    });
  });

  it('leaves a down-stem above its tip and ends at the head’s lower edge', () => {
    const segment = resolveUnisonDiagonal({
      ...base,
      stemUp: false,
      stemTipY: 100,
    });
    expect(segment.fromY).toBe(100 - DIAGONAL_STEM_JOIN_CLEARANCE_PX);
    expect(segment.toY).toBe(64);
  });

  it('keeps the join clear of every tail', () => {
    const plain = resolveUnisonDiagonal({
      ...base,
      stemUp: true,
      stemTipY: 20,
    });
    const flagged = resolveUnisonDiagonal({
      ...base,
      stemUp: true,
      stemTipY: 20,
      flagCount: 2,
    });
    expect(flagged.fromY - plain.fromY).toBe(2 * FLAG_STEM_STEP_PX);
  });
});

describe('resolveAlteredSingleStemGroup', () => {
  const stemmed = (
    voiceNumber: 1 | 2 | 3,
    direction: VoiceDirection,
    pitchAccidental: AccidentalType | null
  ) => ({
    ...part(voiceNumber, direction, 'quarter', {
      pitchAccidental,
      shownAccidental: pitchAccidental,
    }),
    localIndex: 0,
  });
  const stemless = (
    voiceNumber: 1 | 2 | 3,
    pitchAccidental: AccidentalType | null,
    direction: VoiceDirection = 'down'
  ) => ({
    ...part(voiceNumber, direction, 'whole', {
      pitchAccidental,
      shownAccidental: pitchAccidental,
    }),
    localIndex: 0,
  });

  it('is not a group when no head differs by accidental', () => {
    expect(
      resolveAlteredSingleStemGroup([stemmed(1, 'up', null), stemless(2, null)])
    ).toBeNull();
  });

  it('is not a group with two stems', () => {
    expect(
      resolveAlteredSingleStemGroup([
        stemmed(1, 'up', null),
        stemmed(2, 'down', 'sharp'),
      ])
    ).toBeNull();
  });

  it('forks two heads from a stem centred over both, base lifted', () => {
    const layout = resolveAlteredSingleStemGroup([
      stemmed(1, 'up', null),
      stemless(2, 'sharp'),
    ]);
    expect(layout?.shape).toBe('prong');
    expect(layout?.stemLiftPx).toBe(PRONG_LIFT_PX);
    const second = layout?.parts[1].xOffsetPx ?? 0;
    expect(second).toBeGreaterThan(HEAD_RIGHT - HEAD_LEFT);
  });

  it('orders heads flat to sharp whatever the voice order', () => {
    const layout = resolveAlteredSingleStemGroup([
      stemmed(1, 'up', 'sharp'),
      stemless(2, 'flat'),
      stemless(3, null),
    ]);
    expect(layout?.parts.map((entry) => entry.voiceNumber)).toEqual([2, 3, 1]);
    expect(layout?.parts[0].xOffsetPx).toBe(0);
    const offsets = layout?.parts.map((entry) => entry.xOffsetPx) ?? [];
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
  });

  it('uses diagonals from the first head’s stem for three heads, with no lift', () => {
    const layout = resolveAlteredSingleStemGroup([
      stemmed(1, 'up', null),
      stemless(2, 'flat'),
      stemless(3, 'sharp'),
    ]);
    expect(layout?.shape).toBe('diagonal');
    expect(layout?.stemLiftPx).toBe(0);
  });

  it('moves the owner’s stem off its own head when another head leads', () => {
    const layout = resolveAlteredSingleStemGroup([
      stemmed(1, 'up', 'sharp'),
      stemless(2, 'flat'),
      stemless(3, null),
    ]);
    expect(layout?.owner.voiceNumber).toBe(1);
    expect(layout?.stemShiftPx).toBeLessThan(0);
  });
});

describe('resolveAlteredSingleStemGroup: mirrored and chord parts', () => {
  const owner = (
    voiceNumber: 1 | 2 | 3,
    pitchAccidental: AccidentalType | null,
    overrides: Partial<UnisonPartInput> = {}
  ) => ({
    ...part(voiceNumber, 'up', 'quarter', {
      pitchAccidental,
      shownAccidental: pitchAccidental,
      ...overrides,
    }),
    localIndex: 0,
  });
  const whole = (
    voiceNumber: 1 | 2 | 3,
    pitchAccidental: AccidentalType | null
  ) => ({
    ...part(voiceNumber, 'down', 'whole', {
      pitchAccidental,
      shownAccidental: pitchAccidental,
    }),
    localIndex: 0,
  });
  const three = () => [owner(1, null), whole(2, 'flat'), whole(3, 'sharp')];

  it('keeps the first head on the beat when there is room after the column', () => {
    const layout = resolveAlteredSingleStemGroup(three(), {
      beforePx: 20,
      afterPx: 200,
    });
    expect(layout?.mirrored).toBe(false);
    expect(layout?.parts[0].xOffsetPx).toBe(0);
  });

  it('mirrors when the room after is too small and the room before is larger', () => {
    const layout = resolveAlteredSingleStemGroup(three(), {
      beforePx: 60,
      afterPx: 10,
    });
    expect(layout?.mirrored).toBe(true);
    const last = layout?.parts[layout.parts.length - 1];
    expect(last?.xOffsetPx).toBe(0);
    for (const entry of layout?.parts.slice(0, -1) ?? []) {
      expect(entry.xOffsetPx).toBeLessThan(0);
    }
  });

  it('does not mirror when the room before is no larger', () => {
    expect(
      resolveAlteredSingleStemGroup(three(), { beforePx: 10, afterPx: 10 })
        ?.mirrored
    ).toBe(false);
  });

  it('keeps flat-to-sharp order when mirrored', () => {
    const layout = resolveAlteredSingleStemGroup(three(), {
      beforePx: 60,
      afterPx: 10,
    });
    expect(layout?.parts.map((entry) => entry.voiceNumber)).toEqual([2, 1, 3]);
  });

  it('puts a stemmed chord at the stem’s place, never as a prong', () => {
    const chord = owner(1, null, { isChord: true });
    const layout = resolveAlteredSingleStemGroup([chord, whole(2, 'flat')]);
    expect(layout?.shape).toBe('diagonal');
    expect(layout?.parts[0].voiceNumber).toBe(1);
    expect(layout?.stemShiftPx).toBeCloseTo(0, 5);
  });

  it('puts a stemmed chord last when mirrored', () => {
    const layout = resolveAlteredSingleStemGroup(
      [owner(1, null, { isChord: true }), whole(2, 'flat'), whole(3, 'sharp')],
      { beforePx: 60, afterPx: 10 }
    );
    expect(layout?.parts[layout.parts.length - 1].voiceNumber).toBe(1);
  });
});

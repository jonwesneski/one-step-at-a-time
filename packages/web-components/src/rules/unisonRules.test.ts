import type { AccidentalType, BaseDurationType } from '../types/theory';
import {
  ACCIDENTAL_SYMBOL_WIDTH,
  UNISON_STEM_CLEARANCE_PX,
} from '../utils/notationDimensions';
import {
  accidentalChromaticRank,
  canShareNotehead,
  groupUnisonPlacements,
  headClassOf,
  resolveAlteredSingleStemGroup,
  resolveStemlessClusters,
  resolveUnisonPair,
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

describe('resolveUnisonPair: positions and notehead glyphs', () => {
  it('does not share a head between different notehead glyphs', () => {
    expect(
      canShareNotehead(
        part(1, 'up', 'quarter'),
        part(2, 'down', 'quarter', { notehead: 'x' })
      )
    ).toBe(false);
    expect(
      canShareNotehead(
        part(1, 'up', 'quarter', { notehead: 'x' }),
        part(2, 'down', 'quarter', { notehead: 'x' })
      )
    ).toBe(true);
  });

  it('moves the down-stem part further when it sits left of the up-stem part', () => {
    const sameX = resolveUnisonPair(
      part(1, 'up', 'quarter'),
      part(2, 'down', 'quarter', { headCenterX: 14 })
    );
    const leftOf = resolveUnisonPair(
      part(1, 'up', 'quarter', { originX: 6 }),
      part(2, 'down', 'quarter', { headCenterX: 14 })
    );
    expect(leftOf.leftOffsetPx).toBe(0);
    expect(leftOf.rightOffsetPx).toBe(sameX.rightOffsetPx + 6);
  });

  it('moves the up-stem part right when the down-stem part sits further right', () => {
    const layout = resolveUnisonPair(
      part(1, 'up', 'quarter'),
      part(2, 'down', 'quarter', { originX: 6 })
    );
    expect(layout.leftOffsetPx).toBe(6);
    expect(layout.rightOffsetPx).toBe(0);
    expect(layout.omitsHeadVoiceNumber).toBe(2);
  });

  it('clears the left head from where each part sits, never moving the right part left', () => {
    const closer = resolveUnisonPair(
      part(1, 'up', 'half'),
      part(2, 'down', 'quarter', { originX: 4 })
    );
    expect(closer.rightOffsetPx).toBe(
      HEAD_RIGHT + UNISON_STEM_CLEARANCE_PX - HEAD_LEFT - 4
    );
    const far = resolveUnisonPair(
      part(1, 'up', 'half'),
      part(2, 'down', 'quarter', { originX: 100 })
    );
    expect(far.rightOffsetPx).toBe(0);
  });

  it('keeps two heads when sharing is not allowed', () => {
    const layout = resolveUnisonPair(
      part(1, 'up', 'quarter'),
      part(2, 'down', 'quarter'),
      false
    );
    expect(layout.mode).toBe('separate-stems');
    expect(layout.omitsHeadVoiceNumber).toBeNull();
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

  it('puts quarter-tones between their neighbors', () => {
    const ascending: AccidentalType[] = [
      'double-flat-down',
      'double-flat',
      'double-flat-up',
      'flat',
      'flat-up',
      'natural',
      'natural-up',
      'sharp',
      'sharp-up',
      'double-sharp',
      'double-sharp-up',
    ];
    const ranks = ascending.map(accidentalChromaticRank);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
    expect(new Set(ranks).size).toBe(ranks.length);
  });
});

describe('resolveStemlessClusters', () => {
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

  it('brackets stemless parts that differ by accidental', () => {
    expect(
      resolveStemlessClusters([
        placement(1, 'whole'),
        placement(2, 'whole', 'sharp'),
      ])
    ).toEqual([
      {
        staffY: 60,
        members: [
          { voiceNumber: 1, localIndex: 0 },
          { voiceNumber: 2, localIndex: 0 },
        ],
      },
    ]);
  });

  it('lets a stemless chord join at the staff position it shares', () => {
    const chordPart: UnisonGroupPlacement = {
      voiceNumber: 1,
      localIndex: 0,
      staffYCoordinates: [50, 60],
      unison: {
        duration: 'whole',
        pitchAccidental: null,
        shownAccidental: null,
        isChord: true,
      },
    };
    expect(
      resolveStemlessClusters([chordPart, placement(2, 'whole', 'sharp')])
    ).toMatchObject([{ staffY: 60 }]);
  });

  it.each<[string, UnisonGroupPlacement[]]>([
    ['two plain semibreves', [placement(1, 'whole'), placement(2, 'whole')]],
    [
      'a stemmed part beside altered semibreves',
      [placement(1, 'quarter'), placement(2, 'whole', 'sharp')],
    ],
    [
      'two stemmed parts',
      [placement(1, 'quarter'), placement(2, 'quarter', 'sharp')],
    ],
    [
      'parts on different positions',
      [placement(1, 'quarter', null, 60), placement(2, 'whole', null, 65)],
    ],
  ])('draws nothing for %s', (__, placements) => {
    expect(resolveStemlessClusters(placements)).toEqual([]);
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

  it('keeps the stemmed head on its own stem and puts a semibreve after it, clear of the stem', () => {
    const layout = resolveAlteredSingleStemGroup([
      stemmed(1, 'up', null),
      stemless(2, 'sharp'),
    ]);
    const offsetOf = (voiceNumber: number) =>
      layout?.parts.find((entry) => entry.voiceNumber === voiceNumber)
        ?.xOffsetPx ?? 0;
    expect(offsetOf(1)).toBe(0);
    // The sharp, and the semibreve after it, start past the crotchet's stem
    // (its head's right edge) by the clearance.
    expect(offsetOf(2) - ACCIDENTAL_SYMBOL_WIDTH.sharp).toBeGreaterThanOrEqual(
      HEAD_RIGHT + UNISON_STEM_CLEARANCE_PX
    );
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

  it('puts a semibreve clear of an up-stem’s tails as well as its head', () => {
    const flagged = {
      ...part(1, 'up', 'eighth', {
        geometry: {
          headLeftX: HEAD_LEFT,
          headRightX: HEAD_RIGHT,
          stemX: HEAD_RIGHT,
          dotsRightEdgeX: null,
          tailRightX: HEAD_RIGHT + 10,
        },
      }),
      localIndex: 0,
    };
    const layout = resolveAlteredSingleStemGroup([
      flagged,
      stemless(2, 'sharp'),
    ]);
    const semibreveOffset =
      layout?.parts.find((entry) => entry.voiceNumber === 2)?.xOffsetPx ?? 0;
    expect(
      semibreveOffset - ACCIDENTAL_SYMBOL_WIDTH.sharp
    ).toBeGreaterThanOrEqual(HEAD_RIGHT + 10 + UNISON_STEM_CLEARANCE_PX);
  });

  it('puts a down-stem head after a semibreve, its stem clear of it', () => {
    const layout = resolveAlteredSingleStemGroup([
      stemless(1, 'flat', 'up'),
      stemmed(2, 'down', null),
    ]);
    const offsetOf = (voiceNumber: number) =>
      layout?.parts.find((entry) => entry.voiceNumber === voiceNumber)
        ?.xOffsetPx ?? 0;
    expect(layout?.parts.map((entry) => entry.voiceNumber)).toEqual([1, 2]);
    // The down stem sits on the crotchet head's left edge.
    expect(offsetOf(2) + HEAD_LEFT).toBeGreaterThanOrEqual(
      HEAD_RIGHT + UNISON_STEM_CLEARANCE_PX
    );
  });
});

describe('resolveAlteredSingleStemGroup: chord parts and positions', () => {
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
    pitchAccidental: AccidentalType | null,
    overrides: Partial<UnisonPartInput> = {}
  ) => ({
    ...part(voiceNumber, 'down', 'whole', {
      pitchAccidental,
      shownAccidental: pitchAccidental,
      ...overrides,
    }),
    localIndex: 0,
  });

  it('keeps the first head on the beat and runs the rest right', () => {
    const layout = resolveAlteredSingleStemGroup([
      owner(1, null),
      whole(2, 'flat'),
      whole(3, 'sharp'),
    ]);
    expect(layout?.parts[0].xOffsetPx).toBe(0);
    for (const entry of layout?.parts.slice(1) ?? []) {
      expect(entry.xOffsetPx).toBeGreaterThan(0);
    }
  });

  it('orders a stemmed chord chromatically, like any other part', () => {
    const chord = owner(1, null, { isChord: true });
    const layout = resolveAlteredSingleStemGroup([chord, whole(2, 'flat')]);
    expect(layout?.parts.map((entry) => entry.voiceNumber)).toEqual([2, 1]);
  });

  it('measures each head from where its part sits', () => {
    const atZero = resolveAlteredSingleStemGroup([
      owner(1, null),
      whole(2, 'sharp'),
    ]);
    const shifted = resolveAlteredSingleStemGroup([
      owner(1, null),
      whole(2, 'sharp', { originX: 5 }),
    ]);
    const offsetOf = (layout: typeof atZero) =>
      layout?.parts.find((entry) => entry.voiceNumber === 2)?.xOffsetPx ?? 0;
    expect(offsetOf(shifted)).toBe(offsetOf(atZero) - 5);
  });
});

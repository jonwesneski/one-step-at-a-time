import type { AccidentalType, BaseDurationType } from '../types/theory';
import {
  ACCIDENTAL_SYMBOL_WIDTH,
  UNISON_STEM_CLEARANCE_PX,
} from '../utils/notationDimensions';
import {
  accidentalChromaticRank,
  canShareNotehead,
  headClassOf,
  resolveUnisonPair,
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

  it('never shares parts that stem the same way', () => {
    expect(
      canShareNotehead(part(1, 'up', 'quarter'), part(3, 'up', 'quarter'))
    ).toBe(false);
  });

  it.each<[string, Partial<UnisonPartInput>]>([
    ['a different accidental', { pitchAccidental: 'sharp' }],
    ['a different dot count', { dotCount: 1 }],
    ['a chord part', { isChord: true }],
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

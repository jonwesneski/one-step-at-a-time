/**
 * @jest-environment jsdom
 */
import { parsePhonemes } from '../../rules/phonemeRules';
import {
  PHONEME_ARROW_HEAD_LENGTH_PX,
  PHONEME_FONT_SIZE_PX,
  PHONEME_X_HEIGHT_RATIO,
} from '../notationDimensions';
import {
  createPhonemeArrowSvg,
  createPhonemeBracketSvg,
  createPhonemeSvg,
  createStandalonePhonemesSvg,
  phonemeArrowY,
} from './phonemes';

describe('phoneme glyphs', () => {
  it('centres a phoneme and hangs brackets outside it', () => {
    expect(createPhonemeSvg('ah', 50, 90).getAttribute('text-anchor')).toBe(
      'middle'
    );
    const open = createPhonemeBracketSvg('open', 40, 90);
    expect([open.textContent, open.getAttribute('text-anchor')]).toEqual([
      '[',
      'end',
    ]);
    const close = createPhonemeBracketSvg('close', 60, 90);
    expect([close.textContent, close.getAttribute('text-anchor')]).toEqual([
      ']',
      'start',
    ]);
  });

  it('draws an arrow at half the x-height, its head optional', () => {
    expect(phonemeArrowY(90)).toBe(
      90 - (PHONEME_FONT_SIZE_PX * PHONEME_X_HEIGHT_RATIO) / 2
    );
    const d = (head: boolean) =>
      createPhonemeArrowSvg(0, 50, 80, head)
        .querySelector('path')
        ?.getAttribute('d');
    expect(d(false)).toBe('M 0 80 L 50 80');
    expect(d(true)).toContain(`M ${50 - PHONEME_ARROW_HEAD_LENGTH_PX} `);
  });
});

describe('createStandalonePhonemesSvg', () => {
  it('brackets each run and drops an arrow out of the entry', () => {
    const texts = (value: string) =>
      Array.from(
        createStandalonePhonemesSvg(
          parsePhonemes(value) ?? [],
          10,
          50
        ).querySelectorAll('text'),
        (text) => text.textContent
      );
    expect(texts('i,u')).toEqual(['[', 'i', ']', '[', 'u', ']']);
    expect(texts('oo>ah>')).toEqual(['[', 'oo', 'ah', ']']);
    expect(
      createStandalonePhonemesSvg(
        parsePhonemes('oo>ah>') ?? [],
        10,
        50
      ).querySelectorAll('.phoneme-arrow')
    ).toHaveLength(1);
  });
});

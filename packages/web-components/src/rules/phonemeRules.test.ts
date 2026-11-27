import {
  PHONEME_ARROW_GAP_PX,
  PHONEME_ARROW_HEAD_LENGTH_PX,
  PHONEME_ASCENT_RATIO,
  PHONEME_FONT_SIZE_PX,
  PHONEME_GAP_PX,
  PHONEME_INK_GAP_PX,
  PHONEME_STAFF_GAP_PX,
} from '../utils/notationDimensions';
import {
  parsePhonemes,
  phonemeArrow,
  phonemeRowY,
  phonemeSpacingPx,
  phonemesWarning,
  phonemeXs,
  resolvePhonemeRuns,
  type PhonemeEntry,
} from './phonemeRules';

describe('parsePhonemes', () => {
  it('separates at commas and draws an arrow at > or →', () => {
    expect(parsePhonemes(' i , u ')).toEqual([
      { text: 'i', arrowAfter: false },
      { text: 'u', arrowAfter: false },
    ]);
    expect(parsePhonemes('oo>ah→oo')).toEqual([
      { text: 'oo', arrowAfter: true },
      { text: 'ah', arrowAfter: true },
      { text: 'oo', arrowAfter: false },
    ]);
  });

  it('keeps a trailing arrow for the next note and drops brackets', () => {
    expect(parsePhonemes('[oo]>ah>')).toEqual([
      { text: 'oo', arrowAfter: true },
      { text: 'ah', arrowAfter: true },
    ]);
  });

  it('drops empty parts, null when none is left', () => {
    expect(parsePhonemes('i,,u')).toHaveLength(2);
    expect(parsePhonemes(' , [] ')).toBeNull();
    expect(parsePhonemes(null)).toBeNull();
  });
});

describe('phonemesWarning', () => {
  it('warns about empty parts and an empty value, not a trailing arrow', () => {
    expect(phonemesWarning('i,,u')).toMatch(/empty part/);
    expect(phonemesWarning(' , ')).toMatch(/empty/);
    expect(phonemesWarning('oo>ah>')).toBeNull();
    expect(phonemesWarning(null)).toBeNull();
  });
});

describe('resolvePhonemeRuns', () => {
  const entry = (value: string | null): PhonemeEntry => ({
    phonemes: parsePhonemes(value),
    rest: false,
  });
  const rest: PhonemeEntry = { phonemes: null, rest: true };

  it('joins phonemes by arrows across entries, past rests', () => {
    expect(
      resolvePhonemeRuns([entry('oo>ah>'), rest, entry('oo'), entry('i,u')])
    ).toEqual([
      {
        items: [
          { entry: 0, index: 0 },
          { entry: 0, index: 1 },
          { entry: 2, index: 0 },
        ],
        end: 'closed',
      },
      { items: [{ entry: 3, index: 0 }], end: 'closed' },
      { items: [{ entry: 3, index: 1 }], end: 'closed' },
    ]);
  });

  it('closes after an arrow the next note takes no phoneme for', () => {
    expect(resolvePhonemeRuns([entry('oo>'), entry(null)])).toEqual([
      { items: [{ entry: 0, index: 0 }], end: 'dangling' },
    ]);
  });

  it('leaves a run open on an arrow out of the last entry', () => {
    expect(resolvePhonemeRuns([entry('oo>'), rest])[0].end).toBe('open');
  });
});

describe('phonemeXs', () => {
  it('stands the first on its head and spaces the rest toward the next anchor', () => {
    expect(
      phonemeXs({ headX: 10, nextX: 110, arrowOut: true, widths: [10, 10] })
    ).toEqual([10, 60]);
  });

  it('ends the last with the note’s span without an arrow out', () => {
    expect(
      phonemeXs({ headX: 10, nextX: 110, arrowOut: false, widths: [6, 10, 10] })
    ).toEqual([10, 57.5, 105]);
    expect(
      phonemeXs({ headX: 10, nextX: 110, arrowOut: false, widths: [6] })
    ).toEqual([10]);
  });
});

describe('phonemeArrow', () => {
  it('keeps a gap from each phoneme, with a head when there is room', () => {
    expect(phonemeArrow(0, 100)).toEqual({
      fromX: PHONEME_ARROW_GAP_PX,
      toX: 100 - PHONEME_ARROW_GAP_PX,
      head: true,
    });
    const short = 2 * PHONEME_ARROW_GAP_PX + PHONEME_ARROW_HEAD_LENGTH_PX - 1;
    expect(phonemeArrow(0, short)?.head).toBe(false);
    expect(phonemeArrow(0, 2 * PHONEME_ARROW_GAP_PX + 2)).toBeNull();
  });
});

describe('phonemeSpacingPx', () => {
  it('is the shortest arrow, or a gap', () => {
    expect(phonemeSpacingPx(true)).toBe(
      2 * PHONEME_ARROW_GAP_PX + PHONEME_ARROW_HEAD_LENGTH_PX
    );
    expect(phonemeSpacingPx(false)).toBe(PHONEME_GAP_PX);
  });
});

describe('phonemeRowY', () => {
  const ascent = PHONEME_FONT_SIZE_PX * PHONEME_ASCENT_RATIO;

  it('keeps its brackets 1.5 spaces below the stave', () => {
    expect(phonemeRowY({ staffBottomY: 70, inkYs: [60] })).toBe(
      70 + PHONEME_STAFF_GAP_PX + ascent
    );
  });

  it('moves down past the ink above it', () => {
    expect(phonemeRowY({ staffBottomY: 70, inkYs: [60, 100] })).toBe(
      100 + PHONEME_INK_GAP_PX + ascent
    );
  });
});

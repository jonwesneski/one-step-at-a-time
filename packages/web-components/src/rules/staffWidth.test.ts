import {
  AVG_LYRIC_CHAR_WIDTH_PX,
  LEADING_NOTE_GAP_PX,
  MIN_NOTE_WIDTH,
} from '../utils/notationDimensions';
import { NOTE_SVG_WIDTH } from '../utils/svgCreator/note';
import {
  calculateGuitarTabMinWidth,
  calculateStaffMinWidth,
  calculateStaffNaturalWidth,
  calculateStaffVocalMinWidth,
  calculateStaffVocalNaturalWidth,
  computeMinimumEntryAdvance,
  measureFlexValue,
} from './staffWidth';

const TYPICAL_DESCRIBE_END_X = 90;

describe('computeMinimumEntryAdvance', () => {
  it('tucks a plain entry under the previous box, plus any tail room', () => {
    expect(computeMinimumEntryAdvance(0, 0, 0)).toBe(MIN_NOTE_WIDTH);
    expect(computeMinimumEntryAdvance(12, 0, 0)).toBe(MIN_NOTE_WIDTH + 12);
  });

  it('clears the previous box for an entry reaching left of its own', () => {
    expect(computeMinimumEntryAdvance(12, 25, 0)).toBe(NOTE_SVG_WIDTH + 25);
  });

  it('clears the previous box and its rightward footprint', () => {
    expect(computeMinimumEntryAdvance(0, 0, 15)).toBe(NOTE_SVG_WIDTH + 15);
    expect(computeMinimumEntryAdvance(0, 25, 15)).toBe(NOTE_SVG_WIDTH + 40);
  });
});

describe('calculateStaffMinWidth', () => {
  it('returns describeEndX when there are no notes', () => {
    expect(calculateStaffMinWidth(TYPICAL_DESCRIBE_END_X, 0)).toBe(
      TYPICAL_DESCRIBE_END_X
    );
  });

  it('returns describeEndX + leadingGap + MIN_NOTE_WIDTH for a single whole note', () => {
    expect(calculateStaffMinWidth(TYPICAL_DESCRIBE_END_X, 1)).toBe(
      TYPICAL_DESCRIBE_END_X + LEADING_NOTE_GAP_PX + MIN_NOTE_WIDTH
    );
  });

  it('returns describeEndX + leadingGap + 11 × MIN_NOTE_WIDTH for 11 notes (prevents bleed)', () => {
    const minWidth = calculateStaffMinWidth(TYPICAL_DESCRIBE_END_X, 11);
    expect(minWidth).toBe(
      TYPICAL_DESCRIBE_END_X + LEADING_NOTE_GAP_PX + 11 * MIN_NOTE_WIDTH
    );
    expect(minWidth).toBeGreaterThan(300);
  });

  it('scales linearly with note count', () => {
    const widthFor3 = calculateStaffMinWidth(TYPICAL_DESCRIBE_END_X, 3);
    const widthFor6 = calculateStaffMinWidth(TYPICAL_DESCRIBE_END_X, 6);
    expect(widthFor6 - widthFor3).toBe(3 * MIN_NOTE_WIDTH);
  });

  it('respects the describeEndX offset', () => {
    const smallDescribe = calculateStaffMinWidth(50, 4);
    const largeDescribe = calculateStaffMinWidth(120, 4);
    expect(largeDescribe - smallDescribe).toBe(70);
  });

  it('adds leftwardWidth when provided', () => {
    const accidentalWidth = 12;
    const withAccidental = calculateStaffMinWidth(
      TYPICAL_DESCRIBE_END_X,
      4,
      accidentalWidth
    );
    const withoutAccidental = calculateStaffMinWidth(TYPICAL_DESCRIBE_END_X, 4);
    expect(withAccidental - withoutAccidental).toBe(accidentalWidth);
  });

  it('returns same result with zero leftwardWidth as without it', () => {
    expect(calculateStaffMinWidth(TYPICAL_DESCRIBE_END_X, 4, 0)).toBe(
      calculateStaffMinWidth(TYPICAL_DESCRIBE_END_X, 4)
    );
  });
});

describe('calculateStaffVocalMinWidth', () => {
  it('returns describeEndX when there are no notes and no lyrics', () => {
    expect(calculateStaffVocalMinWidth(TYPICAL_DESCRIBE_END_X, 0, 0)).toBe(
      TYPICAL_DESCRIBE_END_X
    );
  });

  it('uses note-driven width when notes need more space than lyrics', () => {
    const result = calculateStaffVocalMinWidth(TYPICAL_DESCRIBE_END_X, 10, 5);
    expect(result).toBe(
      TYPICAL_DESCRIBE_END_X + LEADING_NOTE_GAP_PX + 10 * MIN_NOTE_WIDTH
    );
  });

  it('uses lyric-driven width when lyrics need more space than notes', () => {
    const lyricCharCount = 100;
    const result = calculateStaffVocalMinWidth(
      TYPICAL_DESCRIBE_END_X,
      1,
      lyricCharCount
    );
    expect(result).toBe(
      TYPICAL_DESCRIBE_END_X +
        LEADING_NOTE_GAP_PX +
        lyricCharCount * AVG_LYRIC_CHAR_WIDTH_PX
    );
  });

  it('returns the larger of note-driven vs lyric-driven widths', () => {
    const noteWidth = 4 * MIN_NOTE_WIDTH;
    const lyricWidth = 30 * AVG_LYRIC_CHAR_WIDTH_PX;
    const result = calculateStaffVocalMinWidth(TYPICAL_DESCRIBE_END_X, 4, 30);
    expect(result).toBe(
      TYPICAL_DESCRIBE_END_X +
        LEADING_NOTE_GAP_PX +
        Math.max(noteWidth, lyricWidth)
    );
  });

  it('adds leftwardWidth on top of note/lyric-driven width', () => {
    const accidentalWidth = 12;
    const withAccidental = calculateStaffVocalMinWidth(
      TYPICAL_DESCRIBE_END_X,
      4,
      5,
      accidentalWidth
    );
    const withoutAccidental = calculateStaffVocalMinWidth(
      TYPICAL_DESCRIBE_END_X,
      4,
      5
    );
    expect(withAccidental - withoutAccidental).toBe(accidentalWidth);
  });

  it('adds rightwardWidth to the note-driven width', () => {
    const result = calculateStaffVocalMinWidth(
      TYPICAL_DESCRIBE_END_X,
      8,
      2,
      0,
      30 + 48
    );
    expect(result).toBe(
      TYPICAL_DESCRIBE_END_X +
        LEADING_NOTE_GAP_PX +
        8 * MIN_NOTE_WIDTH +
        30 +
        48
    );
  });

  it('ignores clef and rightward room while a long lyric still drives the width', () => {
    const withRightward = calculateStaffVocalMinWidth(
      TYPICAL_DESCRIBE_END_X,
      2,
      80,
      0,
      30 + 12
    );
    const withoutRightward = calculateStaffVocalMinWidth(
      TYPICAL_DESCRIBE_END_X,
      2,
      80
    );
    expect(withRightward).toBe(withoutRightward);
  });
});

describe('calculateGuitarTabMinWidth', () => {
  it('returns describeEndX when there are no notes', () => {
    expect(calculateGuitarTabMinWidth(TYPICAL_DESCRIBE_END_X, 0)).toBe(
      TYPICAL_DESCRIBE_END_X
    );
  });

  it('returns describeEndX + leadingGap + MIN_NOTE_WIDTH for a single note', () => {
    expect(calculateGuitarTabMinWidth(TYPICAL_DESCRIBE_END_X, 1)).toBe(
      TYPICAL_DESCRIBE_END_X + LEADING_NOTE_GAP_PX + MIN_NOTE_WIDTH
    );
  });

  it('scales linearly with note count', () => {
    const widthFor5 = calculateGuitarTabMinWidth(TYPICAL_DESCRIBE_END_X, 5);
    expect(widthFor5).toBe(
      TYPICAL_DESCRIBE_END_X + LEADING_NOTE_GAP_PX + 5 * MIN_NOTE_WIDTH
    );
  });
});

describe('calculateStaffNaturalWidth', () => {
  it('is the strut min width plus the total slack weight', () => {
    expect(calculateStaffNaturalWidth(200, 84)).toBe(284);
  });

  it('increases with the slack weight', () => {
    const sparse = calculateStaffNaturalWidth(200, 40);
    const dense = calculateStaffNaturalWidth(200, 160);
    expect(dense).toBeGreaterThan(sparse);
  });
});

describe('calculateStaffVocalNaturalWidth', () => {
  it('uses the note-driven natural width when it exceeds the lyric width', () => {
    const result = calculateStaffVocalNaturalWidth(
      TYPICAL_DESCRIBE_END_X,
      8,
      2,
      120
    );
    expect(result).toBe(
      TYPICAL_DESCRIBE_END_X + LEADING_NOTE_GAP_PX + 8 * MIN_NOTE_WIDTH + 120
    );
  });

  it('adds rightwardWidth to the note-driven natural width', () => {
    const result = calculateStaffVocalNaturalWidth(
      TYPICAL_DESCRIBE_END_X,
      8,
      2,
      120,
      0,
      30 + 48
    );
    expect(result).toBe(
      TYPICAL_DESCRIBE_END_X +
        LEADING_NOTE_GAP_PX +
        8 * MIN_NOTE_WIDTH +
        30 +
        48 +
        120
    );
  });

  it('uses the lyric-driven width when the lyrics are wider', () => {
    const result = calculateStaffVocalNaturalWidth(
      TYPICAL_DESCRIBE_END_X,
      2,
      80,
      10
    );
    expect(result).toBe(
      TYPICAL_DESCRIBE_END_X +
        LEADING_NOTE_GAP_PX +
        80 * AVG_LYRIC_CHAR_WIDTH_PX
    );
  });
});

describe('measureFlexValue', () => {
  it('emits grow and basis both equal to the rounded natural width', () => {
    expect(measureFlexValue(388.4)).toBe('388 1 388px');
    expect(measureFlexValue(300)).toBe('300 1 300px');
  });
});

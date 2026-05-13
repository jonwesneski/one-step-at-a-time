import {
  AVG_LYRIC_CHAR_WIDTH_PX,
  COMPOSITION_MAX_WIDTH_PX,
  MIN_NOTE_WIDTH,
  SCORED_MIN_FLEX_GROW,
} from '../utils/notationDimensions';
import {
  calculateGuitarTabMinWidth,
  calculateStaffMinWidth,
  calculateStaffVocalMinWidth,
  minWidthToFlexGrow,
} from './staffWidth';

const TYPICAL_DESCRIBE_END_X = 90;

describe('calculateStaffMinWidth', () => {
  it('returns describeEndX when there are no notes', () => {
    expect(calculateStaffMinWidth(TYPICAL_DESCRIBE_END_X, 0)).toBe(
      TYPICAL_DESCRIBE_END_X
    );
  });

  it('returns describeEndX + MIN_NOTE_WIDTH for a single whole note', () => {
    expect(calculateStaffMinWidth(TYPICAL_DESCRIBE_END_X, 1)).toBe(
      TYPICAL_DESCRIBE_END_X + MIN_NOTE_WIDTH
    );
  });

  it('returns describeEndX + 11 × MIN_NOTE_WIDTH for 11 notes (prevents bleed)', () => {
    const minWidth = calculateStaffMinWidth(TYPICAL_DESCRIBE_END_X, 11);
    expect(minWidth).toBe(TYPICAL_DESCRIBE_END_X + 11 * MIN_NOTE_WIDTH);
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
});

describe('calculateStaffVocalMinWidth', () => {
  it('returns describeEndX when there are no notes and no lyrics', () => {
    expect(calculateStaffVocalMinWidth(TYPICAL_DESCRIBE_END_X, 0, 0)).toBe(
      TYPICAL_DESCRIBE_END_X
    );
  });

  it('uses note-driven width when notes need more space than lyrics', () => {
    const result = calculateStaffVocalMinWidth(TYPICAL_DESCRIBE_END_X, 10, 5);
    expect(result).toBe(TYPICAL_DESCRIBE_END_X + 10 * MIN_NOTE_WIDTH);
  });

  it('uses lyric-driven width when lyrics need more space than notes', () => {
    const lyricCharCount = 100;
    const result = calculateStaffVocalMinWidth(
      TYPICAL_DESCRIBE_END_X,
      1,
      lyricCharCount
    );
    expect(result).toBe(
      TYPICAL_DESCRIBE_END_X + lyricCharCount * AVG_LYRIC_CHAR_WIDTH_PX
    );
  });

  it('returns the larger of note-driven vs lyric-driven widths', () => {
    const noteWidth = 4 * MIN_NOTE_WIDTH;
    const lyricWidth = 30 * AVG_LYRIC_CHAR_WIDTH_PX;
    const result = calculateStaffVocalMinWidth(TYPICAL_DESCRIBE_END_X, 4, 30);
    expect(result).toBe(
      TYPICAL_DESCRIBE_END_X + Math.max(noteWidth, lyricWidth)
    );
  });
});

describe('calculateGuitarTabMinWidth', () => {
  it('returns describeEndX when there are no notes', () => {
    expect(calculateGuitarTabMinWidth(TYPICAL_DESCRIBE_END_X, 0)).toBe(
      TYPICAL_DESCRIBE_END_X
    );
  });

  it('returns describeEndX + MIN_NOTE_WIDTH for a single note', () => {
    expect(calculateGuitarTabMinWidth(TYPICAL_DESCRIBE_END_X, 1)).toBe(
      TYPICAL_DESCRIBE_END_X + MIN_NOTE_WIDTH
    );
  });

  it('scales linearly with note count', () => {
    const widthFor5 = calculateGuitarTabMinWidth(TYPICAL_DESCRIBE_END_X, 5);
    expect(widthFor5).toBe(TYPICAL_DESCRIBE_END_X + 5 * MIN_NOTE_WIDTH);
  });
});

describe('minWidthToFlexGrow', () => {
  it('clamps up to SCORED_MIN_FLEX_GROW for a very narrow minWidth', () => {
    expect(minWidthToFlexGrow(0)).toBeCloseTo(SCORED_MIN_FLEX_GROW);
    expect(minWidthToFlexGrow(50)).toBeCloseTo(SCORED_MIN_FLEX_GROW);
  });

  it('returns SCORED_MIN_FLEX_GROW for a single-whole-note measure (~110px)', () => {
    expect(minWidthToFlexGrow(110)).toBeCloseTo(SCORED_MIN_FLEX_GROW);
  });

  it('returns a value greater than SCORED_MIN_FLEX_GROW for a 310px measure', () => {
    expect(minWidthToFlexGrow(310)).toBeGreaterThan(SCORED_MIN_FLEX_GROW);
  });

  it('clamps to 1.0 for minWidth equal to COMPOSITION_MAX_WIDTH_PX', () => {
    expect(minWidthToFlexGrow(COMPOSITION_MAX_WIDTH_PX)).toBeCloseTo(1.0);
  });

  it('clamps to 1.0 for minWidth exceeding COMPOSITION_MAX_WIDTH_PX', () => {
    expect(minWidthToFlexGrow(COMPOSITION_MAX_WIDTH_PX * 3)).toBeCloseTo(1.0);
  });

  it('increases monotonically with minWidth between the clamped bounds', () => {
    const widths = [180, 250, 400, 600, 900];
    const grows = widths.map(minWidthToFlexGrow);
    for (let i = 1; i < grows.length; i++) {
      expect(grows[i]).toBeGreaterThanOrEqual(grows[i - 1]);
    }
  });
});

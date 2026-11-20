import type { MeasureEndBarline } from '../types/theory';
import {
  ENDING_CONTENT_CLEARANCE_PX,
  ENDING_LABEL_HEIGHT_PX,
  ENDING_LINE_Y_PX,
  ENDING_MIN_ABOVE_STAFF_PX,
} from '../utils/notationDimensions';
import {
  type EndingMeasureInput,
  endingNumeralLabel,
  endingStaffLineY,
  resolveEndingNumberLabels,
  resolveEndings,
  resolveEndingSegments,
} from './endingRules';

const bar = (
  ending: number[] | null = null,
  endBarline: MeasureEndBarline = 'single'
): EndingMeasureInput => ({ ending, endBarline });

// Bar 0 plain, bars 1–3 the first ending (closing on :‖), bars 4–6 the
// second, bar 7 plain: H's 18 | 19a 20a 21a :‖ 19b 20b 21b | 22.
const H_MIDDLE = [
  bar(),
  bar([1]),
  bar([1]),
  bar([1], 'repeat-end'),
  bar([2]),
  bar([2]),
  bar([2]),
  bar(),
];

describe('endingNumeralLabel', () => {
  it('follows each pass with a full stop', () => {
    expect(endingNumeralLabel([1])).toBe('1.');
    expect(endingNumeralLabel([1, 2])).toBe('1.2.');
  });
});

describe('resolveEndings', () => {
  it('groups consecutive bars into endings and endings into a group', () => {
    const { groups, warnings } = resolveEndings([
      bar(),
      bar([1]),
      bar([1], 'repeat-end'),
      bar([2], 'final'),
    ]);
    expect(warnings).toEqual([]);
    expect(groups).toHaveLength(1);
    expect(groups[0].endings).toEqual([
      { numbers: [1], firstMeasure: 1, lastMeasure: 2, closed: true },
      { numbers: [2], firstMeasure: 3, lastMeasure: 3, closed: true },
    ]);
    expect(groups[0].finalEnding).toBe(groups[0].endings[1]);
  });

  it('leaves an ending open unless it ends on an end repeat or final barline', () => {
    const { groups } = resolveEndings([
      bar([1], 'repeat-end'),
      bar([2]),
      bar(),
    ]);
    expect(groups[0].endings.map((ending) => ending.closed)).toEqual([
      true,
      false,
    ]);
  });

  it('starts a new group after a plain bar', () => {
    const { groups } = resolveEndings([
      bar([1], 'repeat-end'),
      bar([2]),
      bar(),
      bar([1], 'repeat-end'),
      bar([2]),
    ]);
    expect(groups.map((group) => group.id)).toEqual([0, 1]);
  });

  it('warns about a non-final ending with nowhere to return from', () => {
    const { warnings } = resolveEndings([bar([1]), bar([2])]);
    expect(warnings).toEqual([
      expect.stringContaining("ending 1. in bar 1 doesn't end"),
    ]);
  });

  it('warns about a final ending that repeats', () => {
    const { warnings } = resolveEndings([
      bar([1], 'repeat-end'),
      bar([2], 'repeat-end'),
    ]);
    expect(warnings).toEqual([
      expect.stringContaining('the last ending 2. in bar 2'),
    ]);
  });

  it('warns about passes that repeat or go backwards', () => {
    expect(resolveEndings([bar([1], 'repeat-end'), bar([1])]).warnings).toEqual(
      [expect.stringContaining('ending 1. in bar 2 repeats')]
    );
    expect(
      resolveEndings([bar([2], 'repeat-end'), bar([1])]).warnings
    ).toHaveLength(1);
    expect(
      resolveEndings([bar([1, 2], 'repeat-end'), bar([3])]).warnings
    ).toEqual([]);
  });

  it('warns about a group with a single ending', () => {
    expect(resolveEndings([bar([1], 'repeat-end'), bar()]).warnings).toEqual([
      expect.stringContaining('has no other ending'),
    ]);
  });
});

describe('resolveEndingSegments', () => {
  it('labels and hooks only an ending’s first bar, and closes its last', () => {
    const { groups } = resolveEndings([
      bar([1]),
      bar([1], 'repeat-end'),
      bar([2]),
    ]);
    const segments = resolveEndingSegments(groups, new Map());
    expect(segments.get(0)).toEqual({
      label: '1.',
      labelIsText: false,
      leftHook: true,
      rightHook: false,
      endsEnding: false,
    });
    // Wherever a row break falls inside the ending, the bar after it is not
    // the ending's first and the bar before it not its last.
    expect(segments.get(1)).toEqual({
      label: null,
      labelIsText: false,
      leftHook: false,
      rightHook: true,
      endsEnding: true,
    });
    expect(segments.get(2)).toEqual({
      label: '2.',
      labelIsText: false,
      leftHook: true,
      rightHook: false,
      endsEnding: true,
    });
  });

  it('draws an ending-label as text in place of the numerals', () => {
    const { groups } = resolveEndings([
      bar([1, 2], 'repeat-end'),
      bar([3], 'final'),
    ]);
    const segments = resolveEndingSegments(groups, new Map([[1, 'Fine']]));
    expect(segments.get(0)?.label).toBe('1.2.');
    expect(segments.get(1)).toMatchObject({
      label: 'Fine',
      labelIsText: true,
      rightHook: true,
    });
  });
});

describe('resolveEndingNumberLabels', () => {
  it('numbers straight through and shows first-time bars and the first later bar', () => {
    const { groups } = resolveEndings(H_MIDDLE);
    const result = resolveEndingNumberLabels(8, groups, 'consecutive');
    expect(result.numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(result.labels.every((label) => label === null)).toBe(true);
    expect(result.forceShow).toEqual([
      false,
      true,
      true,
      true,
      true,
      false,
      false,
      false,
    ]);
  });

  it('duplicates numbers per ending with a letter and continues after the first', () => {
    const { groups } = resolveEndings(H_MIDDLE);
    const result = resolveEndingNumberLabels(8, groups, 'duplicate');
    expect(result.numbers).toEqual([1, 2, 3, 4, 2, 3, 4, 5]);
    expect(result.labels).toEqual([
      null,
      '2a',
      '3a',
      '4a',
      '2b',
      '3b',
      '4b',
      null,
    ]);
    expect(result.forceShow).toEqual([
      false,
      true,
      true,
      true,
      true,
      true,
      true,
      false,
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('warns when a later ending is a different length than the first', () => {
    const { groups } = resolveEndings([
      bar([1]),
      bar([1], 'repeat-end'),
      bar([2]),
    ]);
    expect(resolveEndingNumberLabels(3, groups, 'duplicate').warnings).toEqual([
      expect.stringContaining('equal length'),
    ]);
  });
});

describe('endingStaffLineY', () => {
  it('keeps an empty bar at the minimum distance below the bracket', () => {
    expect(
      endingStaffLineY({
        inkAboveLine: 0,
        labelled: false,
        numberBottomY: null,
      })
    ).toBe(ENDING_LINE_Y_PX + ENDING_MIN_ABOVE_STAFF_PX);
  });

  it('keeps high ink clear of the bracket, its label and the number', () => {
    const ink = 40;
    expect(
      endingStaffLineY({
        inkAboveLine: ink,
        labelled: false,
        numberBottomY: null,
      })
    ).toBe(ENDING_LINE_Y_PX + ink + ENDING_CONTENT_CLEARANCE_PX);
    expect(
      endingStaffLineY({
        inkAboveLine: ink,
        labelled: true,
        numberBottomY: null,
      })
    ).toBe(
      ENDING_LINE_Y_PX +
        ENDING_LABEL_HEIGHT_PX +
        ink +
        ENDING_CONTENT_CLEARANCE_PX
    );
    expect(
      endingStaffLineY({
        inkAboveLine: ink,
        labelled: false,
        numberBottomY: 28,
      })
    ).toBe(28 + ink + ENDING_CONTENT_CLEARANCE_PX);
  });
});

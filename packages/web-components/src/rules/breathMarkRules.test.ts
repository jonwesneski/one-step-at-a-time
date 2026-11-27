import {
  BREATH_MARK_INK_GAP_PX,
  BREATH_MARK_STAFF_GAP_PX,
} from '../utils/notationDimensions';
import {
  breathMarkBottomY,
  breathMarkCenterX,
  breathMarkIndicesInsideSlurs,
} from './breathMarkRules';

describe('breathMarkCenterX', () => {
  it('centres the mark in the gap after its note', () => {
    expect(breathMarkCenterX({ noteRightX: 100, nextLeftX: 140 })).toBe(120);
  });

  it('stays at the note’s edge when the next entry overlaps it', () => {
    expect(breathMarkCenterX({ noteRightX: 100, nextLeftX: 90 })).toBe(100);
  });
});

describe('breathMarkBottomY', () => {
  it('sits just above the stave with nothing under it', () => {
    expect(breathMarkBottomY({ staffTopLineY: 30, inkTopYs: [null] })).toBe(
      30 - BREATH_MARK_STAFF_GAP_PX
    );
  });

  it('rises above ink that reaches higher than the stave', () => {
    expect(
      breathMarkBottomY({ staffTopLineY: 30, inkTopYs: [40, 12, null] })
    ).toBe(12 - BREATH_MARK_INK_GAP_PX);
  });
});

describe('breathMarkIndicesInsideSlurs', () => {
  const marks = [true, true, true, true, true];

  it('flags a slur’s start and the notes inside it, not its end', () => {
    expect(
      breathMarkIndicesInsideSlurs(marks, [{ startIndex: 1, endIndex: 3 }])
    ).toEqual([1, 2]);
  });

  it('ignores notes outside every slur and notes without a mark', () => {
    expect(
      breathMarkIndicesInsideSlurs(
        [false, true, false, true, true],
        [{ startIndex: 0, endIndex: 2 }]
      )
    ).toEqual([1]);
  });
});

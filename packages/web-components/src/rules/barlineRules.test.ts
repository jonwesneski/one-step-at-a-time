import {
  BARLINE_THICK_PX,
  BARLINE_THIN_PX,
  STAFF_LINE_SPACING,
} from '../utils/notationDimensions';
import {
  barlineGlyphWidth,
  barlinePieces,
  barlineVerticalSpan,
  endBarlineInset,
  endBarlineReserve,
  type JunctionInput,
  type RepeatEvent,
  repeatPickupWarning,
  resolveBarlineJunction,
  resolveEndBarline,
  resolveRepeatSpans,
} from './barlineRules';

describe('barlinePieces / barlineGlyphWidth', () => {
  it('orders designs by width', () => {
    expect(barlineGlyphWidth('single')).toBeLessThan(
      barlineGlyphWidth('double')
    );
    expect(barlineGlyphWidth('double')).toBeLessThan(
      barlineGlyphWidth('final')
    );
    expect(barlineGlyphWidth('final')).toBeLessThan(
      barlineGlyphWidth('repeat-end')
    );
    expect(barlineGlyphWidth('repeat-end')).toBeLessThan(
      barlineGlyphWidth('repeat-both')
    );
    expect(barlineGlyphWidth('none')).toBe(0);
  });

  it('mirrors a start repeat into an end repeat', () => {
    expect(barlinePieces('repeat-start').map((piece) => piece.kind)).toEqual([
      'thick',
      'thin',
      'dots',
    ]);
    expect(barlinePieces('repeat-end').map((piece) => piece.kind)).toEqual([
      'dots',
      'thin',
      'thick',
    ]);
    expect(barlineGlyphWidth('repeat-start')).toBe(
      barlineGlyphWidth('repeat-end')
    );
  });

  it('shares one thick line in a back-to-back repeat', () => {
    expect(barlinePieces('repeat-both').map((piece) => piece.kind)).toEqual([
      'dots',
      'thin',
      'thick',
      'thin',
      'dots',
    ]);
  });

  it('reserves nothing extra for a plain barline', () => {
    expect(endBarlineReserve('single')).toBe(0);
    expect(endBarlineReserve('none')).toBe(0);
    expect(endBarlineReserve('final')).toBeGreaterThan(0);
  });

  it('holds the left half of a back-to-back repeat clear of the shared thick line', () => {
    const inset = endBarlineInset('repeat-end-thin');
    expect(inset).toBeGreaterThan(BARLINE_THICK_PX / 2);
    expect(endBarlineInset('repeat-end')).toBe(0);
    expect(endBarlineReserve('repeat-end-thin')).toBe(
      barlineGlyphWidth('repeat-end-thin') - BARLINE_THIN_PX + inset
    );
  });
});

describe('barlineVerticalSpan', () => {
  it('puts the dots in the two middle spaces of five lines', () => {
    const { top, bottom, dotYs } = barlineVerticalSpan(5);
    expect(dotYs[1] - dotYs[0]).toBe(STAFF_LINE_SPACING);
    expect(
      Math.abs((dotYs[0] + dotYs[1]) / 2 - (top + bottom) / 2)
    ).toBeLessThanOrEqual(1);
  });

  it('puts the dots a whole space either side of six lines’ centre', () => {
    const fiveLines = barlineVerticalSpan(5);
    const sixLines = barlineVerticalSpan(6);
    expect(sixLines.dotYs[1] - sixLines.dotYs[0]).toBe(
      2 * (fiveLines.dotYs[1] - fiveLines.dotYs[0])
    );
  });
});

describe('resolveEndBarline', () => {
  it('defaults to single, final for Fine, double before a jump', () => {
    expect(
      resolveEndBarline({ authored: null, fine: false, jump: false }).barline
    ).toBe('single');
    expect(
      resolveEndBarline({ authored: null, fine: true, jump: false }).barline
    ).toBe('final');
    expect(
      resolveEndBarline({ authored: null, fine: false, jump: true }).barline
    ).toBe('double');
  });

  it('keeps an authored barline, warning when it contradicts the default', () => {
    expect(
      resolveEndBarline({ authored: 'repeat-end', fine: false, jump: false })
    ).toEqual({ barline: 'repeat-end', warning: null });
    const result = resolveEndBarline({
      authored: 'double',
      fine: true,
      jump: false,
    });
    expect(result.barline).toBe('double');
    expect(result.warning).toContain('Fine');
  });
});

describe('resolveBarlineJunction', () => {
  const base: JunctionInput = {
    outgoing: 'single',
    incomingRepeatStart: false,
    incomingHasStartGlyphs: false,
    sameRow: true,
    doubleBarBeforeRepeat: false,
  };

  it('leaves a junction without a start repeat alone', () => {
    expect(resolveBarlineJunction({ ...base, outgoing: 'final' })).toEqual({
      outgoing: 'final',
      incomingStartRepeat: 'none',
    });
  });

  it('replaces a plain barline with the start repeat', () => {
    expect(
      resolveBarlineJunction({ ...base, incomingRepeatStart: true })
    ).toEqual({ outgoing: 'none', incomingStartRepeat: 'shared-thick' });
  });

  it('joins an end and a start repeat as thin–thick–thin', () => {
    expect(
      resolveBarlineJunction({
        ...base,
        outgoing: 'repeat-end',
        incomingRepeatStart: true,
      })
    ).toEqual({
      outgoing: 'repeat-end-thin',
      incomingStartRepeat: 'shared-thick',
    });
  });

  it('keeps a double or final barline and follows it', () => {
    expect(
      resolveBarlineJunction({
        ...base,
        outgoing: 'double',
        incomingRepeatStart: true,
      })
    ).toEqual({ outgoing: 'double', incomingStartRepeat: 'full' });
  });

  it('puts the start repeat after clef/key/time glyphs', () => {
    expect(
      resolveBarlineJunction({
        ...base,
        outgoing: 'repeat-end',
        incomingRepeatStart: true,
        incomingHasStartGlyphs: true,
      })
    ).toEqual({ outgoing: 'repeat-end', incomingStartRepeat: 'full' });
  });

  it('draws the start repeat in full at a row start', () => {
    expect(
      resolveBarlineJunction({
        ...base,
        incomingRepeatStart: true,
        sameRow: false,
        incomingHasStartGlyphs: true,
      })
    ).toEqual({ outgoing: 'single', incomingStartRepeat: 'full' });
  });

  it('ends the row with a thin double barline when asked', () => {
    const input = {
      ...base,
      incomingRepeatStart: true,
      sameRow: false,
      doubleBarBeforeRepeat: true,
    };
    expect(resolveBarlineJunction(input).outgoing).toBe('double');
    expect(
      resolveBarlineJunction({ ...input, outgoing: 'repeat-end' }).outgoing
    ).toBe('repeat-end');
  });
});

describe('resolveRepeatSpans', () => {
  const event = (
    kind: RepeatEvent['kind'],
    measureIndex: number,
    beatInBar: number,
    endingGroup: number | null = null
  ): RepeatEvent => ({
    kind,
    measureIndex,
    beatInBar,
    barCapacity: 1,
    endingGroup,
  });

  it('repeats the first section from the beginning', () => {
    const end = event('end', 3, 1);
    const { spans, warnings } = resolveRepeatSpans([end]);
    expect(spans).toEqual([{ start: null, end }]);
    expect(warnings).toEqual([]);
  });

  it('pairs an end with the latest start', () => {
    const start = event('start', 2, 0);
    const end = event('end', 5, 1);
    expect(resolveRepeatSpans([start, end]).spans).toEqual([{ start, end }]);
  });

  it('pairs back-to-back sections', () => {
    const events = [
      event('start', 0, 0),
      event('end', 1, 1),
      event('start', 2, 0),
      event('end', 3, 1),
    ];
    const { spans, warnings } = resolveRepeatSpans(events);
    expect(spans.map((span) => span.start?.measureIndex)).toEqual([0, 2]);
    expect(warnings).toEqual([]);
  });

  it('warns about a start left open before another start', () => {
    const { warnings } = resolveRepeatSpans([
      event('start', 0, 0),
      event('start', 2, 0),
      event('end', 3, 1),
    ]);
    expect(warnings).toHaveLength(1);
  });

  it('warns about a second end with no start of its own', () => {
    const { spans, warnings } = resolveRepeatSpans([
      event('end', 1, 1),
      event('end', 3, 1),
    ]);
    expect(warnings).toHaveLength(1);
    expect(spans[1].start?.measureIndex).toBe(1);
  });

  it('returns every ending of a group to the same start', () => {
    const start = event('start', 1, 0);
    const { spans, warnings } = resolveRepeatSpans([
      start,
      event('end', 3, 1, 7),
      event('end', 4, 1, 7),
    ]);
    expect(spans.map((span) => span.start)).toEqual([start, start]);
    expect(warnings).toEqual([]);
  });

  it('returns every ending of a group to the beginning with no start repeat', () => {
    const { spans, warnings } = resolveRepeatSpans([
      event('end', 2, 1, 0),
      event('end', 3, 1, 0),
    ]);
    expect(spans.map((span) => span.start)).toEqual([null, null]);
    expect(warnings).toEqual([]);
  });
});

describe('repeatPickupWarning', () => {
  const at = (
    kind: RepeatEvent['kind'],
    measureIndex: number,
    beatInBar: number
  ): RepeatEvent => ({
    kind,
    measureIndex,
    beatInBar,
    barCapacity: 1,
    endingGroup: null,
  });

  it('accepts a section on barlines', () => {
    expect(
      repeatPickupWarning({ start: at('start', 0, 0), end: at('end', 3, 1) })
    ).toBeNull();
    expect(repeatPickupWarning({ start: null, end: at('end', 3, 1) })).toBe(
      null
    );
  });

  it('accepts mid-bar ends that make up a whole bar', () => {
    // 4/4: three eighths after the start, a half and an eighth before the end.
    expect(
      repeatPickupWarning({
        start: at('start', 0, 5 / 8),
        end: at('end', 4, 5 / 8),
      })
    ).toBeNull();
  });

  it('warns when the ends do not make up a whole bar', () => {
    expect(
      repeatPickupWarning({
        start: at('start', 0, 5 / 8),
        end: at('end', 4, 1 / 2),
      })
    ).toContain('whole bars');
  });
});

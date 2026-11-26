import {
  TECHNIQUE_TEXT_BELOW_GAP_PX,
  TECHNIQUE_TEXT_NEXT_GAP_PX,
} from '../utils/notationDimensions';
import {
  belowTextPlacement,
  estimateTextWidthPx,
  hangOf,
  parseTechniqueText,
  techniqueTextMaxRight,
  techniqueTextSpan,
  textAttributeWarning,
} from './techniqueTextRules';

describe('parseTechniqueText', () => {
  it('breaks lines at |, trimming each and dropping empty ones', () => {
    expect(parseTechniqueText(' key slaps | | (without air) ')).toEqual([
      { text: 'key slaps', hang: '' },
      { text: '(without air)', hang: '(' },
    ]);
  });

  it('has no text when empty or blank', () => {
    expect(parseTechniqueText(null)).toBeNull();
    expect(parseTechniqueText('')).toBeNull();
    expect(parseTechniqueText('  |  ')).toBeNull();
  });

  it('hangs an opening quote or bracket only in text of several lines', () => {
    expect(parseTechniqueText('(play)')).toEqual([
      { text: '(play)', hang: '' },
    ]);
    expect(
      ['“a', '‘a', '"a', "'a", '(a', '[a', 'a('].map((line) => hangOf(line, 2))
    ).toEqual(['“', '‘', '"', "'", '(', '[', '']);
  });
});

describe('estimateTextWidthPx', () => {
  it('grows with the text and the font size', () => {
    expect(estimateTextWidthPx('sing', 10)).toBeLessThan(
      estimateTextWidthPx('sing softly', 10)
    );
    expect(estimateTextWidthPx('sing', 20)).toBeCloseTo(
      2 * estimateTextWidthPx('sing', 10)
    );
    expect(estimateTextWidthPx('il', 10)).toBeLessThan(
      estimateTextWidthPx('mw', 10)
    );
  });
});

describe('techniqueTextMaxRight', () => {
  it("runs to the row's end, or short of the next text past its own bar", () => {
    expect(
      techniqueTextMaxRight({
        rowRight: 900,
        nextTextX: null,
        ownBarRight: 300,
      })
    ).toBe(900);
    expect(
      techniqueTextMaxRight({ rowRight: 900, nextTextX: 600, ownBarRight: 300 })
    ).toBe(600 - TECHNIQUE_TEXT_NEXT_GAP_PX);
  });

  it('keeps its own bar when the next text is in it', () => {
    expect(
      techniqueTextMaxRight({ rowRight: 900, nextTextX: 250, ownBarRight: 300 })
    ).toBe(300);
  });
});

describe('techniqueTextSpan', () => {
  const input = {
    anchorX: 100,
    width: 200,
    minX: 0,
    rowRight: 900,
    nextTextX: null,
    ownBarRight: 300,
  };

  it('starts at its anchor and may pass its own barline', () => {
    expect(techniqueTextSpan(input)).toEqual({ left: 100, maxRight: 900 });
  });

  it("shifts left to end at the row's end or the next text", () => {
    expect(techniqueTextSpan({ ...input, rowRight: 250 })).toEqual({
      left: 50,
      maxRight: 250,
    });
    const nextTextX = 280 + TECHNIQUE_TEXT_NEXT_GAP_PX;
    expect(
      techniqueTextSpan({ ...input, ownBarRight: 200, nextTextX })
    ).toEqual({ left: 80, maxRight: 280 });
  });

  it("doesn't shift past its bar's notes area; the caller wraps the rest", () => {
    expect(
      techniqueTextSpan({ ...input, rowRight: 150, ownBarRight: 150 })
    ).toEqual({ left: 0, maxRight: 150 });
  });
});

describe('belowTextPlacement', () => {
  const input = {
    anchorX: 100,
    width: 30,
    inkLeft: 98,
    inkBottom: 140,
    previousRight: 20,
    rowTop: 110,
  };

  it('starts at its head with its own ink clear of the row', () => {
    expect(belowTextPlacement({ ...input, inkBottom: 105 })).toEqual({
      left: 100,
      top: 110,
    });
  });

  it('ends a gap before its own stem or ledger lines when there is room', () => {
    expect(belowTextPlacement(input)).toEqual({
      left: 98 - TECHNIQUE_TEXT_BELOW_GAP_PX - 30,
      top: 110,
    });
  });

  it('drops below its own ink when the previous entry leaves no room', () => {
    expect(belowTextPlacement({ ...input, previousRight: 80 })).toEqual({
      left: 100,
      top: 140 + TECHNIQUE_TEXT_BELOW_GAP_PX,
    });
  });
});

describe('textAttributeWarning', () => {
  it('warns about empty text and unknown values', () => {
    expect(textAttributeWarning('technique-text', ' | ')).toMatch(/empty/);
    expect(textAttributeWarning('dynamic-text', ' ')).toMatch(/empty/);
    expect(textAttributeWarning('technique-text-placement', 'left')).toMatch(
      /above or below/
    );
    expect(textAttributeWarning('technique-text-style', 'bold')).toMatch(
      /normal or italic/
    );
  });

  it('is quiet for good values and removed attributes', () => {
    expect(textAttributeWarning('technique-text', 'hum')).toBeNull();
    expect(
      textAttributeWarning('technique-text-placement', 'below')
    ).toBeNull();
    expect(textAttributeWarning('technique-text-style', 'italic')).toBeNull();
    expect(textAttributeWarning('technique-text', null)).toBeNull();
  });
});

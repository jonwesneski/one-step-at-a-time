import {
  arcTopUnder,
  lineTopUnder,
  resolveGlissandoLabel,
} from './glissandoLabelRules';

describe('resolveGlissandoLabel', () => {
  it.each([
    ['gliss', 'gliss.', true, 'head'],
    ['quasi-gliss', 'quasi gliss.', true, 'ink'],
    ['chrom', 'chrom.', false, 'grace'],
    ['chromatic', 'chromatic', false, 'grace'],
    ['lip', 'lip', false, 'head'],
    ['bend', 'bend', false, 'head'],
  ])('draws %s as "%s"', (value, text, italic, anchor) => {
    expect(resolveGlissandoLabel(value)).toEqual({
      lines: [text],
      italic,
      anchor,
    });
  });

  it('draws any other text as written, upright, from the head', () => {
    expect(resolveGlissandoLabel(' Bend pitch ¼-tone ')).toEqual({
      lines: ['Bend pitch ¼-tone'],
      italic: false,
      anchor: 'head',
    });
    expect(resolveGlissandoLabel('toString')?.lines).toEqual(['toString']);
  });

  it('starts a line at each bar, never an empty one', () => {
    expect(resolveGlissandoLabel('bend down|¼-tone')?.lines).toEqual([
      'bend down',
      '¼-tone',
    ]);
    expect(resolveGlissandoLabel('|bend||up|')?.lines).toEqual(['bend', 'up']);
  });

  it('is nothing with no text', () => {
    for (const value of [null, '', '  ', '|', ' | ']) {
      expect(resolveGlissandoLabel(value)).toBeNull();
    }
  });
});

describe('lineTopUnder', () => {
  const from = { x: 100, y: 80 };
  const to = { x: 200, y: 20 };

  it('is the higher end of the part under the label', () => {
    expect(lineTopUnder(from, to, { left: 0, right: 150 })).toBe(50);
    expect(lineTopUnder(from, to, { left: 120, right: 400 })).toBe(20);
  });

  it('is nothing for a line beside the label', () => {
    expect(lineTopUnder(from, to, { left: 0, right: 90 })).toBeNull();
    expect(lineTopUnder(from, to, { left: 210, right: 300 })).toBeNull();
  });
});

describe('arcTopUnder', () => {
  const arc = {
    from: { x: 100, y: 50 },
    to: { x: 200, y: 50 },
    reachY: 30,
    openStart: false,
    openEnd: false,
  };

  it('reaches its height in the middle and less at its ends', () => {
    expect(arcTopUnder(arc, { left: 140, right: 160 })).toBe(30);
    const nearStart = arcTopUnder(arc, { left: 80, right: 105 }) ?? 0;
    expect(nearStart).toBeGreaterThan(30);
    expect(nearStart).toBeLessThan(50);
    expect(arcTopUnder(arc, { left: 0, right: 90 })).toBeNull();
  });

  it('is at its height where it carries on into another bar', () => {
    const atEnd = { left: 190, right: 200 };
    expect(arcTopUnder({ ...arc, openEnd: true }, atEnd)).toBe(30);
    expect(
      arcTopUnder({ ...arc, openStart: true }, { left: 100, right: 110 })
    ).toBe(30);
    expect(arcTopUnder({ ...arc, openStart: true, openEnd: true }, atEnd)).toBe(
      30
    );
  });
});

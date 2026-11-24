/**
 * @jest-environment jsdom
 */
import { dynamicTextHalfWidth } from '../../rules/dynamicsRules';
import type { HairpinKind } from '../../types/theory';
import { DYNAMIC_REMINDER_BRACKET_WIDTH_PX } from '../notationDimensions';
import {
  createAngledHairpinSvg,
  createDynamicMarkingSvg,
  createHairpinSvg,
  createSwellSvg,
} from './dynamics';

type Point = { x: number; y: number };

function pathDs(group: SVGGElement): string[] {
  return Array.from(group.querySelectorAll('path')).map(
    (path) => path.getAttribute('d') ?? ''
  );
}

function pathEnds(group: SVGGElement): [Point, Point][] {
  return pathDs(group).map((d) => {
    const [, x1, y1, , x2, y2] = d.split(' ');
    return [
      { x: Number(x1), y: Number(y1) },
      { x: Number(x2), y: Number(y2) },
    ];
  });
}

describe('createHairpinSvg', () => {
  const crescendo: HairpinKind = 'crescendo';
  const decrescendo: HairpinKind = 'decrescendo';

  it.each([
    [crescendo, false, false, ['M 10 50 L 110 45', 'M 10 50 L 110 55']],
    [crescendo, true, false, ['M 10 47.5 L 110 45', 'M 10 52.5 L 110 55']],
    [crescendo, false, true, ['M 10 50 L 110 45', 'M 10 50 L 110 55']],
    [decrescendo, false, false, ['M 10 45 L 110 50', 'M 10 55 L 110 50']],
    [decrescendo, true, false, ['M 10 47.5 L 110 50', 'M 10 52.5 L 110 50']],
    [decrescendo, true, true, ['M 10 47.5 L 110 47.5', 'M 10 52.5 L 110 52.5']],
  ])(
    'draws a horizontal %s (openAtStart=%s, openAtEnd=%s) as two straight paths',
    (kind, openAtStart, openAtEnd, expected) => {
      const group = createHairpinSvg(
        kind,
        10,
        110,
        50,
        10,
        openAtStart,
        openAtEnd
      );

      expect(group.getAttribute('class')).toBe('hairpin');
      expect(pathDs(group)).toEqual(expected);
    }
  );
});

describe('createAngledHairpinSvg', () => {
  it('closes a crescendo to a single point at its start', () => {
    const group = createAngledHairpinSvg(
      'crescendo',
      { x: 0, y: 0 },
      { x: 30, y: -40 },
      10
    );
    const [top, bottom] = pathEnds(group);

    expect(group.classList.contains('hairpin')).toBe(true);
    expect(group.classList.contains('hairpin-angled')).toBe(true);
    expect(top[0]).toEqual({ x: 0, y: 0 });
    expect(bottom[0]).toEqual({ x: 0, y: 0 });
  });

  it('opens perpendicular to its axis with a spread of openHeight', () => {
    const group = createAngledHairpinSvg(
      'crescendo',
      { x: 0, y: 0 },
      { x: 30, y: -40 },
      10
    );
    const [top, bottom] = pathEnds(group);
    const openingX = bottom[1].x - top[1].x;
    const openingY = bottom[1].y - top[1].y;

    expect(Math.hypot(openingX, openingY)).toBeCloseTo(10);
    expect(openingX * 30 + openingY * -40).toBeCloseTo(0);
    expect((top[1].x + bottom[1].x) / 2).toBeCloseTo(30);
    expect((top[1].y + bottom[1].y) / 2).toBeCloseTo(-40);
  });

  it('closes a decrescendo to a single point at its end', () => {
    const group = createAngledHairpinSvg(
      'decrescendo',
      { x: 0, y: 40 },
      { x: 30, y: 0 },
      10
    );
    const [top, bottom] = pathEnds(group);

    expect(top[1]).toEqual({ x: 30, y: 0 });
    expect(bottom[1]).toEqual({ x: 30, y: 0 });
    expect(
      Math.hypot(bottom[0].x - top[0].x, bottom[0].y - top[0].y)
    ).toBeCloseTo(10);
  });
});

describe('createDynamicMarkingSvg', () => {
  it('draws a reminder between upright brackets, still centred', () => {
    const text = createDynamicMarkingSvg('f', 50, 90, { bracketed: true });
    expect(text.textContent).toBe('(f)');
    expect(text.getAttribute('text-anchor')).toBe('middle');
    const [open, marking, close] = Array.from(text.children);
    expect(open.getAttribute('font-style')).toBe('normal');
    expect(marking.getAttribute('font-style')).toBeNull();
    expect(close.getAttribute('font-style')).toBe('normal');
  });

  it('draws a plain marking as before', () => {
    expect(createDynamicMarkingSvg('mf', 50, 90).textContent).toBe('mf');
  });
});

describe('dynamicTextHalfWidth', () => {
  it('widens by both brackets for a reminder', () => {
    expect(dynamicTextHalfWidth('f', true) - dynamicTextHalfWidth('f')).toBe(
      DYNAMIC_REMINDER_BRACKET_WIDTH_PX
    );
  });
});

describe('createSwellSvg', () => {
  it('draws a crescendo then a diminuendo on one line', () => {
    const group = createSwellSvg(
      {
        crescendo: { startX: 0, endX: 45 },
        diminuendo: { startX: 55, endX: 100 },
      },
      30
    );
    expect(group.classList.contains('swell')).toBe(true);
    expect(group.querySelectorAll('.hairpin')).toHaveLength(2);
  });
});

/**
 * @jest-environment jsdom
 */
import type { HairpinKind } from '../../types/theory';
import { createAngledHairpinSvg, createHairpinSvg } from './dynamics';

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

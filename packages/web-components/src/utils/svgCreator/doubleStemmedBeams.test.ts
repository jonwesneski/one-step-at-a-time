/**
 * @jest-environment jsdom
 */
import { BEAM_THICKNESS_PX } from '../notationDimensions';
import { createDoubleStemmedBeamPolygon } from './doubleStemmedBeams';

describe('createDoubleStemmedBeamPolygon', () => {
  it('builds a 4-point polygon growing downward by BEAM_THICKNESS_PX', () => {
    const polygon = createDoubleStemmedBeamPolygon(0, 100, 200, 90);

    expect(polygon.classList.contains('double-stemmed-beam')).toBe(true);
    expect(polygon.getAttribute('fill')).toBe('currentColor');
    expect(polygon.getAttribute('points')).toBe(
      `0,100 0,${100 + BEAM_THICKNESS_PX} 200,${90 + BEAM_THICKNESS_PX} 200,90`
    );
  });

  it('draws a horizontal polygon when y1 equals y2', () => {
    const polygon = createDoubleStemmedBeamPolygon(10, 50, 110, 50);

    expect(polygon.getAttribute('points')).toBe(
      `10,50 10,${50 + BEAM_THICKNESS_PX} 110,${50 + BEAM_THICKNESS_PX} 110,50`
    );
  });
});

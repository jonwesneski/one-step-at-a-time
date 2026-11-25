/**
 * @jest-environment jsdom
 */
import {
  GLISSANDO_DIP_DEPTH_PX,
  GLISSANDO_DIP_WIDTH_PX,
  GLISSANDO_LINE_THICKNESS_PX,
  GLISSANDO_WAVE_AMPLITUDE_PX,
  GLISSANDO_WAVELENGTH_PX,
} from '../notationDimensions';
import { createGlissandoLineSvg, type GlissandoLineProps } from './glissando';

const from = { x: 0, y: 50 };
const to = { x: 200, y: 50 };

const pathOf = (props: Partial<GlissandoLineProps>): SVGPathElement =>
  createGlissandoLineSvg({
    from,
    to,
    shape: 'straight',
    ...props,
  }).querySelector('path') as SVGPathElement;

const numbersOf = (path: SVGPathElement): number[] =>
  (path.getAttribute('d') ?? '').match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];

describe('createGlissandoLineSvg', () => {
  it('draws a straight line at stave-line weight', () => {
    const path = pathOf({});
    expect(path.getAttribute('d')).toBe('M 0 50 L 200 50');
    expect(Number(path.getAttribute('stroke-width'))).toBe(
      GLISSANDO_LINE_THICKNESS_PX
    );
  });

  it('dips around its centre and runs straight to both ends', () => {
    const numbers = numbersOf(pathOf({ shape: 'dip', dipCenterX: 80 }));
    const left = 80 - GLISSANDO_DIP_WIDTH_PX / 2;
    const right = 80 + GLISSANDO_DIP_WIDTH_PX / 2;
    expect(numbers.slice(0, 4)).toEqual([0, 50, left, 50]);
    expect(numbers.slice(8, 10)).toEqual([80, 50 + GLISSANDO_DIP_DEPTH_PX]);
    expect(numbers.slice(-4)).toEqual([right, 50, 200, 50]);
  });

  it('keeps a dip on its line, sloped or near an end', () => {
    const nearEnd = numbersOf(pathOf({ shape: 'dip', dipCenterX: 195 }));
    expect(nearEnd[nearEnd.length - 4]).toBeLessThanOrEqual(200);
    const sloped = numbersOf(
      pathOf({ shape: 'dip', to: { x: 200, y: 150 }, dipCenterX: 100 })
    );
    expect(sloped.slice(8, 10)).toEqual([100, 100 + GLISSANDO_DIP_DEPTH_PX]);
  });

  it('waves in whole half-waves, the first one up', () => {
    const path = pathOf({
      shape: 'wave',
      to: { x: GLISSANDO_WAVELENGTH_PX * 2, y: 50 },
    });
    expect(path.getAttribute('d')?.match(/C/g)).toHaveLength(4);
    const [, , , firstControlY] = numbersOf(path);
    expect(50 - firstControlY).toBeCloseTo(
      (GLISSANDO_WAVE_AMPLITUDE_PX * 4) / 3
    );
    expect(numbersOf(path).slice(-2)[1]).toBeCloseTo(50);
  });

  it("puts a label above the line, and above a wave's crests", () => {
    const labelY = (shape: 'straight' | 'wave'): number =>
      Number(
        createGlissandoLineSvg({ from, to, shape, label: 'gliss.' })
          .querySelector('text')
          ?.getAttribute('y')
      );
    expect(labelY('straight')).toBeLessThan(50);
    expect(labelY('wave')).toBeCloseTo(
      labelY('straight') - GLISSANDO_WAVE_AMPLITUDE_PX
    );
  });
});

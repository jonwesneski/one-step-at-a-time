/**
 * @jest-environment jsdom
 */
import {
  BEND_TARGET_PARENTHESIS_HALF_HEIGHT_PX,
  BEND_TARGET_PARENTHESIS_WIDTH_PX,
  GLISSANDO_DIP_DEPTH_PX,
  GLISSANDO_DIP_WIDTH_PX,
  GLISSANDO_LINE_THICKNESS_PX,
  GLISSANDO_WAVE_AMPLITUDE_PX,
  GLISSANDO_WAVELENGTH_PX,
  TRILL_WRITTEN_NOTE_GAP_PX,
} from '../notationDimensions';
import {
  bendTargetWidthPx,
  createBendSvg,
  createBendTargetSvg,
  createGlissandoLineSvg,
  type GlissandoLineProps,
} from './glissando';
import { computeWrittenTrillNoteWidth, createWrittenTrillNoteSvg } from './trill';

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

describe('createBendSvg', () => {
  const lines = [
    { from, to },
    { from: { x: 0, y: 30 }, to: { x: 200, y: 37 } },
  ];

  it('draws a line for each head and no target without one', () => {
    const bend = createBendSvg('down', { lines, targetLeftX: null }, null);
    const paths = Array.from(bend.querySelectorAll('.bend-line'));
    expect(paths.map((path) => path.getAttribute('d'))).toEqual([
      'M 0 50 L 200 50',
      'M 0 30 L 200 37',
    ]);
    expect(bend.querySelector('.bend-target-note')).toBeNull();
    expect(bend.classList.contains('connector')).toBe(false);
  });

  it('puts the target where the layout says', () => {
    const bend = createBendSvg(
      'up',
      { lines: [{ from, to }], targetLeftX: 210 },
      { centerY: 40, accidental: 'sharp-up', staffY: 40 }
    );
    const open = bend.querySelector('.parenthesis-open');
    expect(open?.getAttribute('d')).toBe(
      `M ${210 + BEND_TARGET_PARENTHESIS_WIDTH_PX} ${
        40 - BEND_TARGET_PARENTHESIS_HALF_HEIGHT_PX
      }${open?.getAttribute('d')?.slice(open.getAttribute('d')?.indexOf(' Q'))}`
    );
    expect(bend.querySelector('.bend-target-note-accidental')).not.toBeNull();
  });
});

describe('createBendTargetSvg', () => {
  it('is not a drag target', () => {
    const target = createBendTargetSvg({
      leftX: 0,
      centerY: 40,
      accidental: null,
    });
    expect(target.querySelector('.bend-target-head')).not.toBeNull();
    expect(target.querySelector('.head, .head-hit-zone')).toBeNull();
  });

  it('keeps its parentheses one height, arrow or no arrow', () => {
    const parenthesisOf = (accidental: 'sharp' | 'sharp-up') =>
      createBendTargetSvg({ leftX: 0, centerY: 40, accidental })
        .querySelector('.parenthesis-open')
        ?.getAttribute('d');
    expect(parenthesisOf('sharp-up')).toBe(parenthesisOf('sharp'));
  });

  it('widens for an accidental', () => {
    expect(bendTargetWidthPx('sharp')).toBeGreaterThan(bendTargetWidthPx(null));
  });

  it('draws ledger lines outside the stave', () => {
    const ledgers = (staffY: number | null) =>
      createBendTargetSvg({ leftX: 0, centerY: 0, accidental: null, staffY })
        .querySelectorAll('.bend-target-ledger-line').length;
    expect(ledgers(null)).toBe(0);
    expect(ledgers(40)).toBe(0);
    expect(ledgers(-40)).toBeGreaterThan(0);
  });
});

describe('a written trilling note', () => {
  it('is as wide as the room reserved for it', () => {
    for (const accidental of [null, 'flat', 'natural-up'] as const) {
      const { element, width } = createWrittenTrillNoteSvg({
        leftX: 0,
        centerY: 40,
        accidental,
      });
      expect(TRILL_WRITTEN_NOTE_GAP_PX + width).toBeCloseTo(
        computeWrittenTrillNoteWidth(accidental)
      );
      expect(element.querySelectorAll('.trill-parenthesis')).toHaveLength(2);
      expect(element.querySelector('.trill-written-head')).not.toBeNull();
    }
  });
});

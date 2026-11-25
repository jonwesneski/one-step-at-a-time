/**
 * @jest-environment jsdom
 */
import { accidentalArrowOverhangs } from '../../rules/accidentalRules';
import type {
  ConventionalAccidentalType,
  QuarterTone,
} from '../../types/theory';
import { ACCIDENTAL_TYPES, QUARTER_TONES } from '../consts';
import {
  ACCIDENTAL_ARROW_OVERSHOOT_PX,
  ACCIDENTAL_ARROW_STROKES,
  STAFF_LINE_SPACING,
} from '../notationDimensions';
import { createAccidentalSvg } from './accidental';

const arrowOf = (
  base: ConventionalAccidentalType,
  quarterTone: QuarterTone
): { tip: { x: number; y: number }; shaftX: number } => {
  const svg = createAccidentalSvg(`${base}-${quarterTone}`);
  const arrow = svg.querySelector('.accidental-arrow') as SVGGElement;
  const points = (arrow.querySelector('path')?.getAttribute('d') ?? '')
    .replace(/[ML]/g, '')
    .trim()
    .split(/\s+/)
    .map((point) => point.split(',').map(Number));
  return {
    tip: { x: points[1][0], y: points[1][1] },
    shaftX: Number(arrow.querySelector('line')?.getAttribute('x1')),
  };
};

describe('accidental arrows', () => {
  it.each(ACCIDENTAL_TYPES)('extends a stroke of a %s each way', (base) => {
    for (const quarterTone of QUARTER_TONES) {
      const { tip, shaftX } = arrowOf(base, quarterTone);
      const stroke = ACCIDENTAL_ARROW_STROKES[base][quarterTone];
      expect(tip.x).toBeCloseTo(stroke.x);
      expect(shaftX).toBeCloseTo(stroke.x);
      expect(tip.y).toBeCloseTo(
        stroke.endY +
          (quarterTone === 'up' ? -1 : 1) * ACCIDENTAL_ARROW_OVERSHOOT_PX
      );
    }
  });

  it('uses the stroke that projects furthest each way', () => {
    // The natural's left stroke is the taller, its right the lower; the
    // sharp's the other way round. A flat has one stem.
    expect(arrowOf('natural', 'up').tip.x).toBeLessThan(
      arrowOf('natural', 'down').tip.x
    );
    expect(arrowOf('sharp', 'up').tip.x).toBeGreaterThan(
      arrowOf('sharp', 'down').tip.x
    );
    expect(arrowOf('flat', 'up').tip.x).toBe(arrowOf('flat', 'down').tip.x);
  });

  it.each(ACCIDENTAL_TYPES)('keeps the box of a plain %s', (base) => {
    const plain = createAccidentalSvg(base);
    for (const quarterTone of QUARTER_TONES) {
      const arrowed = createAccidentalSvg(`${base}-${quarterTone}`);
      for (const attribute of ['viewBox', 'width', 'height']) {
        expect(arrowed.getAttribute(attribute)).toBe(
          plain.getAttribute(attribute)
        );
      }
      expect(arrowed.getAttribute('overflow')).toBe('visible');
    }
    expect(plain.querySelector('.accidental-arrow')).toBeNull();
  });

  it('draws in px of the glyph, whatever its viewBox', () => {
    const arrow =
      createAccidentalSvg('flat-up').querySelector('.accidental-arrow');
    // 300 units drawn 25px tall.
    expect(arrow?.getAttribute('transform')).toMatch(/^scale\(12(\.0+)?\d*\)/);
  });
});

describe('a reminder with an arrow', () => {
  it('encloses the arrow in taller parentheses, centred on the whole sign', () => {
    const boundsOf = (
      accidental: 'natural' | 'natural-up' | 'natural-down'
    ) => {
      const svg = createAccidentalSvg(accidental, true);
      const ys = Array.from(svg.querySelectorAll(':scope > path')).flatMap(
        (path) =>
          Array.from(
            (path.getAttribute('d') ?? '').matchAll(
              /(-?[\d.]+)[ ,](-?[\d.]+)/g
            ),
            (match) => Number(match[2])
          )
      );
      return { top: Math.min(...ys), bottom: Math.max(...ys) };
    };
    const plain = boundsOf('natural');
    const up = boundsOf('natural-up');
    const down = boundsOf('natural-down');
    expect(up.top).toBeLessThan(plain.top);
    expect(up.bottom).toBeLessThanOrEqual(plain.bottom);
    expect(down.bottom).toBeGreaterThan(plain.bottom);
    expect(down.top).toBeGreaterThanOrEqual(plain.top);
  });

  it('moves the glyph clear of the opening parenthesis', () => {
    const glyphX = (accidental: 'flat' | 'flat-up') =>
      Number(
        createAccidentalSvg(accidental, true)
          .querySelector('svg')
          ?.getAttribute('x')
      );
    expect(glyphX('flat-up') - glyphX('flat')).toBeGreaterThan(
      accidentalArrowOverhangs('flat-up').left
    );
    expect(glyphX('flat-up') - glyphX('flat')).toBeLessThan(STAFF_LINE_SPACING);
  });
});

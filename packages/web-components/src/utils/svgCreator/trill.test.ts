/**
 * @jest-environment jsdom
 */
import {
  TRILL_DOUBLE_WAVE_HEIGHT_PX,
  TRILL_NOTCH_HEIGHT_PX,
  TRILL_SIGN_HEIGHT_PX,
  TRILL_WAVE_HEIGHT_PX,
} from '../notationDimensions';
import { createTrillLineSvg, createTrillNotchSvg } from './trill';

const rowOffsets = (line: SVGGElement): number[] => [
  ...new Set(
    Array.from(line.querySelectorAll('.trill-wave-tile')).map((tile) =>
      Number(
        /translate\([^ ]+ ([^)]+)\)/.exec(tile.getAttribute('transform')!)![1]
      )
    )
  ),
];

describe('createTrillLineSvg', () => {
  it('draws one row of waves, or two thinner rows for a double trill', () => {
    const single = createTrillLineSvg({ startX: 0, endX: 80, bottomY: 50 })!;
    const double = createTrillLineSvg({
      startX: 0,
      endX: 80,
      bottomY: 50,
      double: true,
    })!;
    expect(rowOffsets(single)).toEqual([0]);
    expect(single.getAttribute('transform')).toBe(
      `translate(0 ${50 - TRILL_WAVE_HEIGHT_PX})`
    );
    expect(double.classList.contains('trill-line-double')).toBe(true);
    const tiles = double.querySelectorAll('.trill-wave-tile');
    expect(tiles.length).toBe(
      2 * single.querySelectorAll('.trill-wave-tile').length
    );
    const [lower, upper] = rowOffsets(double);
    expect(double.getAttribute('transform')).toBe(
      `translate(0 ${50 - TRILL_DOUBLE_WAVE_HEIGHT_PX})`
    );
    expect(lower).toBe(0);
    // The upper line's top is level with the sign's.
    expect(50 - TRILL_DOUBLE_WAVE_HEIGHT_PX + upper).toBeCloseTo(
      50 - TRILL_SIGN_HEIGHT_PX
    );
  });

  it('notches the full height of a double line', () => {
    expect(Number(createTrillNotchSvg(10, 50).getAttribute('y2'))).toBe(
      50 - TRILL_NOTCH_HEIGHT_PX
    );
    expect(Number(createTrillNotchSvg(10, 50, true).getAttribute('y2'))).toBe(
      50 - TRILL_SIGN_HEIGHT_PX
    );
  });
});

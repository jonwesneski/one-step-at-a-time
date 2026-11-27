/**
 * @jest-environment jsdom
 */
import {
  BREATH_MARK_COMMA_HEIGHT_PX,
  BREATH_MARK_SIDE_GAP_PX,
  BREATH_MARK_TICK_HEIGHT_PX,
} from '../notationDimensions';
import {
  breathMarkHeightPx,
  breathMarkReservedWidthPx,
  breathMarkWidthPx,
  createBreathMarkSvg,
} from './breathMarks';

describe('createBreathMarkSvg', () => {
  it.each(['tick', 'comma'] as const)('draws one %s glyph', (kind) => {
    const group = createBreathMarkSvg(kind, 50, 20);
    expect(group.classList.contains('breath-mark')).toBe(true);
    expect(group.classList.contains(`breath-mark-${kind}`)).toBe(true);
    expect(group.querySelectorAll('path')).toHaveLength(1);
  });

  it('places its top-left corner from the centre x and bottom y', () => {
    const group = createBreathMarkSvg('tick', 50, 20);
    const [, x, y] =
      group
        .getAttribute('transform')
        ?.match(/translate\((\S+) (\S+)\)/)
        ?.map(Number) ?? [];
    expect(x).toBeCloseTo(50 - breathMarkWidthPx('tick') / 2, 5);
    expect(y).toBeCloseTo(20 - BREATH_MARK_TICK_HEIGHT_PX, 5);
  });
});

describe('breath mark sizes', () => {
  it('draws the tick 1½ spaces tall and the comma at its own size', () => {
    expect(breathMarkHeightPx('tick')).toBe(BREATH_MARK_TICK_HEIGHT_PX);
    expect(breathMarkHeightPx('comma')).toBe(BREATH_MARK_COMMA_HEIGHT_PX);
    expect(breathMarkWidthPx('comma')).toBeLessThan(breathMarkWidthPx('tick'));
  });

  it('reserves the glyph plus a gap each side', () => {
    expect(breathMarkReservedWidthPx('tick')).toBeCloseTo(
      breathMarkWidthPx('tick') + 2 * BREATH_MARK_SIDE_GAP_PX,
      5
    );
  });
});

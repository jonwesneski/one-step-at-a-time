import {
  GLISSANDO_DIP_WIDTH_PX,
  GLISSANDO_GAP_PX,
  GLISSANDO_LEVEL_LIFT_PX,
  GLISSANDO_MIN_DRAWN_PX,
  GLISSANDO_MIN_GAP_PX,
  GLISSANDO_OFF_LINE_PX,
  GLISSANDO_WAVELENGTH_PX,
} from '../utils/notationDimensions';
import {
  glissandoDipWidthPx,
  glissandoEndpoints,
  glissandoEndYs,
  glissandoHalfWaveCount,
  glissandoShapeWarning,
  glissandoXSpan,
  splitGlissandoAcrossRows,
} from './glissandoRules';

const heights = {
  startHeadY: 60,
  endHeadY: 30,
  startDotY: null,
  startOnLine: false,
  endOnLine: false,
  shape: 'straight' as const,
};

describe('glissandoEndYs', () => {
  it("runs between the heads' centres when both are in spaces", () => {
    expect(glissandoEndYs(heights)).toEqual({ fromY: 60, toY: 30 });
  });

  it('keeps a sloped line off the stave lines, away from its travel at the start', () => {
    const rising = glissandoEndYs({
      ...heights,
      startOnLine: true,
      endOnLine: true,
    });
    expect(rising).toEqual({
      fromY: 60 + GLISSANDO_OFF_LINE_PX,
      toY: 30 - GLISSANDO_OFF_LINE_PX,
    });
    const falling = glissandoEndYs({
      ...heights,
      startHeadY: 30,
      endHeadY: 60,
      startOnLine: true,
    });
    expect(falling).toEqual({ fromY: 30 - GLISSANDO_OFF_LINE_PX, toY: 60 });
  });

  it('moves a level line, and a wave, up into the space', () => {
    const level = {
      ...heights,
      endHeadY: 60,
      startOnLine: true,
      endOnLine: true,
    };
    const lifted = 60 - GLISSANDO_LEVEL_LIFT_PX;
    expect(glissandoEndYs(level)).toEqual({ fromY: lifted, toY: lifted });
    expect(
      glissandoEndYs({ ...heights, startOnLine: true, shape: 'wave' })
    ).toEqual({ fromY: lifted, toY: 30 });
  });

  it('starts level with a dot', () => {
    expect(
      glissandoEndYs({ ...heights, startOnLine: true, startDotY: 55 }).fromY
    ).toBe(55);
  });
});

describe('glissandoXSpan', () => {
  it('keeps the gap from the ink at both ends', () => {
    expect(glissandoXSpan(10, 100)).toEqual({
      fromX: 10 + GLISSANDO_GAP_PX,
      toX: 100 - GLISSANDO_GAP_PX,
    });
  });

  it('closes the gaps for a short span, then gives up', () => {
    const tight = GLISSANDO_MIN_DRAWN_PX + 2 * GLISSANDO_MIN_GAP_PX;
    expect(glissandoXSpan(0, tight)).toEqual({
      fromX: GLISSANDO_MIN_GAP_PX,
      toX: tight - GLISSANDO_MIN_GAP_PX,
    });
    expect(glissandoXSpan(0, tight - 1)).toBeNull();
    expect(
      glissandoEndpoints({ ...heights, startInkRight: 0, endInkLeft: 5 })
    ).toBeNull();
  });
});

describe('splitGlissandoAcrossRows', () => {
  it('breaks where both halves keep one slope', () => {
    const { breakRelY } = splitGlissandoAcrossRows({
      fromRelY: 60,
      toRelY: 20,
      firstLength: 30,
      secondLength: 10,
    });
    expect((breakRelY - 60) / 30).toBeCloseTo((20 - breakRelY) / 10);
  });

  it('copes with no length at all', () => {
    expect(
      splitGlissandoAcrossRows({
        fromRelY: 60,
        toRelY: 20,
        firstLength: 0,
        secondLength: 0,
      })
    ).toEqual({ breakRelY: 60 });
  });
});

describe('glissando contours', () => {
  it('narrows a dip to a short line', () => {
    expect(glissandoDipWidthPx(200)).toBe(GLISSANDO_DIP_WIDTH_PX);
    expect(glissandoDipWidthPx(15)).toBe(15);
  });

  it('fits whole half-waves, at least one', () => {
    expect(glissandoHalfWaveCount(GLISSANDO_WAVELENGTH_PX * 2)).toBe(4);
    expect(glissandoHalfWaveCount(GLISSANDO_WAVELENGTH_PX * 1.6)).toBe(3);
    expect(glissandoHalfWaveCount(1)).toBe(1);
  });
});

describe('glissandoShapeWarning', () => {
  it('is silent for a straight line or on a start', () => {
    expect(
      glissandoShapeWarning({ shape: 'straight', glissando: null })
    ).toBeNull();
    expect(
      glissandoShapeWarning({ shape: 'dip', glissando: 'start' })
    ).toBeNull();
  });

  it('warns elsewhere', () => {
    expect(
      glissandoShapeWarning({ shape: 'wave', glissando: 'end' })
    ).toContain('starts no glissando');
  });
});

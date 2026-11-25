import type { BendShape, Note, Octave, QuarterTone } from '../types/theory';
import {
  BEND_BARLINE_GAP_PX,
  BEND_FREE_TRAVEL_PX,
  BEND_SAME_POSITION_TILT_PX,
  GLISSANDO_DIP_WIDTH_PX,
  GLISSANDO_GAP_PX,
  GLISSANDO_LEVEL_LIFT_PX,
  GLISSANDO_MIN_DRAWN_PX,
  GLISSANDO_MIN_GAP_PX,
  GLISSANDO_MIN_LENGTH_PX,
  GLISSANDO_OFF_LINE_PX,
  GLISSANDO_WAVELENGTH_PX,
} from '../utils/notationDimensions';
import {
  bendConsistencyWarning,
  bendDotYs,
  bendReserveWidthPx,
  bendTargetSteps,
  glissandoDipWidthPx,
  glissandoEndpoints,
  glissandoEndYs,
  glissandoHalfWaveCount,
  glissandoShapeWarning,
  glissandoXSpan,
  layoutBend,
  resolveBend,
  splitGlissandoAcrossRows,
  type BendHead,
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

describe('resolveBend', () => {
  const resolve = (
    note: Note,
    {
      bend = null,
      bendTo = null,
      bendToQuarterTone = null,
      octave = 4,
      quarterTone = null,
    }: {
      bend?: BendShape | null;
      bendTo?: Note | null;
      bendToQuarterTone?: QuarterTone | null;
      octave?: Octave;
      quarterTone?: QuarterTone | null;
    }
  ) => resolveBend(bend, bendTo, bendToQuarterTone, note, octave, quarterTone);

  it('is nothing without bend or bend-to, and free without bend-to', () => {
    expect(resolve('C', {})).toBeNull();
    expect(resolve('C', { bend: 'dip' })).toEqual({
      shape: 'dip',
      target: null,
    });
  });

  it('counts the arrow in the direction of a target on the same letter', () => {
    const up = resolve('C#', { bendTo: 'C#', bendToQuarterTone: 'up' });
    expect(up?.shape).toBe('up');
    expect(up?.target).toEqual({
      letter: 'C',
      octave: 4,
      accidental: 'sharp-up',
    });
    const down = resolve('C#', { bendTo: 'C#', bendToQuarterTone: 'down' });
    expect(down?.shape).toBe('down');
    expect(
      resolve('C', { quarterTone: 'up', bendTo: 'C#', bendToQuarterTone: null })
        ?.shape
    ).toBe('up');
  });

  it('takes the octave nearest the note', () => {
    expect(resolve('B', { bendTo: 'C' })?.target?.octave).toBe(5);
    expect(resolve('C', { bendTo: 'B' })?.target?.octave).toBe(3);
    expect(resolve('C', { bendTo: 'G' })?.target?.octave).toBe(3);
  });

  it('goes the way bend says when the target is a tritone either way', () => {
    expect(resolve('F', { bendTo: 'B' })?.target?.octave).toBe(4);
    expect(resolve('F', { bendTo: 'B', bend: 'down' })?.target?.octave).toBe(3);
  });

  it('keeps a dip or wave, and turns an up or down toward the target', () => {
    expect(resolve('C', { bendTo: 'D', bend: 'wave' })?.shape).toBe('wave');
    expect(resolve('C', { bendTo: 'D', bend: 'down' })?.shape).toBe('up');
  });

  it("cancels the note's own accidental on a plain target letter", () => {
    expect(resolve('C#', { bendTo: 'C' })?.target?.accidental).toBe('natural');
    expect(resolve('C', { bendTo: 'D' })?.target?.accidental).toBeNull();
  });
});

describe('bendTargetSteps', () => {
  it('counts staff steps across the octave', () => {
    const target = { letter: 'C' as const, octave: 5 as Octave, accidental: null };
    expect(bendTargetSteps('B', 4, target)).toBe(1);
    expect(bendTargetSteps('D', 5, target)).toBe(-1);
  });
});

describe('bendReserveWidthPx', () => {
  it('adds a target and its gap to the line and both gaps', () => {
    const free = GLISSANDO_MIN_LENGTH_PX + 2 * GLISSANDO_GAP_PX;
    expect(bendReserveWidthPx(null, 0)).toBe(0);
    expect(bendReserveWidthPx('down', 0)).toBe(free);
    expect(bendReserveWidthPx('down', 18)).toBe(free + 18 + GLISSANDO_GAP_PX);
  });
});

describe('layoutBend', () => {
  const head: BendHead = { y: 50, dotY: null, onLine: false };
  const base = {
    shape: 'down' as BendShape,
    heads: [head],
    target: null,
    inkRight: 20,
    tail: null,
    limit: { kind: 'ink' as const, left: 100 },
  };
  const lineOf = (input: Partial<Parameters<typeof layoutBend>[0]>) => {
    const layout = layoutBend({ ...base, ...input });
    if (layout === null) {
      throw new Error('no layout');
    }
    return layout.lines[0];
  };

  it('runs from its note to the next ink, half a space from each', () => {
    const { from, to } = lineOf({});
    expect(from).toEqual({ x: 20 + GLISSANDO_GAP_PX, y: 50 });
    expect(to).toEqual({ x: 100 - GLISSANDO_GAP_PX, y: 50 + BEND_FREE_TRAVEL_PX });
  });

  it('moves as far whatever its length', () => {
    const { from, to } = lineOf({ limit: { kind: 'ink', left: 400 } });
    expect(to.y - from.y).toBeCloseTo(BEND_FREE_TRAVEL_PX);
  });

  it('starts just off a stave line, away from its travel', () => {
    const onLine = [{ ...head, onLine: true }];
    expect(lineOf({ heads: onLine }).from.y).toBe(50 - GLISSANDO_OFF_LINE_PX);
    expect(lineOf({ heads: onLine, shape: 'up' }).from.y).toBe(
      50 + GLISSANDO_OFF_LINE_PX
    );
  });

  it('lifts a wave or dip into the space, and starts level with a dot', () => {
    const onLine = { ...head, onLine: true };
    for (const shape of ['wave', 'dip'] as const) {
      const { from, to } = lineOf({ heads: [onLine], shape });
      expect(from.y).toBe(50 - GLISSANDO_LEVEL_LIFT_PX);
      expect(to.y).toBe(from.y);
    }
    expect(lineOf({ heads: [{ ...onLine, dotY: 45 }] }).from.y).toBe(45);
  });

  it('drops a level line where a neighbouring head has the space above', () => {
    const layout = layoutBend({
      ...base,
      shape: 'wave',
      heads: [
        { y: 50, dotY: null, onLine: true },
        { y: 45, dotY: null, onLine: false },
      ],
    });
    expect(layout?.lines.map(({ from }) => from.y)).toEqual([55, 45]);
  });

  it('keeps off a barline as far as its room allows', () => {
    expect(lineOf({ limit: { kind: 'barline', left: 100 } }).to.x).toBe(
      100 - BEND_BARLINE_GAP_PX
    );
    const tight = 20 + bendReserveWidthPx('down', 0);
    expect(lineOf({ limit: { kind: 'barline', left: tight } }).to.x).toBe(
      tight - GLISSANDO_GAP_PX
    );
  });

  it('puts a target before the limit and runs to it', () => {
    const layout = layoutBend({
      ...base,
      shape: 'up',
      target: { y: 40, onLine: false, width: 20 },
    });
    expect(layout?.targetLeftX).toBe(100 - GLISSANDO_GAP_PX - 20);
    expect(layout?.lines[0].to).toEqual({
      x: 100 - 2 * GLISSANDO_GAP_PX - 20,
      y: 40,
    });
  });

  it('tilts toward a target on its own position', () => {
    const target = { y: 50, onLine: false, width: 20 };
    expect(lineOf({ target, shape: 'up' }).to.y).toBe(
      50 - BEND_SAME_POSITION_TILT_PX
    );
    expect(lineOf({ target, shape: 'down' }).to.y).toBe(
      50 + BEND_SAME_POSITION_TILT_PX
    );
  });

  it('clears a tail only where the line would cross it', () => {
    const tail = { right: 30, bottomY: 46 };
    expect(lineOf({ tail }).from.x).toBe(20 + GLISSANDO_GAP_PX);
    expect(lineOf({ tail, shape: 'wave' }).from.x).toBe(30 + GLISSANDO_GAP_PX);
  });

  it('closes its first gap before giving up', () => {
    const short = 20 + GLISSANDO_MIN_GAP_PX + GLISSANDO_MIN_DRAWN_PX;
    const limitAt = (left: number) => ({
      ...base,
      limit: { kind: 'ink' as const, left: left + GLISSANDO_GAP_PX },
    });
    expect(layoutBend(limitAt(short))?.lines[0].from.x).toBe(
      20 + GLISSANDO_MIN_GAP_PX
    );
    expect(layoutBend(limitAt(short - 1))).toBeNull();
  });

  it('is a set length standalone', () => {
    const { from, to } = lineOf({ limit: { kind: 'length', length: 50 } });
    expect(to.x - from.x).toBe(50);
  });

  it('ends every line of a chord at one x', () => {
    const layout = layoutBend({
      ...base,
      heads: [head, { ...head, y: 30 }, { ...head, y: 10 }],
    });
    expect(new Set(layout?.lines.map(({ to }) => to.x)).size).toBe(1);
  });
});

describe('bendDotYs', () => {
  it('pairs rows with heads, top to bottom', () => {
    expect(bendDotYs([50, 45], [45, 55])).toEqual([55, 45]);
  });

  it('takes the nearest row when they do not pair up', () => {
    expect(bendDotYs([50], [45, 55])).toEqual([45]);
    expect(bendDotYs([50], [])).toEqual([null]);
  });
});

describe('bendConsistencyWarning', () => {
  const fine = {
    bend: 'down' as BendShape | null,
    bendTo: null as Note | null,
    glissando: null,
    isChord: false,
    inTremoloGroup: false,
    onTriangle: false,
    targetDirection: null,
  };
  it('names what stops a bend or overrules it', () => {
    expect(bendConsistencyWarning(fine)).toBeNull();
    expect(bendConsistencyWarning({ ...fine, glissando: 'start' })).toContain(
      'glissando="start"'
    );
    expect(bendConsistencyWarning({ ...fine, inTremoloGroup: true })).toContain(
      '<music-tremolo>'
    );
    expect(bendConsistencyWarning({ ...fine, onTriangle: true })).toContain(
      'triangle'
    );
    expect(
      bendConsistencyWarning({ ...fine, isChord: true, bendTo: 'D' })
    ).toContain('on a chord');
    expect(
      bendConsistencyWarning({ ...fine, bendTo: 'D', targetDirection: 'up' })
    ).toContain('disagrees');
    expect(
      bendConsistencyWarning({
        ...fine,
        bend: 'wave',
        bendTo: 'D',
        targetDirection: 'up',
      })
    ).toBeNull();
    expect(
      bendConsistencyWarning({ ...fine, bend: null, glissando: 'start' })
    ).toBeNull();
  });
});

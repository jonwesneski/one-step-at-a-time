import type { ConnectorRole } from '../types/elements';
import type { GlissandoShape } from '../types/theory';
import {
  GLISSANDO_DIP_WIDTH_PX,
  GLISSANDO_GAP_PX,
  GLISSANDO_LEVEL_LIFT_PX,
  GLISSANDO_MIN_DRAWN_PX,
  GLISSANDO_MIN_GAP_PX,
  GLISSANDO_MIN_LENGTH_PX,
  GLISSANDO_OFF_LINE_PX,
  GLISSANDO_WAVELENGTH_PX,
} from '../utils/notationDimensions';

export type LinePoint = { x: number; y: number };

export type GlissandoHeights = {
  /** The heads' centres. */
  startHeadY: number;
  endHeadY: number;
  /** The start note's dot, or null with none. */
  startDotY: number | null;
  startOnLine: boolean;
  endOnLine: boolean;
  shape: GlissandoShape;
};

/**
 * The heights a glissando line starts and ends at: its heads' centres, and off
 * any stave line the heads sit on so it stays visible. A dotted start is level
 * with the dot.
 */
export function glissandoEndYs({
  startHeadY,
  endHeadY,
  startDotY,
  startOnLine,
  endOnLine,
  shape,
}: GlissandoHeights): { fromY: number; toY: number } {
  const travel = Math.sign(endHeadY - startHeadY);
  const inSpace = shape === 'wave' || travel === 0;
  const fromY = !startOnLine
    ? startHeadY
    : inSpace
    ? startHeadY - GLISSANDO_LEVEL_LIFT_PX
    : startHeadY - travel * GLISSANDO_OFF_LINE_PX;
  const toY = !endOnLine
    ? endHeadY
    : inSpace
    ? endHeadY - GLISSANDO_LEVEL_LIFT_PX
    : endHeadY + travel * GLISSANDO_OFF_LINE_PX;
  return { fromY: startDotY ?? fromY, toY };
}

/**
 * The x-span of a line between two inks, half a space from each. The gaps close
 * up before the line gets too short; null when it would still be.
 */
export function glissandoXSpan(
  startInkRight: number,
  endInkLeft: number
): { fromX: number; toX: number } | null {
  for (const gap of [GLISSANDO_GAP_PX, GLISSANDO_MIN_GAP_PX]) {
    const fromX = startInkRight + gap;
    const toX = endInkLeft - gap;
    if (toX - fromX >= GLISSANDO_MIN_DRAWN_PX) {
      return { fromX, toX };
    }
  }
  return null;
}

export function glissandoEndpoints({
  startInkRight,
  endInkLeft,
  ...heights
}: GlissandoHeights & {
  startInkRight: number;
  endInkLeft: number;
}): { from: LinePoint; to: LinePoint } | null {
  const span = glissandoXSpan(startInkRight, endInkLeft);
  if (span === null) {
    return null;
  }
  const { fromY, toY } = glissandoEndYs(heights);
  return { from: { x: span.fromX, y: fromY }, to: { x: span.toX, y: toY } };
}

/**
 * The height a line broken over two rows breaks at, so both halves keep one
 * slope. Heights are relative to the stave.
 */
export function splitGlissandoAcrossRows({
  fromRelY,
  toRelY,
  firstLength,
  secondLength,
}: {
  fromRelY: number;
  toRelY: number;
  firstLength: number;
  secondLength: number;
}): { breakRelY: number } {
  const total = firstLength + secondLength;
  return {
    breakRelY:
      total <= 0
        ? fromRelY
        : fromRelY + ((toRelY - fromRelY) * firstLength) / total,
  };
}

/** Room (px) a glissando's start keeps after its note's ink. */
export function glissandoReserveWidthPx(): number {
  return GLISSANDO_MIN_LENGTH_PX + 2 * GLISSANDO_GAP_PX;
}

/** A dip's width on a line this long. */
export function glissandoDipWidthPx(length: number): number {
  return Math.min(GLISSANDO_DIP_WIDTH_PX, Math.max(0, length));
}

/** How many half-waves fit a line; never none. */
export function glissandoHalfWaveCount(length: number): number {
  return Math.max(1, Math.round(length / (GLISSANDO_WAVELENGTH_PX / 2)));
}

/** A glissando's shape is read only from the element it starts on. */
export function glissandoShapeWarning({
  shape,
  glissando,
}: {
  shape: GlissandoShape;
  glissando: ConnectorRole | null;
}): string | null {
  if (shape === 'straight' || glissando === 'start') {
    return null;
  }
  return `glissando-shape="${shape}" is set but this element starts no glissando; the shape is read from the glissando's start`;
}

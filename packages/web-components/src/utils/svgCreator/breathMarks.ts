import type { BreathMark } from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  BREATH_MARK_COMMA_HEIGHT_PX,
  BREATH_MARK_SIDE_GAP_PX,
  BREATH_MARK_TICK_HEIGHT_PX,
} from '../notationDimensions';

// Path data below is derived from engraved glyph outlines via
// `scripts/extract-glyphs.mjs` (regenerate with
// `pnpm --filter @one-step-at-a-time/web-components extract-glyphs -- \
//   breathMarkTick breathMarkComma`). Each outline is normalized to a top-left
// origin, staff-space units, y-down.

const BREATH_MARK_TICK_PATH_D =
  'M 0.024 0.988 C 0.016 0.976 0.008 0.968 0 0.968 C 0 0.988 0 1.056 0.024 1.08 C 0.112 1.14 0.456 1.672 0.496 1.956 C 0.496 2 0.516 2.008 0.532 2.008 C 0.548 2.008 0.576 1.992 0.584 1.956 C 0.68 1.46 1.408 0.18 1.94 0.06 C 1.984 0.052 2 0.032 2 0.024 C 2 0.008 1.976 0 1.94 0 C 1.264 0.024 0.584 1.448 0.548 1.492 C 0.54 1.512 0.524 1.52 0.516 1.52 C 0.496 1.52 0.488 1.492 0.488 1.492 C 0.396 1.268 0.076 1.012 0.024 0.988';
const BREATH_MARK_TICK_NATURAL_WIDTH = 2;
const BREATH_MARK_TICK_NATURAL_HEIGHT = 2.008;

const BREATH_MARK_COMMA_PATH_D =
  'M 0.284 0 C 0.112 0 0 0.112 0 0.252 C 0 0.388 0.092 0.476 0.224 0.476 C 0.324 0.476 0.336 0.56 0.336 0.56 C 0.34 0.576 0.344 0.588 0.344 0.604 C 0.344 0.66 0.316 0.712 0.28 0.76 C 0.212 0.848 0.108 0.908 0.1 0.916 C 0.084 0.924 0.068 0.932 0.068 0.956 L 0.072 0.96 C 0.076 0.988 0.088 0.996 0.1 0.996 C 0.232 0.996 0.436 0.82 0.5 0.72 C 0.58 0.596 0.604 0.456 0.604 0.34 L 0.604 0.312 C 0.604 0.124 0.468 0 0.284 0';
const BREATH_MARK_COMMA_NATURAL_WIDTH = 0.604;
const BREATH_MARK_COMMA_NATURAL_HEIGHT = 0.996;

const GLYPHS: Record<
  BreathMark,
  { pathD: string; naturalWidth: number; naturalHeight: number; height: number }
> = {
  tick: {
    pathD: BREATH_MARK_TICK_PATH_D,
    naturalWidth: BREATH_MARK_TICK_NATURAL_WIDTH,
    naturalHeight: BREATH_MARK_TICK_NATURAL_HEIGHT,
    height: BREATH_MARK_TICK_HEIGHT_PX,
  },
  comma: {
    pathD: BREATH_MARK_COMMA_PATH_D,
    naturalWidth: BREATH_MARK_COMMA_NATURAL_WIDTH,
    naturalHeight: BREATH_MARK_COMMA_NATURAL_HEIGHT,
    height: BREATH_MARK_COMMA_HEIGHT_PX,
  },
};

const scaleOf = (kind: BreathMark): number =>
  GLYPHS[kind].height / GLYPHS[kind].naturalHeight;

/** Drawn height (px) of a breath mark. */
export const breathMarkHeightPx = (kind: BreathMark): number =>
  GLYPHS[kind].height;

/** Drawn width (px) of a breath mark. */
export const breathMarkWidthPx = (kind: BreathMark): number =>
  GLYPHS[kind].naturalWidth * scaleOf(kind);

/** Width (px) an entry with a breath mark keeps free to its right. */
export const breathMarkReservedWidthPx = (kind: BreathMark): number =>
  breathMarkWidthPx(kind) + 2 * BREATH_MARK_SIDE_GAP_PX;

/** A breath mark centred on `centerX`, its bottom edge on `bottomY`. */
export function createBreathMarkSvg(
  kind: BreathMark,
  centerX: number,
  bottomY: number
): SVGGElement {
  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('breath-mark', `breath-mark-${kind}`);
  group.setAttribute(
    'transform',
    `translate(${centerX - breathMarkWidthPx(kind) / 2} ${
      bottomY - breathMarkHeightPx(kind)
    }) scale(${scaleOf(kind)})`
  );
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', GLYPHS[kind].pathD);
  path.setAttribute('fill', 'currentColor');
  group.appendChild(path);
  return group;
}

import type { StemMark } from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  STEM_CROSS_SIZE_PX,
  STEM_CROSS_STROKE_WIDTH_PX,
  STEM_MULTIPHONIC_HEIGHT_PX,
  STEM_MULTIPHONIC_WIDTH_PX,
} from '../notationDimensions';

// Where the M's middle V meets the stem, as a share of its height from the top.
const MULTIPHONIC_MIDDLE_DEPTH = 0.85;

/** A `stem-mark="cross"`: an × centred on (centerX, centerY). */
export function createStemCrossSvg(
  centerX: number,
  centerY: number,
  scale = 1
): SVGGElement {
  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('stem-cross');
  const half = (scale * STEM_CROSS_SIZE_PX) / 2;
  for (const direction of [1, -1]) {
    const arm = document.createElementNS(SVG_NS, 'line');
    arm.setAttribute('x1', `${centerX - half}`);
    arm.setAttribute('y1', `${centerY - direction * half}`);
    arm.setAttribute('x2', `${centerX + half}`);
    arm.setAttribute('y2', `${centerY + direction * half}`);
    arm.setAttribute('stroke', 'currentColor');
    arm.setAttribute('stroke-width', `${scale * STEM_CROSS_STROKE_WIDTH_PX}`);
    group.appendChild(arm);
  }
  return group;
}

/**
 * A `stem-mark="multiphonic"`: an M centred on (centerX, centerY), upright
 * outer legs and its middle V meeting the stem near the foot.
 */
export function createStemMultiphonicSvg(
  centerX: number,
  centerY: number,
  scale = 1
): SVGPathElement {
  const halfWidth = (scale * STEM_MULTIPHONIC_WIDTH_PX) / 2;
  const height = scale * STEM_MULTIPHONIC_HEIGHT_PX;
  const top = centerY - height / 2;
  const bottom = centerY + height / 2;
  const middle = top + MULTIPHONIC_MIDDLE_DEPTH * height;
  const path = document.createElementNS(SVG_NS, 'path');
  path.classList.add('stem-multiphonic');
  path.setAttribute(
    'd',
    `M ${centerX - halfWidth} ${bottom} L ${centerX - halfWidth} ${top} ` +
      `L ${centerX} ${middle} L ${centerX + halfWidth} ${top} ` +
      `L ${centerX + halfWidth} ${bottom}`
  );
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', `${scale * STEM_CROSS_STROKE_WIDTH_PX}`);
  path.setAttribute('stroke-linejoin', 'miter');
  return path;
}

export const createStemMarkSvg = (
  mark: StemMark,
  centerX: number,
  centerY: number,
  scale = 1
): SVGElement =>
  mark === 'multiphonic'
    ? createStemMultiphonicSvg(centerX, centerY, scale)
    : createStemCrossSvg(centerX, centerY, scale);

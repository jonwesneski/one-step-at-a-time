import { SVG_NS } from '../consts';
import {
  STEM_CROSS_SIZE_PX,
  STEM_CROSS_STROKE_WIDTH_PX,
} from '../notationDimensions';

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

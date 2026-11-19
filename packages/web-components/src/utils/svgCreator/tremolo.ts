import { SVG_NS } from '../consts';
import {
  TREMOLO_STROKE_RISE_PX,
  TREMOLO_STROKE_THICKNESS_PX,
  TREMOLO_STROKE_WIDTH_PX,
} from '../notationDimensions';

/**
 * Tremolo strokes centred on `centerX` (the stem, or a stemless head's
 * centre), one per Y in `centerYs`, in the caller's px space. Each slants
 * from bottom left to top right whatever the stem direction, with vertical
 * ends like a beam.
 */
export function createTremoloStrokes(
  centerX: number,
  centerYs: readonly number[]
): SVGGElement {
  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('tremolo-strokes');
  const left = centerX - TREMOLO_STROKE_WIDTH_PX / 2;
  const right = centerX + TREMOLO_STROKE_WIDTH_PX / 2;
  const halfThickness = TREMOLO_STROKE_THICKNESS_PX / 2;
  const halfRise = TREMOLO_STROKE_RISE_PX / 2;
  for (const centerY of centerYs) {
    const leftMiddle = centerY + halfRise;
    const rightMiddle = centerY - halfRise;
    const stroke = document.createElementNS(SVG_NS, 'polygon');
    stroke.classList.add('tremolo-stroke');
    stroke.setAttribute(
      'points',
      [
        [left, leftMiddle - halfThickness],
        [right, rightMiddle - halfThickness],
        [right, rightMiddle + halfThickness],
        [left, leftMiddle + halfThickness],
      ]
        .map(([x, y]) => `${x},${y}`)
        .join(' ')
    );
    stroke.setAttribute('fill', 'currentColor');
    group.appendChild(stroke);
  }
  return group;
}

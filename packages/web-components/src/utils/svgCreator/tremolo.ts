import type { TremoloBeamSegment } from '../../rules/tremoloRules';
import { SVG_NS } from '../consts';
import {
  BEAM_THICKNESS_PX,
  TREMOLO_STROKE_RISE_PX,
  TREMOLO_STROKE_THICKNESS_PX,
  TREMOLO_STROKE_WIDTH_PX,
} from '../notationDimensions';
import { createTupletNumeralText } from './tuplet';

/**
 * Tremolo strokes centred on `centerX` (the stem, or a stemless head's
 * centre), one per Y in `centerYs`, in the caller's px space. Each slants
 * from bottom left to top right whatever the stem direction, with vertical
 * ends like a beam.
 */
export function createTremoloStrokes(
  centerX: number,
  centerYs: readonly number[],
  scale = 1
): SVGGElement {
  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('tremolo-strokes');
  const left = centerX - (scale * TREMOLO_STROKE_WIDTH_PX) / 2;
  const right = centerX + (scale * TREMOLO_STROKE_WIDTH_PX) / 2;
  const halfThickness = (scale * TREMOLO_STROKE_THICKNESS_PX) / 2;
  const halfRise = (scale * TREMOLO_STROKE_RISE_PX) / 2;
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

/** A tremolo's tuplet numeral, centred on (x, centerY). */
export function createTremoloNumeral(
  x: number,
  centerY: number,
  value: number
): SVGTextElement {
  return createTupletNumeralText(x, centerY, `${value}`, 'tremolo-numeral');
}

/** `points` for a tremolo beam whose top edge runs along `segment`. */
export function tremoloBeamPoints(
  segment: TremoloBeamSegment,
  thickness = BEAM_THICKNESS_PX
): string {
  const { x1, x2, top1, top2 } = segment;
  return [
    [x1, top1],
    [x2, top2],
    [x2, top2 + thickness],
    [x1, top1 + thickness],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(' ');
}

/** One tremolo beam, ordinary beam thickness, with vertical ends. */
export function createTremoloBeamPolygon(
  segment: TremoloBeamSegment
): SVGPolygonElement {
  const beam = document.createElementNS(SVG_NS, 'polygon');
  beam.classList.add('tremolo-beam');
  beam.setAttribute('fill', 'currentColor');
  beam.setAttribute('points', tremoloBeamPoints(segment));
  return beam;
}

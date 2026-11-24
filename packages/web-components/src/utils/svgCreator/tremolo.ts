import type { TremoloBeamSegment } from '../../rules/tremoloRules';
import type { TremoloLabel } from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  BEAM_THICKNESS_PX,
  TREMOLO_LABEL_CHAR_WIDTH_PX,
  TREMOLO_LABEL_FONT_SIZE_PX,
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

/** A tremolo's tuplet numeral, centred on (x, centerY). */
export function createTremoloNumeral(
  x: number,
  centerY: number,
  value: number
): SVGTextElement {
  return createTupletNumeralText(x, centerY, `${value}`, 'tremolo-numeral');
}

const TREMOLO_LABEL_TEXT: Record<TremoloLabel, string> = {
  trem: 'trem.',
  'non-trem': 'non trem.',
  flz: 'flz.',
  flt: 'flt.',
  frull: 'frull.',
  ord: 'ord.',
  nat: 'nat.',
  norm: 'norm.',
};

/** Estimated drawn width (px) of a technique label. */
export function tremoloLabelWidthPx(label: TremoloLabel): number {
  return TREMOLO_LABEL_TEXT[label].length * TREMOLO_LABEL_CHAR_WIDTH_PX;
}

/** A technique label starting at leftX on baselineY. */
export function createTremoloLabel(
  leftX: number,
  baselineY: number,
  label: TremoloLabel
): SVGTextElement {
  const text = document.createElementNS(SVG_NS, 'text');
  text.classList.add('tremolo-label');
  text.setAttribute('x', `${leftX}`);
  text.setAttribute('y', `${baselineY}`);
  text.setAttribute('text-anchor', 'start');
  text.setAttribute('font-family', 'serif');
  text.setAttribute('font-size', `${TREMOLO_LABEL_FONT_SIZE_PX}`);
  text.setAttribute('fill', 'currentColor');
  text.textContent = TREMOLO_LABEL_TEXT[label];
  return text;
}

/** `points` for a tremolo beam whose top edge runs along `segment`. */
export function tremoloBeamPoints(segment: TremoloBeamSegment): string {
  const { x1, x2, top1, top2 } = segment;
  return [
    [x1, top1],
    [x2, top2],
    [x2, top2 + BEAM_THICKNESS_PX],
    [x1, top1 + BEAM_THICKNESS_PX],
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

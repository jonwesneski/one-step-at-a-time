import { cubicSlurControlPoints } from '../../rules/connectorPlacementRules';
import { SVG_NS } from '../consts';
import {
  CONNECTOR_LABEL_CHAR_WIDTH_PX,
  STAFF_LINE_SPACING,
  TIE_DASH_GAP_PX,
  TIE_DASH_PX,
} from '../notationDimensions';

export type CurveBulge = 'above' | 'below';
export type CurveStyle = 'smooth' | 'straight';

export type CurveProps = {
  from: { x: number; y: number };
  to: { x: number; y: number };
  bulge: CurveBulge;
  label?: string;
  style?: CurveStyle;
  nestingLevel?: number;
  // Overrides the default bulge height (plus any nestingLevel step) — for
  // callers whose endpoints are pushed unusually far apart on the bulge
  // side (e.g. to clear an accidental), so the control point still sits
  // outside both endpoints instead of the fixed default undershooting.
  bulgeHeight?: number;
  // Draws a cubic instead, with control points at 1/3 and 2/3 of the chord
  // raised toward `bulge` by these heights (see
  // rules/connectorPlacementRules.ts#cubicSlurControlPoints). Overrides
  // bulgeHeight/nestingLevel.
  controlHeights?: readonly [number, number];
  // Draws the curve as a dotted line (a dotted tie or slur).
  dotted?: boolean;
};

export const DEFAULT_BULGE_HEIGHT = STAFF_LINE_SPACING * 0.9;
export const BULGE_STEP_PX = STAFF_LINE_SPACING * 1.1;
const STROKE_WIDTH = 1.4;
const LABEL_FONT_SIZE = STAFF_LINE_SPACING * 1.1;

export const createCurveSvg = ({
  from,
  to,
  bulge,
  label,
  style = 'smooth',
  nestingLevel = 0,
  bulgeHeight,
  controlHeights,
  dotted = false,
}: CurveProps): SVGGElement => {
  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('connector');

  // Callers pass the full span including row edges for cross-row splits,
  // so from/to are used directly.
  const startX = from.x;
  const startY = from.y;
  const endX = to.x;
  const endY = to.y;

  const path = document.createElementNS(SVG_NS, 'path');
  const bulgeSign = bulge === 'above' ? -1 : 1;
  const effectiveBulgeHeight =
    bulgeHeight ?? DEFAULT_BULGE_HEIGHT + nestingLevel * BULGE_STEP_PX;
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2 + bulgeSign * effectiveBulgeHeight;

  if (style === 'straight') {
    path.setAttribute('d', `M ${startX} ${startY} L ${endX} ${endY}`);
  } else if (controlHeights) {
    const [c1, c2] = cubicSlurControlPoints(from, to, bulge, controlHeights);
    path.setAttribute(
      'd',
      `M ${startX} ${startY} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${endX} ${endY}`
    );
  } else {
    path.setAttribute(
      'd',
      `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`
    );
  }
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', `${STROKE_WIDTH}`);
  path.setAttribute('stroke-linecap', 'round');
  group.appendChild(path);

  if (label) {
    group.appendChild(
      style === 'straight'
        ? createLineLabel({ from, to, label, side: bulge })
        : createLabelText(label, midX, midY + bulgeSign * LABEL_FONT_SIZE * 0.6)
    );
  }

  if (dotted) {
    setCurveDotted(group);
  }

  return group;
};

function createLabelText(label: string, x: number, y: number): SVGTextElement {
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', `${x}`);
  text.setAttribute('y', `${y}`);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('font-size', `${LABEL_FONT_SIZE}`);
  text.setAttribute('font-style', 'italic');
  text.setAttribute('fill', 'currentColor');
  text.textContent = label;
  return text;
}

/**
 * A label beside a straight line's middle. A steep line rises or falls under
 * the label's width, so it keeps off the line at both of its own edges, as far
 * as the line reaches.
 */
export function createLineLabel({
  from,
  to,
  label,
  side,
  clearance = 0,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  label: string;
  side: CurveBulge;
  /** How far the drawn line leaves the straight one. */
  clearance?: number;
}): SVGTextElement {
  const span = to.x - from.x;
  const slope = span === 0 ? 0 : (to.y - from.y) / span;
  const halfWidth = Math.min(
    (label.length * CONNECTOR_LABEL_CHAR_WIDTH_PX) / 2,
    Math.abs(span) / 2
  );
  const sign = side === 'above' ? -1 : 1;
  const nearestY =
    (from.y + to.y) / 2 + sign * (Math.abs(slope) * halfWidth + clearance);
  return createLabelText(
    label,
    (from.x + to.x) / 2,
    nearestY + sign * LABEL_FONT_SIZE * 0.9
  );
}

/** Redraws an already built curve's line as a dotted one. */
export function setCurveDotted(curve: SVGGElement): void {
  for (const path of Array.from(curve.querySelectorAll('path'))) {
    path.classList.add('dotted');
    path.setAttribute('stroke-dasharray', `${TIE_DASH_PX} ${TIE_DASH_GAP_PX}`);
  }
}

export type OpenTieProps = {
  anchor: { x: number; y: number };
  /** +1 draws forward in time (right); -1 draws back toward the source. */
  direction: 1 | -1;
  length: number;
  bulge: CurveBulge;
  label?: string;
};

/**
 * A tie that starts (or ends) at a notehead and curves out into empty space —
 * one half of a divided tie, or a laissez-vibrer tie. Built as a short
 * `createCurveSvg` with a flattened bulge.
 */
export const createOpenTieSvg = ({
  anchor,
  direction,
  length,
  bulge,
  label,
}: OpenTieProps): SVGGElement =>
  createCurveSvg({
    from: { x: anchor.x, y: anchor.y },
    to: { x: anchor.x + direction * length, y: anchor.y },
    bulge,
    bulgeHeight: DEFAULT_BULGE_HEIGHT * 0.6,
    label,
  });

import { SVG_NS } from '../consts';
import { STAFF_LINE_SPACING } from '../notationDimensions';

export type CurveBulge = 'above' | 'below';
export type CurveStyle = 'smooth' | 'straight';

export type CurveProps = {
  from: { x: number; y: number };
  to: { x: number; y: number };
  bulge: CurveBulge;
  label?: string;
  style?: CurveStyle;
  nestingLevel?: number;
};

const DEFAULT_BULGE_HEIGHT = STAFF_LINE_SPACING * 0.9;
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
    DEFAULT_BULGE_HEIGHT + nestingLevel * BULGE_STEP_PX;
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2 + bulgeSign * effectiveBulgeHeight;

  if (style === 'straight') {
    path.setAttribute('d', `M ${startX} ${startY} L ${endX} ${endY}`);
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
    const text = document.createElementNS(SVG_NS, 'text');
    const labelY =
      style === 'straight'
        ? (startY + endY) / 2 + bulgeSign * LABEL_FONT_SIZE * 0.9
        : midY + bulgeSign * LABEL_FONT_SIZE * 0.6;
    text.setAttribute('x', `${midX}`);
    text.setAttribute('y', `${labelY}`);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', `${LABEL_FONT_SIZE}`);
    text.setAttribute('font-style', 'italic');
    text.setAttribute('fill', 'currentColor');
    text.textContent = label;
    group.appendChild(text);
  }

  return group;
};

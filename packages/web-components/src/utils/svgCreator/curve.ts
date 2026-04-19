import { STAFF_LINE_SPACING } from '../notationDimensions';
import { SVG_NS } from '../consts';

export type CurveBulge = 'above' | 'below';
export type CurveStyle = 'smooth' | 'straight';
export type CurveSplit = 'open-right' | 'open-left' | null;

export type CurveProps = {
  from: { x: number; y: number };
  to: { x: number; y: number };
  bulge: CurveBulge;
  label?: string;
  style?: CurveStyle;
  split?: CurveSplit;
};

const DEFAULT_BULGE_HEIGHT = STAFF_LINE_SPACING * 0.9;
const OPEN_EDGE_LENGTH = STAFF_LINE_SPACING * 1.5;
const STROKE_WIDTH = 1.4;
const LABEL_FONT_SIZE = STAFF_LINE_SPACING * 1.1;

export const createCurveSvg = ({
  from,
  to,
  bulge,
  label,
  style = 'smooth',
  split = null,
}: CurveProps): SVGGElement => {
  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('connector');

  const startX = split === 'open-left' ? to.x - OPEN_EDGE_LENGTH : from.x;
  const startY = split === 'open-left' ? to.y : from.y;
  const endX = split === 'open-right' ? from.x + OPEN_EDGE_LENGTH : to.x;
  const endY = split === 'open-right' ? from.y : to.y;

  const path = document.createElementNS(SVG_NS, 'path');
  const bulgeSign = bulge === 'above' ? -1 : 1;
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2 + bulgeSign * DEFAULT_BULGE_HEIGHT;

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

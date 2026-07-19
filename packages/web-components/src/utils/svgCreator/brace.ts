import { SVG_NS } from '../consts';
import {
  BRACE_MID_BULGE_PX,
  BRACE_WIDTH_PX,
  BRACKET_CAP_LENGTH_PX,
  BRACKET_WIDTH_PX,
} from '../notationDimensions';

const BRACE_STROKE_WIDTH = 2;
const BRACKET_STROKE_WIDTH = 2;

// grand staff
export function createBraceSvg(height: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('brace');
  svg.setAttribute('width', `${BRACE_WIDTH_PX}`);
  svg.setAttribute('height', `${height}`);
  svg.setAttribute('viewBox', `0 0 ${BRACE_WIDTH_PX} ${height}`);
  svg.style.overflow = 'visible';

  const topX = BRACE_WIDTH_PX;
  const topY = 0;
  const bottomX = BRACE_WIDTH_PX;
  const bottomY = height;
  const midX = BRACE_WIDTH_PX - BRACE_MID_BULGE_PX;
  const midY = height / 2;

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    `M ${topX} ${topY} ` +
      `C ${topX - BRACE_WIDTH_PX * 0.8} ${topY + (midY - topY) * 0.55}, ` +
      `${midX + BRACE_WIDTH_PX * 0.55} ${midY - (midY - topY) * 0.2}, ` +
      `${midX} ${midY} ` +
      `C ${midX + BRACE_WIDTH_PX * 0.55} ${midY + (bottomY - midY) * 0.2}, ` +
      `${bottomX - BRACE_WIDTH_PX * 0.8} ${
        bottomY - (bottomY - midY) * 0.55
      }, ` +
      `${bottomX} ${bottomY}`
  );
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', `${BRACE_STROKE_WIDTH}`);
  path.setAttribute('stroke-linecap', 'round');
  svg.appendChild(path);

  return svg;
}

/**
 * A square bracket connecting independently-notated staves (e.g. an SATB
 * choir pair) — a vertical line with a short horizontal tick at each end.
 * Positioned the same way createBraceSvg is: right edge (x=BRACKET_WIDTH_PX)
 * sits just left of the staves' plain barline connector.
 */
export function createBracketSvg(height: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('bracket');
  svg.setAttribute('width', `${BRACKET_WIDTH_PX}`);
  svg.setAttribute('height', `${height}`);
  svg.setAttribute('viewBox', `0 0 ${BRACKET_WIDTH_PX} ${height}`);
  svg.style.overflow = 'visible';

  const lineX = BRACKET_WIDTH_PX * 0.5;

  const verticalLine = document.createElementNS(SVG_NS, 'line');
  verticalLine.setAttribute('x1', `${lineX}`);
  verticalLine.setAttribute('y1', '0');
  verticalLine.setAttribute('x2', `${lineX}`);
  verticalLine.setAttribute('y2', `${height}`);
  verticalLine.setAttribute('stroke', 'currentColor');
  verticalLine.setAttribute('stroke-width', `${BRACKET_STROKE_WIDTH}`);
  svg.appendChild(verticalLine);

  const topCap = document.createElementNS(SVG_NS, 'line');
  topCap.setAttribute('x1', `${lineX}`);
  topCap.setAttribute('y1', '0');
  topCap.setAttribute('x2', `${lineX + BRACKET_CAP_LENGTH_PX}`);
  topCap.setAttribute('y2', '0');
  topCap.setAttribute('stroke', 'currentColor');
  topCap.setAttribute('stroke-width', `${BRACKET_STROKE_WIDTH}`);
  svg.appendChild(topCap);

  const bottomCap = document.createElementNS(SVG_NS, 'line');
  bottomCap.setAttribute('x1', `${lineX}`);
  bottomCap.setAttribute('y1', `${height}`);
  bottomCap.setAttribute('x2', `${lineX + BRACKET_CAP_LENGTH_PX}`);
  bottomCap.setAttribute('y2', `${height}`);
  bottomCap.setAttribute('stroke', 'currentColor');
  bottomCap.setAttribute('stroke-width', `${BRACKET_STROKE_WIDTH}`);
  svg.appendChild(bottomCap);

  return svg;
}

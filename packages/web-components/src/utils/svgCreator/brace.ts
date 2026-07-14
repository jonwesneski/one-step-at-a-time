import { SVG_NS } from '../consts';
import {
  BRACE_MID_BULGE_PX,
  BRACE_WIDTH_PX,
  BRACKET_CAP_LENGTH_PX,
  BRACKET_WIDTH_PX,
} from '../notationDimensions';

const BRACE_STROKE_WIDTH = 2;
const BRACKET_STROKE_WIDTH = 2;

/**
 * A curly brace connecting two (or more) staves of a single instrument
 * (e.g. a piano grand staff), drawn as a symmetric pair of cubic-bezier
 * S-curves meeting at a leftward bulge at the vertical midpoint. Positioned
 * by the caller so this glyph's right edge (x=0) sits just left of the
 * staves' plain barline connector.
 */
export function createBraceSvg(height: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  svg.classList.add('brace');
  svg.setAttribute('width', `${BRACE_WIDTH_PX}`);
  svg.setAttribute('height', `${height}`);
  svg.setAttribute(
    'viewBox',
    `${-BRACE_WIDTH_PX} 0 ${BRACE_WIDTH_PX} ${height}`
  );
  svg.style.overflow = 'visible';

  const topX = 0;
  const topY = 0;
  const bottomX = 0;
  const bottomY = height;
  const midX = -BRACE_MID_BULGE_PX;
  const midY = height / 2;

  // Each half is an S-curve tangent to VERTICAL at its staff-line anchor
  // (top/bottom) and tangent to HORIZONTAL at the mid-bulge tip — control
  // point offsets are chosen relative to each other's axis (near-anchor
  // control point offset mostly in Y, near-bulge control point offset
  // mostly in X) rather than scaling both from `height`, which previously
  // produced a near-straight diagonal instead of a curl.
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    `M ${topX} ${topY} ` +
      `C ${topX} ${topY + (midY - topY) * 0.55}, ` +
      `${midX + BRACE_WIDTH_PX * 0.55} ${midY - (midY - topY) * 0.2}, ` +
      `${midX} ${midY} ` +
      `C ${midX + BRACE_WIDTH_PX * 0.55} ${midY + (bottomY - midY) * 0.2}, ` +
      `${bottomX} ${bottomY - (bottomY - midY) * 0.55}, ` +
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
 * Positioned the same way createBraceSvg is: right edge (x=0) sits just
 * left of the staves' plain barline connector.
 */
export function createBracketSvg(height: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  svg.classList.add('bracket');
  svg.setAttribute('width', `${BRACKET_WIDTH_PX}`);
  svg.setAttribute('height', `${height}`);
  svg.setAttribute(
    'viewBox',
    `${-BRACKET_WIDTH_PX} 0 ${BRACKET_WIDTH_PX} ${height}`
  );
  svg.style.overflow = 'visible';

  const lineX = -BRACKET_WIDTH_PX * 0.5;

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

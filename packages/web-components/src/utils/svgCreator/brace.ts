import { SVG_NS } from '../consts';
import {
  BRACE_MID_BULGE_PX,
  BRACE_WIDTH_PX,
  BRACKET_CAP_LENGTH_PX,
  BRACKET_WIDTH_PX,
} from '../notationDimensions';

const BRACE_STROKE_WIDTH = 2;
const BRACKET_STROKE_WIDTH = 2;

// Half-width of the small gap left at the brace's mid-junction (where the
// top and bottom halves meet) — configurable, kept deliberately thin but
// non-zero rather than a full pinch to a point.
const BRACE_MID_JUNCTION_HALF_WIDTH_PX = 0.5;

// Control-point offset that bulges each half's outline outward around its
// own midpoint. Per the cubic-bezier identity offset(t) = 3d*t*(1-t) (both
// control points offset by d, endpoints near 0), the resulting peak is
// ~0.75 of this value — tune visually as usual.
const BRACE_HUMP_HALF_WIDTH_PX = BRACE_STROKE_WIDTH;

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

  // Off-curve control points shaping the two centerline S-curves (top->mid,
  // mid->bottom). Reused below both to build the filled outline (offset by
  // +/- midHalfWidth) and to place debug dots.
  const topC1 = {
    x: topX - BRACE_WIDTH_PX * 0.8,
    y: topY + (midY - topY) * 0.3,
  };
  const topC2 = {
    x: midX + BRACE_WIDTH_PX * 0.55,
    y: midY - (midY - topY) * 0.2,
  };
  const botC1 = {
    x: midX + BRACE_WIDTH_PX * 0.55,
    y: midY + (bottomY - midY) * 0.2,
  };
  const botC2 = {
    x: bottomX - BRACE_WIDTH_PX * 0.8,
    y: bottomY - (bottomY - midY) * 0.3,
  };

  // Filled closed outline: two rails offset horizontally from the
  // centerline. Endpoints stay near 0 (pointed tips at top/bottom, a thin
  // configurable gap at the mid-junction) while BOTH control points of each
  // segment get the full hump offset — that's what bulges the outline
  // outward around each half's own midpoint instead of at the junction.
  const hump = BRACE_HUMP_HALF_WIDTH_PX;
  const junction = BRACE_MID_JUNCTION_HALF_WIDTH_PX;

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    `M ${topX} ${topY} ` +
      `C ${topC1.x - hump} ${topC1.y}, ` +
      `${topC2.x - hump} ${topC2.y}, ` +
      `${midX - junction} ${midY} ` +
      `C ${botC1.x - hump} ${botC1.y}, ` +
      `${botC2.x - hump} ${botC2.y}, ` +
      `${bottomX} ${bottomY} ` +
      `C ${botC2.x + hump} ${botC2.y}, ` +
      `${botC1.x + hump} ${botC1.y}, ` +
      `${midX + junction} ${midY} ` +
      `C ${topC2.x + hump} ${topC2.y}, ` +
      `${topC1.x + hump} ${topC1.y}, ` +
      `${topX} ${topY} ` +
      `Z`
  );
  path.setAttribute('fill', 'currentColor');
  path.setAttribute('stroke', 'none');
  svg.appendChild(path);

  // // DEBUG: red dots at the centerline's 4 off-curve control points
  // for (const point of [topC1, topC2, botC1, botC2]) {
  //   const dot = document.createElementNS(SVG_NS, 'circle');
  //   dot.setAttribute('cx', `${point.x}`);
  //   dot.setAttribute('cy', `${point.y}`);
  //   dot.setAttribute('r', '2');
  //   dot.setAttribute('fill', 'red');
  //   svg.appendChild(dot);
  // }

  // // DEBUG: blue dots at the outline's hump-offset control points
  // for (const point of [
  //   { x: topC1.x - hump, y: topC1.y },
  //   { x: topC2.x - hump, y: topC2.y },
  //   { x: botC1.x - hump, y: botC1.y },
  //   { x: botC2.x - hump, y: botC2.y },
  //   { x: botC2.x + hump, y: botC2.y },
  //   { x: botC1.x + hump, y: botC1.y },
  //   { x: topC2.x + hump, y: topC2.y },
  //   { x: topC1.x + hump, y: topC1.y },
  // ]) {
  //   const dot = document.createElementNS(SVG_NS, 'circle');
  //   dot.setAttribute('cx', `${point.x}`);
  //   dot.setAttribute('cy', `${point.y}`);
  //   dot.setAttribute('r', '2');
  //   dot.setAttribute('fill', 'blue');
  //   svg.appendChild(dot);
  // }

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

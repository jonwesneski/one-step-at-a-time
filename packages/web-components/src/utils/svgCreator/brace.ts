import { SVG_NS } from '../consts';
import {
  BRACE_MID_BULGE_PX,
  BRACE_WIDTH_PX,
  BRACKET_CAP_LENGTH_PX,
  BRACKET_WIDTH_PX,
} from '../notationDimensions';

const BRACKET_STROKE_WIDTH = 2;

// Half-width of the small gap left at the brace's mid-junction (where the
// top and bottom halves meet) — configurable, kept deliberately thin but
// non-zero rather than a full pinch to a point.
const BRACE_MID_JUNCTION_WIDTH_PX = 0.5;

// Control-point offset that bulges each half's outline outward around its
// own midpoint. Per the cubic-bezier identity offset(t) = 3d*t*(1-t) (both
// control points offset by d, endpoints near 0), the resulting peak is
// ~0.75 of this value — tune visually as usual.
const BRACE_HUMP_WIDTH_PX = 2;

// Half-width of the small gap left at the very top/bottom tips, so they
// read as a little thicker than a true point — configurable, same amount
// at both tips.
const BRACE_TIP_WIDTH_PX = 0.4;

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

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    `M ${topX - BRACE_TIP_WIDTH_PX} ${topY} ` +
      `C ${topC1.x - BRACE_HUMP_WIDTH_PX} ${topC1.y}, ` +
      `${topC2.x - BRACE_HUMP_WIDTH_PX} ${topC2.y}, ` +
      `${midX - BRACE_MID_JUNCTION_WIDTH_PX} ${midY} ` +
      `C ${botC1.x - BRACE_HUMP_WIDTH_PX} ${botC1.y}, ` +
      `${botC2.x - BRACE_HUMP_WIDTH_PX} ${botC2.y}, ` +
      `${bottomX - BRACE_TIP_WIDTH_PX} ${bottomY} ` +
      `L ${bottomX + BRACE_TIP_WIDTH_PX} ${bottomY} ` +
      `C ${botC2.x + BRACE_HUMP_WIDTH_PX} ${botC2.y}, ` +
      `${botC1.x + BRACE_HUMP_WIDTH_PX} ${botC1.y}, ` +
      `${midX + BRACE_MID_JUNCTION_WIDTH_PX} ${midY} ` +
      `C ${topC2.x + BRACE_HUMP_WIDTH_PX} ${topC2.y}, ` +
      `${topC1.x + BRACE_HUMP_WIDTH_PX} ${topC1.y}, ` +
      `${topX + BRACE_TIP_WIDTH_PX} ${topY} ` +
      `Z`
  );
  path.setAttribute('fill', 'currentColor');
  path.setAttribute('stroke', 'none');
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

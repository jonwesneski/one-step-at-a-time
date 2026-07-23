import { SVG_NS } from '../consts';
import {
  BRACE_MID_BULGE_PX,
  BRACE_WIDTH_PX,
  BRACKET_HOOK_REACH_PX,
  BRACKET_HOOK_RISE_PX,
  BRACKET_STEM_HALF_WIDTH_PX,
  BRACKET_TIP_WIDTH_PX,
  BRACKET_WIDTH_PX,
} from '../notationDimensions';

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

// ─── SMuFL-derived brace (alternate renderer) ──────────────────────────────
//
// Path data below is derived from the "brace" glyph (U+E000) in the Bravura
// font (github.com/steinbergmedia/bravura, SIL Open Font License 1.1) — the
// SMuFL (Standard Music Font Layout) reference font — via a one-off
// extraction/processing script (not checked in), keeping the glyph's
// original ~20-segment cubic-bezier structure intact: each on-curve anchor
// point is moved inward toward the outline's local centerline by 12.5% of
// its locally ray-cast stroke thickness there (~25% thinner overall once
// both sides move), with the two tip caps and the mid-junction pinch
// smoothed by interpolation instead, since a rounded cap has no
// well-defined "opposite wall" for the ray-cast to find. Each segment's two
// control points are shifted by the same vector as whichever endpoint
// they're adjacent to, so the curve moves inward coherently. Finally the
// origin is normalized so the path's own coordinate space is already
// X ∈ [0, SMUFL_BRACE_NATURAL_WIDTH], Y ∈ [0, SMUFL_BRACE_NATURAL_HEIGHT]
// (top-left origin, Y-down) — so no translation is needed at render time,
// only the scale below.
const SMUFL_BRACE_PATH_D =
  'M 12.81 498.62 ' +
  'C 41.81 480.62, 72.25 409.47, 72.25 350.47 ' +
  'C 72.25 345.47, 72.09 340.31, 71.09 335.31 ' +
  'C 64.09 275.31, 35.83 181.63, 35.83 127.63 ' +
  'C 35.83 75.63, 60.56 24.92, 65.56 15.92 ' +
  'C 68.56 9.92, 71.58 9.46, 71.58 6.46 ' +
  'C 71.58 3.46, 69.6 0, 66.6 0 ' +
  'C 64.6 0, 63.62 2.54, 59.62 7.54 ' +
  'C 37.62 34.54, 13.81 91.61, 13.81 191.61 ' +
  'C 13.81 290.61, 47.56 330.59, 47.56 393.59 ' +
  'C 47.56 440.59, 28 467.12, 0 499.12 ' +
  'C 18 519.12, 47.44 534.63, 47.44 599.63 ' +
  'C 47.44 669.63, 13.82 731.63, 13.82 804.63 ' +
  'C 13.82 904.63, 37.63 961.72, 59.63 989.72 ' +
  'C 63.63 994.72, 64.6 996.27, 66.6 996.27 ' +
  'C 69.6 996.27, 71.58 993.81, 71.58 990.81 ' +
  'C 71.58 987.81, 69.55 986.36, 65.55 980.36 ' +
  'C 60.55 972.36, 35.83 921.61, 35.83 868.61 ' +
  'C 35.83 815.61, 64.21 720.94, 71.21 661.94 ' +
  'C 72.21 656.94, 72.32 652.77, 72.32 646.77 ' +
  'C 72.32 587.77, 41.81 516.62, 12.81 498.62 Z';

/** Full width (units) of the thinned+normalized glyph outline's bounding box. */
const SMUFL_BRACE_NATURAL_WIDTH = 72.32;

/**
 * Full height (units) of the thinned+normalized glyph outline's bounding
 * box — its default/natural size. SMuFL specifies that the brace glyph is
 * meant to be scaled disproportionately (Y independent of X) to fit
 * whatever gap the connected staves need, which is what createSmuflBraceSvg
 * does below.
 */
const SMUFL_BRACE_NATURAL_HEIGHT = 996.27;

/**
 * Alternate brace renderer built from a SMuFL glyph outline (see
 * SMUFL_BRACE_PATH_D above) instead of hand-computed bezier curves. Same
 * signature and right-edge-at-x=BRACE_WIDTH_PX positioning contract as
 * createBraceSvg, so the two are directly interchangeable for comparison.
 */
export function createSmuflBraceSvg(height: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('brace', 'brace--smufl');
  svg.setAttribute('width', `${BRACE_WIDTH_PX}`);
  svg.setAttribute('height', `${height}`);
  svg.setAttribute('viewBox', `0 0 ${BRACE_WIDTH_PX} ${height}`);
  svg.style.overflow = 'visible';

  // Width scales by a fixed factor regardless of height (disproportionate
  // scaling — see SMUFL_BRACE_NATURAL_HEIGHT comment); height scales to
  // exactly fill the requested span. The path's own coordinates already
  // start at (0, 0), so scale is the only transform needed.
  const scaleX = BRACE_WIDTH_PX / SMUFL_BRACE_NATURAL_WIDTH;
  const scaleY = height / SMUFL_BRACE_NATURAL_HEIGHT;

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', SMUFL_BRACE_PATH_D);
  path.setAttribute('transform', `scale(${scaleX}, ${scaleY})`);
  path.setAttribute('fill', 'currentColor');
  path.setAttribute('stroke', 'none');
  svg.appendChild(path);

  return svg;
}

/**
 * A square bracket connecting independently-notated staves (e.g. an SATB
 * choir pair) — a thick vertical stem with a small curled hook flourish at
 * each end: curling up-and-right at the top, down-and-right at the bottom
 * (vertical mirror images of each other). Rendered as a single filled
 * closed path, the same approach as createBraceSvg above. Positioned the
 * same way createBraceSvg is: right edge (x=BRACKET_WIDTH_PX) sits just
 * left of the staves' plain barline connector.
 */
export function createBracketSvg(height: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('bracket');
  svg.setAttribute('width', `${BRACKET_WIDTH_PX}`);
  svg.setAttribute('height', `${height}`);
  svg.setAttribute('viewBox', `0 0 ${BRACKET_WIDTH_PX} ${height}`);
  svg.style.overflow = 'visible';

  const lineX = BRACKET_WIDTH_PX * 0.5;
  const stemLeftX = lineX - BRACKET_STEM_HALF_WIDTH_PX;
  const stemRightX = lineX + BRACKET_STEM_HALF_WIDTH_PX;

  const topTipX = lineX + BRACKET_HOOK_REACH_PX;
  const topTipOuterY = -BRACKET_HOOK_RISE_PX - BRACKET_TIP_WIDTH_PX;
  const topTipInnerY = -BRACKET_HOOK_RISE_PX + BRACKET_TIP_WIDTH_PX;

  const bottomTipX = lineX + BRACKET_HOOK_REACH_PX;
  const bottomTipOuterY = height + BRACKET_HOOK_RISE_PX + BRACKET_TIP_WIDTH_PX;
  const bottomTipInnerY = height + BRACKET_HOOK_RISE_PX - BRACKET_TIP_WIDTH_PX;

  // The outer contour departs the stem's far corner and sweeps out to the
  // tip's more extreme point; the inner contour departs the near corner and
  // sweeps to the tip's nearer point. Pairing longer-travel with the more
  // extreme target (and vice versa) keeps the two contours from crossing.
  const topOuterControl = { x: stemLeftX, y: -BRACKET_HOOK_RISE_PX };
  const topInnerControl = { x: stemRightX, y: -BRACKET_HOOK_RISE_PX };
  const bottomOuterControl = {
    x: stemLeftX,
    y: height + BRACKET_HOOK_RISE_PX,
  };
  const bottomInnerControl = {
    x: stemRightX,
    y: height + BRACKET_HOOK_RISE_PX,
  };

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    `M ${topTipX} ${topTipOuterY} ` +
      `Q ${topOuterControl.x} ${topOuterControl.y}, ${stemLeftX} 0 ` +
      `L ${stemLeftX} ${height} ` +
      `Q ${bottomOuterControl.x} ${bottomOuterControl.y}, ${bottomTipX} ${bottomTipOuterY} ` +
      `L ${bottomTipX} ${bottomTipInnerY} ` +
      `Q ${bottomInnerControl.x} ${bottomInnerControl.y}, ${stemRightX} ${height} ` +
      `L ${stemRightX} 0 ` +
      `Q ${topInnerControl.x} ${topInnerControl.y}, ${topTipX} ${topTipInnerY} ` +
      `Z`
  );
  path.setAttribute('fill', 'currentColor');
  path.setAttribute('stroke', 'none');
  svg.appendChild(path);

  return svg;
}

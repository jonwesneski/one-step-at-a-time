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
// original 20-segment cubic-bezier structure intact. The outline traces
// both walls of the brace's curved "ribbon" (an outer wall out to each tip,
// an inner wall back from each tip to the mid-junction pinch); every point
// in the path — anchors and control points alike — is tagged with which of
// those four wall arcs it belongs to, matched against its nearest
// (by vertical position) point on the opposite wall of the same tip's
// ribbon, and moved 25% of the way toward that match. Since both sides of
// a matched pair move toward each other by the same fraction, the gap
// between them (the local stroke width) shrinks to half its original
// size — verified by sampling cross-sections at several heights (~43-48%
// width reduction at the humps, converging naturally to ~0 at the tips and
// pinch where the two walls already meet). Finally the origin is
// normalized so the path's own coordinate space is already
// X ∈ [0, SMUFL_BRACE_NATURAL_WIDTH], Y ∈ [0, SMUFL_BRACE_NATURAL_HEIGHT]
// (top-left origin, Y-down) — so no translation is needed at render time,
// only the scale below.
const SMUFL_BRACE_PATH_D =
  'M 6.25 504 ' +
  'C 30.5 477.5, 60 406, 60 346 ' +
  'C 60 342.25, 60 337.75, 59.25 334 ' +
  'C 45.25 279, 22.75 184.5, 22.75 119 ' +
  'C 22.75 80, 46.75 28, 56 14.5 ' +
  'C 58.25 10, 59.75 9.25, 59.75 7 ' +
  'C 60.75 3.5, 59 0, 56.75 0 ' +
  'C 56.5 0, 55.75 2.5, 52.75 7 ' +
  'C 33.75 32, 7.75 88, 7.75 189.5 ' +
  'C 15.25 287, 43.25 332, 43.5 398 ' +
  'C 43.5 433.25, 21 470.5, 0 494.5 ' +
  'C 13.5 518.5, 35.25 530.5, 43.5 597 ' +
  'C 43.25 668.25, 15.25 729.5, 7.75 807.75 ' +
  'C 7.75 909.25, 33.75 965.25, 52.75 991 ' +
  'C 55 996.25, 56.5 997, 58 997 ' +
  'C 59 997, 60.75 994.5, 59.75 991 ' +
  'C 59.75 988.75, 59 987.25, 56 982.75 ' +
  'C 46.75 969.75, 22.75 917.75, 22.75 878 ' +
  'C 22.75 813.25, 45.25 724.5, 59.25 664.75 ' +
  'C 60 661, 60 657.25, 60 652.75 ' +
  'C 60 591, 28 517.5, 6.25 504 Z';

/** Full width (units) of the thinned+normalized glyph outline's bounding box. */
const SMUFL_BRACE_NATURAL_WIDTH = 60.75;

/**
 * Full height (units) of the thinned+normalized glyph outline's bounding
 * box — its default/natural size. SMuFL specifies that the brace glyph is
 * meant to be scaled disproportionately (Y independent of X) to fit
 * whatever gap the connected staves need, which is what createSmuflBraceSvg
 * does below.
 */
const SMUFL_BRACE_NATURAL_HEIGHT = 997;

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

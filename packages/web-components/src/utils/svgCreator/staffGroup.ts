import { SVG_NS } from '../consts';
import {
  BRACE_WIDTH_PX,
  BRACKET_LEFT_MARGIN_PX,
  BRACKET_STEM_THICKNESS_PX,
  BRACKET_WIDTH_PX,
} from '../notationDimensions';

// ─── Brace ──────────────────────────────────────────────────────────────────
//
// An engraved brace outline, thinned to half its stroke width (each wall
// point moved 25% toward the opposite wall) and normalized to
// X ∈ [0, BRACE_NATURAL_WIDTH], Y ∈ [0, BRACE_NATURAL_HEIGHT], top-left
// origin, so rendering only scales it.
const BRACE_PATH_D =
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
const BRACE_NATURAL_WIDTH = 60.75;

/**
 * Natural height (units) of the brace outline; createBraceSvg scales Y
 * independently of X to fit the span.
 */
const BRACE_NATURAL_HEIGHT = 997;

/**
 * Brace renderer; its right edge sits at x=BRACE_WIDTH_PX, like the other
 * connector renderers.
 */
export function createBraceSvg(height: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('brace');
  svg.setAttribute('width', `${BRACE_WIDTH_PX}`);
  svg.setAttribute('height', `${height}`);
  svg.setAttribute('viewBox', `0 0 ${BRACE_WIDTH_PX} ${height}`);
  svg.style.overflow = 'visible';

  // Width scales by a fixed factor regardless of height (disproportionate
  // scaling — see BRACE_NATURAL_HEIGHT comment); height scales to
  // exactly fill the requested span. The path's own coordinates already
  // start at (0, 0), so scale is the only transform needed.
  const scaleX = BRACE_WIDTH_PX / BRACE_NATURAL_WIDTH;
  const scaleY = height / BRACE_NATURAL_HEIGHT;

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', BRACE_PATH_D);
  path.setAttribute('transform', `scale(${scaleX}, ${scaleY})`);
  path.setAttribute('fill', 'currentColor');
  path.setAttribute('stroke', 'none');
  svg.appendChild(path);

  return svg;
}

// ─── Bracket ────────────────────────────────────────────────────────────────
//
// A straight stem with a fixed-size hook at each end: the hooks never
// stretch, only the stem lengthens. Both hooks share one outline
// (X ∈ [0, 18.76], Y ∈ [0, 11.8]; X ∈ [0, 5] meets the stem), mirrored so
// the tip curls away from the stem. BRACKET_TOP_PATH_D is that mirrored
// outline shifted right by BRACKET_LEFT_MARGIN_PX; the bottom hook depends on
// the height, so bracketBottomPathD builds it per call.
const BRACKET_TOP_PATH_D =
  `M ${0 + BRACKET_LEFT_MARGIN_PX} 0 L ${5 + BRACKET_LEFT_MARGIN_PX} 0 ` +
  `C ${11.4 + BRACKET_LEFT_MARGIN_PX} -1.2, ${
    17.12 + BRACKET_LEFT_MARGIN_PX
  } -4.16, ${18.72 + BRACKET_LEFT_MARGIN_PX} -10.84 ` +
  `C ${18.76 + BRACKET_LEFT_MARGIN_PX} -11, ${
    18.76 + BRACKET_LEFT_MARGIN_PX
  } -11.12, ${18.76 + BRACKET_LEFT_MARGIN_PX} -11.24 ` +
  `C ${18.76 + BRACKET_LEFT_MARGIN_PX} -11.56, ${
    18.64 + BRACKET_LEFT_MARGIN_PX
  } -11.72, ${18.44 + BRACKET_LEFT_MARGIN_PX} -11.8 ` +
  `C ${18.08 + BRACKET_LEFT_MARGIN_PX} -11.8, ${
    17.64 + BRACKET_LEFT_MARGIN_PX
  } -11.52, ${17.44 + BRACKET_LEFT_MARGIN_PX} -11.24 ` +
  `C ${17.04 + BRACKET_LEFT_MARGIN_PX} -10.8, ${
    12 + BRACKET_LEFT_MARGIN_PX
  } -5.52, ${4.36 + BRACKET_LEFT_MARGIN_PX} -4.96 ` +
  `L ${0.32 + BRACKET_LEFT_MARGIN_PX} -4.96 ` +
  `C ${0.08 + BRACKET_LEFT_MARGIN_PX} -4.96, ${
    0 + BRACKET_LEFT_MARGIN_PX
  } -4.92, ${0 + BRACKET_LEFT_MARGIN_PX} -4.68 Z`;

/** Full natural height (px) of a hook cap's own outline — see comment above. */
const BRACKET_CAP_NATURAL_HEIGHT = 11.8;

type PathSegment =
  | { cmd: 'M' | 'L'; x: number; y: number }
  | {
      cmd: 'C';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      x: number;
      y: number;
    }
  | { cmd: 'Z' };

// Natural (unmirrored) coordinates, X already shifted right by
// BRACKET_LEFT_MARGIN_PX — Y is mirrored (and offset by the requested
// height) at call time in bracketBottomPathD, since that part of the
// transform genuinely depends on a runtime value.
const BRACKET_BOTTOM_PATH_SEGMENTS: PathSegment[] = [
  { cmd: 'M', x: 0 + BRACKET_LEFT_MARGIN_PX, y: 7.12 },
  {
    cmd: 'C',
    x1: 0 + BRACKET_LEFT_MARGIN_PX,
    y1: 6.88,
    x2: 0.08 + BRACKET_LEFT_MARGIN_PX,
    y2: 6.84,
    x: 0.32 + BRACKET_LEFT_MARGIN_PX,
    y: 6.84,
  },
  { cmd: 'L', x: 4.36 + BRACKET_LEFT_MARGIN_PX, y: 6.84 },
  {
    cmd: 'C',
    x1: 12 + BRACKET_LEFT_MARGIN_PX,
    y1: 6.28,
    x2: 17.04 + BRACKET_LEFT_MARGIN_PX,
    y2: 1,
    x: 17.44 + BRACKET_LEFT_MARGIN_PX,
    y: 0.56,
  },
  {
    cmd: 'C',
    x1: 17.64 + BRACKET_LEFT_MARGIN_PX,
    y1: 0.28,
    x2: 18.08 + BRACKET_LEFT_MARGIN_PX,
    y2: 0,
    x: 18.44 + BRACKET_LEFT_MARGIN_PX,
    y: 0,
  },
  {
    cmd: 'C',
    x1: 18.64 + BRACKET_LEFT_MARGIN_PX,
    y1: 0.08,
    x2: 18.76 + BRACKET_LEFT_MARGIN_PX,
    y2: 0.24,
    x: 18.76 + BRACKET_LEFT_MARGIN_PX,
    y: 0.56,
  },
  {
    cmd: 'C',
    x1: 18.76 + BRACKET_LEFT_MARGIN_PX,
    y1: 0.68,
    x2: 18.76 + BRACKET_LEFT_MARGIN_PX,
    y2: 0.8,
    x: 18.72 + BRACKET_LEFT_MARGIN_PX,
    y: 0.96,
  },
  {
    cmd: 'C',
    x1: 17.12 + BRACKET_LEFT_MARGIN_PX,
    y1: 7.64,
    x2: 11.4 + BRACKET_LEFT_MARGIN_PX,
    y2: 10.6,
    x: 5 + BRACKET_LEFT_MARGIN_PX,
    y: 11.8,
  },
  { cmd: 'L', x: 0 + BRACKET_LEFT_MARGIN_PX, y: 11.8 },
  { cmd: 'Z' },
];

/**
 * The bottom hook's outline with its meeting edge at `offsetY` (the stem's
 * bottom) and its tip curling down past it.
 */
function bracketBottomPathD(offsetY: number): string {
  const y = (naturalY: number) =>
    BRACKET_CAP_NATURAL_HEIGHT - naturalY + offsetY;
  return BRACKET_BOTTOM_PATH_SEGMENTS.map((segment) => {
    switch (segment.cmd) {
      case 'M':
        return `M ${segment.x} ${y(segment.y)}`;
      case 'L':
        return `L ${segment.x} ${y(segment.y)}`;
      case 'C':
        return (
          `C ${segment.x1} ${y(segment.y1)}, ` +
          `${segment.x2} ${y(segment.y2)}, ` +
          `${segment.x} ${y(segment.y)}`
        );
      case 'Z':
        return 'Z';
    }
  }).join(' ');
}

/**
 * Bracket renderer: two hooks and a stem, hook tips at x=BRACKET_WIDTH_PX.
 * Any height keeps the hooks undistorted.
 */
export function createBracketSvg(height: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('bracket');
  svg.setAttribute('width', `${BRACKET_WIDTH_PX}`);
  svg.setAttribute('height', `${height}`);
  svg.setAttribute('viewBox', `0 0 ${BRACKET_WIDTH_PX} ${height}`);
  svg.style.overflow = 'visible';

  const topCap = document.createElementNS(SVG_NS, 'path');
  topCap.setAttribute('d', BRACKET_TOP_PATH_D);
  topCap.setAttribute('fill', 'currentColor');
  topCap.setAttribute('stroke', 'none');
  svg.appendChild(topCap);

  const stem = document.createElementNS(SVG_NS, 'rect');
  stem.setAttribute('x', `${BRACKET_LEFT_MARGIN_PX}`);
  stem.setAttribute('y', '0');
  stem.setAttribute('width', `${BRACKET_STEM_THICKNESS_PX}`);
  stem.setAttribute('height', `${height}`);
  stem.setAttribute('fill', 'currentColor');
  svg.appendChild(stem);

  const bottomCap = document.createElementNS(SVG_NS, 'path');
  bottomCap.setAttribute('d', bracketBottomPathD(height));
  bottomCap.setAttribute('fill', 'currentColor');
  bottomCap.setAttribute('stroke', 'none');
  svg.appendChild(bottomCap);

  return svg;
}

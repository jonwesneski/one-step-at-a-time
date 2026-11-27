import { contourPath, contourSegments } from '../../rules/bendContourRules';
import {
  glissandoDipWidthPx,
  glissandoHalfWaveCount,
  type BendLayout,
  type LinePoint,
} from '../../rules/glissandoRules';
import type { AccidentalType, GlissandoShape } from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  BEND_CONTOUR_THICKNESS_PX,
  BEND_TARGET_GAP_PX,
  BEND_TARGET_LEDGER_OVERHANG_PX,
  BEND_TARGET_PARENTHESIS_HALF_HEIGHT_PX,
  BEND_TARGET_PARENTHESIS_WIDTH_PX,
  CUE_SCALE,
  GLISSANDO_DIP_DEPTH_PX,
  GLISSANDO_LINE_THICKNESS_PX,
  GLISSANDO_WAVE_AMPLITUDE_PX,
} from '../notationDimensions';
import { createLineLabel } from './curve';
import { createParenthesisSvg } from './parenthesis';
import {
  createWrittenNoteSvg,
  writtenNoteWidthPx,
  type WrittenNoteProps,
  type WrittenNoteStyle,
} from './writtenNote';

export type GlissandoLineProps = {
  from: LinePoint;
  to: LinePoint;
  shape: GlissandoShape;
  /** Where a dip is centred; the middle of the line by default. */
  dipCenterX?: number;
  label?: string;
};

// A cubic whose controls sit at these fractions of a half-wave, 4/3 of its
// amplitude out, follows a half sine closely.
const HALF_WAVE_CONTROL_FRACTIONS = [0.3642, 0.6358];

function createGlissandoPath({
  from,
  to,
  shape,
  dipCenterX = (from.x + to.x) / 2,
}: GlissandoLineProps): SVGPathElement {
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    shape === 'dip'
      ? dipPath(from, to, dipCenterX)
      : shape === 'wave'
      ? wavePath(from, to)
      : `M ${from.x} ${from.y} L ${to.x} ${to.y}`
  );
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', `${GLISSANDO_LINE_THICKNESS_PX}`);
  return path;
}

/** The line of a glissando, beside its notes' heads. */
export function createGlissandoLineSvg(props: GlissandoLineProps): SVGGElement {
  const { from, to, shape, label } = props;
  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('connector', 'glissando');
  group.appendChild(createGlissandoPath(props));
  if (label) {
    group.appendChild(
      createLineLabel({
        from,
        to,
        label,
        side: 'above',
        clearance: shape === 'wave' ? GLISSANDO_WAVE_AMPLITUDE_PX : 0,
      })
    );
  }
  return group;
}

const BEND_TARGET_STYLE: WrittenNoteStyle = {
  classPrefix: 'bend-target',
  scale: CUE_SCALE,
  parenthesisWidthPx: BEND_TARGET_PARENTHESIS_WIDTH_PX,
  gapPx: BEND_TARGET_GAP_PX,
  // An arrow reaches past the parentheses rather than lengthening them.
  parenthesisHalfHeightPx: () => BEND_TARGET_PARENTHESIS_HALF_HEIGHT_PX,
  createParenthesis: (side, x, centerY, halfHeight) =>
    createParenthesisSvg(
      side === 'left' ? 'open' : 'close',
      x,
      centerY - halfHeight,
      BEND_TARGET_PARENTHESIS_WIDTH_PX,
      2 * halfHeight
    ),
  ledgerOverhangPx: BEND_TARGET_LEDGER_OVERHANG_PX,
};

export function bendTargetWidthPx(accidental: AccidentalType | null): number {
  return writtenNoteWidthPx(BEND_TARGET_STYLE, accidental);
}

/** The pitch a bend ends on: a small notehead in parentheses. */
export function createBendTargetSvg(props: WrittenNoteProps): SVGGElement {
  return createWrittenNoteSvg(BEND_TARGET_STYLE, props).element;
}

/** A note's or chord's pitch bends and the targets they run to. */
export function createBendSvg({ lines }: BendLayout): SVGGElement {
  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('bend');
  for (const { target, contour, ...line } of lines) {
    const path =
      contour === null ? createGlissandoPath(line) : createContourPath(contour);
    path.classList.add('bend-line');
    group.appendChild(path);
    if (target !== null) {
      group.appendChild(createBendTargetSvg(target));
    }
  }
  return group;
}

// A `bend-contour`: a monotone curve through its points.
function createContourPath(points: readonly LinePoint[]): SVGPathElement {
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', contourPath(contourSegments(points)));
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', `${BEND_CONTOUR_THICKNESS_PX}`);
  path.classList.add('bend-contour');
  return path;
}

const pointText = ({ x, y }: LinePoint): string => `${x} ${y}`;

// Straight but for the dip, which eases out of the line and back into it.
function dipPath(from: LinePoint, to: LinePoint, centerX: number): string {
  const length = to.x - from.x;
  const halfWidth = glissandoDipWidthPx(length) / 2;
  const center = Math.min(
    to.x - halfWidth,
    Math.max(from.x + halfWidth, centerX)
  );
  const at = (x: number, depth: number): string =>
    pointText({
      x,
      y: from.y + ((to.y - from.y) * (x - from.x)) / length + depth,
    });
  const [left, right] = [center - halfWidth, center + halfWidth];
  const quarter = halfWidth / 2;
  const depth = GLISSANDO_DIP_DEPTH_PX;
  return [
    `M ${pointText(from)} L ${at(left, 0)}`,
    `C ${at(left + quarter, 0)} ${at(center - quarter, depth)} ${at(
      center,
      depth
    )}`,
    `C ${at(center + quarter, depth)} ${at(right - quarter, 0)} ${at(
      right,
      0
    )}`,
    `L ${pointText(to)}`,
  ].join(' ');
}

// Whole half-waves along the line, the first one upward.
function wavePath(from: LinePoint, to: LinePoint): string {
  const [dx, dy] = [to.x - from.x, to.y - from.y];
  const length = Math.hypot(dx, dy);
  const count = glissandoHalfWaveCount(length);
  const normal = { x: dy / length, y: -dx / length };
  const at = (halfWaves: number, height: number): string =>
    pointText({
      x: from.x + (dx * halfWaves) / count + normal.x * height,
      y: from.y + (dy * halfWaves) / count + normal.y * height,
    });
  const peak = (GLISSANDO_WAVE_AMPLITUDE_PX * 4) / 3;
  const halfWaves = Array.from({ length: count }, (_, i) => {
    const height = i % 2 === 0 ? peak : -peak;
    const [first, second] = HALF_WAVE_CONTROL_FRACTIONS;
    return `C ${at(i + first, height)} ${at(i + second, height)} ${at(
      i + 1,
      0
    )}`;
  });
  return `M ${pointText(from)} ${halfWaves.join(' ')}`;
}

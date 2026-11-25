import {
  glissandoDipWidthPx,
  glissandoHalfWaveCount,
  type LinePoint,
} from '../../rules/glissandoRules';
import type { GlissandoShape } from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  GLISSANDO_DIP_DEPTH_PX,
  GLISSANDO_LINE_THICKNESS_PX,
  GLISSANDO_WAVE_AMPLITUDE_PX,
} from '../notationDimensions';
import { createLineLabel } from './curve';

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

/** The line of a glissando or pitch bend, beside its notes' heads. */
export function createGlissandoLineSvg({
  from,
  to,
  shape,
  dipCenterX = (from.x + to.x) / 2,
  label,
}: GlissandoLineProps): SVGGElement {
  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('connector', 'glissando');
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
  group.appendChild(path);
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

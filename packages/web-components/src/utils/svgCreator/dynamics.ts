import { HairpinKind, DynamicMarking } from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  DYNAMICS_FONT_SIZE,
  HAIRPIN_OPEN_HEIGHT,
  HAIRPIN_STROKE_WIDTH,
} from '../notationDimensions';

/**
 * Renders a dynamic marking (e.g. "mf", "pp", "sfz") as italic serif text
 * centered at (x, y) in the staff SVG coordinate space.
 *
 * Dynamic markings are always placed below the staff — the caller is
 * responsible for passing an appropriate y value (see DYNAMICS_BASELINE_Y).
 */
export function createDynamicMarkingSvg(
  marking: DynamicMarking,
  x: number,
  y: number
): SVGTextElement {
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', `${x}`);
  text.setAttribute('y', `${y}`);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('font-size', `${DYNAMICS_FONT_SIZE}`);
  text.setAttribute('font-style', 'italic');
  text.setAttribute('font-family', 'serif');
  text.setAttribute('fill', 'currentColor');
  text.classList.add('dynamic-marking');
  text.textContent = marking;
  return text;
}

/**
 * Renders a hairpin wedge (crescendo or decrescendo) as two straight SVG lines.
 *
 * Crescendo (<): lines converge to a point at startX, open to openHeight at endX.
 * Decrescendo (>): lines open to openHeight at startX, converge to a point at endX.
 *
 * openAtStart: left end starts at half-spread (centerY ± openHeight/4) instead of
 *   its normal position. For crescendo this means already-spreading (not a point);
 *   for decrescendo this means a reduced spread (not fully open). Used when rendering
 *   the second segment of a cross-system hairpin to signal the change is in progress.
 *
 * openAtEnd: right end stops at half-spread instead of its normal position. For
 *   decrescendo this prevents the wedge from fully closing to a point at the system
 *   edge ("remains open" per engraving convention). Ignored for crescendo since its
 *   right end is already the natural open side.
 */
export function createHairpinSvg(
  kind: HairpinKind,
  startX: number,
  endX: number,
  centerY: number,
  openHeight: number = HAIRPIN_OPEN_HEIGHT,
  openAtStart: boolean = false,
  openAtEnd: boolean = false
): SVGGElement {
  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('hairpin');

  const halfHeight = openHeight / 2;

  let topPath: string;
  let bottomPath: string;

  if (kind === 'crescendo') {
    const leftTopY = openAtStart ? centerY - halfHeight / 2 : centerY;
    const leftBottomY = openAtStart ? centerY + halfHeight / 2 : centerY;
    topPath = `M ${startX} ${leftTopY} L ${endX} ${centerY - halfHeight}`;
    bottomPath = `M ${startX} ${leftBottomY} L ${endX} ${centerY + halfHeight}`;
  } else {
    const leftTopY = openAtStart
      ? centerY - halfHeight / 2
      : centerY - halfHeight;
    const leftBottomY = openAtStart
      ? centerY + halfHeight / 2
      : centerY + halfHeight;
    const rightTopY = openAtEnd ? centerY - halfHeight / 2 : centerY;
    const rightBottomY = openAtEnd ? centerY + halfHeight / 2 : centerY;
    topPath = `M ${startX} ${leftTopY} L ${endX} ${rightTopY}`;
    bottomPath = `M ${startX} ${leftBottomY} L ${endX} ${rightBottomY}`;
  }

  for (const d of [topPath, bottomPath]) {
    const line = document.createElementNS(SVG_NS, 'path');
    line.setAttribute('d', d);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', 'currentColor');
    line.setAttribute('stroke-width', `${HAIRPIN_STROKE_WIDTH}`);
    line.setAttribute('stroke-linecap', 'round');
    group.appendChild(line);
  }

  return group;
}

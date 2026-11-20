import {
  hairpinWedgeEdges,
  type HairpinPoint,
  type HairpinWedgeEdges,
} from '../../rules/hairpinPlacementRules';
import type { DynamicMarking, HairpinKind } from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  ARPEGGIO_HAIRPIN_OPEN_WIDTH_PX,
  DYNAMICS_FONT_SIZE,
  HAIRPIN_OPEN_HEIGHT,
  HAIRPIN_STROKE_WIDTH,
} from '../notationDimensions';

/**
 * Renders a dynamic marking (e.g. "mf", "pp", "sfz") as italic serif text
 * centered at (x, y) in the staff SVG coordinate space.
 */
export function createDynamicMarkingSvg(
  marking: DynamicMarking,
  x: number,
  y: number,
  { bracketed = false }: { bracketed?: boolean } = {}
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
  if (!bracketed) {
    text.textContent = marking;
    return text;
  }
  // A reminder: the italic marking between upright brackets, all centred on x.
  const bracket = (content: string) => {
    const span = document.createElementNS(SVG_NS, 'tspan');
    span.setAttribute('font-style', 'normal');
    span.textContent = content;
    return span;
  };
  const markingSpan = document.createElementNS(SVG_NS, 'tspan');
  markingSpan.textContent = marking;
  text.classList.add('dynamic-reminder');
  text.append(bracket('('), markingSpan, bracket(')'));
  return text;
}

/**
 * Renders a hairpin wedge (crescendo or decrescendo) as two straight SVG lines.
 *
 * Crescendo (<): lines converge to a point at startX, open to openHeight at endX.
 * Decrescendo (>): lines open to openHeight at startX, converge to a point at endX.
 *
 * openAtStart: the left end starts at half-spread, for the continuation of a
 *   hairpin across a system break.
 * openAtEnd: the right end stops at half-spread, so a decrescendo stays open at
 *   a system edge. Ignored for crescendo.
 */
export function createHairpinSvg(
  kind: HairpinKind,
  startX: number,
  endX: number,
  centerY: number,
  openHeight: number = HAIRPIN_OPEN_HEIGHT,
  openAtStart = false,
  openAtEnd = false
): SVGGElement {
  const group = createHairpinGroup(
    hairpinWedgeEdges(
      kind,
      { x: startX, y: centerY },
      { x: endX, y: centerY },
      openHeight,
      openAtStart,
      openAtEnd
    )
  );
  group.classList.add('hairpin');
  return group;
}

/**
 * Renders a hairpin wedge whose axis runs from `start` to `end` at any slant,
 * with each end's opening perpendicular to that axis.
 */
export function createAngledHairpinSvg(
  kind: HairpinKind,
  start: HairpinPoint,
  end: HairpinPoint,
  openHeight: number = HAIRPIN_OPEN_HEIGHT
): SVGGElement {
  const group = createHairpinGroup(
    hairpinWedgeEdges(kind, start, end, openHeight)
  );
  group.classList.add('hairpin', 'hairpin-angled');
  return group;
}

function createHairpinGroup(edges: HairpinWedgeEdges): SVGGElement {
  const group = document.createElementNS(SVG_NS, 'g');
  for (const [from, to] of edges) {
    const line = document.createElementNS(SVG_NS, 'path');
    line.setAttribute('d', `M ${from.x} ${from.y} L ${to.x} ${to.y}`);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', 'currentColor');
    line.setAttribute('stroke-width', `${HAIRPIN_STROKE_WIDTH}`);
    line.setAttribute('stroke-linecap', 'round');
    group.appendChild(line);
  }
  return group;
}

/**
 * Renders a hairpin wedge rotated to run vertically, for a dynamic change during
 * an arpeggiated (rolled) chord. The wedge spans `topY`..`bottomY` with its
 * spine at `spineX`; one end is a point (`narrowEnd`) and the other opens to
 * `spineX ± openWidth/2`. `kind` selects which visual style but the geometry is
 * driven entirely by `narrowEnd` (the caller derives it from the roll direction).
 */
export function createVerticalHairpinSvg(
  kind: HairpinKind,
  topY: number,
  bottomY: number,
  spineX: number,
  narrowEnd: 'top' | 'bottom',
  openWidth: number = ARPEGGIO_HAIRPIN_OPEN_WIDTH_PX
): SVGGElement {
  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('arpeggio-hairpin', `arpeggio-hairpin-${kind}`);

  const halfWidth = openWidth / 2;
  const pointY = narrowEnd === 'top' ? topY : bottomY;
  const openY = narrowEnd === 'top' ? bottomY : topY;

  const leftPath = `M ${spineX} ${pointY} L ${spineX - halfWidth} ${openY}`;
  const rightPath = `M ${spineX} ${pointY} L ${spineX + halfWidth} ${openY}`;

  for (const d of [leftPath, rightPath]) {
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

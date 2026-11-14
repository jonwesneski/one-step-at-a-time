import type { UnisonStemSegment } from '../../rules/unisonRules';
import { SVG_NS } from '../consts';
import {
  CLUSTER_BRACKET_HOOK_PX,
  STEM_STROKE_WIDTH_PX,
} from '../notationDimensions';

/** A diagonal joining a displaced head to a single stem, or a prong's fork. */
export function createUnisonDiagonalSvg(
  { fromX, fromY, toX, toY }: UnisonStemSegment,
  cssClass: 'unison-diagonal' | 'unison-prong' = 'unison-diagonal'
): SVGLineElement {
  const line = document.createElementNS(SVG_NS, 'line');
  line.classList.add(cssClass);
  line.setAttribute('x1', `${fromX}`);
  line.setAttribute('y1', `${fromY}`);
  line.setAttribute('x2', `${toX}`);
  line.setAttribute('y2', `${toY}`);
  line.setAttribute('stroke', 'currentColor');
  line.setAttribute('stroke-width', `${STEM_STROKE_WIDTH_PX}`);
  return line;
}

/** The square bracket over the simultaneous heads of a stemless cluster. */
export function createUnisonBracketSvg({
  leftX,
  rightX,
  topY,
}: {
  leftX: number;
  rightX: number;
  topY: number;
}): SVGPathElement {
  const path = document.createElementNS(SVG_NS, 'path');
  path.classList.add('unison-bracket');
  path.setAttribute(
    'd',
    `M ${leftX} ${
      topY + CLUSTER_BRACKET_HOOK_PX
    } L ${leftX} ${topY} L ${rightX} ${topY} L ${rightX} ${
      topY + CLUSTER_BRACKET_HOOK_PX
    }`
  );
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', `${STEM_STROKE_WIDTH_PX}`);
  return path;
}

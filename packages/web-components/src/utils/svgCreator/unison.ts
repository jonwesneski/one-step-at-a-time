import { SVG_NS } from '../consts';
import {
  CLUSTER_BRACKET_HOOK_PX,
  STEM_STROKE_WIDTH_PX,
} from '../notationDimensions';

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

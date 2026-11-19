import { SVG_NS } from '../consts';
import { SHARED_STEM_WIDTH_PX } from '../notationDimensions';

/**
 * The `shared-stem-for` stem between two noteheads on adjacent staves, in
 * measure-relative px.
 */
export function createSharedStemLine(
  x: number,
  y1: number,
  y2: number
): SVGLineElement {
  const line = document.createElementNS(SVG_NS, 'line');
  line.classList.add('shared-stem');
  line.setAttribute('x1', `${x}`);
  line.setAttribute('y1', `${y1}`);
  line.setAttribute('x2', `${x}`);
  line.setAttribute('y2', `${y2}`);
  line.setAttribute('stroke', 'currentColor');
  line.setAttribute('stroke-width', `${SHARED_STEM_WIDTH_PX}`);
  line.setAttribute('stroke-linecap', 'butt');
  return line;
}

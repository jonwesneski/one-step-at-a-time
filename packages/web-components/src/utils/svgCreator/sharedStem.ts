import { SVG_NS } from '../consts';
import { SHARED_STEM_WIDTH_PX } from '../notationDimensions';

/**
 * The real stem line directly connecting two noteheads on adjacent staves
 * that share one stem (`shared-stem-for`) — both hands occasionally playing
 * the same beat simultaneously in otherwise single-part writing, instead of
 * each drawing its own. Coordinates are real px, measure-relative
 * (measure.ts#redrawSharedStems already resolves them there via real
 * notehead `getBoundingClientRect()`s) — 1:1 with the
 * `.shared-stems-overlay` SVG it's appended into, no further scaling.
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

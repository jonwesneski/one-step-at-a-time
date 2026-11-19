import { SVG_NS } from '../consts';
import { BEAM_THICKNESS_PX } from '../notationDimensions';

/**
 * The shared primary beam polygon for a cross-staff double-stemmed group —
 * a slanted rectangle from (x1, y1) to (x2, y2), BEAM_THICKNESS_PX thick,
 * growing downward (noteheads sit on both sides, so the direction is
 * arbitrary). Measure-relative px.
 */
export function createDoubleStemmedBeamPolygon(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): SVGPolygonElement {
  const polygon = document.createElementNS(SVG_NS, 'polygon');
  polygon.classList.add('double-stemmed-beam');
  polygon.setAttribute('fill', 'currentColor');
  polygon.setAttribute(
    'points',
    `${x1},${y1} ${x1},${y1 + BEAM_THICKNESS_PX} ${x2},${
      y2 + BEAM_THICKNESS_PX
    } ${x2},${y2}`
  );
  return polygon;
}

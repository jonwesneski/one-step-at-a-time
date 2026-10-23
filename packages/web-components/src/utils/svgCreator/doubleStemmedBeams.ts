import { SVG_NS } from '../consts';
import { BEAM_THICKNESS_PX } from '../notationDimensions';

/**
 * The shared primary beam polygon for a cross-staff double-stemmed group —
 * a slanted rectangle from (x1, y1) to (x2, y2), BEAM_THICKNESS_PX thick,
 * growing downward (toward the bottom staff). Coordinates are real px,
 * measure-relative (measure.ts#redrawDoubleStemmedBeams already resolves
 * them there via resolveDoubleStemmedBeamLine) — 1:1 with the
 * `.double-stemmed-beams-overlay` SVG they're appended into, no further
 * scaling. Unlike a same-staff beam (utils/svgCreator/beams.ts), there is no
 * single "toward the noteheads" direction to grow the thickness in — the two
 * staves' noteheads sit on opposite sides of this beam — so downward is a
 * fixed, arbitrary but consistent choice.
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

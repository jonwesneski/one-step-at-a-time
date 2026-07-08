import type {
  AccentType,
  ArticulationLength,
  ArticulationType,
  StressType,
} from '../../types/theory';
import { SVG_NS } from '../consts';

// Notehead half-height in the 600-unit space (createNoteSvg draws the head with
// ry = HEAD_WIDTH * 0.75 = 60).
const HEAD_HALF_HEIGHT = 60;
// Gap from the notehead edge to the center of the first (closest) mark.
const MARK_GAP = 90;
// Distance between the centers of consecutively stacked marks (one per
// "stave-space" in engraving terms).
const MARK_STEP = 150;
// Marks are roughly one notehead wide.
const MARK_HALF_WIDTH = 70;

export type ArticulationMarksProps = {
  articulation?: ArticulationType | null;
  stress?: StressType | null;
  stemUp: boolean;
  // Notehead center in the 600-unit note coordinate space.
  noteHeadCenterX: number;
  noteHeadCenterY: number;
};

// Split a combined articulation value into its optional accent prefix and its
// optional length/hold token, e.g. 'accent-portato' -> { accent: 'accent',
// length: 'portato' }, 'fermata' -> { length: 'fermata' }, 'marcato' ->
// { accent: 'marcato' }. The input is always a valid ArticulationType.
const decomposeArticulation = (
  value: ArticulationType
): { accent?: AccentType; length?: ArticulationLength } => {
  let accent: AccentType | undefined;
  let rest: string = value;
  if (value === 'accent' || value.startsWith('accent-')) {
    accent = 'accent';
    rest = value.slice('accent'.length);
  } else if (value === 'marcato' || value.startsWith('marcato-')) {
    accent = 'marcato';
    rest = value.slice('marcato'.length);
  }
  if (rest.startsWith('-')) {
    rest = rest.slice(1);
  }
  const length = rest === '' ? undefined : (rest as ArticulationLength);
  return { accent, length };
};

const line = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number
): SVGLineElement => {
  const element = document.createElementNS(SVG_NS, 'line');
  element.setAttribute('x1', `${x1}`);
  element.setAttribute('y1', `${y1}`);
  element.setAttribute('x2', `${x2}`);
  element.setAttribute('y2', `${y2}`);
  element.setAttribute('stroke', 'currentColor');
  element.setAttribute('stroke-width', `${width}`);
  element.setAttribute('stroke-linecap', 'round');
  return element;
};

const createStaccatoDot = (cx: number, cy: number): SVGElement => {
  const dot = document.createElementNS(SVG_NS, 'circle');
  dot.classList.add('staccato');
  dot.setAttribute('cx', `${cx}`);
  dot.setAttribute('cy', `${cy}`);
  dot.setAttribute('r', '22');
  dot.setAttribute('fill', 'currentColor');
  return dot;
};

const createTenutoLine = (cx: number, cy: number): SVGElement => {
  const tenuto = line(cx - MARK_HALF_WIDTH, cy, cx + MARK_HALF_WIDTH, cy, 24);
  tenuto.classList.add('tenuto');
  return tenuto;
};

const createStaccatissimoWedge = (
  cx: number,
  cy: number,
  dir: number
): SVGElement => {
  const half = 45;
  const wedgeHalfWidth = 26;
  const apexY = cy - dir * half; // toward the head
  const baseY = cy + dir * half; // away from the head
  const wedge = document.createElementNS(SVG_NS, 'polygon');
  wedge.classList.add('staccatissimo');
  wedge.setAttribute(
    'points',
    `${cx},${apexY} ${cx - wedgeHalfWidth},${baseY} ${
      cx + wedgeHalfWidth
    },${baseY}`
  );
  wedge.setAttribute('fill', 'currentColor');
  return wedge;
};

const createAccentMark = (cx: number, cy: number): SVGElement => {
  const halfWidth = 60;
  const halfHeight = 42;
  const accent = document.createElementNS(SVG_NS, 'polyline');
  accent.classList.add('accent');
  accent.setAttribute(
    'points',
    `${cx - halfWidth},${cy - halfHeight} ${cx + halfWidth},${cy} ${
      cx - halfWidth
    },${cy + halfHeight}`
  );
  accent.setAttribute('fill', 'none');
  accent.setAttribute('stroke', 'currentColor');
  accent.setAttribute('stroke-width', '20');
  accent.setAttribute('stroke-linejoin', 'round');
  accent.setAttribute('stroke-linecap', 'round');
  return accent;
};

const createMarcatoMark = (cx: number, cy: number, dir: number): SVGElement => {
  const halfWidth = 45;
  const halfHeight = 45;
  const apexY = cy + dir * halfHeight; // away from the head
  const armY = cy - dir * halfHeight; // toward the head
  const marcato = document.createElementNS(SVG_NS, 'polyline');
  marcato.classList.add('marcato');
  marcato.setAttribute(
    'points',
    `${cx - halfWidth},${armY} ${cx},${apexY} ${cx + halfWidth},${armY}`
  );
  marcato.setAttribute('fill', 'none');
  marcato.setAttribute('stroke', 'currentColor');
  marcato.setAttribute('stroke-width', '22');
  marcato.setAttribute('stroke-linejoin', 'round');
  marcato.setAttribute('stroke-linecap', 'round');
  return marcato;
};

const createStressMark = (cx: number, cy: number): SVGElement => {
  const mark = line(cx - 22, cy + 26, cx + 22, cy - 26, 20);
  mark.classList.add('stressed');
  return mark;
};

const createUnstressMark = (
  cx: number,
  cy: number,
  dir: number
): SVGElement => {
  const half = 34;
  const depth = 30;
  const endY = cy - (dir * depth) / 2;
  const controlY = cy + dir * depth;
  const arc = document.createElementNS(SVG_NS, 'path');
  arc.classList.add('unstressed');
  arc.setAttribute(
    'd',
    `M ${cx - half},${endY} Q ${cx},${controlY} ${cx + half},${endY}`
  );
  arc.setAttribute('fill', 'none');
  arc.setAttribute('stroke', 'currentColor');
  arc.setAttribute('stroke-width', '16');
  arc.setAttribute('stroke-linecap', 'round');
  return arc;
};

const createFermataSvg = (cx: number, cy: number, dir: number): SVGGElement => {
  const radius = 100;
  // sweep 1 draws the dome upward (smaller y); sweep 0 downward. The dome bulges
  // away from the head: upward when placed above (dir -1), downward when below.
  const sweep = dir === -1 ? 1 : 0;
  const fermata = document.createElementNS(SVG_NS, 'g');
  fermata.classList.add('fermata');

  const arc = document.createElementNS(SVG_NS, 'path');
  arc.setAttribute(
    'd',
    `M ${cx - radius},${cy} A ${radius},${radius} 0 0 ${sweep} ${
      cx + radius
    },${cy}`
  );
  arc.setAttribute('fill', 'none');
  arc.setAttribute('stroke', 'currentColor');
  arc.setAttribute('stroke-width', '16');
  arc.setAttribute('stroke-linecap', 'round');
  fermata.appendChild(arc);

  const dot = document.createElementNS(SVG_NS, 'circle');
  dot.setAttribute('cx', `${cx}`);
  dot.setAttribute('cy', `${cy + dir * 30}`);
  dot.setAttribute('r', '20');
  dot.setAttribute('fill', 'currentColor');
  fermata.appendChild(dot);

  return fermata;
};

/**
 * Build the articulation marks for one note/chord as an SVG <g> in the note's
 * 600-unit coordinate space. The combined `articulation` value is split into its
 * accent prefix and length/hold token. All marks are placed on the side opposite
 * the stem (below the head for a stem-up note, above it for stem-down), stacking
 * outward: length mark closest, then accent, then a fermata (outermost, since it
 * never coexists with a length mark). The Schoenberg stress mark (a separate
 * attribute) is outermost of all.
 *
 * Returns null when nothing is set, so callers can skip appending / setting
 * overflow.
 */
export const createArticulationMarks = ({
  articulation,
  stress,
  stemUp,
  noteHeadCenterX,
  noteHeadCenterY,
}: ArticulationMarksProps): SVGGElement | null => {
  if (!articulation && !stress) {
    return null;
  }

  const { accent, length } = articulation
    ? decomposeArticulation(articulation)
    : {};

  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('articulations');

  // +1 places marks below the head (stem-up), -1 above (stem-down).
  const dir = stemUp ? 1 : -1;
  let step = 0;
  const nextY = (): number => {
    const y =
      noteHeadCenterY + dir * (HEAD_HALF_HEIGHT + MARK_GAP + step * MARK_STEP);
    step++;
    return y;
  };

  // Length family — closest to the notehead. portato / tenuto-staccatissimo are
  // the two legal within-length combinations and stack the dot/wedge nearest the
  // head with the tenuto line just beyond it. (fermata is handled separately.)
  if (length === 'staccato') {
    group.appendChild(createStaccatoDot(noteHeadCenterX, nextY()));
  } else if (length === 'staccatissimo') {
    group.appendChild(createStaccatissimoWedge(noteHeadCenterX, nextY(), dir));
  } else if (length === 'tenuto') {
    group.appendChild(createTenutoLine(noteHeadCenterX, nextY()));
  } else if (length === 'portato') {
    group.appendChild(createStaccatoDot(noteHeadCenterX, nextY()));
    group.appendChild(createTenutoLine(noteHeadCenterX, nextY()));
  } else if (length === 'tenuto-staccatissimo') {
    group.appendChild(createStaccatissimoWedge(noteHeadCenterX, nextY(), dir));
    group.appendChild(createTenutoLine(noteHeadCenterX, nextY()));
  }

  // Accent — outside the length marks.
  if (accent === 'accent') {
    group.appendChild(createAccentMark(noteHeadCenterX, nextY()));
  } else if (accent === 'marcato') {
    group.appendChild(createMarcatoMark(noteHeadCenterX, nextY(), dir));
  }

  // Fermata — opposite the stem like the other marks, outermost (after any
  // accent). Never coexists with a length mark.
  if (length === 'fermata') {
    group.appendChild(createFermataSvg(noteHeadCenterX, nextY(), dir));
  }

  // Schoenberg stress — outermost on the opposite-stem side.
  if (stress === 'stressed') {
    group.appendChild(createStressMark(noteHeadCenterX, nextY()));
  } else if (stress === 'unstressed') {
    group.appendChild(createUnstressMark(noteHeadCenterX, nextY(), dir));
  }

  return group;
};

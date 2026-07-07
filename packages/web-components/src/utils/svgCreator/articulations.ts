// Articulation marks (staccato, accent, tenuto, etc.) drawn adjacent to a
// notehead. Rendered in the note's internal 600-unit coordinate space (the same
// space createNoteSvg draws the notehead/stem/flags in), so the marks live
// inside the note's scaled <g> and move/scale with the notehead as a unit.
//
// These geometry constants intentionally live here — alongside the notehead
// coordinate space in ./note — rather than in notationDimensions.ts, which holds
// pixel-space staff constants. See ./note for the same convention.

import type {
  AccentType,
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
  accent?: AccentType | null;
  articulation?: ArticulationType | null;
  stress?: StressType | null;
  stemUp: boolean;
  // Notehead center in the 600-unit note coordinate space.
  headCx: number;
  headCy: number;
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

// Staccato dot (•) — a small filled circle centered on the notehead.
const createStaccatoDot = (cx: number, cy: number): SVGElement => {
  const dot = document.createElementNS(SVG_NS, 'circle');
  dot.classList.add('staccato');
  dot.setAttribute('cx', `${cx}`);
  dot.setAttribute('cy', `${cy}`);
  dot.setAttribute('r', '22');
  dot.setAttribute('fill', 'currentColor');
  return dot;
};

// Tenuto line (—) — a short thick horizontal stroke, about a notehead wide.
const createTenutoLine = (cx: number, cy: number): SVGElement => {
  const tenuto = line(cx - MARK_HALF_WIDTH, cy, cx + MARK_HALF_WIDTH, cy, 24);
  tenuto.classList.add('tenuto');
  return tenuto;
};

// Staccatissimo wedge (▾) — a filled narrow triangle whose apex points toward
// the notehead (dir points away from the head).
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

// Standard accent (>) — a horizontal chevron opening away from the notehead.
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

// Strong accent / marcato (^) — a vertical chevron whose apex points away from
// the notehead (so it reads as "^" above the head and "v" below it).
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

// Schoenberg stressed note — a short angled stroke (like an acute accent).
const createStressMark = (cx: number, cy: number): SVGElement => {
  const mark = line(cx - 22, cy + 26, cx + 22, cy - 26, 20);
  mark.classList.add('stressed');
  return mark;
};

// Schoenberg unstressed note — a shallow breve arc (˘).
const createUnstressMark = (cx: number, cy: number): SVGElement => {
  const half = 34;
  const depth = 30;
  const arc = document.createElementNS(SVG_NS, 'path');
  arc.classList.add('unstressed');
  arc.setAttribute(
    'd',
    `M ${cx - half},${cy - depth / 2} Q ${cx},${cy + depth} ${cx + half},${
      cy - depth / 2
    }`
  );
  arc.setAttribute('fill', 'none');
  arc.setAttribute('stroke', 'currentColor');
  arc.setAttribute('stroke-width', '16');
  arc.setAttribute('stroke-linecap', 'round');
  return arc;
};

/**
 * Build the articulation marks for one note/chord as an SVG <g> in the note's
 * 600-unit coordinate space. Marks are placed on the side opposite the stem
 * (below the head for a stem-up note, above it for stem-down) and stack outward
 * from the notehead in engraving order: length mark closest, then accent, then
 * the Schoenberg stress mark outermost.
 *
 * Returns null when no marks are set, so callers can skip appending / setting
 * overflow.
 */
export const createArticulationMarks = ({
  accent,
  articulation,
  stress,
  stemUp,
  headCx,
  headCy,
}: ArticulationMarksProps): SVGGElement | null => {
  if (!accent && !articulation && !stress) {
    return null;
  }

  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('articulations');

  // +1 places marks below the head (stem-up), -1 above (stem-down).
  const dir = stemUp ? 1 : -1;
  let step = 0;
  const nextY = (): number => {
    const y = headCy + dir * (HEAD_HALF_HEIGHT + MARK_GAP + step * MARK_STEP);
    step++;
    return y;
  };

  // Length family — closest to the notehead. portato / tenuto-staccatissimo are
  // the two legal within-family combinations and stack the dot/wedge nearest
  // the head with the tenuto line just beyond it.
  if (articulation === 'staccato') {
    group.appendChild(createStaccatoDot(headCx, nextY()));
  } else if (articulation === 'staccatissimo') {
    group.appendChild(createStaccatissimoWedge(headCx, nextY(), dir));
  } else if (articulation === 'tenuto') {
    group.appendChild(createTenutoLine(headCx, nextY()));
  } else if (articulation === 'portato') {
    group.appendChild(createStaccatoDot(headCx, nextY()));
    group.appendChild(createTenutoLine(headCx, nextY()));
  } else if (articulation === 'tenuto-staccatissimo') {
    group.appendChild(createStaccatissimoWedge(headCx, nextY(), dir));
    group.appendChild(createTenutoLine(headCx, nextY()));
  }

  // Accent family — outside the length marks.
  if (accent === 'accent') {
    group.appendChild(createAccentMark(headCx, nextY()));
  } else if (accent === 'marcato') {
    group.appendChild(createMarcatoMark(headCx, nextY(), dir));
  }

  // Schoenberg stress — outermost.
  if (stress === 'stressed') {
    group.appendChild(createStressMark(headCx, nextY()));
  } else if (stress === 'unstressed') {
    group.appendChild(createUnstressMark(headCx, nextY()));
  }

  return group;
};

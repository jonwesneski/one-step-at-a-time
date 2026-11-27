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
// Ink clearance (≈2.5px) from the stem anchor (already at the beam surface,
// note.ts#stemBeamJunctionPosition) to the first mark's near edge. Measured
// edge-to-edge since a stem-anchored fermata's dome points back at the beam.
const STEM_ANCHOR_INK_GAP = 48;
// Minimum ink clearance between consecutive stacked marks. Every ordinary
// pair already clears this at MARK_STEP, so it only spreads a pair
// involving the fermata's tall dome.
const MARK_INK_GAP = 40;
// Horizontal offset from the stem's own X for a stem-anchored mark, in the
// same direction the stem already leans away from the notehead center —
// otherwise the mark's own radius/half-width straddles the thin stem line
// itself instead of sitting beside it.
const STEM_ANCHOR_X_OFFSET = 90;

// A mark's ink extent (from its center, stroke included) along the stacking
// axis, on its notehead-facing side and on the side away from the notehead.
type MarkExtent = { towardHead: number; awayFromHead: number };

const symmetricExtent = (half: number): MarkExtent => ({
  towardHead: half,
  awayFromHead: half,
});

const STACCATO_EXTENT = symmetricExtent(22);
const TENUTO_EXTENT = symmetricExtent(12);
const STACCATISSIMO_EXTENT = symmetricExtent(45);
const ACCENT_EXTENT = symmetricExtent(52);
const MARCATO_EXTENT = symmetricExtent(56);
// The dome (radius 100) bulges away from the notehead; only the baseline's
// stroke reaches toward it.
const FERMATA_EXTENT: MarkExtent = { towardHead: 8, awayFromHead: 108 };
const STRESS_EXTENT = symmetricExtent(36);
const UNSTRESS_EXTENT: MarkExtent = { towardHead: 23, awayFromHead: 16 };

export type ArticulationMarksProps = {
  articulation?: ArticulationType | null;
  stress?: StressType | null;
  stemUp: boolean;
  // Notehead center in the 600-unit note coordinate space.
  noteHeadCenterX: number;
  noteHeadCenterY: number;
  // Stem-end anchor (600-unit space) for an inner voice of a double-stemmed
  // beam group, whose marks sit next to the shared beam; null anchors at the
  // notehead.
  stemAnchor?: { x: number; y: number } | null;
  // Times the length mark is drawn across a row (a measured tremolo's
  // repetitions); 1 draws it once.
  repeatCount?: number;
  // A cue note's marks, drawn smaller about their anchor.
  scale?: number;
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

// Ink gap between repeated length marks in one row.
const REPEATED_MARK_GAP = 90;

// A length mark's half-width, for spacing a repeated row.
const STACCATO_HALF_WIDTH = 22;
const STACCATISSIMO_HALF_WIDTH = 26;
// The tenuto line plus its round caps.
const TENUTO_HALF_WIDTH = MARK_HALF_WIDTH + 12;

type MarkRow = {
  extent: MarkExtent;
  // Draws the mark centred at (x, y); `dir` as in createArticulationMarks.
  draw: (x: number, y: number, dir: number) => SVGElement;
  // Length marks repeat across the row; accents, fermatas and stress don't.
  repeats: boolean;
};

// The rows of marks for one articulation and stress, nearest the notehead
// first, with the step between repeated length marks.
function markRows(
  articulation: ArticulationType | null | undefined,
  stress: StressType | null | undefined
): { rows: MarkRow[]; repeatStep: number } {
  const { accent, length } = articulation
    ? decomposeArticulation(articulation)
    : {};
  const rows: MarkRow[] = [];
  const staccato: MarkRow = {
    extent: STACCATO_EXTENT,
    draw: (x, y) => createStaccatoDot(x, y),
    repeats: true,
  };
  const staccatissimo: MarkRow = {
    extent: STACCATISSIMO_EXTENT,
    draw: createStaccatissimoWedge,
    repeats: true,
  };
  const tenuto: MarkRow = {
    extent: TENUTO_EXTENT,
    draw: (x, y) => createTenutoLine(x, y),
    repeats: true,
  };
  let lengthHalfWidth = 0;
  // portato / tenuto-staccatissimo are the two legal within-length
  // combinations and stack the dot/wedge nearest the head with the tenuto
  // line just beyond it; repeated, both rows share the line's spacing so each
  // dot stays under its line. (fermata is handled separately.)
  if (length === 'staccato') {
    rows.push(staccato);
    lengthHalfWidth = STACCATO_HALF_WIDTH;
  } else if (length === 'staccatissimo') {
    rows.push(staccatissimo);
    lengthHalfWidth = STACCATISSIMO_HALF_WIDTH;
  } else if (length === 'tenuto') {
    rows.push(tenuto);
    lengthHalfWidth = TENUTO_HALF_WIDTH;
  } else if (length === 'portato') {
    rows.push(staccato, tenuto);
    lengthHalfWidth = TENUTO_HALF_WIDTH;
  } else if (length === 'tenuto-staccatissimo') {
    rows.push(staccatissimo, tenuto);
    lengthHalfWidth = TENUTO_HALF_WIDTH;
  }

  // Accent — outside the length marks.
  if (accent === 'accent') {
    rows.push({
      extent: ACCENT_EXTENT,
      draw: (x, y) => createAccentMark(x, y),
      repeats: false,
    });
  } else if (accent === 'marcato') {
    rows.push({
      extent: MARCATO_EXTENT,
      draw: createMarcatoMark,
      repeats: false,
    });
  }

  // Fermata — outermost after any accent. Never coexists with a length mark.
  if (length === 'fermata') {
    rows.push({
      extent: FERMATA_EXTENT,
      draw: createFermataSvg,
      repeats: false,
    });
  }

  // Schoenberg stress — outermost of all.
  if (stress === 'stressed') {
    rows.push({
      extent: STRESS_EXTENT,
      draw: (x, y) => createStressMark(x, y),
      repeats: false,
    });
  } else if (stress === 'unstressed') {
    rows.push({
      extent: UNSTRESS_EXTENT,
      draw: createUnstressMark,
      repeats: false,
    });
  }

  return { rows, repeatStep: 2 * lengthHalfWidth + REPEATED_MARK_GAP };
}

// Centre offsets of each row from the notehead centre, notehead-anchored.
function headAnchoredOffsets(rows: readonly MarkRow[]): number[] {
  const offsets: number[] = [];
  let previous: { offset: number; far: number } | null = null;
  for (const { extent } of rows) {
    const offset: number =
      previous === null
        ? HEAD_HALF_HEIGHT + MARK_GAP
        : previous.offset +
          Math.max(MARK_STEP, previous.far + MARK_INK_GAP + extent.towardHead);
    offsets.push(offset);
    previous = { offset, far: extent.awayFromHead };
  }
  return offsets;
}

/**
 * How far (600-unit space) notehead-anchored marks reach from the notehead's
 * centre, on the side opposite the stem; 0 with no marks.
 */
export function articulationStackDepth(
  articulation: ArticulationType | null | undefined,
  stress: StressType | null | undefined,
  scale = 1
): number {
  const { rows } = markRows(articulation, stress);
  if (rows.length === 0) {
    return 0;
  }
  const offsets = headAnchoredOffsets(rows);
  return (
    scale *
    (offsets[offsets.length - 1] + rows[rows.length - 1].extent.awayFromHead)
  );
}

/**
 * Build the articulation marks for one note/chord as an SVG <g> in the note's
 * 600-unit coordinate space. The combined `articulation` value is split into its
 * accent prefix and length/hold token. All marks are placed on the side opposite
 * the stem (below the head for a stem-up note, above it for stem-down), stacking
 * outward: length mark closest, then accent, then a fermata (outermost, since it
 * never coexists with a length mark). The Schoenberg stress mark (a separate
 * attribute) is outermost of all. With `repeatCount` above 1 the length mark is
 * drawn that many times in a row centred on the notehead; the others once.
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
  stemAnchor = null,
  repeatCount = 1,
  scale = 1,
}: ArticulationMarksProps): SVGGElement | null => {
  if (!articulation && !stress) {
    return null;
  }
  const { rows, repeatStep } = markRows(articulation, stress);

  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('articulations');

  // +1 places marks below the head, -1 above: opposite the stem, or on the
  // stem side when stem-anchored. Also orients each glyph toward the
  // notehead.
  const dir = stemAnchor !== null ? (stemUp ? -1 : 1) : stemUp ? 1 : -1;
  // markX follows suit: the stem's own X (already offset from the notehead
  // center, same as the stem line itself), pushed out further by
  // STEM_ANCHOR_X_OFFSET in the same direction so the mark sits beside the
  // stem rather than straddling it.
  const markX =
    stemAnchor !== null
      ? stemAnchor.x + (stemUp ? 1 : -1) * STEM_ANCHOR_X_OFFSET
      : noteHeadCenterX;
  const anchorY = stemAnchor?.y ?? noteHeadCenterY;
  // Marks stack toward free space: away from a notehead anchor, back toward
  // the notehead from a stem anchor. Both come out as stemUp ? 1 : -1.
  const stackDir = stemUp ? 1 : -1;
  // A glyph's notehead-facing side faces the anchor when notehead-anchored,
  // and faces away from it when stem-anchored (stacking runs toward the
  // notehead there).
  const nearSide = (extent: MarkExtent): number =>
    stemAnchor !== null ? extent.awayFromHead : extent.towardHead;
  const farSide = (extent: MarkExtent): number =>
    stemAnchor !== null ? extent.towardHead : extent.awayFromHead;
  // Center offset from the anchor and far-edge extent of the last placed
  // mark; null until the first one.
  let previous: { offset: number; far: number } | null = null;
  const nextY = (extent: MarkExtent): number => {
    let offset: number;
    if (previous === null) {
      offset =
        stemAnchor !== null
          ? STEM_ANCHOR_INK_GAP + nearSide(extent)
          : HEAD_HALF_HEIGHT + MARK_GAP;
    } else {
      offset =
        previous.offset +
        Math.max(MARK_STEP, previous.far + MARK_INK_GAP + nearSide(extent));
    }
    previous = { offset, far: farSide(extent) };
    return anchorY + stackDir * offset;
  };

  // Repetition is notehead-anchored only; a stem-anchored mark stays single.
  const count = stemAnchor === null ? Math.max(1, repeatCount) : 1;
  for (const row of rows) {
    const y = nextY(row.extent);
    const copies = row.repeats ? count : 1;
    for (let i = 0; i < copies; i++) {
      const x = markX + (i - (copies - 1) / 2) * repeatStep;
      group.appendChild(row.draw(x, y, dir));
    }
  }

  if (scale !== 1) {
    group.setAttribute(
      'transform',
      `translate(${markX} ${anchorY}) scale(${scale}) translate(${-markX} ${-anchorY})`
    );
  }
  return group;
};

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
// Ink clearance from the stem-anchor point to the near edge of the first
// (closest) mark, when stem-anchored — a historically-attested alternative
// to notehead-centered placement (common pre-1920, still used for an inner
// double-stemmed voice per the reference engraving material this mirrors),
// so marks nestle at the stem end rather than the fixed, much larger
// MARK_GAP a notehead anchor uses. The anchor point itself (stemAnchor,
// computed by note.ts#stemBeamJunctionPosition) already sits at the visible
// beam surface facing the notehead, so this only needs to be a small,
// clearly-visible margin (≈2.5px) beyond that. Measured edge-to-edge rather
// than to the mark's center, since a stem-anchored fermata's dome points
// back at the beam.
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
  // This note's own real stem-tip position (600-unit space) — set when it's
  // an inner voice of a double-stemmed beam group, so marks anchor at the
  // stem end (next to the shared beam) instead of the notehead, matching
  // the reference engraving material's own placement for that case (see
  // measure.ts#redrawDoubleStemmedBeams). null/undefined = the ordinary
  // notehead-relative default.
  stemAnchor?: { x: number; y: number } | null;
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
  stemAnchor = null,
}: ArticulationMarksProps): SVGGElement | null => {
  if (!articulation && !stress) {
    return null;
  }

  const { accent, length } = articulation
    ? decomposeArticulation(articulation)
    : {};

  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('articulations');

  // +1 places marks below the head (stem-up), -1 above (stem-down) — the
  // ordinary default, opposite the stem. stemAnchor flips this: the stem
  // tip sits on the *stem's own* side, not the opposite one — an
  // inner-voice group anchors its marks there instead (see
  // measure.ts#redrawDoubleStemmedBeams), since the ordinary
  // opposite-of-stem side is occupied by the outer voice's own content. dir
  // still drives each glyph's own internal shape orientation (e.g. a wedge
  // apex pointing toward the notehead) either way, since that's about the
  // mark's position relative to the notehead, not about which direction
  // marks stack away from their anchor.
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
  // Marks always stack from their anchor toward the side that's actually
  // free. For the ordinary notehead anchor that's dir itself (away from the
  // notehead, into the opposite-of-stem territory). For a stem anchor it's
  // the opposite of dir: the anchor already sits at the beam's own visible
  // surface (the far end of the only safe space), so stacking must walk
  // back toward the notehead, into the corridor beside the stem — which
  // numerically always works out to stemUp ? 1 : -1 regardless of anchoring.
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

  // Length family — closest to the notehead. portato / tenuto-staccatissimo are
  // the two legal within-length combinations and stack the dot/wedge nearest the
  // head with the tenuto line just beyond it. (fermata is handled separately.)
  if (length === 'staccato') {
    group.appendChild(createStaccatoDot(markX, nextY(STACCATO_EXTENT)));
  } else if (length === 'staccatissimo') {
    group.appendChild(
      createStaccatissimoWedge(markX, nextY(STACCATISSIMO_EXTENT), dir)
    );
  } else if (length === 'tenuto') {
    group.appendChild(createTenutoLine(markX, nextY(TENUTO_EXTENT)));
  } else if (length === 'portato') {
    group.appendChild(createStaccatoDot(markX, nextY(STACCATO_EXTENT)));
    group.appendChild(createTenutoLine(markX, nextY(TENUTO_EXTENT)));
  } else if (length === 'tenuto-staccatissimo') {
    group.appendChild(
      createStaccatissimoWedge(markX, nextY(STACCATISSIMO_EXTENT), dir)
    );
    group.appendChild(createTenutoLine(markX, nextY(TENUTO_EXTENT)));
  }

  // Accent — outside the length marks.
  if (accent === 'accent') {
    group.appendChild(createAccentMark(markX, nextY(ACCENT_EXTENT)));
  } else if (accent === 'marcato') {
    group.appendChild(createMarcatoMark(markX, nextY(MARCATO_EXTENT), dir));
  }

  // Fermata — opposite the stem like the other marks, outermost (after any
  // accent). Never coexists with a length mark.
  if (length === 'fermata') {
    group.appendChild(createFermataSvg(markX, nextY(FERMATA_EXTENT), dir));
  }

  // Schoenberg stress — outermost on the opposite-stem side.
  if (stress === 'stressed') {
    group.appendChild(createStressMark(markX, nextY(STRESS_EXTENT)));
  } else if (stress === 'unstressed') {
    group.appendChild(createUnstressMark(markX, nextY(UNSTRESS_EXTENT), dir));
  }

  return group;
};

import type {
  AccidentalType,
  ArticulationType,
  Note,
  NoteLetter,
  NoteheadType,
  Octave,
  QuarterTone,
} from '../types/theory';
import {
  ACCIDENTAL_NOTE_GAP,
  GRACE_MAIN_GAP_PX,
  GRACE_MIN_STEM_LENGTH_PX,
  GRACE_NOTE_ADVANCE_PX,
  GRACE_SCALE,
  GRACE_STEM_LENGTH_PX,
  ORNAMENT_SLUR_CLEARANCE_PX,
  ORNAMENT_SLUR_MAX_BULGE_PX,
  STAFF_Y_STEP,
} from '../utils/notationDimensions';
import { accidentalReach, pitchAccidental } from './accidentalRules';
import {
  anchorYClearOfRects,
  bulgeHeightEnclosingRects,
  inflateRect,
  type CurvePoint,
  type CurveSide,
  type ObstacleRect,
} from './connectorPlacementRules';
import { resolveGraceNoteheads } from './noteheadRules';

export type GraceNoteDescriptor = {
  // Diatonic steps from the reference (main) pitch; positive = higher.
  // One step equals STAFF_Y_STEP pixels in every classical yCoordinates map,
  // so grace heads can be placed relative to the main head's pixel center
  // identically in standalone and in-staff rendering.
  relativeStaffSteps: number;
  accidental: AccidentalType | null;
  articulation: ArticulationType | null;
  // Absent = normal.
  notehead?: NoteheadType;
  // How far (px, at grace scale) this grace's head reaches left of the ellipse
  // head's edge. Its accidental, when shown, moves left by this much.
  headLeftOverhangPx?: number;
};

export type GraceLayout = {
  // X center of each grace head, relative to the group's left edge (0).
  headXCenters: number[];
  // Full width of the group including per-grace accidental columns.
  totalWidth: number;
};

export const LETTER_ORDER: NoteLetter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export function diatonicStepsBetween(
  referenceLetter: NoteLetter,
  referenceOctave: Octave,
  letter: NoteLetter,
  octave: Octave
): number {
  return (
    (octave - referenceOctave) * LETTER_ORDER.length +
    (LETTER_ORDER.indexOf(letter) - LETTER_ORDER.indexOf(referenceLetter))
  );
}

// Missing or invalid octave slots (graceOctaves[i] is null, or the array is
// shorter than graceNotes) default to the reference (main element's) octave.
// Missing or invalid articulation slots (graceArticulations[i] is null/absent)
// default to no mark for that grace note.
export function buildGraceNoteDescriptors(
  graceNotes: Note[],
  graceOctaves: (Octave | null)[],
  referenceLetter: NoteLetter,
  referenceOctave: Octave,
  graceArticulations: (ArticulationType | null)[] = [],
  graceNoteheads: readonly (NoteheadType | null)[] | null = null,
  graceQuarterTones: readonly (QuarterTone | null)[] | null = null
): GraceNoteDescriptor[] {
  const noteheads = graceNoteheads
    ? resolveGraceNoteheads(graceNoteheads, graceNotes.length)
    : null;
  return graceNotes.map((graceNote, i) => {
    const letter = graceNote[0] as NoteLetter;
    const octave = graceOctaves[i] ?? referenceOctave;
    return {
      relativeStaffSteps: diatonicStepsBetween(
        referenceLetter,
        referenceOctave,
        letter,
        octave
      ),
      accidental: pitchAccidental(graceNote, graceQuarterTones?.[i]),
      articulation: graceArticulations[i] ?? null,
      ...(noteheads ? { notehead: noteheads[i] } : {}),
    };
  });
}

// Overrides the suffix-derived accidentals with the staff's key-signature
// resolution when one is available for every grace note.
export function applyResolvedGraceAccidentals(
  graceNotes: GraceNoteDescriptor[],
  resolvedAccidentals: (AccidentalType | null)[] | null
): void {
  if (
    resolvedAccidentals === null ||
    resolvedAccidentals.length !== graceNotes.length
  ) {
    return;
  }
  for (let i = 0; i < graceNotes.length; i++) {
    graceNotes[i].accidental = resolvedAccidentals[i];
  }
}

export function applyGraceHeadOverhangs(
  graceNotes: GraceNoteDescriptor[],
  overhangsPx: readonly number[]
): void {
  for (let i = 0; i < graceNotes.length; i++) {
    graceNotes[i].headLeftOverhangPx = overhangsPx[i] ?? 0;
  }
}

// relativeStaffSteps count from the host's nominal pitch but are applied to
// its drawn head. When those differ (a triangle, placed outside the stave),
// this keeps each ornament on its real staff position.
export function rebaseGraceSteps(
  graceNotes: GraceNoteDescriptor[],
  hostStaffY: number,
  hostNominalStaffY: number
): void {
  const offsetSteps = (hostStaffY - hostNominalStaffY) / STAFF_Y_STEP;
  for (const graceNote of graceNotes) {
    graceNote.relativeStaffSteps += offsetSteps;
  }
}

// Width (px) an accidental column adds in front of a grace head, at grace scale.
function graceAccidentalWidth(accidental: AccidentalType): number {
  return GRACE_SCALE * (accidentalReach(accidental) + ACCIDENTAL_NOTE_GAP);
}

// Left-to-right column layout: each grace head advances GRACE_NOTE_ADVANCE_PX,
// plus a scaled accidental column when that grace carries an accidental.
export function computeGraceLayout(
  graceNotes: GraceNoteDescriptor[]
): GraceLayout {
  const headXCenters: number[] = [];
  let runningX = 0;
  for (const graceNote of graceNotes) {
    if (graceNote.accidental !== null) {
      runningX +=
        graceAccidentalWidth(graceNote.accidental) +
        (graceNote.headLeftOverhangPx ?? 0);
    }
    headXCenters.push(runningX + GRACE_NOTE_ADVANCE_PX / 2);
    runningX += GRACE_NOTE_ADVANCE_PX;
  }
  return { headXCenters, totalWidth: runningX };
}

// Staff-space X of the first grace note's head centre, for a grace-dynamic.
// The group's origin is `noteX - leftwardWidth` (leftwardWidth covers the
// group and the main accidental), so only the first grace note's own
// accidental needs adding.
export function computeFirstGraceHeadX(
  noteX: number,
  leftwardWidth: number,
  graceNotes: Note[],
  resolvedAccidentals?: (AccidentalType | null)[] | null,
  headLeftOverhangsPx: readonly number[] = []
): number {
  if (graceNotes.length === 0) {
    return noteX - leftwardWidth;
  }
  const useResolved = hasUsableResolvedAccidentals(
    graceNotes,
    resolvedAccidentals
  );
  const firstAccidental = useResolved
    ? resolvedAccidentals[0]
    : pitchAccidental(graceNotes[0]);
  const firstAccidentalWidth =
    firstAccidental !== null
      ? graceAccidentalWidth(firstAccidental) + (headLeftOverhangsPx[0] ?? 0)
      : 0;
  const firstHeadXCenter = firstAccidentalWidth + GRACE_NOTE_ADVANCE_PX / 2;
  return noteX - leftwardWidth + firstHeadXCenter;
}

// True when resolvedAccidentals is usable (non-null and index-aligned with
// graceNotes) — the same fallback condition applyResolvedGraceAccidentals uses.
function hasUsableResolvedAccidentals(
  graceNotes: Note[],
  resolvedAccidentals: (AccidentalType | null)[] | null | undefined
): resolvedAccidentals is (AccidentalType | null)[] {
  return (
    resolvedAccidentals != null &&
    resolvedAccidentals.length === graceNotes.length
  );
}

// The leftward horizontal footprint (px) the staff must reserve for a grace
// group, in addition to the main element's own accidental footprint. Prefers
// the key-signature-resolved accidentals (which can render a natural even for
// a suffix-less grace note) and falls back to suffix-derived accidentals when
// resolved data isn't available, e.g. standalone (no staff) rendering.
export function computeGraceFootprintWidth(
  graceNotes: Note[] | null,
  resolvedAccidentals?: (AccidentalType | null)[] | null,
  headLeftOverhangsPx: readonly number[] = []
): number {
  if (graceNotes === null || graceNotes.length === 0) {
    return 0;
  }
  const useResolved = hasUsableResolvedAccidentals(
    graceNotes,
    resolvedAccidentals
  );
  let width = GRACE_MAIN_GAP_PX;
  for (let i = 0; i < graceNotes.length; i++) {
    const accidental = useResolved
      ? resolvedAccidentals[i]
      : pitchAccidental(graceNotes[i]);
    if (accidental !== null) {
      width += graceAccidentalWidth(accidental) + (headLeftOverhangsPx[i] ?? 0);
    }
    width += GRACE_NOTE_ADVANCE_PX;
  }
  return width;
}

// Beam-surface Y for each stem of a grace group. The beam line runs through
// the first and last stem tips (head Y minus GRACE_STEM_LENGTH_PX), then is
// raised uniformly so no interior stem falls below the minimum length.
export function computeGraceBeamYs(
  headXs: number[],
  headYs: number[]
): number[] {
  const firstTipY = headYs[0] - GRACE_STEM_LENGTH_PX;
  const lastTipY = headYs[headYs.length - 1] - GRACE_STEM_LENGTH_PX;
  const spanX = headXs[headXs.length - 1] - headXs[0];
  const slope = spanX === 0 ? 0 : (lastTipY - firstTipY) / spanX;

  const lineYs = headXs.map((headX) => firstTipY + (headX - headXs[0]) * slope);

  // Y grows downward: a stem is too short when the beam line sits below
  // (greater than) headY - minimum length.
  let raise = 0;
  for (let i = 0; i < lineYs.length; i++) {
    const lowestAllowedY = headYs[i] - GRACE_MIN_STEM_LENGTH_PX;
    if (lineYs[i] > lowestAllowedY) {
      raise = Math.max(raise, lineYs[i] - lowestAllowedY);
    }
  }

  return lineYs.map((lineY) => lineY - raise);
}

export type OrnamentSlurShape = {
  from: CurvePoint;
  to: CurvePoint;
  bulgeHeight: number;
};

const ORNAMENT_SLUR_LIFT_STEPS = 10;

// What a px of bulge height costs against a px of lift: enough to lift an end
// rather than bow a short slur steeply.
const ORNAMENT_SLUR_BULGE_COST = 0.75;

/**
 * An ornament slur's shape, outside every obstacle between its ends. Its ends
 * stay at their notes unless that would bow it past
 * `ORNAMENT_SLUR_MAX_BULGE_PX`; then they may lift off, and of the shapes that
 * clear, the one that bows and lifts least in all is used.
 */
export function resolveOrnamentSlur(
  from: CurvePoint,
  to: CurvePoint,
  side: CurveSide,
  bulgeHeightFor: (from: CurvePoint, to: CurvePoint) => number,
  obstacles: readonly ObstacleRect[]
): OrnamentSlurShape {
  const padded = obstacles
    .filter((rect) => rect.right >= from.x && rect.left <= to.x)
    .map((rect) => inflateRect(rect, ORNAMENT_SLUR_CLEARANCE_PX));
  const clearOf = (anchor: CurvePoint): CurvePoint => ({
    x: anchor.x,
    y: anchorYClearOfRects(anchor, side, padded, 0),
  });
  const shapeBetween = (
    start: CurvePoint,
    end: CurvePoint
  ): OrnamentSlurShape => {
    const baseHeight = bulgeHeightFor(start, end);
    return {
      from: start,
      to: end,
      bulgeHeight:
        bulgeHeightEnclosingRects(
          start,
          end,
          side,
          baseHeight,
          padded,
          Infinity
        ) ?? baseHeight,
    };
  };

  const start = clearOf(from);
  const end = clearOf(to);
  const grounded = shapeBetween(start, end);
  if (
    grounded.bulgeHeight <=
    Math.max(ORNAMENT_SLUR_MAX_BULGE_PX, bulgeHeightFor(start, end))
  ) {
    return grounded;
  }

  const outermostY =
    side === 'below'
      ? Math.max(...padded.map((rect) => rect.bottom))
      : Math.min(...padded.map((rect) => rect.top));
  const liftsOf = (anchor: CurvePoint): CurvePoint[] => {
    const inside =
      side === 'below' ? anchor.y < outermostY : anchor.y > outermostY;
    const steps = inside ? ORNAMENT_SLUR_LIFT_STEPS : 0;
    return Array.from({ length: steps + 1 }, (_, step) => ({
      x: anchor.x,
      y: anchor.y + ((outermostY - anchor.y) * step) / Math.max(1, steps),
    }));
  };
  const costOf = (shape: OrnamentSlurShape): number =>
    shape.bulgeHeight * ORNAMENT_SLUR_BULGE_COST +
    Math.abs(shape.from.y - start.y) +
    Math.abs(shape.to.y - end.y);
  let best = grounded;
  for (const liftedStart of liftsOf(start)) {
    for (const liftedEnd of liftsOf(end)) {
      const shape = shapeBetween(liftedStart, liftedEnd);
      if (costOf(shape) < costOf(best)) {
        best = shape;
      }
    }
  }
  return best;
}

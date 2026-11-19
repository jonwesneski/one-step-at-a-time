import type { DurationType, TremoloValue } from '../types/theory';
import {
  BASE_STEM_LENGTH_PX,
  BEAM_STEP_PX,
  BEAM_THICKNESS_PX,
  FLAG_STEM_STEP_PX,
  STAFF_BOTTOM_LINE_Y,
  STAFF_LINE_SPACING,
  STAFF_TOP_LINE_Y,
  TREMOLO_STEM_OVERSHOOT_PX,
  TREMOLO_STROKE_END_CLEARANCE_PX,
  TREMOLO_STROKE_HEAD_CLEARANCE_PX,
  TREMOLO_STROKE_RISE_PX,
  TREMOLO_STROKE_STEP_PX,
  TREMOLO_STROKE_THICKNESS_PX,
  TREMOLO_TAIL_ROOM_PX,
} from '../utils/notationDimensions';
import {
  durationToBase,
  durationToFlagCountMap,
  isStemlessDuration,
} from './theoryConsts';

// Every Y here is in the note Y-coordinate map: stave lines at
// STAFF_TOP_LINE_Y…STAFF_BOTTOM_LINE_Y, y growing downward.

const EPSILON = 1e-6;
// The shortest value a stroke can stand for is a 128th: five beams.
const MAX_BEAMS = 5;
// Unmeasured tremolo is three beams' worth: strokes plus the note's own tails.
const UNMEASURED_BEAMS = 3;

export type StaffBand = { topLineY: number; bottomLineY: number };

export const STAFF_BAND: StaffBand = {
  topLineY: STAFF_TOP_LINE_Y,
  bottomLineY: STAFF_BOTTOM_LINE_Y,
};

export type StemEnding =
  | { kind: 'plain' }
  | { kind: 'tail'; flagCount: number }
  | { kind: 'beam'; beamCount: number };

function flagCountOf(duration: DurationType): number {
  return durationToFlagCountMap.get(durationToBase[duration]) ?? 0;
}

/** Strokes drawn for a `tremolo` value on a note of this duration. */
export function resolveStrokeCount(
  value: TremoloValue,
  duration: DurationType
): number {
  if (value === 'unmeasured') {
    return Math.max(1, UNMEASURED_BEAMS - flagCountOf(duration));
  }
  return value;
}

/** Warning text when the strokes plus the note's own tails exceed a 128th. */
export function tremoloStrokeCountWarning(
  value: TremoloValue,
  duration: DurationType
): string | null {
  const beams = resolveStrokeCount(value, duration) + flagCountOf(duration);
  return beams > MAX_BEAMS
    ? `tremolo="${value}" on a ${duration} stands for ${beams} beams; no note value is shorter than a 128th (5 beams)`
    : null;
}

/** What the stem carries past its strokes. */
export function stemEndingFor(
  duration: DurationType,
  beamed: boolean
): StemEnding {
  const flagCount = flagCountOf(duration);
  if (flagCount === 0) {
    return { kind: 'plain' };
  }
  return beamed
    ? { kind: 'beam', beamCount: flagCount }
    : { kind: 'tail', flagCount };
}

// Stem length (px) taken past the outermost stroke. Tails are counted in the
// stem's base length: the note SVG adds a step per tail past the second on
// its own, so only the second tail's step counts here.
function stemEndRoomPx(ending: StemEnding): number {
  switch (ending.kind) {
    case 'plain':
      return TREMOLO_STEM_OVERSHOOT_PX;
    case 'tail':
      return (
        TREMOLO_TAIL_ROOM_PX + (ending.flagCount >= 2 ? FLAG_STEM_STEP_PX : 0)
      );
    case 'beam':
      return (
        TREMOLO_STROKE_END_CLEARANCE_PX +
        BEAM_THICKNESS_PX +
        (ending.beamCount - 1) * BEAM_STEP_PX
      );
  }
}

export type StrokePlacementInput = {
  /** The head nearest the stem's open end (stemless: the stroke-bearing head). */
  headY: number;
  /** Notional direction for a stemless head: strokes go on the stem side. */
  stemUp: boolean;
  strokeCount: number;
  /** Null standalone: no stave lines to centre on or stay within. */
  staff: StaffBand | null;
  /**
   * Base-length stem (px) from headY: to the tip for a plain or tailed stem,
   * to the beam's outer edge for a beamed one. Null for a stemless head.
   */
  stemLengthPx: number | null;
  ending: StemEnding;
  /**
   * True while the staff is still sizing the stem; false once it is drawn, so
   * strokes stay on the stem as it is.
   */
  canLengthenStem: boolean;
};

export type StrokePlacement = {
  /** Stroke centres, nearest the head first. */
  centerYs: number[];
  /** Shortest base-length stem (px) that carries the strokes; 0 when stemless. */
  stemFloorPx: number;
};

/**
 * Where the strokes go, and how long the stem must be to carry them. Strokes
 * sit near the stem's end, the stem extending a little past the outermost
 * one (or a tail's root or the beams clearing it), and two or more keep a
 * space from the head's centre; when they can't, the stem lengthens. Inside
 * a staff they stay within the stave, and one stroke (or the middle of two)
 * centres on a stave line. A stemless head takes them on its notional stem
 * side.
 */
export function resolveStrokePlacement(
  input: StrokePlacementInput
): StrokePlacement {
  const {
    headY,
    stemUp,
    strokeCount,
    staff,
    stemLengthPx,
    ending,
    canLengthenStem,
  } = input;
  if (strokeCount <= 0) {
    return { centerYs: [], stemFloorPx: 0 };
  }
  // Distances below are measured from the head along the stem, outward.
  const outward = stemUp ? -1 : 1;
  const halfHeight = (TREMOLO_STROKE_THICKNESS_PX + TREMOLO_STROKE_RISE_PX) / 2;
  const stackSpan = (strokeCount - 1) * TREMOLO_STROKE_STEP_PX;
  const nearest =
    strokeCount === 1
      ? TREMOLO_STROKE_HEAD_CLEARANCE_PX
      : TREMOLO_STROKE_HEAD_CLEARANCE_PX + halfHeight;
  const stemmed = stemLengthPx !== null;
  const endRoom = stemmed ? stemEndRoomPx(ending) : 0;
  const atStemEnd = stemmed
    ? stemLengthPx - endRoom - halfHeight - stackSpan
    : nearest;
  const farthest = stemmed && !canLengthenStem ? atStemEnd : Infinity;

  let rangeLow = nearest;
  let rangeHigh = farthest;
  if (staff !== null) {
    const toTop = outward * (staff.topLineY - headY);
    const toBottom = outward * (staff.bottomLineY - headY);
    const staveLow = Math.min(toTop, toBottom);
    const staveHigh = Math.max(toTop, toBottom) - stackSpan;
    const low = Math.max(rangeLow, staveLow);
    const high = Math.min(rangeHigh, staveHigh);
    if (low <= high + EPSILON) {
      rangeLow = low;
      rangeHigh = high;
    }
  }

  let first: number;
  if (rangeLow > rangeHigh + EPSILON) {
    // A drawn stem too short for its strokes: keep them on it.
    first = rangeHigh;
  } else {
    first = Math.min(Math.max(atStemEnd, rangeLow), rangeHigh);
    if (staff !== null && strokeCount <= 2) {
      first = centreOnStaveLine(first, {
        headY,
        outward,
        staff,
        offset: strokeCount === 1 ? 0 : TREMOLO_STROKE_STEP_PX / 2,
        rangeLow,
        rangeHigh,
      });
    }
  }

  const centerYs = Array.from(
    { length: strokeCount },
    (_, i) => headY + outward * (first + i * TREMOLO_STROKE_STEP_PX)
  );
  return {
    centerYs,
    stemFloorPx: stemmed ? first + stackSpan + halfHeight + endRoom : 0,
  };
}

// Moves the first stroke so one stroke, or the middle of two, sits on the
// nearest stave line in range; ties go toward the head.
function centreOnStaveLine(
  first: number,
  options: {
    headY: number;
    outward: number;
    staff: StaffBand;
    offset: number;
    rangeLow: number;
    rangeHigh: number;
  }
): number {
  const { headY, outward, staff, offset, rangeLow, rangeHigh } = options;
  let best: number | null = null;
  for (
    let lineY = staff.topLineY;
    lineY <= staff.bottomLineY + EPSILON;
    lineY += STAFF_LINE_SPACING
  ) {
    const candidate = outward * (lineY - headY) - offset;
    if (candidate < rangeLow - EPSILON || candidate > rangeHigh + EPSILON) {
      continue;
    }
    const distance = Math.abs(candidate - first);
    const bestDistance = best === null ? Infinity : Math.abs(best - first);
    if (
      distance < bestDistance - EPSILON ||
      (Math.abs(distance - bestDistance) <= EPSILON &&
        best !== null &&
        candidate < best)
    ) {
      best = candidate;
    }
  }
  return best ?? first;
}

/**
 * Shortest base-length stem (px) from the head nearest the open end that
 * carries this many strokes; 0 when there are none or the head is stemless.
 */
export function tremoloStemFloorPx(
  input: Omit<StrokePlacementInput, 'canLengthenStem'>
): number {
  return resolveStrokePlacement({ ...input, canLengthenStem: true })
    .stemFloorPx;
}

/**
 * An unbeamed stem extension (px, from the head nearest the open end)
 * lengthened as far as its tremolo strokes need.
 */
export function unbeamedTremoloStemExtensionPx(input: {
  tremolo: TremoloValue | null;
  duration: DurationType;
  headYs: readonly number[];
  stemUp: boolean;
  staff: StaffBand | null;
  stemExtensionPx: number;
}): number {
  const { tremolo, duration, headYs, stemUp, staff, stemExtensionPx } = input;
  if (tremolo === null || headYs.length === 0 || isStemlessDuration(duration)) {
    return stemExtensionPx;
  }
  const floor = tremoloStemFloorPx({
    headY: stemUp ? Math.min(...headYs) : Math.max(...headYs),
    stemUp,
    strokeCount: resolveStrokeCount(tremolo, duration),
    staff,
    stemLengthPx: BASE_STEM_LENGTH_PX + stemExtensionPx,
    ending: stemEndingFor(duration, false),
  });
  return Math.max(stemExtensionPx, floor - BASE_STEM_LENGTH_PX);
}

/**
 * Shortest stem (px, head nearest the beam to the beam's outer edge) a beamed
 * note with tremolo strokes takes, or undefined without strokes.
 */
export function beamedTremoloMinimumStemPx(input: {
  tremolo: TremoloValue | null;
  duration: DurationType;
  nearestHeadY: number;
  stemUp: boolean;
}): number | undefined {
  const { tremolo, duration, nearestHeadY, stemUp } = input;
  if (tremolo === null) {
    return undefined;
  }
  const ending = stemEndingFor(duration, true);
  const beamCount = ending.kind === 'beam' ? ending.beamCount : 1;
  return tremoloStemFloorPx({
    headY: nearestHeadY,
    stemUp,
    strokeCount: resolveStrokeCount(tremolo, duration),
    staff: STAFF_BAND,
    stemLengthPx:
      BASE_STEM_LENGTH_PX + Math.max(0, beamCount - 2) * BEAM_STEP_PX,
    ending,
  });
}

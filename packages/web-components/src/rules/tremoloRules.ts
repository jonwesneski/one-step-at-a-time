import type {
  ArticulationType,
  DurationType,
  TremoloValue,
} from '../types/theory';
import {
  BASE_STEM_LENGTH_PX,
  BEAM_STEP_PX,
  BEAM_THICKNESS_PX,
  FLAG_STEM_STEP_PX,
  STAFF_BOTTOM_LINE_Y,
  STAFF_LINE_SPACING,
  STAFF_TOP_LINE_Y,
  TREMOLO_NUMERAL_GAP_PX,
  TREMOLO_STEM_OVERSHOOT_PX,
  TREMOLO_STROKE_END_CLEARANCE_PX,
  TREMOLO_STROKE_HEAD_CLEARANCE_PX,
  TREMOLO_STROKE_RISE_PX,
  TREMOLO_STROKE_STEP_PX,
  TREMOLO_STROKE_THICKNESS_PX,
  TREMOLO_TAIL_ROOM_PX,
  TUPLET_NUMERAL_FONT_SIZE,
} from '../utils/notationDimensions';
import {
  durationToBase,
  durationToFactor,
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

/**
 * The tuplet numeral a tremolo draws, or null when there is none to draw: a
 * numeral needs a measured stroke count.
 */
export function drawnTremoloTuplet(
  tremolo: TremoloValue | null,
  tuplet: number | null
): number | null {
  return tuplet !== null && tremolo !== null && tremolo !== 'unmeasured'
    ? tuplet
    : null;
}

/** Warning text for a `tremolo-tuplet` that has no measured strokes to number. */
export function tremoloTupletWarning(
  tremolo: TremoloValue | null,
  tuplet: number | null
): string | null {
  if (tuplet === null || drawnTremoloTuplet(tremolo, tuplet) !== null) {
    return null;
  }
  return `tremolo-tuplet="${tuplet}" needs a tremolo stroke count (1–4); drawing no numeral`;
}

/** Half the vertical extent (px) of one slanted stroke. */
export const TREMOLO_STROKE_HALF_HEIGHT_PX =
  (TREMOLO_STROKE_THICKNESS_PX + TREMOLO_STROKE_RISE_PX) / 2;

/** Height (px) a tremolo tuplet numeral adds past the stem's end. */
export const TREMOLO_NUMERAL_EXTENT_PX =
  TREMOLO_NUMERAL_GAP_PX + TUPLET_NUMERAL_FONT_SIZE;

/**
 * How many notes a measured tremolo stands for: its numeral when it has one,
 * otherwise the written value over the repeated one (each stroke and tail
 * halves it).
 */
export function repetitionCount(
  duration: DurationType,
  strokes: number,
  tuplet: number | null
): number {
  if (tuplet !== null) {
    return tuplet;
  }
  return Math.round(
    durationToFactor[duration] * 2 ** (2 + flagCountOf(duration) + strokes)
  );
}

const REPEATABLE_LENGTHS = new Set([
  'staccato',
  'staccatissimo',
  'tenuto',
  'portato',
  'tenuto-staccatissimo',
]);

/**
 * How many times the articulation's length mark is drawn: once per
 * repetition with `articulation-repeat` on a measured tremolo, otherwise
 * once.
 */
export function articulationRepeatCount(input: {
  articulationRepeat: boolean;
  articulation: ArticulationType | null;
  tremolo: TremoloValue | null;
  tuplet: number | null;
  duration: DurationType;
}): number {
  const { articulationRepeat, articulation, tremolo, tuplet, duration } = input;
  if (
    !articulationRepeat ||
    articulationRepeatWarning(articulation, tremolo) !== null ||
    tremolo === null ||
    tremolo === 'unmeasured'
  ) {
    return 1;
  }
  return repetitionCount(
    duration,
    resolveStrokeCount(tremolo, duration),
    drawnTremoloTuplet(tremolo, tuplet)
  );
}

/** Warning text when `articulation-repeat` has nothing to repeat. */
export function articulationRepeatWarning(
  articulation: ArticulationType | null,
  tremolo: TremoloValue | null
): string | null {
  if (tremolo === null || tremolo === 'unmeasured') {
    return 'articulation-repeat needs a tremolo stroke count (1–4); drawing the articulation once';
  }
  const length = articulation?.replace(/^(accent|marcato)-?/, '') ?? '';
  if (!REPEATABLE_LENGTHS.has(length)) {
    return `articulation-repeat repeats a staccato, staccatissimo, tenuto, portato or tenuto-staccatissimo mark; articulation="${
      articulation ?? ''
    }" has none`;
  }
  return null;
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
  const halfHeight = TREMOLO_STROKE_HALF_HEIGHT_PX;
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

const CHECKS_BY_ATTRIBUTE: Record<
  string,
  readonly ('strokes' | 'tuplet' | 'repeat')[]
> = {
  tremolo: ['strokes', 'tuplet', 'repeat'],
  duration: ['strokes'],
  'tremolo-tuplet': ['tuplet'],
  articulation: ['repeat'],
  'articulation-repeat': ['repeat'],
};

/**
 * Warnings for tremolo attributes that don't fit together, limited to the
 * checks the `changed` attribute affects (all of them when null).
 */
export function tremoloConsistencyWarnings(input: {
  changed: string | null;
  tremolo: TremoloValue | null;
  tuplet: number | null;
  articulationRepeat: boolean;
  articulation: ArticulationType | null;
  duration: DurationType;
}): string[] {
  const { changed, tremolo, tuplet, articulationRepeat, articulation } = input;
  const checks =
    changed === null
      ? ['strokes', 'tuplet', 'repeat']
      : CHECKS_BY_ATTRIBUTE[changed] ?? [];
  const warnings: (string | null)[] = [];
  if (checks.includes('strokes') && tremolo !== null) {
    warnings.push(tremoloStrokeCountWarning(tremolo, input.duration));
  }
  if (checks.includes('tuplet')) {
    warnings.push(tremoloTupletWarning(tremolo, tuplet));
  }
  if (checks.includes('repeat') && articulationRepeat) {
    warnings.push(articulationRepeatWarning(articulation, tremolo));
  }
  return warnings.filter((warning): warning is string => warning !== null);
}

type TremoloInkInput = {
  tremolo: TremoloValue | null;
  tuplet: number | null;
  duration: DurationType;
  /** The head nearest the stem's open end. */
  headY: number;
  stemUp: boolean;
};

/**
 * How far (px) a stemless head's strokes, and their numeral, reach from the
 * head's centre on its notional stem side; 0 without a tremolo.
 */
export function stemlessTremoloReachPx(input: TremoloInkInput): number {
  const { tremolo, tuplet, duration, headY, stemUp } = input;
  if (tremolo === null) {
    return 0;
  }
  const { centerYs } = resolveStrokePlacement({
    headY,
    stemUp,
    strokeCount: resolveStrokeCount(tremolo, duration),
    staff: STAFF_BAND,
    stemLengthPx: null,
    ending: { kind: 'plain' },
    canLengthenStem: true,
  });
  const numeral =
    drawnTremoloTuplet(tremolo, tuplet) !== null
      ? TREMOLO_NUMERAL_EXTENT_PX
      : 0;
  return (
    Math.abs(centerYs[centerYs.length - 1] - headY) +
    TREMOLO_STROKE_HALF_HEIGHT_PX +
    numeral
  );
}

/**
 * How far (px) a tremolo reaches past the end of its stem on the stem side:
 * the numeral beyond a drawn stem, or a stemless head's strokes and numeral
 * past where a base-length stem would end.
 */
export function tremoloInkPastStemPx(input: TremoloInkInput): number {
  if (input.tremolo === null) {
    return 0;
  }
  if (isStemlessDuration(input.duration)) {
    return Math.max(0, stemlessTremoloReachPx(input) - BASE_STEM_LENGTH_PX);
  }
  return drawnTremoloTuplet(input.tremolo, input.tuplet) !== null
    ? TREMOLO_NUMERAL_EXTENT_PX
    : 0;
}

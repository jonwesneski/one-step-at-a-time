import type {
  ArticulationType,
  DurationType,
  StemMark,
  TremoloBeamAttach,
  TremoloLabel,
  TremoloValue,
} from '../types/theory';
import { FLUTTER_TONGUE_LABELS, ORDINARY_LABELS } from '../utils/consts';
import {
  BASE_STEM_LENGTH_PX,
  BEAM_STEP_PX,
  BEAM_THICKNESS_PX,
  FLAG_STEM_STEP_PX,
  MAX_BEAM_SLOPE_SHORT_GROUP_PX,
  STAFF_BOTTOM_LINE_Y,
  STAFF_LINE_SPACING,
  STAFF_TOP_LINE_Y,
  STAFF_Y_STEP,
  STEM_CROSS_END_INSET_PX,
  STEM_CROSS_HEAD_GAP_PX,
  STEM_CROSS_SIZE_PX,
  STEM_CROSS_STROKE_GAP_PX,
  STEM_MULTIPHONIC_HEIGHT_PX,
  TREMOLO_BEAM_MAX_LENGTH_PX,
  TREMOLO_BEAM_MIN_LENGTH_PX,
  TREMOLO_BEAM_STEM_GAP_PX,
  TREMOLO_BETWEEN_MIN_INTERVAL_PX,
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
import { resolveBeamPlacement } from './beamPlacementRules';
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
// The longest row of repeated articulation marks drawn; longer rows draw once.
export const MAX_ARTICULATION_REPEATS = 32;

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

type ArticulationRepeatInput = {
  articulationRepeat: boolean;
  articulation: ArticulationType | null;
  tremolo: TremoloValue | null;
  tuplet: number | null;
  duration: DurationType;
};

function requestedRepeatCount(input: ArticulationRepeatInput): number {
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

/**
 * How many times the articulation's length mark is drawn: once per
 * repetition with `articulation-repeat` on a measured tremolo, otherwise
 * once. A row longer than `MAX_ARTICULATION_REPEATS` draws once.
 */
export function articulationRepeatCount(
  input: ArticulationRepeatInput
): number {
  const count = requestedRepeatCount(input);
  return count > MAX_ARTICULATION_REPEATS ? 1 : count;
}

/** Warning text when `articulation-repeat` asks for too long a row. */
export function articulationRepeatCountWarning(
  input: ArticulationRepeatInput
): string | null {
  const count = requestedRepeatCount(input);
  return count > MAX_ARTICULATION_REPEATS
    ? `articulation-repeat stands for ${count} repetitions; more than ${MAX_ARTICULATION_REPEATS} can't be written out, drawing the articulation once`
    : null;
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

/**
 * Warning text when a flutter-tongue label has no single-note tremolo under
 * it, or an `ord.` / `nat.` / `norm.` label sits on a tremolo note.
 */
export function flutterLabelConsistencyWarning(
  label: TremoloLabel | null,
  tremolo: TremoloValue | null,
  inTremoloGroup: boolean
): string | null {
  if (label === null) {
    return null;
  }
  if (
    FLUTTER_TONGUE_LABELS.includes(label) &&
    (tremolo === null || inTremoloGroup)
  ) {
    return `tremolo-label="${label}": flutter-tonguing is written as a single-note tremolo`;
  }
  if (ORDINARY_LABELS.includes(label) && tremolo !== null) {
    return `tremolo-label="${label}" marks the ordinary note; remove the tremolo`;
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
  /** A `stem-mark` on the stem, between the strokes and the head. */
  stemMark?: StemMark | null;
};

export type StrokePlacement = {
  /** Stroke centres, nearest the head first. */
  centerYs: number[];
  /** Shortest base-length stem (px) that carries the strokes; 0 when stemless. */
  stemFloorPx: number;
  /** The stem mark's centre, or null without one. */
  markCenterY: number | null;
};

/** Half the height (px) of a stem mark's ink along the stem. */
export const stemMarkHalfHeightPx = (mark: StemMark): number =>
  (mark === 'multiphonic' ? STEM_MULTIPHONIC_HEIGHT_PX : STEM_CROSS_SIZE_PX) /
  2;

// How far (px) the mark's centre stays from the head's.
const stemMarkNearestPx = (mark: StemMark): number =>
  STAFF_Y_STEP + STEM_CROSS_HEAD_GAP_PX + stemMarkHalfHeightPx(mark);

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
  const mark = input.stemMark ?? null;
  if (mark === null) {
    return { ...placeStrokes(input, 0), markCenterY: null };
  }
  const { headY, stemUp, strokeCount, stemLengthPx, ending, canLengthenStem } =
    input;
  const half = stemMarkHalfHeightPx(mark);
  const nearest = stemMarkNearestPx(mark);
  const outward = stemUp ? -1 : 1;
  if (strokeCount > 0) {
    // The strokes keep to the stem's end; the mark stands inside them.
    const strokes = placeStrokes(
      input,
      nearest + half + STEM_CROSS_STROKE_GAP_PX + TREMOLO_STROKE_HALF_HEIGHT_PX
    );
    const first = outward * (strokes.centerYs[0] - headY);
    return {
      ...strokes,
      markCenterY:
        headY +
        outward *
          (first -
            TREMOLO_STROKE_HALF_HEIGHT_PX -
            STEM_CROSS_STROKE_GAP_PX -
            half),
    };
  }
  if (stemLengthPx === null) {
    return {
      centerYs: [],
      stemFloorPx: 0,
      markCenterY: headY + outward * nearest,
    };
  }
  // A plain stem reaches as far past any mark as past a cross centred a
  // space in from its end; a tail's root or the beams are cleared instead.
  const endRoom =
    ending.kind === 'plain'
      ? STEM_CROSS_END_INSET_PX - stemMarkHalfHeightPx('cross')
      : stemEndRoomPx(ending);
  const atStemEnd = stemLengthPx - endRoom - half;
  const center = canLengthenStem ? Math.max(atStemEnd, nearest) : atStemEnd;
  return {
    centerYs: [],
    stemFloorPx: center + half + endRoom,
    markCenterY: headY + outward * center,
  };
}

// The strokes, the first at least `minFirstPx` from the head's centre.
function placeStrokes(
  input: StrokePlacementInput,
  minFirstPx: number
): Omit<StrokePlacement, 'markCenterY'> {
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
  const nearest = Math.max(
    minFirstPx,
    strokeCount === 1
      ? TREMOLO_STROKE_HEAD_CLEARANCE_PX
      : TREMOLO_STROKE_HEAD_CLEARANCE_PX + halfHeight
  );
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
  stemMark?: StemMark | null;
  duration: DurationType;
  headYs: readonly number[];
  stemUp: boolean;
  staff: StaffBand | null;
  stemExtensionPx: number;
}): number {
  const { tremolo, duration, headYs, stemUp, staff, stemExtensionPx } = input;
  const stemMark = input.stemMark ?? null;
  if (
    (tremolo === null && stemMark === null) ||
    headYs.length === 0 ||
    isStemlessDuration(duration)
  ) {
    return stemExtensionPx;
  }
  const floor = tremoloStemFloorPx({
    headY: stemUp ? Math.min(...headYs) : Math.max(...headYs),
    stemUp,
    stemMark,
    strokeCount: tremolo === null ? 0 : resolveStrokeCount(tremolo, duration),
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
  stemMark?: StemMark | null;
  duration: DurationType;
  nearestHeadY: number;
  stemUp: boolean;
}): number | undefined {
  const { tremolo, duration, nearestHeadY, stemUp } = input;
  const stemMark = input.stemMark ?? null;
  if (tremolo === null && stemMark === null) {
    return undefined;
  }
  const ending = stemEndingFor(duration, true);
  const beamCount = ending.kind === 'beam' ? ending.beamCount : 1;
  return tremoloStemFloorPx({
    headY: nearestHeadY,
    stemUp,
    stemMark,
    strokeCount: tremolo === null ? 0 : resolveStrokeCount(tremolo, duration),
    staff: STAFF_BAND,
    stemLengthPx:
      BASE_STEM_LENGTH_PX + Math.max(0, beamCount - 2) * BEAM_STEP_PX,
    ending,
  });
}

const CHECKS_BY_ATTRIBUTE: Record<
  string,
  readonly ('strokes' | 'tuplet' | 'repeat' | 'repeat-count' | 'flutter')[]
> = {
  tremolo: ['strokes', 'tuplet', 'repeat', 'repeat-count', 'flutter'],
  'tremolo-label': ['flutter'],
  duration: ['strokes', 'repeat-count'],
  'tremolo-tuplet': ['tuplet', 'repeat-count'],
  articulation: ['repeat', 'repeat-count'],
  'articulation-repeat': ['repeat', 'repeat-count'],
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
  label: TremoloLabel | null;
  inTremoloGroup: boolean;
}): string[] {
  const { changed, tremolo, tuplet, articulationRepeat, articulation } = input;
  const checks =
    changed === null
      ? ['strokes', 'tuplet', 'repeat', 'repeat-count', 'flutter']
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
  if (checks.includes('repeat-count')) {
    warnings.push(articulationRepeatCountWarning(input));
  }
  if (checks.includes('flutter')) {
    warnings.push(
      flutterLabelConsistencyWarning(input.label, tremolo, input.inTremoloGroup)
    );
  }
  return warnings.filter((warning): warning is string => warning !== null);
}

type TremoloInkInput = {
  tremolo: TremoloValue | null;
  stemMark?: StemMark | null;
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
  const stemMark = input.stemMark ?? null;
  if (tremolo === null && stemMark === null) {
    return 0;
  }
  const { centerYs, markCenterY } = resolveStrokePlacement({
    headY,
    stemUp,
    stemMark,
    strokeCount: tremolo === null ? 0 : resolveStrokeCount(tremolo, duration),
    staff: STAFF_BAND,
    stemLengthPx: null,
    ending: { kind: 'plain' },
    canLengthenStem: true,
  });
  const numeral =
    drawnTremoloTuplet(tremolo, tuplet) !== null
      ? TREMOLO_NUMERAL_EXTENT_PX
      : 0;
  return centerYs.length === 0
    ? Math.abs((markCenterY ?? headY) - headY) +
        (stemMark === null ? 0 : stemMarkHalfHeightPx(stemMark))
    : Math.abs(centerYs[centerYs.length - 1] - headY) +
        TREMOLO_STROKE_HALF_HEIGHT_PX +
        numeral;
}

/**
 * How far (px) a tremolo reaches past the end of its stem on the stem side:
 * the numeral beyond a drawn stem, or a stemless head's strokes and numeral
 * past where a base-length stem would end.
 */
export function tremoloInkPastStemPx(input: TremoloInkInput): number {
  if (isStemlessDuration(input.duration)) {
    return Math.max(0, stemlessTremoloReachPx(input) - BASE_STEM_LENGTH_PX);
  }
  if (input.tremolo === null) {
    return 0;
  }
  return drawnTremoloTuplet(input.tremolo, input.tuplet) !== null
    ? TREMOLO_NUMERAL_EXTENT_PX
    : 0;
}

// ─── Two-note tremolos ────────────────────────────────────────────────────────

/**
 * How many beams a two-note tremolo draws, and how many of them (the outermost)
 * join the stems: a quaver or shorter keeps its own beams attached, a minim
 * attaches per `beam-attach`, and crotchets and semibreves attach none.
 */
export function tremoloBeamCounts(
  duration: DurationType,
  strokes: number,
  beamAttach: TremoloBeamAttach | null
): { attached: number; total: number } {
  if (durationToBase[duration] === 'half') {
    const attached =
      beamAttach === 'all' ? strokes : beamAttach === 'outer' ? 1 : 0;
    return { attached, total: strokes };
  }
  const flagCount = flagCountOf(duration);
  return { attached: flagCount, total: flagCount + strokes };
}

/** True when `beam-attach` applies to a tremolo of this duration (minims). */
export function acceptsBeamAttach(duration: DurationType): boolean {
  return durationToBase[duration] === 'half';
}

/**
 * True when two members' heads are an octave or more apart, so their beams
 * can sit between them.
 */
export function canPlaceTremoloBetween(
  firstHeadYs: readonly number[],
  secondHeadYs: readonly number[]
): boolean {
  const nearest = Math.min(
    ...firstHeadYs.flatMap((a) => secondHeadYs.map((b) => Math.abs(a - b)))
  );
  return nearest >= TREMOLO_BETWEEN_MIN_INTERVAL_PX - EPSILON;
}

/** One tremolo beam: its top edge at each end. */
export type TremoloBeamSegment = {
  x1: number;
  x2: number;
  top1: number;
  top2: number;
};

export type TremoloGroupLayout = {
  beams: TremoloBeamSegment[];
  /** The outermost beam's top edge at each member's stem. */
  primaryTops: number[];
  /** Signed distance from one beam level to the next. */
  levelOffset: number;
};

/**
 * A detached beam is centred on the middle of the group (a lone middle note,
 * or the middle two), stops short of the outer stems and is capped; between
 * stems too close for that, it keeps a minimum length instead.
 */
export function tremoloDetachedSpan(xs: readonly number[]): {
  x1: number;
  x2: number;
} {
  const count = xs.length;
  const first = xs[0];
  const last = xs[count - 1];
  const center =
    count % 2 === 1
      ? xs[(count - 1) / 2]
      : (xs[count / 2 - 1] + xs[count / 2]) / 2;
  const clearOfStems = Math.min(
    center - (first + TREMOLO_BEAM_STEM_GAP_PX),
    last - TREMOLO_BEAM_STEM_GAP_PX - center
  );
  const room = Math.min(center - first, last - center);
  const half = Math.max(
    0,
    Math.min(
      TREMOLO_BEAM_MAX_LENGTH_PX / 2,
      Math.max(clearOfStems, Math.min(TREMOLO_BEAM_MIN_LENGTH_PX / 2, room))
    )
  );
  return { x1: center - half, x2: center + half };
}

/**
 * A two-note (or multi-note) tremolo's beams, in the note Y map: placed as if
 * every beam joined the stems, so they sit where an ordinary beam of that many
 * levels would, with the `attached` outermost ones spanning stem to stem and
 * the rest detached. Stems (or a semibreve's notional ones) reach the outer
 * edge of the outermost beam, enclosing them all.
 */
export function resolveTremoloGroupLayout(input: {
  members: readonly { stemX: number; nearestHeadY: number }[];
  stemUp: boolean;
  attached: number;
  total: number;
  // A cue group's beams.
  scale?: number;
}): TremoloGroupLayout {
  const { members, stemUp, attached, total, scale = 1 } = input;
  const placement = resolveBeamPlacement({
    notes: members.map((member) => ({
      x: member.stemX,
      nearestHeadY: member.nearestHeadY,
      beamCount: total,
    })),
    stemUp,
    scale,
  });
  const xs = members.map((member) => member.stemX);
  const first = xs[0];
  const span = xs[xs.length - 1] - first;
  const topAt = (x: number): number =>
    span === 0 || !Number.isFinite(span)
      ? placement.primaryTopAtFirst
      : placement.primaryTopAtFirst +
        ((placement.primaryTopAtLast - placement.primaryTopAtFirst) *
          (x - first)) /
          span;
  const detached = tremoloDetachedSpan(xs);
  const beams = Array.from({ length: total }, (_, level) => {
    const { x1, x2 } =
      level < attached ? { x1: first, x2: xs[xs.length - 1] } : detached;
    const shift = level * placement.levelOffset;
    return { x1, x2, top1: topAt(x1) + shift, top2: topAt(x2) + shift };
  });
  return {
    beams,
    primaryTops: xs.map(topAt),
    levelOffset: placement.levelOffset,
  };
}

/**
 * Beams between two noteheads an octave or more apart: centred on the line
 * between the heads' centres, sloping with it no more than an ordinary short
 * beam, and spanning the gap between the heads, capped and centred.
 */
export function resolveBetweenTremoloBeams(input: {
  from: { edgeX: number; centerY: number };
  to: { edgeX: number; centerY: number };
  strokes: number;
  scale?: number;
}): TremoloBeamSegment[] {
  const { from, to, strokes, scale = 1 } = input;
  const { x1, x2 } = tremoloDetachedSpan([from.edgeX, to.edgeX]);
  const run = to.edgeX - from.edgeX;
  const slope = run === 0 ? 0 : (to.centerY - from.centerY) / run;
  const middleY = from.centerY + slope * ((x1 + x2) / 2 - from.edgeX);
  const halfRise = Math.max(
    -MAX_BEAM_SLOPE_SHORT_GROUP_PX / 2,
    Math.min(MAX_BEAM_SLOPE_SHORT_GROUP_PX / 2, (slope * (x2 - x1)) / 2)
  );
  const stackHeight =
    scale * (BEAM_THICKNESS_PX + (strokes - 1) * BEAM_STEP_PX);
  return Array.from({ length: strokes }, (_, level) => {
    const top = middleY - stackHeight / 2 + level * scale * BEAM_STEP_PX;
    return {
      x1,
      x2,
      top1: top - halfRise,
      top2: top + halfRise,
    };
  });
}

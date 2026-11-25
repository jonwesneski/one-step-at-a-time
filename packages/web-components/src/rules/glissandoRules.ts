import type { ConnectorRole } from '../types/elements';
import type {
  AccidentalType,
  BendShape,
  ConventionalAccidentalType,
  GlissandoShape,
  Note,
  NoteLetter,
  Octave,
  QuarterTone,
} from '../types/theory';
import {
  BEND_BARLINE_GAP_PX,
  BEND_FREE_MAX_TRAVEL_PX,
  BEND_FREE_SLOPE,
  BEND_FREE_TRAVEL_PX,
  BEND_SAME_POSITION_TILT_PX,
  BEND_TARGET_GAP_PX,
  BEND_TARGET_PARENTHESIS_HALF_HEIGHT_PX,
  GLISSANDO_DIP_WIDTH_PX,
  GLISSANDO_GAP_PX,
  GLISSANDO_INK_CLEARANCE_PX,
  GLISSANDO_LEVEL_LIFT_PX,
  GLISSANDO_MIN_DRAWN_PX,
  GLISSANDO_MIN_GAP_PX,
  GLISSANDO_MIN_LENGTH_PX,
  GLISSANDO_OFF_LINE_PX,
  GLISSANDO_WAVE_AMPLITUDE_PX,
  GLISSANDO_WAVELENGTH_PX,
  STAFF_LINE_SPACING,
  STAFF_Y_STEP,
} from '../utils/notationDimensions';
import {
  baseAccidental,
  pitchAccidental,
  quarterToneOf,
} from './accidentalRules';
import { isOnStaffLine } from './augmentationDotRules';
import { diatonicStepsBetween } from './graceRules';
import { noteSemitoneMap } from './theoryConsts';

export type LinePoint = { x: number; y: number };

export type GlissandoHeights = {
  /** The heads' centres. */
  startHeadY: number;
  endHeadY: number;
  /** The start note's dot, or null with none. */
  startDotY: number | null;
  startOnLine: boolean;
  endOnLine: boolean;
  shape: GlissandoShape;
};

/**
 * The heights a glissando line starts and ends at: its heads' centres, and off
 * any stave line the heads sit on so it stays visible. A dotted start is level
 * with the dot.
 */
export function glissandoEndYs({
  startHeadY,
  endHeadY,
  startDotY,
  startOnLine,
  endOnLine,
  shape,
}: GlissandoHeights): { fromY: number; toY: number } {
  const travel = Math.sign(endHeadY - startHeadY);
  const inSpace = shape === 'wave' || travel === 0;
  const fromY = !startOnLine
    ? startHeadY
    : inSpace
    ? startHeadY - GLISSANDO_LEVEL_LIFT_PX
    : startHeadY - travel * GLISSANDO_OFF_LINE_PX;
  const toY = !endOnLine
    ? endHeadY
    : inSpace
    ? endHeadY - GLISSANDO_LEVEL_LIFT_PX
    : endHeadY + travel * GLISSANDO_OFF_LINE_PX;
  return { fromY: startDotY ?? fromY, toY };
}

/**
 * The x-span of a line between two inks, half a space from each. The gaps close
 * up before the line gets too short; null when it would still be.
 */
export function glissandoXSpan(
  startInkRight: number,
  endInkLeft: number
): { fromX: number; toX: number } | null {
  for (const gap of [GLISSANDO_GAP_PX, GLISSANDO_MIN_GAP_PX]) {
    const fromX = startInkRight + gap;
    const toX = endInkLeft - gap;
    if (toX - fromX >= GLISSANDO_MIN_DRAWN_PX) {
      return { fromX, toX };
    }
  }
  return null;
}

export function glissandoEndpoints({
  startInkRight,
  endInkLeft,
  ...heights
}: GlissandoHeights & {
  startInkRight: number;
  endInkLeft: number;
}): { from: LinePoint; to: LinePoint } | null {
  const span = glissandoXSpan(startInkRight, endInkLeft);
  if (span === null) {
    return null;
  }
  const { fromY, toY } = glissandoEndYs(heights);
  return { from: { x: span.fromX, y: fromY }, to: { x: span.toX, y: toY } };
}

/**
 * The height a line broken over two rows breaks at, so both halves keep one
 * slope. Heights are relative to the stave.
 */
export function splitGlissandoAcrossRows({
  fromRelY,
  toRelY,
  firstLength,
  secondLength,
}: {
  fromRelY: number;
  toRelY: number;
  firstLength: number;
  secondLength: number;
}): { breakRelY: number } {
  const total = firstLength + secondLength;
  return {
    breakRelY:
      total <= 0
        ? fromRelY
        : fromRelY + ((toRelY - fromRelY) * firstLength) / total,
  };
}

/** Room (px) a glissando's start keeps after its note's ink. */
export function glissandoReserveWidthPx(): number {
  return GLISSANDO_MIN_LENGTH_PX + 2 * GLISSANDO_GAP_PX;
}

/** A dip's width on a line this long. */
export function glissandoDipWidthPx(length: number): number {
  return Math.min(GLISSANDO_DIP_WIDTH_PX, Math.max(0, length));
}

/** How many half-waves fit a line; never none. */
export function glissandoHalfWaveCount(length: number): number {
  return Math.max(1, Math.round(length / (GLISSANDO_WAVELENGTH_PX / 2)));
}

/** A glissando's shape is read only from the element it starts on. */
export function glissandoShapeWarning({
  shape,
  glissando,
}: {
  shape: GlissandoShape;
  glissando: ConnectorRole | null;
}): string | null {
  if (shape === 'straight' || glissando === 'start') {
    return null;
  }
  return `glissando-shape="${shape}" is set but this element starts no glissando; the shape is read from the glissando's start`;
}

// ─── Pitch bends ───────────────────────────────────────────────────────────────

export type BendTarget = {
  letter: NoteLetter;
  octave: Octave;
  /** The accidental drawn on it. */
  accidental: AccidentalType | null;
  /** Diatonic steps up to it from its note (negative below). */
  steps: number;
};

export type ResolvedBend = { shape: BendShape; target: BendTarget | null };

/** The line a bend draws; `up` and `down` only say which way it runs. */
export const bendLineShape = (shape: BendShape): GlissandoShape =>
  shape === 'dip' || shape === 'wave' ? shape : 'straight';

const QUARTER_TONES_PER_OCTAVE = 24;

const ACCIDENTAL_SEMITONES: Record<ConventionalAccidentalType, number> = {
  sharp: 1,
  flat: -1,
  natural: 0,
  'double-sharp': 2,
  'double-flat': -2,
};

function quarterTonePosition(
  letter: NoteLetter,
  octave: number,
  accidental: AccidentalType | null
): number {
  // noteSemitoneMap counts from A; octaves count from C.
  const semitone = ((noteSemitoneMap.get(letter) ?? 0) + 9) % 12;
  const spelled = accidental ?? 'natural';
  const arrow = quarterToneOf(spelled);
  return (
    octave * QUARTER_TONES_PER_OCTAVE +
    2 * (semitone + ACCIDENTAL_SEMITONES[baseAccidental(spelled)]) +
    (arrow === 'up' ? 1 : arrow === 'down' ? -1 : 0)
  );
}

type BendPitches = {
  bend: BendShape | null;
  bendTo: Note;
  bendToQuarterTone: QuarterTone | null;
  note: Note;
  octave: Octave;
  quarterTone: QuarterTone | null;
};

// The target in the octave nearest the note, and how far above it, in
// quarter-tones. A tritone either way goes the way `bend` says, else up.
function nearestBendTarget({
  bend,
  bendTo,
  bendToQuarterTone,
  note,
  octave,
  quarterTone,
}: BendPitches): { octave: Octave; rise: number } {
  const letter = bendTo[0] as NoteLetter;
  const from = quarterTonePosition(
    note[0] as NoteLetter,
    octave,
    pitchAccidental(note, quarterTone)
  );
  const accidental = pitchAccidental(bendTo, bendToQuarterTone);
  return [octave - 1, octave, octave + 1]
    .map((candidate) => ({
      octave: candidate as Octave,
      rise: quarterTonePosition(letter, candidate, accidental) - from,
    }))
    .reduce((nearest, candidate) => {
      const closer = Math.abs(candidate.rise) - Math.abs(nearest.rise);
      return closer < 0 || (closer === 0 && bend !== 'down')
        ? candidate
        : nearest;
    });
}

/** Which way a bend toward a pitch goes; null when it ends where it started. */
export function bendTargetDirection(
  pitches: BendPitches
): 'up' | 'down' | null {
  const { rise } = nearestBendTarget(pitches);
  return rise === 0 ? null : rise > 0 ? 'up' : 'down';
}

/**
 * The bend a note draws from its `bend` and `bend-to`. A target alone makes a
 * straight bend; an `up` or `down` it disagrees with follows the target. A
 * plain target letter takes a natural when the note's own accidental would
 * carry over to it.
 */
export function resolveBend(
  bend: BendShape | null,
  bendTo: Note | null,
  bendToQuarterTone: QuarterTone | null,
  note: Note,
  octave: Octave,
  quarterTone: QuarterTone | null
): ResolvedBend | null {
  if (bendTo === null) {
    return bend === null ? null : { shape: bend, target: null };
  }
  const pitches = {
    bend,
    bendTo,
    bendToQuarterTone,
    note,
    octave,
    quarterTone,
  };
  const letter = bendTo[0] as NoteLetter;
  const noteAccidental = pitchAccidental(note, quarterTone);
  const { octave: targetOctave } = nearestBendTarget(pitches);
  const target: BendTarget = {
    letter,
    octave: targetOctave,
    steps: diatonicStepsBetween(
      note[0] as NoteLetter,
      octave,
      letter,
      targetOctave
    ),
    accidental:
      pitchAccidental(bendTo, bendToQuarterTone) ??
      (letter === note[0] && noteAccidental !== null ? 'natural' : null),
  };
  return {
    shape:
      bend === 'dip' || bend === 'wave'
        ? bend
        : bendTargetDirection(pitches) ?? bend ?? 'up',
    target,
  };
}

/**
 * Room (px) a bend keeps between its note's ink and the next note's; targets
 * stand in it, after the line.
 */
export function bendReserveWidthPx(targetWidth: number): number {
  return (
    GLISSANDO_MIN_LENGTH_PX +
    2 * GLISSANDO_GAP_PX +
    (targetWidth > 0 ? targetWidth + GLISSANDO_GAP_PX : 0)
  );
}

export type BendHead = {
  /** The head's centre, and its dot, or null with none. */
  y: number;
  dotY: number | null;
  /** Null outside a staff, where there are no lines to keep off. */
  staffY: number | null;
  bend: ResolvedBend;
};

const isOnLine = (staffY: number | null): boolean =>
  staffY !== null && isOnStaffLine(staffY);

const targetOffsetY = ({ steps }: BendTarget): number => -steps * STAFF_Y_STEP;

// Whether the space above a head's stave line is free for a level line; a
// neighbouring head's own line may already run there.
function levelLift(head: BendHead, heads: readonly BendHead[]): number {
  const taken = (y: number): boolean =>
    heads.some((other) => other !== head && Math.abs(other.y - y) < 1);
  return taken(head.y - GLISSANDO_LEVEL_LIFT_PX) &&
    !taken(head.y + GLISSANDO_LEVEL_LIFT_PX)
    ? GLISSANDO_LEVEL_LIFT_PX
    : -GLISSANDO_LEVEL_LIFT_PX;
}

// A bend's line starts level with a dot or its head, off any stave line the
// head is on: just off it when sloped, in the space when level or wavy. A
// free straight one moves at least BEND_FREE_TRAVEL_PX, and keeps a slope that
// still reads over a long note.
function bendEndYs(
  head: BendHead,
  heads: readonly BendHead[],
  length: number
): { fromY: number; toY: number } {
  const { shape, target } = head.bend;
  const rise = shape === 'up' ? -1 : shape === 'down' ? 1 : 0;
  const startOnLine = isOnLine(head.staffY);
  if (target !== null && target.steps !== 0) {
    return glissandoEndYs({
      startHeadY: head.y,
      endHeadY: head.y + targetOffsetY(target),
      startDotY: head.dotY,
      startOnLine,
      endOnLine: isOnLine(
        head.staffY === null ? null : head.staffY + targetOffsetY(target)
      ),
      shape: bendLineShape(shape),
    });
  }
  const level = target !== null || rise === 0;
  const offLine = level
    ? levelLift(head, heads)
    : -rise * GLISSANDO_OFF_LINE_PX;
  const fromY = head.dotY ?? head.y + (startOnLine ? offLine : 0);
  const travel =
    target === null
      ? Math.max(
          BEND_FREE_TRAVEL_PX,
          Math.min(BEND_FREE_MAX_TRAVEL_PX, length * BEND_FREE_SLOPE)
        )
      : BEND_SAME_POSITION_TILT_PX;
  return { fromY, toY: fromY + rise * travel };
}

// Targets too close to share a column stand in columns side by side.
function bendTargetColumns(
  targets: readonly { y: number; width: number }[]
): { columnOf: number[]; lefts: number[]; width: number } {
  const columns: { ys: number[]; width: number }[] = [];
  const columnOf = targets.map(() => 0);
  const order = targets.map((_, i) => i).sort((a, b) => targets[a].y - targets[b].y);
  for (const i of order) {
    const { y, width } = targets[i];
    let column = columns.findIndex(({ ys }) =>
      ys.every(
        (other) =>
          Math.abs(other - y) >= 2 * BEND_TARGET_PARENTHESIS_HALF_HEIGHT_PX
      )
    );
    if (column < 0) {
      column = columns.push({ ys: [], width: 0 }) - 1;
    }
    columns[column].ys.push(y);
    columns[column].width = Math.max(columns[column].width, width);
    columnOf[i] = column;
  }
  const lefts: number[] = [];
  let left = 0;
  for (const { width } of columns) {
    lefts.push(left);
    left += width + BEND_TARGET_GAP_PX;
  }
  return {
    columnOf,
    lefts,
    width: columns.length === 0 ? 0 : left - BEND_TARGET_GAP_PX,
  };
}

/** Room (px) the targets of a note's or chord's bends take; 0 with none. */
export function bendTargetsWidthPx(
  heads: readonly Pick<BendHead, 'y' | 'bend'>[],
  targetWidthPx: (accidental: AccidentalType | null) => number
): number {
  return bendTargetColumns(
    heads.flatMap(({ y, bend: { target } }) =>
      target === null
        ? []
        : [
            {
              y: y + targetOffsetY(target),
              width: targetWidthPx(target.accidental),
            },
          ]
    )
  ).width;
}

/** Where a bend stops: before ink, before a barline, or at a set length. */
export type BendLimit =
  | { kind: 'ink'; left: number }
  | { kind: 'barline'; left: number }
  | { kind: 'length'; length: number };

export type BendTargetPlacement = {
  /** Where its left parenthesis begins. */
  leftX: number;
  centerY: number;
  accidental: AccidentalType | null;
  staffY: number | null;
};

export type BendLine = {
  from: LinePoint;
  to: LinePoint;
  shape: GlissandoShape;
  target: BendTargetPlacement | null;
};

export type BendLayout = { lines: BendLine[]; rightX: number };

/**
 * A note's or chord's bends, one line a head, all between the same two x's:
 * from the note's ink to the limit, or to the targets standing before it. Null
 * when there is no room. An up-tail counts as ink only where a line would
 * cross it.
 */
export function layoutBends({
  heads,
  inkRight,
  tail,
  limit,
  targetWidthPx,
}: {
  heads: readonly BendHead[];
  /** The right edge of the heads, dots and trill notes. */
  inkRight: number;
  tail: { right: number; bottomY: number } | null;
  limit: BendLimit;
  targetWidthPx: (accidental: AccidentalType | null) => number;
}): BendLayout | null {
  const targeted = heads.flatMap(({ y, bend: { target } }, i) =>
    target === null
      ? []
      : [
          {
            head: i,
            y: y + targetOffsetY(target),
            width: targetWidthPx(target.accidental),
          },
        ]
  );
  const columns = bendTargetColumns(targeted);
  const targetRoom =
    targeted.length === 0 ? 0 : columns.width + GLISSANDO_GAP_PX;

  // The lines from one x to the limit, or null where they would be too short.
  // The gap before them closes up before that.
  const linesFrom = (startRight: number): BendLine[] | null => {
    const spare =
      limit.kind === 'barline'
        ? limit.left - startRight - bendReserveWidthPx(columns.width)
        : 0;
    const lineEnd =
      limit.kind === 'length'
        ? startRight + GLISSANDO_GAP_PX + limit.length
        : limit.left -
          targetRoom -
          (limit.kind === 'ink'
            ? GLISSANDO_GAP_PX
            : Math.max(
                GLISSANDO_GAP_PX,
                Math.min(BEND_BARLINE_GAP_PX, GLISSANDO_GAP_PX + spare)
              ));
    const fromX = [GLISSANDO_GAP_PX, GLISSANDO_MIN_GAP_PX]
      .map((gap) => startRight + gap)
      .find((x) => lineEnd - x >= GLISSANDO_MIN_DRAWN_PX);
    if (fromX === undefined) {
      return null;
    }
    return heads.map((head, i): BendLine => {
      const { fromY, toY } = bendEndYs(head, heads, lineEnd - fromX);
      const { shape, target } = head.bend;
      const column = targeted.findIndex((candidate) => candidate.head === i);
      return {
        from: { x: fromX, y: fromY },
        to: { x: lineEnd, y: toY },
        shape: bendLineShape(shape),
        target:
          target === null
            ? null
            : {
                leftX:
                  lineEnd +
                  GLISSANDO_GAP_PX +
                  columns.lefts[columns.columnOf[column]],
                centerY: targeted[column].y,
                accidental: target.accidental,
                staffY:
                  head.staffY === null
                    ? null
                    : head.staffY + targetOffsetY(target),
              },
      };
    });
  };

  let lines = linesFrom(inkRight);
  if (
    tail !== null &&
    (lines === null || lines.some((line) => crossesTail(line, tail)))
  ) {
    lines = linesFrom(Math.max(inkRight, tail.right));
  }
  return lines === null
    ? null
    : {
        lines,
        rightX: lines[0].to.x + targetRoom,
      };
}

// A tail hangs from the stem's tip down to bottomY, left of `right`.
function crossesTail(
  { from, to, shape }: BendLine,
  tail: { right: number; bottomY: number }
): boolean {
  const x = Math.min(tail.right, to.x);
  const yAtTail = from.y + ((to.y - from.y) * (x - from.x)) / (to.x - from.x);
  return (
    from.x < tail.right &&
    Math.min(from.y, yAtTail) -
      (shape === 'wave' ? GLISSANDO_WAVE_AMPLITUDE_PX : 0) -
      GLISSANDO_INK_CLEARANCE_PX <
      tail.bottomY
  );
}

/** Each head's own dot among a note's or chord's dot rows. */
export function bendDotYs(
  headYs: readonly number[],
  dotYs: readonly number[]
): (number | null)[] {
  if (headYs.length === dotYs.length) {
    const order = headYs
      .map((y, index) => ({ y, index }))
      .sort((a, b) => a.y - b.y);
    const sorted = [...dotYs].sort((a, b) => a - b);
    const result: (number | null)[] = headYs.map(() => null);
    order.forEach(({ index }, rank) => {
      result[index] = sorted[rank];
    });
    return result;
  }
  return headYs.map((headY) => {
    const near = [...dotYs]
      .filter((dotY) => Math.abs(dotY - headY) < STAFF_LINE_SPACING)
      .sort((a, b) => Math.abs(a - headY) - Math.abs(b - headY) || a - b);
    return near[0] ?? null;
  });
}

/** What keeps a bend from drawing, or draws it otherwise than written. */
export function bendConsistencyWarning({
  bend,
  bendTo,
  glissando,
  isChord,
  inTremoloGroup,
  onTriangle,
  targetDirection,
}: {
  bend: BendShape | null;
  bendTo: Note | null;
  glissando: ConnectorRole | null;
  isChord: boolean;
  inTremoloGroup: boolean;
  onTriangle: boolean;
  /** Which way the target lies; null with none. */
  targetDirection: 'up' | 'down' | null;
}): string | null {
  if (bend === null && bendTo === null) {
    return null;
  }
  const name = bend === null ? 'bend-to' : 'bend';
  if (glissando === 'start') {
    return `${name} is ignored on a glissando="start"; the glissando's line is drawn`;
  }
  if (inTremoloGroup) {
    return `${name} is ignored on a <music-tremolo> member`;
  }
  if (onTriangle) {
    return `${name} is ignored on a triangle notehead, which has no definite pitch to bend`;
  }
  if (isChord && bendTo !== null) {
    return 'bend-to is ignored on a chord; bend draws a line after each head';
  }
  if (
    (bend === 'up' || bend === 'down') &&
    targetDirection !== null &&
    targetDirection !== bend
  ) {
    return `bend="${bend}" disagrees with bend-to="${bendTo}", which lies ${
      targetDirection === 'up' ? 'above' : 'below'
    }; the line follows bend-to`;
  }
  return null;
}

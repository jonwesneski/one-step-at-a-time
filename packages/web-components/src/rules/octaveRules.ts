import type { OctaveDisplayMode, OctaveShiftAmount } from '../types/theory';
import { MUSIC_REST_NODE } from '../utils/consts';

export type OctaveSpanMember = {
  index: number;
  isRest: boolean;
};

export type OctaveSpanCloseReason = 'octave-stop' | 'loco' | 'implicit';

export type OctaveSpan = {
  amount: OctaveShiftAmount;
  mode: OctaveDisplayMode;
  startIndex: number;
  /** Inclusive — the element that closed the span. */
  stopIndex: number;
  /** Every index from startIndex..stopIndex inclusive, in order. */
  members: OctaveSpanMember[];
  closedBy: OctaveSpanCloseReason;
};

type OctaveSpanElement = {
  octaveShift?: OctaveShiftAmount | null;
  octaveMode?: OctaveDisplayMode | null;
  octaveStop?: boolean;
  loco?: boolean;
  nodeName: string;
};

/** `va`/`ma` suffixes raise the written pitch; `vb`/`mb` lower it. */
export function isOctaveRaise(amount: OctaveShiftAmount): boolean {
  return amount.endsWith('a');
}

/**
 * The most extreme staff-Y in a span (topmost for a raise, bottommost for a
 * lower), over every chord tone; null when every member is a rest.
 */
export function resolveOctaveSpanExtremalStaffY(
  span: OctaveSpan,
  raisesPitch: boolean,
  getStaffYsForIndex: (index: number) => number[]
): number | null {
  const ys = span.members.flatMap((m) => getStaffYsForIndex(m.index));
  if (ys.length === 0) {
    return null;
  }
  return raisesPitch ? Math.min(...ys) : Math.max(...ys);
}

/**
 * Resolves octave-transposition spans over a flat element stream with a
 * single forward scan. Restating the open span's amount continues it rather
 * than restarting. A rest only passes through as a member. `loco` wins over
 * `octave-stop` on the same element.
 */
export function resolveOctaveSpans(elements: readonly OctaveSpanElement[]): {
  spans: OctaveSpan[];
  warnings: string[];
  standaloneLocoIndices: number[];
} {
  const spans: OctaveSpan[] = [];
  const warnings: string[] = [];
  const standaloneLocoIndices: number[] = [];
  let open: OctaveSpan | null = null;

  const closeOpenSpanAt = (
    index: number,
    reason: OctaveSpanCloseReason
  ): void => {
    if (open === null) {
      return;
    }
    open.stopIndex = index;
    open.closedBy = reason;
    spans.push(open);
    open = null;
  };

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const shift = element.octaveShift ?? null;
    const openAmount: OctaveShiftAmount | null = open ? open.amount : null;

    if (shift !== null && shift !== openAmount) {
      closeOpenSpanAt(i - 1, 'implicit');
      open = {
        amount: shift,
        mode: element.octaveMode ?? 'sign',
        startIndex: i,
        stopIndex: i,
        members: [],
        closedBy: 'implicit',
      };
    }

    if (open !== null) {
      open.members.push({
        index: i,
        isRest: element.nodeName === MUSIC_REST_NODE,
      });
    }

    if (element.loco) {
      if (open !== null) {
        closeOpenSpanAt(i, 'loco');
      } else {
        standaloneLocoIndices.push(i);
      }
    }

    if (element.octaveStop && open !== null) {
      closeOpenSpanAt(i, 'octave-stop');
    }
  }

  if (open !== null) {
    closeOpenSpanAt(elements.length - 1, 'implicit');
    const unterminated = spans[spans.length - 1];
    warnings.push(
      `[octaveRules] octave-shift span starting at index ${unterminated.startIndex} has no matching octave-stop — closed at the end of the available elements`
    );
  }

  return { spans, warnings, standaloneLocoIndices };
}

/** One measure's own slice `[startIndex, endIndex)` of a staff-track's global, concatenated element array (see `resolveOctaveContinuationSegments`). */
export type OctaveMeasureBoundary = { startIndex: number; endIndex: number };

export type OctaveContinuationSegment = {
  /** Index into the staff-track's own measure list (not a global element index). */
  measureIndex: number;
  /**
   * Local index (within this measure) to draw the corner terminator (and,
   * if the span closed via `loco`, the loco label) at — null means the line
   * runs to this measure's own right edge (the span continues past it).
   */
  stopAtLocalIndex: number | null;
};

const measureIndexOfGlobalIndex = (
  measureBoundaries: readonly OctaveMeasureBoundary[],
  globalIndex: number
): number => {
  for (let m = 0; m < measureBoundaries.length; m++) {
    if (
      globalIndex >= measureBoundaries[m].startIndex &&
      globalIndex < measureBoundaries[m].endIndex
    ) {
      return m;
    }
  }
  return measureBoundaries.length - 1;
};

/**
 * For a span resolved over a staff-track's concatenated elements, the
 * segments needed in measures after the starting one (whose staff draws its
 * own part). Empty when the span stays in its measure.
 */
export function resolveOctaveContinuationSegments(
  measureBoundaries: readonly OctaveMeasureBoundary[],
  span: OctaveSpan
): OctaveContinuationSegment[] {
  const startMeasure = measureIndexOfGlobalIndex(
    measureBoundaries,
    span.startIndex
  );
  const stopMeasure = measureIndexOfGlobalIndex(
    measureBoundaries,
    span.stopIndex
  );

  if (startMeasure === stopMeasure) {
    return [];
  }

  const segments: OctaveContinuationSegment[] = [];
  for (let m = startMeasure + 1; m <= stopMeasure; m++) {
    if (m < stopMeasure) {
      segments.push({ measureIndex: m, stopAtLocalIndex: null });
      continue;
    }
    segments.push({
      measureIndex: m,
      stopAtLocalIndex: span.stopIndex - measureBoundaries[m].startIndex,
    });
  }
  return segments;
}

/**
 * Where a one-hand octave line breaks so it encloses only its own notes of a
 * shared (double-stemmed) beam: a line running over the other hand's notes
 * would read as transposing them too. `spannedBeats` are the beat offsets of
 * the line's own pitched notes in order and `otherHand` the other staff's
 * notes in the beam groups they share, with
 * `transposed` when an octave line of their own covers them. A break goes
 * after `spannedBeats[k]` when an untransposed other-hand note lies strictly
 * between it and the next one. One sounding on the same beat as a spanned
 * note can't be split around (`sharesBeat`), so the caller marks the other
 * staff `loco` instead.
 */
export function resolveCrossStaffOctaveBreaks(
  spannedBeats: readonly number[],
  otherHand: readonly { beat: number; transposed: boolean }[],
  sameBeatTolerance: number
): { breakAfter: number[]; sharesBeat: boolean } {
  const untransposed = otherHand.filter((note) => !note.transposed);
  const breakAfter: number[] = [];
  for (let k = 0; k < spannedBeats.length - 1; k++) {
    if (
      untransposed.some(
        (note) =>
          note.beat > spannedBeats[k] + sameBeatTolerance &&
          note.beat < spannedBeats[k + 1] - sameBeatTolerance
      )
    ) {
      breakAfter.push(k);
    }
  }
  const sharesBeat = untransposed.some((note) =>
    spannedBeats.some((beat) => Math.abs(note.beat - beat) <= sameBeatTolerance)
  );
  return { breakAfter, sharesBeat };
}

/**
 * Splits a span into the runs it is drawn as, breaking after each member
 * index in `breakAfter` and resuming at the next pitched member. Each run is
 * drawn as its own sign, line and corner; only the last keeps the span's own
 * close reason (so a `loco` label follows the last corner only).
 */
export function splitOctaveSpanIntoRuns(
  span: OctaveSpan,
  breakAfter: ReadonlySet<number>
): OctaveSpan[] {
  if (breakAfter.size === 0) {
    return [span];
  }
  const runs: OctaveSpan[] = [];
  let current: OctaveSpanMember[] = [];
  const closeRun = (closedBy: OctaveSpanCloseReason) => {
    const pitched = current.filter((member) => !member.isRest);
    if (pitched.length > 0) {
      runs.push({
        ...span,
        startIndex: pitched[0].index,
        stopIndex: current[current.length - 1].index,
        members: current.slice(current.indexOf(pitched[0])),
        closedBy,
      });
    }
    current = [];
  };
  for (const member of span.members) {
    current.push(member);
    if (breakAfter.has(member.index) && member.index !== span.stopIndex) {
      closeRun('octave-stop');
    }
  }
  closeRun(span.closedBy);
  return runs;
}

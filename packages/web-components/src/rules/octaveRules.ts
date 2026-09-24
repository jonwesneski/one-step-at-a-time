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
 * The real staff-Y of the most extreme pitched member in a span — the
 * topmost (smallest) Y for a raise span, the bottommost (largest) Y for a
 * lower span. A rest member contributes nothing (`getStaffYsForIndex`
 * returns `[]` for one); a chord member contributes every one of its
 * simultaneous pitches, so only that chord's own most-extreme note ends up
 * selected. Returns `null` when the span has no pitched member at all
 * (every member a rest) — callers fall back to a fixed nominal position.
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
 * single forward scan, maintaining "currently open span" state. An
 * `octave-shift` value equal to the currently-open span's own amount is a
 * no-op continuation (not a restart) — an author restating the same value on
 * every note of a phrase out of habit must not fragment the span. A rest
 * never opens, closes, or carries an amount itself; it simply passes through
 * as a member of whatever span is currently open, if any.
 *
 * `loco` takes precedence over `octave-stop` when both are set on the same
 * element: it closes the span first, so the `octave-stop` check that follows
 * sees `open === null` and becomes a no-op rather than double-closing it.
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
 * Given an `OctaveSpan` resolved over a staff-track's global element array
 * (the concatenation of every measure's own note/chord/rest stream, in row
 * order), returns the additional segments needed in measures *after* the one
 * the span started in. Empty when the span never leaves its starting
 * measure — that case is already fully drawn by that measure's own
 * staff-local render pass. Simpler than trill's own
 * `resolveTrillContinuationSegments`: an octave span has no tie chain to
 * walk — `startIndex`/`stopIndex` are already fully resolved by
 * `resolveOctaveSpans`, so this is pure index math over the measure
 * boundaries. Pure; the caller supplies real geometry per segment
 * (`staffClassicalBase.ts` for the starting measure, `composition.ts` for
 * every measure this returns).
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

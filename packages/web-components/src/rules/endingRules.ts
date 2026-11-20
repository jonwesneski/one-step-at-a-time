import type { EndingNumbering, MeasureEndBarline } from '../types/theory';
import {
  ENDING_CONTENT_CLEARANCE_PX,
  ENDING_LABEL_HEIGHT_PX,
  ENDING_LINE_Y_PX,
  ENDING_MIN_ABOVE_STAFF_PX,
} from '../utils/notationDimensions';

export type EndingMeasureInput = {
  ending: readonly number[] | null;
  /** The bar's resolved end barline. */
  endBarline: MeasureEndBarline;
};

/** Consecutive bars with the same `ending`, by measure index. */
export type Ending = {
  numbers: number[];
  firstMeasure: number;
  lastMeasure: number;
  /** Ends on an end repeat or final barline, so the bracket gets a right hook. */
  closed: boolean;
};

/** Endings with no plain bar between them; `id` is the group's order. */
export type EndingGroup = {
  id: number;
  endings: Ending[];
  finalEnding: Ending;
};

/** An ending's numeral label: each pass followed by a full stop ("1.2."). */
export function endingNumeralLabel(numbers: readonly number[]): string {
  return numbers.map((number) => `${number}.`).join('');
}

const sameNumbers = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && a.every((value, i) => value === b[i]);

const barsText = (ending: Ending): string =>
  ending.firstMeasure === ending.lastMeasure
    ? `bar ${ending.firstMeasure + 1}`
    : `bars ${ending.firstMeasure + 1}–${ending.lastMeasure + 1}`;

/**
 * Groups bars into endings (consecutive bars with the same passes, up to an
 * end repeat) and endings into groups. Warns about a non-final
 * ending with no end repeat to return from, a final ending that repeats,
 * passes that repeat or go backwards within a group, and a group with only
 * one ending.
 */
export function resolveEndings(measures: readonly EndingMeasureInput[]): {
  groups: EndingGroup[];
  warnings: string[];
} {
  const groups: EndingGroup[] = [];
  const warnings: string[] = [];
  let current: Ending[] = [];
  const closeGroup = () => {
    if (current.length > 0) {
      groups.push({
        id: groups.length,
        endings: current,
        finalEnding: current[current.length - 1],
      });
    }
    current = [];
  };
  measures.forEach((measure, index) => {
    if (measure.ending === null) {
      closeGroup();
      return;
    }
    const last = current[current.length - 1];
    // An end repeat closes an ending, so the same passes after it start
    // another one.
    if (
      last !== undefined &&
      last.lastMeasure === index - 1 &&
      measures[index - 1].endBarline !== 'repeat-end' &&
      sameNumbers(last.numbers, measure.ending)
    ) {
      last.lastMeasure = index;
      return;
    }
    current.push({
      numbers: [...measure.ending],
      firstMeasure: index,
      lastMeasure: index,
      closed: false,
    });
  });
  closeGroup();

  for (const group of groups) {
    for (const ending of group.endings) {
      const barline = measures[ending.lastMeasure].endBarline;
      ending.closed = barline === 'repeat-end' || barline === 'final';
    }
    if (group.endings.length === 1) {
      warnings.push(
        `ending ${endingNumeralLabel(group.endings[0].numbers)} in ${barsText(
          group.endings[0]
        )} has no other ending to follow it`
      );
    }
    group.endings.forEach((ending, i) => {
      const label = endingNumeralLabel(ending.numbers);
      const barline = measures[ending.lastMeasure].endBarline;
      if (ending !== group.finalEnding && barline !== 'repeat-end') {
        warnings.push(
          `ending ${label} in ${barsText(
            ending
          )} doesn't end with an end repeat, so the performer has nowhere to return from`
        );
      }
      if (ending === group.finalEnding && group.endings.length > 1) {
        if (barline === 'repeat-end') {
          warnings.push(
            `the last ending ${label} in ${barsText(
              ending
            )} ends with an end repeat`
          );
        }
      }
      const previous = group.endings[i - 1];
      if (
        previous !== undefined &&
        Math.min(...ending.numbers) <= Math.max(...previous.numbers)
      ) {
        warnings.push(
          `ending ${label} in ${barsText(
            ending
          )} repeats or goes back on a pass of the ending before it`
        );
      }
    });
  }
  return { groups, warnings };
}

/** What one bar of an ending draws of the bracket. */
export type EndingSegment = {
  /** The ending's label, on its first bar only. */
  label: string | null;
  /** An `ending-label`: italic text instead of bold numerals. */
  labelIsText: boolean;
  /** The ending's first bar. */
  leftHook: boolean;
  /** The ending's last bar, when the ending is closed. */
  rightHook: boolean;
  /** The ending's last bar: the line stops short of the barline. */
  endsEnding: boolean;
};

/**
 * One segment per bar of every ending. A bar after a row break inside an
 * ending is never its first, so it gets no label or left hook, and a bar
 * before one is never its last, so it gets no right hook.
 */
export function resolveEndingSegments(
  groups: readonly EndingGroup[],
  labels: ReadonlyMap<number, string>
): Map<number, EndingSegment> {
  const segments = new Map<number, EndingSegment>();
  for (const group of groups) {
    for (const ending of group.endings) {
      const text = labels.get(ending.firstMeasure) ?? null;
      for (
        let index = ending.firstMeasure;
        index <= ending.lastMeasure;
        index++
      ) {
        const first = index === ending.firstMeasure;
        const last = index === ending.lastMeasure;
        segments.set(index, {
          label: first ? text ?? endingNumeralLabel(ending.numbers) : null,
          labelIsText: first && text !== null,
          leftHook: first,
          rightHook: last && ending.closed,
          endsEnding: last,
        });
      }
    }
  }
  return segments;
}

export type EndingNumberLabels = {
  numbers: number[];
  labels: (string | null)[];
  forceShow: boolean[];
  warnings: string[];
};

const endingLetter = (index: number): string =>
  String.fromCharCode('a'.charCodeAt(0) + (index % 26));

/**
 * Bar numbers through endings. `consecutive` counts straight through and
 * shows every non-final ending bar and each later ending's first bar.
 * `duplicate` numbers every ending from the group's first bar with a letter
 * per ending (19a, 19b), shows them all, and continues after the group as if
 * only the first ending were played.
 */
export function resolveEndingNumberLabels(
  measureCount: number,
  groups: readonly EndingGroup[],
  numbering: EndingNumbering
): EndingNumberLabels {
  const numbers = Array.from({ length: measureCount }, (_, i) => i + 1);
  const labels: (string | null)[] = Array(measureCount).fill(null);
  const forceShow: boolean[] = Array(measureCount).fill(false);
  const warnings: string[] = [];

  if (numbering === 'consecutive') {
    for (const group of groups) {
      group.endings.forEach((ending, k) => {
        if (ending !== group.finalEnding) {
          for (let i = ending.firstMeasure; i <= ending.lastMeasure; i++) {
            forceShow[i] = true;
          }
        } else if (k > 0) {
          forceShow[ending.firstMeasure] = true;
        }
      });
    }
    return { numbers, labels, forceShow, warnings };
  }

  const groupByFirstMeasure = new Map(
    groups.map((group) => [group.endings[0].firstMeasure, group])
  );
  let next = 1;
  let index = 0;
  while (index < measureCount) {
    const group = groupByFirstMeasure.get(index);
    if (group === undefined) {
      numbers[index] = next;
      next += 1;
      index += 1;
      continue;
    }
    const firstLength =
      group.endings[0].lastMeasure - group.endings[0].firstMeasure + 1;
    group.endings.forEach((ending, k) => {
      const length = ending.lastMeasure - ending.firstMeasure + 1;
      if (k > 0 && length !== firstLength) {
        warnings.push(
          `ending ${endingNumeralLabel(ending.numbers)} has ${length} bar${
            length === 1 ? '' : 's'
          } but the first ending has ${firstLength}; duplicate bar numbers need endings of equal length`
        );
      }
      for (let i = 0; i < length; i++) {
        const measureIndex = ending.firstMeasure + i;
        numbers[measureIndex] = next + i;
        labels[measureIndex] = `${next + i}${endingLetter(k)}`;
        forceShow[measureIndex] = true;
      }
    });
    next += firstLength;
    index = group.finalEnding.lastMeasure + 1;
  }
  return { numbers, labels, forceShow, warnings };
}

/**
 * How far below its measure's top an ending bar's top stave line must sit:
 * the bracket line, then whichever needs more of an empty bar's minimum and
 * the bar's highest ink plus clearance, kept under the label in a labelled
 * bar and under the number when the bar shows one.
 */
export function endingStaffLineY(input: {
  inkAboveLine: number;
  labelled: boolean;
  numberBottomY: number | null;
}): number {
  const { inkAboveLine, labelled, numberBottomY } = input;
  const clearInk = inkAboveLine + ENDING_CONTENT_CLEARANCE_PX;
  return Math.max(
    ENDING_LINE_Y_PX + ENDING_MIN_ABOVE_STAFF_PX,
    ENDING_LINE_Y_PX + (labelled ? ENDING_LABEL_HEIGHT_PX : 0) + clearInk,
    numberBottomY === null ? 0 : numberBottomY + clearInk
  );
}

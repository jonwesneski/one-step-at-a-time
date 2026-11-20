import type { ClefType, TimeSignature } from '../types/theory';
import {
  keySignatureEquals,
  type KeySignatureState,
} from './keySignatureChangeRules';

/** A staff's clef, key and time at one point; null where it has none. */
export type BoundaryState = {
  clef: ClefType | null;
  key: KeySignatureState | null;
  time: TimeSignature;
};

export type Component = 'clef' | 'key' | 'time';

const COMPONENTS: readonly Component[] = ['clef', 'key', 'time'];

/** Which of the clef, key and time a describe reminder brackets. */
export type DescribeReminder = Record<Component, boolean>;

export function describeReminderEquals(
  a: DescribeReminder | null,
  b: DescribeReminder | null
): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return a.clef === b.clef && a.key === b.key && a.time === b.time;
}

export type RepeatEndInput = {
  /** S: where the repeated section starts (the piece's start for a repeat from the beginning). */
  start: BoundaryState;
  /** E: just before the end repeat. */
  end: BoundaryState;
  /** N: just after the end repeat; null at the last bar or mid-bar. */
  next: BoundaryState | null;
  /** The bar after the end repeat begins a later ending of the same group. */
  nextIsLaterEnding: boolean;
  /** V: the end of the bar before the group's first ending, when nextIsLaterEnding. */
  beforeEndings: BoundaryState | null;
};

export type RepeatEndDisplay = {
  /** What to reinstate before the end repeat, where the section's end differs from its start. */
  warnings: Partial<BoundaryState>;
  /** The bar after continues in what the warning showed: draw no change after the barline. */
  suppressAfter: Set<Component>;
  /** A later ending starts in the state before the endings: bracket it as a reminder. */
  reminderAfter: Set<Component>;
};

function componentEquals(
  component: Component,
  a: BoundaryState,
  b: BoundaryState
): boolean {
  if (component === 'key') {
    if (a.key === null || b.key === null) {
      return a.key === b.key;
    }
    return keySignatureEquals(a.key, b.key);
  }
  return a[component] === b[component];
}

/**
 * What a staff draws around an end repeat. Whatever differs between the
 * section's end and its start is reinstated before the barline; a bar after
 * it that continues in that state draws no change; a later ending that starts
 * as the music did before the endings shows the state in brackets.
 */
export function resolveRepeatWarnings(input: RepeatEndInput): RepeatEndDisplay {
  const { start, end, next, nextIsLaterEnding, beforeEndings } = input;
  const warnings: Partial<BoundaryState> = {};
  const suppressAfter = new Set<Component>();
  const reminderAfter = new Set<Component>();
  for (const component of COMPONENTS) {
    // A staff with no clef or key (vocal, tab) never warns of one.
    const missing =
      component !== 'time' &&
      (start[component] === null || end[component] === null);
    const warns = !missing && !componentEquals(component, end, start);
    if (warns) {
      Object.assign(warnings, { [component]: start[component] });
    }
    const shown = warns ? start : end;
    if (next === null) {
      continue;
    }
    if (
      nextIsLaterEnding &&
      beforeEndings !== null &&
      componentEquals(component, next, beforeEndings) &&
      !componentEquals(component, shown, next)
    ) {
      reminderAfter.add(component);
    } else if (warns && componentEquals(component, next, shown)) {
      suppressAfter.add(component);
    }
  }
  return { warnings, suppressAfter, reminderAfter };
}

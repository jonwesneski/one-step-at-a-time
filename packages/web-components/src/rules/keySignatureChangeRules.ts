import type {
  ClefType,
  Mode,
  Note,
  NoteLetter,
  TimeSignature,
} from '../types/theory';
import {
  COURTESY_CLEF_WIDTH_PX,
  END_WARNING_GAP_PX,
  KEY_SIG_CANCEL_GAP_PX,
  KEY_SIG_FLAT_WIDTH,
  KEY_SIG_NATURAL_WIDTH,
  KEY_SIG_SHARP_WIDTH,
  TIME_SIG_DIGIT_WIDTH_PX,
} from '../utils/notationDimensions';
import { getKeySignatureAccidentals } from './accidentalRules';

export type KeySignatureState = { keySig: Note; mode: Mode };

export type KeyChange = { from: KeySignatureState; to: KeySignatureState };

/** Same accidental set, so C major equals A minor. */
export function keySignatureEquals(
  a: KeySignatureState,
  b: KeySignatureState
): boolean {
  const left = getKeySignatureAccidentals(a.keySig, a.mode);
  const right = getKeySignatureAccidentals(b.keySig, b.mode);
  if (left.size !== right.size) {
    return false;
  }
  for (const [letter, type] of left) {
    if (right.get(letter) !== type) {
      return false;
    }
  }
  return true;
}

export function keyChangeEquals(
  a: KeyChange | null,
  b: KeyChange | null
): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return (
    a.from.keySig === b.from.keySig &&
    a.from.mode === b.from.mode &&
    a.to.keySig === b.to.keySig &&
    a.to.mode === b.to.mode
  );
}

/** A natural cancelling one accidental of the old key, by its index in that key's order. */
export type CancellationNatural = { letter: NoteLetter; orderIndex: number };

/**
 * A natural for every accidental of the old key that the new key doesn't
 * keep with the same type, in the old key's order: going to C major or
 * A minor cancels everything, and sharps to flats cancels every sharp.
 */
export function resolveCancellationNaturals(
  from: KeySignatureState,
  to: KeySignatureState
): CancellationNatural[] {
  const target = getKeySignatureAccidentals(to.keySig, to.mode);
  const naturals: CancellationNatural[] = [];
  [...getKeySignatureAccidentals(from.keySig, from.mode)].forEach(
    ([letter, type], orderIndex) => {
      if (target.get(letter) !== type) {
        naturals.push({ letter: letter as NoteLetter, orderIndex });
      }
    }
  );
  return naturals;
}

/** Width of a key change: its naturals, the gap after them, then the new key. */
export function keyChangeWidth(change: KeyChange): number {
  const naturalCount = resolveCancellationNaturals(
    change.from,
    change.to
  ).length;
  const accidentals = [
    ...getKeySignatureAccidentals(change.to.keySig, change.to.mode).values(),
  ];
  const accidentalWidth =
    accidentals[0] === 'flat' ? KEY_SIG_FLAT_WIDTH : KEY_SIG_SHARP_WIDTH;
  return (
    naturalCount * KEY_SIG_NATURAL_WIDTH +
    (naturalCount > 0 && accidentals.length > 0 ? KEY_SIG_CANCEL_GAP_PX : 0) +
    accidentals.length * accidentalWidth
  );
}

/** Width of a time signature's widest number. */
export function timeSignatureWidth(time: TimeSignature): number {
  const digits = Math.max(...time.split('/').map((part) => part.length));
  return digits * TIME_SIG_DIGIT_WIDTH_PX;
}

/**
 * The clef, key and time a staff warns of before its end barline.
 *
 * `reservesWidth` is a cross-file layout choice: a reserving warning (one
 * before an end repeat) adds its width to the staff's strut and natural
 * width; a row-wrap courtesy doesn't. A courtesy only exists because of where
 * the row wraps, so growing the measure for it could move the wrap and remove
 * the courtesy, flipping each frame. Always reserving was rejected for that
 * reason. Either way the notes are spaced short of the area.
 */
export type EndWarnings = {
  clef: ClefType | null;
  key: KeyChange | null;
  time: TimeSignature | null;
  reservesWidth: boolean;
};

export function endWarningsEqual(
  a: EndWarnings | null,
  b: EndWarnings | null
): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return (
    a.clef === b.clef &&
    keyChangeEquals(a.key, b.key) &&
    a.time === b.time &&
    a.reservesWidth === b.reservesWidth
  );
}

/**
 * Width of the warning area: each group's glyphs, plus END_WARNING_GAP_PX
 * before the barline and between groups.
 */
export function endWarningWidth(warnings: EndWarnings | null): number {
  if (warnings === null) {
    return 0;
  }
  const groups = [
    warnings.clef === null ? null : COURTESY_CLEF_WIDTH_PX,
    warnings.key === null ? null : keyChangeWidth(warnings.key),
    warnings.time === null ? null : timeSignatureWidth(warnings.time),
  ].filter((width): width is number => width !== null);
  return groups.reduce((sum, width) => sum + width + END_WARNING_GAP_PX, 0);
}

/**
 * One staff's warnings from a row-wrap courtesy and a repeat: the repeat's
 * wins per component, and any repeat warning makes the area reserve width.
 */
export function mergeEndWarnings(
  courtesy: EndWarnings | null,
  repeat: EndWarnings | null
): EndWarnings | null {
  if (repeat === null) {
    return courtesy;
  }
  if (courtesy === null) {
    return repeat;
  }
  return {
    clef: repeat.clef ?? courtesy.clef,
    key: repeat.key ?? courtesy.key,
    time: repeat.time ?? courtesy.time,
    reservesWidth: true,
  };
}

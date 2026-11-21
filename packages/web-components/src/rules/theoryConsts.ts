import {
  BaseDurationType,
  ChordType,
  DotCount,
  DurationType,
  Note,
} from '../types/theory';
import { BASE_DURATIONS, DOT_PREFIXES, DURATIONS } from '../utils/consts';

// Minor key → its relative major. Used both for accidental key-signature
// lookup and for deriving minor key-signature Y-coordinate tables from a
// clef's major tables (same relative-major relationship applies to both).
export const MINOR_TO_RELATIVE_MAJOR: Partial<Record<string, string>> = {
  A: 'C',
  E: 'G',
  B: 'D',
  'F#': 'A',
  'C#': 'E',
  'G#': 'B',
  'D#': 'F#',
  'A#': 'C#',
  D: 'F',
  G: 'Bb',
  C: 'Eb',
  F: 'Ab',
  Bb: 'Db',
  Eb: 'Gb',
  Ab: 'Cb',
};

/** Each duration's undotted base value (`dotted-eighth` → `eighth`). */
export const durationToBase = Object.fromEntries(
  BASE_DURATIONS.flatMap((base) =>
    DOT_PREFIXES.map((prefix) => [`${prefix}${base}`, base])
  )
) as Record<DurationType, BaseDurationType>;

/** Each duration's augmentation-dot count (`double-dotted-half` → 2). */
export const durationToDotCount = Object.fromEntries(
  BASE_DURATIONS.flatMap((base) =>
    DOT_PREFIXES.map((prefix, dots) => [`${prefix}${base}`, dots])
  )
) as Record<DurationType, DotCount>;

/** Half and longer: drawn with an open (unfilled) notehead. */
export const isOpenDuration = (duration: DurationType): boolean => {
  const base = durationToBase[duration];
  return base === 'half' || base === 'whole' || base === 'double-whole';
};

/** Whole and longer: drawn with no stem. */
export const isStemlessDuration = (duration: DurationType): boolean => {
  const base = durationToBase[duration];
  return base === 'whole' || base === 'double-whole';
};

const baseFlagCounts: Partial<Record<BaseDurationType, number>> = {
  eighth: 1,
  sixteenth: 2,
  thirtysecond: 3,
  sixtyfourth: 4,
  hundredtwentyeighth: 5,
};

/** Flag (tail/beam) count by duration; dots never change it. */
export const durationToFlagCountMap = new Map<DurationType, number>(
  DURATIONS.flatMap((duration) => {
    const count = baseFlagCounts[durationToBase[duration]];
    return count === undefined ? [] : [[duration, count] as const];
  })
);

export const noteSemitoneMap: Map<Note, number> = new Map();
noteSemitoneMap.set('A', 0);
noteSemitoneMap.set('A#', 1);
noteSemitoneMap.set('Bb', 1);
noteSemitoneMap.set('B', 2);
noteSemitoneMap.set('C', 3);
noteSemitoneMap.set('C#', 4);
noteSemitoneMap.set('Db', 4);
noteSemitoneMap.set('D', 5);
noteSemitoneMap.set('D#', 6);
noteSemitoneMap.set('Eb', 6);
noteSemitoneMap.set('E', 7);
noteSemitoneMap.set('Fb', 7);
noteSemitoneMap.set('E#', 8);
noteSemitoneMap.set('F', 8);
noteSemitoneMap.set('F#', 9);
noteSemitoneMap.set('Gb', 9);
noteSemitoneMap.set('G', 10);
noteSemitoneMap.set('G#', 11);
noteSemitoneMap.set('Ab', 11);
noteSemitoneMap.set('B#', 3);
noteSemitoneMap.set('Cb', 2);

/** A chord tone's interval above the root, named by quality and number. */
export type ChordInterval =
  | 'M2'
  | 'm3'
  | 'M3'
  | 'P4'
  | 'd5'
  | 'P5'
  | 'A5'
  | 'M6'
  | 'd7'
  | 'm7'
  | 'M7'
  | 'M9'
  | 'A9'
  | 'P11'
  | 'A11'
  | 'M13';

/**
 * Semitones above the root, and letter steps above the root's letter. The
 * letter step fixes the spelling: a minor third is always two letters up, so
 * C's is Eb, never D#.
 */
export const CHORD_INTERVALS: Record<
  ChordInterval,
  { semitones: number; letterSteps: number }
> = {
  M2: { semitones: 2, letterSteps: 1 },
  m3: { semitones: 3, letterSteps: 2 },
  M3: { semitones: 4, letterSteps: 2 },
  P4: { semitones: 5, letterSteps: 3 },
  d5: { semitones: 6, letterSteps: 4 },
  P5: { semitones: 7, letterSteps: 4 },
  A5: { semitones: 8, letterSteps: 4 },
  M6: { semitones: 9, letterSteps: 5 },
  d7: { semitones: 9, letterSteps: 6 },
  m7: { semitones: 10, letterSteps: 6 },
  M7: { semitones: 11, letterSteps: 6 },
  M9: { semitones: 14, letterSteps: 8 },
  A9: { semitones: 15, letterSteps: 8 },
  P11: { semitones: 17, letterSteps: 10 },
  A11: { semitones: 18, letterSteps: 10 },
  M13: { semitones: 21, letterSteps: 12 },
};

/** Each chord quality's tones above the root, lowest first. */
export const ChordIntervalMap: Record<ChordType, ChordInterval[]> = {
  '5': ['P5'],
  sus2: ['M2', 'P5'],
  sus4: ['P4', 'P5'],
  '': ['M3', 'P5'], // alias for maj
  maj: ['M3', 'P5'],
  '6': ['M3', 'P5', 'M6'],
  maj7: ['M3', 'P5', 'M7'],
  add9: ['M3', 'P5', 'M9'],
  maj9: ['M3', 'P5', 'M7', 'M9'],
  'maj7#11': ['M3', 'P5', 'M7', 'A11'],
  min: ['m3', 'P5'],
  'min(add9)': ['m3', 'P5', 'M9'],
  min6: ['m3', 'P5', 'M6'],
  min7: ['m3', 'P5', 'm7'],
  min7b5: ['m3', 'd5', 'm7'],
  'min(maj7)': ['m3', 'P5', 'M7'],
  min9: ['m3', 'P5', 'm7', 'M9'],
  min11: ['m3', 'P5', 'm7', 'P11'],
  '7': ['M3', 'P5', 'm7'], // Dominants
  '7sus4': ['P4', 'P5', 'm7'],
  '7b5': ['M3', 'd5', 'm7'],
  '9': ['M3', 'P5', 'm7', 'M9'],
  '7#9': ['M3', 'P5', 'm7', 'A9'],
  '11': ['M3', 'P5', 'm7', 'M9', 'P11'],
  '13': ['M3', 'P5', 'm7', 'M9', 'M13'], // End Dominants
  aug: ['M3', 'A5'],
  '+': ['M3', 'A5'], // alias for aug
  '7#5': ['M3', 'A5', 'm7'],
  dim: ['m3', 'd5'],
  dim7: ['m3', 'd5', 'd7'],
};

export const ChordIntervalMapAliases: Record<
  string,
  keyof typeof ChordIntervalMap
> = {
  '': 'maj',
  sus: 'sus4',
  '5add2': 'sus2',
  M7: 'maj7',
  M9: 'maj9',
  'M7#11': 'maj7#11',
  m: 'min',
  '-': 'min',
  m6: 'min6',
  '-6': 'min6',
  m7: 'min7',
  '-7': 'min7',
  m7b5: 'min7b5',
  '-7b5': 'min7b5',
  'm(maj7)': 'min(maj7)',
  '-9': 'min9',
  m9: 'min9',
  m11: 'min11',
  '-11': 'min11',
  '7sus': '7sus4',
  '+': 'aug',
  '(#5)': 'aug',
  '+7': '7#5',
};

/**
 * Relative horizontal space each duration occupies, as a fraction of a whole
 * note (`whole` = 1, `quarter` = 0.25, `dotted-quarter` = 0.375, …). Exported
 * so consumers can reproduce
 * the staff's note spacing and bar fit.
 */
export const durationToFactor = Object.fromEntries(
  DURATIONS.map((duration) => {
    const baseFactor =
      2 ** (1 - BASE_DURATIONS.indexOf(durationToBase[duration]));
    // Each dot adds half the previous value: base × (2 − 2^−dots).
    const factor = baseFactor * (2 - 2 ** -durationToDotCount[duration]);
    return [duration, factor];
  })
) as Record<DurationType, number>;

export const factorToDuration: Map<number, DurationType> = new Map(
  (Object.entries(durationToFactor) as [DurationType, number][]).map(
    ([duration, factor]) => [factor, duration]
  )
);

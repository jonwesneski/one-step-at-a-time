import { DurationType, LetterNote } from '../types/theory';

export const SVG_NS = 'http://www.w3.org/2000/svg';

export const durationToFlagCountMap = new Map<DurationType, number>([
  ['eighth', 1],
  ['sixteenth', 2],
  ['thirtysecond', 3],
  ['sixtyfourth', 4],
  ['hundredtwentyeighth', 5],
]);

export const noteSemitoneMap: Map<LetterNote, number> = new Map();
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
noteSemitoneMap.set('F', 8);
noteSemitoneMap.set('F#', 9);
noteSemitoneMap.set('Gb', 9);
noteSemitoneMap.set('G', 10);
noteSemitoneMap.set('G#', 11);
noteSemitoneMap.set('Ab', 11);

export const semitoneNoteMap: Map<number, LetterNote[]> = new Map();
semitoneNoteMap.set(0, ['A']);
semitoneNoteMap.set(1, ['A#', 'Bb']);
semitoneNoteMap.set(2, ['B']);
semitoneNoteMap.set(3, ['C']);
semitoneNoteMap.set(4, ['C#', 'Db']);
semitoneNoteMap.set(5, ['D']);
semitoneNoteMap.set(6, ['D#', 'Eb']);
semitoneNoteMap.set(7, ['E']);
semitoneNoteMap.set(8, ['F']);
semitoneNoteMap.set(9, ['F#', 'Gb']);
semitoneNoteMap.set(10, ['G']);
semitoneNoteMap.set(11, ['G#', 'Ab']);

// 1 b2 2 b3 3 4 b5 5 b6 6 b7 7
// Semitones from root
export const ChordSemitoneMap: Record<string, number[]> = {
  '5': [7],
  sus2: [2, 7],
  sus4: [5, 7],
  maj: [4, 7],
  '6': [4, 7, 9],
  maj7: [4, 7, 11],
  add9: [4, 7, 14],
  maj9: [4, 7, 11, 14],
  'maj7#11': [4, 7, 11, 18],
  min: [3, 7],
  'min(add9)': [3, 7, 14],
  min6: [3, 7, 9],
  min7: [3, 7, 10],
  min7b5: [3, 6, 10],
  'min(maj7)': [3, 7, 11],
  min9: [3, 7, 10, 14],
  min11: [3, 7, 10, 17],
  '7': [4, 7, 10], // Dominants
  '7sus4': [5, 7, 10],
  '7b5': [4, 6, 10],
  '9': [4, 7, 10, 14],
  '7#9': [4, 7, 10, 15],
  '11': [4, 7, 10, 14, 17],
  '13': [4, 7, 10, 14, 21], // End Dominants
  aug: [4, 8],
  '7#5': [4, 8, 10],
  dim: [3, 6],
  dim7: [3, 6, 8],
};

export const ChordSemitoneMapAliases: Record<
  string,
  keyof typeof ChordSemitoneMap
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

export const durationToFactor: Record<DurationType, number> = {
  whole: 1,
  half: 0.5,
  quarter: 0.25,
  eighth: 0.125,
  sixteenth: 0.0625,
  thirtysecond: 0.03125,
  sixtyfourth: 0.015625,
  hundredtwentyeighth: 0.0078125,
} as const;

export const factorToDuration: Map<number, DurationType> = new Map(
  (Object.entries(durationToFactor) as [DurationType, number][]).map(
    ([duration, factor]) => [factor, duration]
  )
);

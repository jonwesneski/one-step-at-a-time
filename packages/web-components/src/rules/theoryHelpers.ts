import {
  KeySignatureYCoordinates,
  NoteLetterOctave,
  YCoordinates,
} from '../types/elements';
import { Chord, ChordType, Note } from '../types/theory';
import { STAFF_LINE_SPACING } from '../utils/notationDimensions';
import {
  ChordSemitoneMap,
  ChordSemitoneMapAliases,
  MINOR_TO_RELATIVE_MAJOR,
  noteSemitoneMap,
  semitoneNoteMap,
} from './theoryConsts';

const Y_COORDINATE_INCREMENT = STAFF_LINE_SPACING / 2;

// Shared by generateYCoordinates and extrapolateYCoordinate.
const NOTE_LETTER_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export const getChordNotes = (chord: Chord) => {
  const isSlash = chord[1] === '/';
  let root = isSlash ? chord[2] : chord[0];
  let startIndex = isSlash ? 3 : 1;
  if (chord[startIndex] === '#' || chord[startIndex] === 'b') {
    root += chord[startIndex];
    startIndex += 1;
  }
  const chordSignature = chord.slice(startIndex, chord.length) as ChordType;
  const semitones =
    ChordSemitoneMap[chordSignature] ??
    ChordSemitoneMap[ChordSemitoneMapAliases[chordSignature]];
  return getNotes(root as Note, semitones);
};

// Indices 0→4 mirror semitoneNoteMap: double-flat, flat, natural, sharp, double-sharp.
const enharmonicIndex: Partial<Record<Note, 0 | 1 | 2 | 3 | 4>> = {
  Cb: 0,
  Fb: 0,
  Bb: 1,
  Eb: 1,
  Ab: 1,
  Db: 1,
  Gb: 1,
  C: 2,
  D: 2,
  E: 2,
  F: 2,
  G: 2,
  A: 2,
  B: 2,
  'F#': 3,
  'C#': 3,
  'G#': 3,
  'D#': 4,
  'A#': 4,
};
// Exported only for direct unit testing — call getChordNotes() otherwise.
export const getNotes = (root: Note, semitones: number[]) => {
  const notes: Note[] = [root];
  const choiceIndex = enharmonicIndex[root] ?? 2;
  const rootPosition = noteSemitoneMap.get(root);
  if (rootPosition !== undefined) {
    for (const s of semitones) {
      const position = (rootPosition + s) % 12;
      const possibleNotes = semitoneNoteMap.get(position);
      if (possibleNotes) {
        notes.push(
          possibleNotes[choiceIndex] ?? possibleNotes[2] ?? possibleNotes[0]
        );
      } else {
        throw new Error('possible note not found');
      }
    }
  } else {
    throw new Error('no root found');
  }
  return notes;
};

// Walks natural notes only (C, B, A, G, F, E, D) from highestNote down to
// lowestNote, assigning Y positions in Y_COORDINATE_INCREMENT steps starting
// at startingY.
export const generateYCoordinates = (
  highestNote: NoteLetterOctave,
  lowestNote: NoteLetterOctave,
  startingY = 10
): YCoordinates => {
  const parseNote = (
    note: NoteLetterOctave
  ): { letter: string; octave: number } => {
    const match = note.match(/^([A-G])#?b?(\d)$/);
    if (!match) throw new Error(`Invalid note format: ${note}`);
    return { letter: match[1], octave: parseInt(match[2]) };
  };

  const highest = parseNote(highestNote);
  const lowest = parseNote(lowestNote);

  // Build note sequence from highest to lowest in natural note order
  const sequence: Array<{ note: string; octave: number }> = [];

  let currentNote = highest.letter;
  let currentOctave = highest.octave;

  while (currentNote !== lowest.letter || currentOctave !== lowest.octave) {
    sequence.push({ note: currentNote, octave: currentOctave });

    // Move down one diatonic step
    const currentIndex = NOTE_LETTER_ORDER.indexOf(currentNote);
    if (currentIndex === 0) {
      // C → B of previous octave
      currentNote = 'B';
      currentOctave--;
    } else {
      // Move to previous note in sequence
      currentNote = NOTE_LETTER_ORDER[currentIndex - 1];
    }
  }

  sequence.push({ note: lowest.letter, octave: lowest.octave });

  const result: YCoordinates = {};
  let currentY = startingY;

  for (const { note, octave } of sequence) {
    const noteStr = `${note}${octave}` as NoteLetterOctave;
    result[noteStr] = currentY;
    currentY += Y_COORDINATE_INCREMENT;
  }

  return result;
};

// Extends generateYCoordinates' own diatonic-step pattern past the edges of
// an already-generated table, for a note/octave the table has no entry for
// (any pitch outside a clef's usual 3-octave window — still a legal `Octave`
// value, e.g. a low ledger-line note on a treble staff). Anchors off the
// table's own topmost (smallest-Y) entry, so every existing in-range Y value
// is untouched — this only ever adds new values, never shifts old ones.
export const extrapolateYCoordinate = (
  letter: string,
  octave: number,
  yCoordinates: YCoordinates
): number => {
  let anchorKey: string | null = null;
  let anchorY = Infinity;
  for (const [key, y] of Object.entries(yCoordinates)) {
    if (y !== undefined && y < anchorY) {
      anchorY = y;
      anchorKey = key;
    }
  }
  if (anchorKey === null) {
    return 0;
  }
  const match = anchorKey.match(/^([A-G])(\d)$/);
  if (!match) {
    return 0;
  }
  const diatonicIndex = (l: string, o: number) =>
    o * 7 + NOTE_LETTER_ORDER.indexOf(l);
  const steps =
    diatonicIndex(match[1], Number(match[2])) - diatonicIndex(letter, octave);
  return anchorY + steps * Y_COORDINATE_INCREMENT;
};

export const generateKeySignatureYCoordinates = (
  keyCountMap: Partial<{ [key in Note]: number }>,
  accidentals: NoteLetterOctave[],
  yCoordinates: YCoordinates
): KeySignatureYCoordinates => {
  const keySignatureYCoordinates: KeySignatureYCoordinates = {};
  for (const key in keyCountMap) {
    keySignatureYCoordinates[key as Note] = [];
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- key came from iterating keyCountMap's own keys
    for (let i = 0; i < keyCountMap[key as Note]!; i++) {
      const yCoordinate = yCoordinates[accidentals[i]];
      if (yCoordinate) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- just assigned above in this same loop
        keySignatureYCoordinates[key as Note]!.push(yCoordinate);
      } else {
        throw new Error(
          `Y coordinate not found for accidental: ${accidentals[i]}`
        );
      }
    }
  }

  return keySignatureYCoordinates;
};

/**
 * Derives a minor-key signature Y-coordinate table from a major-key one, using
 * the relative-major relationship (e.g. E minor borrows G major's coordinates).
 * Only produces entries whose relative major exists in `majorYCoordinates` —
 * pass the sharp table to get sharp minor keys, the flat table for flat ones.
 */
export const generateMinorKeySignatureYCoordinates = (
  majorYCoordinates: KeySignatureYCoordinates
): KeySignatureYCoordinates => {
  const minorYCoordinates: KeySignatureYCoordinates = {};
  for (const minorKey in MINOR_TO_RELATIVE_MAJOR) {
    const relativeMajor = MINOR_TO_RELATIVE_MAJOR[minorKey] as Note;
    const coordinates = majorYCoordinates[relativeMajor];
    if (coordinates !== undefined) {
      minorYCoordinates[minorKey as Note] = coordinates;
    }
  }
  return minorYCoordinates;
};

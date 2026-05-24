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
  noteSemitoneMap,
  semitoneNoteMap,
} from './theoryConsts';

const Y_COORDINATE_INCREMENT = STAFF_LINE_SPACING / 2;

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
// Just exporting for testing; do not use
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

/**
 * Generates Y coordinates for a staff range from highest to lowest note.
 * Uses only natural notes (C, B, A, G, F, E, D) with 5px increments per note.
 *
 * @param highestNote - The highest note in the range (e.g., 'C6')
 * @param lowestNote - The lowest note in the range (e.g., 'C4')
 * @param startingY - The Y coordinate for the highest note (defaults to 10)
 * @returns YCoordinates object mapping note names to pixel positions
 *
 * @example
 * const sopranoYCoords = generateYCoordinates('C6', 'C4');
 * // { C6: 10, B5: 15, A5: 20, ..., C4: 80 }
 *
 * // Line y-positioning
 * [
 *   // Above 1st line
 *   10,
 *   15,
 *   20,
 *   25,
 *
 *   30, // 1st line
 *   35,
 *   40,
 *   45,
 *   50,
 *   55,
 *   60,
 *   65,
 *   70,
 *   // Below last line
 *   75,
 *   80,
 * ]
 */
export const generateYCoordinates = (
  highestNote: NoteLetterOctave,
  lowestNote: NoteLetterOctave,
  startingY = 10
): YCoordinates => {
  // Parse note to extract letter and octave
  const parseNote = (
    note: NoteLetterOctave
  ): { letter: string; octave: number } => {
    // Strip accidentals if present, keep only the letter and octave
    const match = note.match(/^([A-G])#?b?(\d)$/);
    if (!match) throw new Error(`Invalid note format: ${note}`);
    return { letter: match[1], octave: parseInt(match[2]) };
  };

  const highest = parseNote(highestNote);
  const lowest = parseNote(lowestNote);

  // Build note sequence from highest to lowest in natural note order
  const noteOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const sequence: Array<{ note: string; octave: number }> = [];

  let currentNote = highest.letter;
  let currentOctave = highest.octave;

  while (currentNote !== lowest.letter || currentOctave !== lowest.octave) {
    sequence.push({ note: currentNote, octave: currentOctave });

    // Move down one diatonic step
    const currentIndex = noteOrder.indexOf(currentNote);
    if (currentIndex === 0) {
      // C → B of previous octave
      currentNote = 'B';
      currentOctave--;
    } else {
      // Move to previous note in sequence
      currentNote = noteOrder[currentIndex - 1];
    }
  }

  sequence.push({ note: lowest.letter, octave: lowest.octave });

  // Convert sequence to Y coordinates
  const result: YCoordinates = {};
  let currentY = startingY;

  for (const { note, octave } of sequence) {
    const noteStr = `${note}${octave}` as NoteLetterOctave;
    result[noteStr] = currentY;
    currentY += Y_COORDINATE_INCREMENT;
  }

  return result;
};

export const generateKeySignatureYCoordinates = (
  keyCountMap: Partial<{ [key in Note]: number }>,
  accidentals: NoteLetterOctave[],
  yCoordinates: YCoordinates
): KeySignatureYCoordinates => {
  const keySignatureYCoordinates: KeySignatureYCoordinates = {};
  for (const key in keyCountMap) {
    keySignatureYCoordinates[key as Note] = [];
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- it's okay
    for (let i = 0; i < keyCountMap[key as Note]!; i++) {
      const yCoordinate = yCoordinates[accidentals[i]];
      if (yCoordinate) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- it's okay
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

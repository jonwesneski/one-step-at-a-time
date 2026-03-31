import { YCoordinates } from '../types/elements';
import { Chord, LetterNote, LetterOctave } from '../types/theory';
import {
  ChordSemitoneMap,
  ChordSemitoneMapAliases,
  noteSemitoneMap,
  semitoneNoteMap,
} from './consts';

// Half of staffLineSpacing (10), one semitone step = 5px
const Y_COORDINATE_INCREMENT = 5;

export const getChordNotes = (chord: Chord) => {
  const isSlash = chord[1] === '/';
  let root = isSlash ? chord[2] : chord[0];
  let startIndex = isSlash ? 3 : 1;
  if (chord[startIndex] === '#' || chord[startIndex] === 'b') {
    root += chord[startIndex];
    startIndex += 1;
  }
  const chordSignature = chord.slice(startIndex, chord.length);
  const semitones =
    ChordSemitoneMap[chordSignature] ??
    ChordSemitoneMap[ChordSemitoneMapAliases[chordSignature]];
  return getNotes(root as LetterNote, semitones);
};

const useFirstIndex: Record<string, true> = {
  C: true,
  // Keys with sharps
  'C#': true,
  D: true,
  'D#': true,
  E: true,
  F: true,
  'F#': true,
  G: true,
  'G#': true,
  A: true,
  'A#': true,
  B: true,
};
export const getNotes = (root: LetterNote, semitones: number[]) => {
  const notes: LetterNote[] = [root];
  // 2nd index in possibleNotes is for flats
  const choiceIndex = useFirstIndex[root] ? 0 : 1;
  const rootPosition = noteSemitoneMap.get(root);
  if (rootPosition !== undefined) {
    for (const s of semitones) {
      let position = rootPosition + s;
      position =
        position <= 11 ? position : (position % 11) - Math.floor(position / 11);
      // If position is less than zero then we need to go backwards
      position = position < 0 ? 11 + position + 1 : position;
      const possibleNotes = semitoneNoteMap.get(position);
      if (possibleNotes) {
        notes.push(possibleNotes[choiceIndex] ?? possibleNotes[0]);
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
  highestNote: LetterOctave,
  lowestNote: LetterOctave,
  startingY = 10
): YCoordinates => {
  // Parse note to extract letter and octave
  const parseNote = (
    note: LetterOctave
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
    const noteStr = `${note}${octave}` as LetterOctave;
    result[noteStr] = currentY;
    currentY += Y_COORDINATE_INCREMENT;
  }

  return result;
};

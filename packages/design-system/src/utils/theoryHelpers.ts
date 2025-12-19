import { Note } from '../types/theory';
import {
  ChordSemitoneMap,
  ChordSemitoneMapAliases,
  noteSemitoneMap,
  semitoneNoteMap,
} from './consts';

export const getChordNotes = (
  chord: string /**TODO make type Chord when union literals are fixed */
) => {
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
  console.log({ semitones });
  return getNotes(root as Note, semitones);
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
export const getNotes = (root: Note, semitones: number[]) => {
  const notes: Note[] = [root];
  // 2nd index in possibleNotes is for flats
  const firstChoice = useFirstIndex[root] ? 0 : 1;
  let rootPosition = noteSemitoneMap.get(root);
  if (rootPosition !== undefined) {
    for (const s of semitones) {
      let position = rootPosition + s;
      console.log({ position });
      position =
        position <= 11 ? position : (position % 11) - Math.floor(position / 11);
      // If position is less than zero then we need to go backwards
      position = position < 0 ? 11 + position + 1 : position;
      const possibleNotes = semitoneNoteMap.get(position);
      if (possibleNotes) {
        notes.push(possibleNotes[firstChoice] ?? possibleNotes[0]);
      } else {
        throw new Error('possible note not found');
      }
    }
  } else {
    throw new Error('no root found');
  }
  return notes;
};

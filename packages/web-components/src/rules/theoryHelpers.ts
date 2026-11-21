import {
  KeySignatureYCoordinates,
  NoteLetterOctave,
  YCoordinates,
} from '../types/elements';
import { Chord, ChordType, Note } from '../types/theory';
import { STAFF_LINE_SPACING } from '../utils/notationDimensions';
import {
  CHORD_INTERVALS,
  type ChordInterval,
  ChordIntervalMap,
  ChordIntervalMapAliases,
  MINOR_TO_RELATIVE_MAJOR,
  noteSemitoneMap,
} from './theoryConsts';

const Y_COORDINATE_INCREMENT = STAFF_LINE_SPACING / 2;

// Shared by generateYCoordinates and extrapolateYCoordinate.
const NOTE_LETTER_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

const NATURAL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
const ROOT_PATTERN = /^([A-G])(#|b)?/;

/**
 * The notes of a chord symbol, root first; null when the root or quality
 * isn't recognised. A slash chord's bass note is ignored.
 */
export const getChordNotes = (chord: Chord): Note[] | null => {
  const slashIndex = chord.indexOf('/');
  const body = slashIndex === -1 ? chord : chord.slice(slashIndex + 1);
  const match = body.match(ROOT_PATTERN);
  if (match === null) {
    return null;
  }
  const root = match[0] as Note;
  const quality = body.slice(match[0].length);
  const intervals =
    ChordIntervalMap[quality as ChordType] ??
    ChordIntervalMap[ChordIntervalMapAliases[quality]];
  if (intervals === undefined) {
    return null;
  }
  return getNotes(root, intervals);
};

// Exported only for direct unit testing — call getChordNotes() otherwise.
export const getNotes = (root: Note, intervals: ChordInterval[]): Note[] => {
  const rootPitch = noteSemitoneMap.get(root);
  if (rootPitch === undefined) {
    throw new Error(`no root found: ${root}`);
  }
  const rootLetterIndex = NATURAL_LETTERS.indexOf(
    root[0] as (typeof NATURAL_LETTERS)[number]
  );
  return [
    root,
    ...intervals.map((interval) => {
      const { semitones, letterSteps } = CHORD_INTERVALS[interval];
      const letter = NATURAL_LETTERS[(rootLetterIndex + letterSteps) % 7];
      const pitch = (rootPitch + semitones) % 12;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- every natural letter is in noteSemitoneMap
      const naturalPitch = noteSemitoneMap.get(letter)!;
      // Signed semitone gap in -6..5: positive sharpens, negative flattens.
      const alteration = ((pitch - naturalPitch + 18) % 12) - 6;
      if (Math.abs(alteration) > 2) {
        return enharmonicSpelling(pitch);
      }
      const accidental =
        alteration > 0 ? '#'.repeat(alteration) : 'b'.repeat(-alteration);
      return `${letter}${accidental}` as Note;
    }),
  ];
};

// Past a double sharp/flat (e.g. B#aug's fifth, F###), fall back to the
// first spelling noteSemitoneMap lists for the pitch, natural or single sharp.
const enharmonicSpelling = (pitch: number): Note => {
  for (const [note, notePitch] of noteSemitoneMap) {
    if (notePitch === pitch) {
      return note;
    }
  }
  throw new Error(`no spelling for pitch ${pitch}`);
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
    if (!match) {
      throw new Error(`Invalid note format: ${note}`);
    }
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

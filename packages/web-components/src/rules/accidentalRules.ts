/**
 * # Scope explicitly excluded (follow-up work)

- **Cautionary accidentals** (brackets/parentheses around reminders)
- **Octave-specific tracking** (book: each octave needs its own accidental; implementation tracks by letter only)
- **Cross-stave accidental tracking** (multi-stave instruments like piano)
- **Multi-voice accidental sharing** (one accidental applies to all parts on a stave — not repeated per voice in same bar)
- **Clef-change re-confirmation** (accidental holds only in the clef it was written)
- **Key-change natural rendering** (naturals that cancel the old key signature before displaying the new one)
- **System-break repetition on tied notes** (repeat accidental at start of new system for cross-break ties)
- **Down-stem accidental displacement** (move accidental closer to stem than a displaced notehead when room allows)
- **Grace note accidentals**
- **Ornament accidentals** (confirm/cancel altered pitches for trills, turns, etc.)
- **Microtones** (quarter-tones, arrows)
 */
import {
  ChordElementType,
  NoteElementType,
  NoteOrChordElementType,
} from '../types/elements';
import { AccidentalType, LetterNote, Mode } from '../types/theory';
import { MUSIC_NOTE_NODE } from '../utils/consts';

// ─── Suffix parsing ────────────────────────────────────────────────────────────

type AccidentalSuffix = '' | '#' | 'b' | '##' | 'bb';

export function parseAccidentalSuffix(noteName: string): AccidentalSuffix {
  const suffix = noteName.slice(1);
  if (suffix === '##' || suffix === 'bb' || suffix === '#' || suffix === 'b') {
    return suffix as AccidentalSuffix;
  }
  return '';
}

export function suffixToType(suffix: AccidentalSuffix): AccidentalType | null {
  switch (suffix) {
    case '##':
      return 'double-sharp';
    case 'bb':
      return 'double-flat';
    case '#':
      return 'sharp';
    case 'b':
      return 'flat';
    default:
      return null;
  }
}

// ─── Key signature ─────────────────────────────────────────────────────────────

const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'] as const;
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'] as const;

const MAJOR_ACCIDENTAL_COUNT: Record<string, number> = {
  C: 0,
  G: 1,
  D: 2,
  A: 3,
  E: 4,
  B: 5,
  'F#': 6,
  'C#': 7,
  F: -1,
  Bb: -2,
  Eb: -3,
  Ab: -4,
  Db: -5,
  Gb: -6,
  Cb: -7,
};

const MINOR_TO_RELATIVE_MAJOR: Partial<Record<string, string>> = {
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

// Key signature accidentals are always single sharp or flat — never double accidentals.
export function getKeySignatureAccidentals(
  keySig: LetterNote | string,
  mode: Mode
): Map<string, 'sharp' | 'flat'> {
  const key =
    mode === 'minor' ? MINOR_TO_RELATIVE_MAJOR[keySig] ?? 'C' : keySig;
  const count = MAJOR_ACCIDENTAL_COUNT[key] ?? 0;
  const result = new Map<string, 'sharp' | 'flat'>();
  if (count > 0) {
    SHARP_ORDER.slice(0, count).forEach((letter) =>
      result.set(letter, 'sharp')
    );
  } else if (count < 0) {
    FLAT_ORDER.slice(0, -count).forEach((letter) => result.set(letter, 'flat'));
  }
  return result;
}

// ─── Accidental resolution ─────────────────────────────────────────────────────

// Given the note's actual accidental and the currently-in-effect state for that
// letter (from key sig + in-measure tracking), return what symbol to render.
export function resolveAccidental(
  noteAccidental: AccidentalType | null,
  effectiveState: AccidentalType | null
): AccidentalType | null {
  if (noteAccidental === effectiveState) {
    return null; // already in effect — suppress
  }
  if (noteAccidental !== null) {
    return noteAccidental; // show the required accidental
  }
  return 'natural'; // note is natural but something else is in effect
}

// ─── Inter-note spacing ────────────────────────────────────────────────────────

// Returns the nudged xPosition so the accidental clears the previous element's
// right edge. Per Behind Bars (Gould): place accidentals as close to the note
// as possible — nudge only as much as needed to avoid collision.
export function computeInterNoteSpacing(
  xPosition: number,
  accidentalWidth: number,
  previousRightEdge: number
): number {
  if (accidentalWidth <= 0) {
    return xPosition;
  }
  return Math.max(xPosition, previousRightEdge + accidentalWidth);
}

// ─── Per-measure orchestration ─────────────────────────────────────────────────

export function computeNoteAccidentals(
  elements: NoteOrChordElementType[],
  keySig: LetterNote,
  mode: Mode
): {
  noteShowAccidentals: Map<NoteElementType, AccidentalType | null>;
  chordNoteAccidentals: Map<
    ChordElementType,
    (AccidentalType | null | undefined)[]
  >;
} {
  const keySigAccidentals = getKeySignatureAccidentals(keySig, mode);
  const inMeasureState = new Map<string, AccidentalType | null>();

  const noteShowAccidentals = new Map<NoteElementType, AccidentalType | null>();
  const chordNoteAccidentals = new Map<
    ChordElementType,
    (AccidentalType | null | undefined)[]
  >();

  for (const element of elements) {
    if (element.nodeName === MUSIC_NOTE_NODE) {
      const noteElement = element as NoteElementType;
      if (noteElement.note === 'rest') {
        continue;
      }
      if (noteElement.tie === 'end') {
        noteShowAccidentals.set(noteElement, null);
        continue;
      }
      const letter = noteElement.note[0].toUpperCase();
      const suffix = parseAccidentalSuffix(noteElement.note);
      const noteAccidental = suffixToType(suffix);
      const effectiveState =
        inMeasureState.get(letter) ?? keySigAccidentals.get(letter) ?? null;
      const showAccidental = resolveAccidental(noteAccidental, effectiveState);
      noteShowAccidentals.set(noteElement, showAccidental);
      inMeasureState.set(letter, noteAccidental);
    } else {
      const chordElement = element as ChordElementType;
      if (chordElement.tie === 'end') {
        chordNoteAccidentals.set(
          chordElement,
          chordElement.notes.map(() => null)
        );
        continue;
      }
      const accidentals: (AccidentalType | null | undefined)[] = [];
      for (const chordNote of chordElement.notes) {
        const letter = chordNote.value[0].toUpperCase();
        const suffix = parseAccidentalSuffix(chordNote.value);
        const noteAccidental = suffixToType(suffix);
        const effectiveState =
          inMeasureState.get(letter) ?? keySigAccidentals.get(letter) ?? null;
        accidentals.push(resolveAccidental(noteAccidental, effectiveState));
        inMeasureState.set(letter, noteAccidental);
      }
      chordNoteAccidentals.set(chordElement, accidentals);
    }
  }

  return { noteShowAccidentals, chordNoteAccidentals };
}

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
- **Ornament accidentals** (confirm/cancel altered pitches for trills, turns, etc.)
- **Microtones** (quarter-tones, arrows)
 */
import {
  ChordElementType,
  NoteChordOrRestElementType,
  NoteElementType,
} from '../types/elements';
import { AccidentalType, Mode, Note } from '../types/theory';
import { MUSIC_CHORD_NODE, MUSIC_NOTE_NODE } from '../utils/consts';
import {
  ACCIDENTAL_NOTE_GAP,
  ACCIDENTAL_SYMBOL_HEIGHT,
  ACCIDENTAL_SYMBOL_WIDTH,
} from '../utils/notationDimensions';
import { MINOR_TO_RELATIVE_MAJOR } from './theoryConsts';

// ─── Suffix parsing ────────────────────────────────────────────────────────────

type AccidentalSuffix = '' | '#' | 'b' | '##' | 'bb';

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

// ─── Inter-note spacing ────────────────────────────────────────────────────────

// Returns the nudged xPosition so the element's leftward overhang (accidental
// and/or grace notes) clears the previous element's right edge. Overhanging
// glyphs sit as close to the note as possible — nudge only as much as needed
// to avoid collision.
export function computeInterNoteSpacing(
  xPosition: number,
  leftwardWidth: number,
  previousRightEdge: number
): number {
  if (leftwardWidth <= 0) {
    return xPosition;
  }
  return Math.max(xPosition, previousRightEdge + leftwardWidth);
}

// ─── Per-measure orchestration ─────────────────────────────────────────────────

export function computeNoteAccidentals(
  elements: NoteChordOrRestElementType[],
  keySig: Note,
  mode: Mode
): {
  noteShowAccidentals: Map<NoteElementType, AccidentalType | null>;
  chordNoteAccidentals: Map<
    ChordElementType,
    (AccidentalType | null | undefined)[]
  >;
  graceShowAccidentals: Map<
    NoteElementType | ChordElementType,
    (AccidentalType | null)[]
  >;
} {
  const keySigAccidentals = getKeySignatureAccidentals(keySig, mode);
  const inMeasureState = new Map<string, AccidentalType | null>();

  const noteShowAccidentals = new Map<NoteElementType, AccidentalType | null>();
  const chordNoteAccidentals = new Map<
    ChordElementType,
    (AccidentalType | null | undefined)[]
  >();
  const graceShowAccidentals = new Map<
    NoteElementType | ChordElementType,
    (AccidentalType | null)[]
  >();

  // Grace notes sound before their host element, so their accidentals are
  // resolved first and carry through the measure like any other accidental.
  const resolveGraceAccidentals = (
    hostElement: NoteElementType | ChordElementType
  ): void => {
    const graceNotes = hostElement.grace;
    if (graceNotes === null || graceNotes.length === 0) {
      return;
    }
    const resolved = graceNotes.map((graceNote) => {
      const letter = graceNote[0].toUpperCase();
      const graceAccidental = suffixToType(parseAccidentalSuffix(graceNote));
      const effectiveState =
        inMeasureState.get(letter) ?? keySigAccidentals.get(letter) ?? null;
      const showAccidental = resolveAccidental(graceAccidental, effectiveState);
      inMeasureState.set(letter, graceAccidental);
      return showAccidental;
    });
    graceShowAccidentals.set(hostElement, resolved);
  };

  for (const element of elements) {
    if (element.nodeName === MUSIC_NOTE_NODE) {
      const noteElement = element as NoteElementType;
      resolveGraceAccidentals(noteElement);
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
    } else if (element.nodeName === MUSIC_CHORD_NODE) {
      const chordElement = element as ChordElementType;
      resolveGraceAccidentals(chordElement);
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

  return { noteShowAccidentals, chordNoteAccidentals, graceShowAccidentals };
}

// Key signature accidentals are always single sharp or flat — never double accidentals.
export function getKeySignatureAccidentals(
  keySig: Note,
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

export function parseAccidentalSuffix(noteName: Note): AccidentalSuffix {
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

// ─── Chord accidental column layout ───────────────────────────────────────────

const COLUMN_GAP = 2;

export type AccidentalPlacementInput = {
  noteIndex: number;
  accidental: AccidentalType;
  yPixel: number;
};

export type AccidentalPlacement = AccidentalPlacementInput & {
  xOffset: number;
};

function hasVerticalStrokes(type: AccidentalType): boolean {
  return type === 'sharp' || type === 'natural';
}

function minVerticalClearance(a: AccidentalType, b: AccidentalType): number {
  if (hasVerticalStrokes(a) || hasVerticalStrokes(b)) {
    // Vertical strokes must not join — require clearance just over a sixth (~25px).
    return 26;
  }
  return (ACCIDENTAL_SYMBOL_HEIGHT[a] + ACCIDENTAL_SYMBOL_HEIGHT[b]) / 2;
}

export function computeChordAccidentalPlacements(
  inputs: AccidentalPlacementInput[]
): AccidentalPlacement[] {
  if (inputs.length === 0) {
    return [];
  }

  // Sort ascending by yPixel (lowest y = highest pitch)
  const sorted = [...inputs].sort((a, b) => a.yPixel - b.yPixel);

  // Build interleaved order: highest, lowest, 2nd-highest, 2nd-lowest, ...
  // Exception: adjacent-note pairs (within one step ~5px) use descending order.
  const isAdjacentPair =
    sorted.length === 2 && Math.abs(sorted[0].yPixel - sorted[1].yPixel) <= 6;

  const ordered: AccidentalPlacementInput[] = [];
  if (isAdjacentPair) {
    ordered.push(sorted[0], sorted[1]);
  } else {
    let lo = 0;
    let hi = sorted.length - 1;
    while (lo <= hi) {
      ordered.push(sorted[lo++]);
      if (lo <= hi) {
        ordered.push(sorted[hi--]);
      }
    }
  }

  // Assign columns: col 0 = rightmost (closest to notehead)
  const columns: AccidentalPlacementInput[][] = [];
  const placements: AccidentalPlacement[] = new Array(inputs.length);

  for (const item of ordered) {
    let assignedColumn = -1;
    for (let col = 0; col < columns.length; col++) {
      const fits = columns[col].every(
        (existing) =>
          Math.abs(existing.yPixel - item.yPixel) >=
          minVerticalClearance(existing.accidental, item.accidental)
      );
      if (fits) {
        assignedColumn = col;
        break;
      }
    }
    if (assignedColumn === -1) {
      assignedColumn = columns.length;
      columns.push([]);
    }
    columns[assignedColumn].push(item);

    // Placeholder — xOffset computed after all columns are assigned
    placements[item.noteIndex] = { ...item, xOffset: 0 };
  }

  // Compute column widths and cumulative x offsets
  const columnWidths = columns.map(
    (col) =>
      Math.max(...col.map((i) => ACCIDENTAL_SYMBOL_WIDTH[i.accidental])) +
      COLUMN_GAP
  );
  const cumulativeX: number[] = [];
  let runningX = 0;
  for (const width of columnWidths) {
    cumulativeX.push(runningX);
    runningX += width;
  }

  // Assign xOffset to each placement
  for (let col = 0; col < columns.length; col++) {
    for (const item of columns[col]) {
      placements[item.noteIndex] = {
        ...placements[item.noteIndex],
        xOffset: -(cumulativeX[col] + ACCIDENTAL_SYMBOL_WIDTH[item.accidental]),
      };
    }
  }

  return placements.filter((p): p is AccidentalPlacement => p !== undefined);
}

export function totalChordAccidentalWidth(
  noteAccidentals: (AccidentalType | null | undefined)[],
  staffYCoordinates: number[]
): number {
  const inputs: AccidentalPlacementInput[] = [];
  for (let i = 0; i < noteAccidentals.length; i++) {
    const acc = noteAccidentals[i];
    if (acc) {
      inputs.push({
        noteIndex: i,
        accidental: acc,
        yPixel: staffYCoordinates[i],
      });
    }
  }
  if (inputs.length === 0) {
    return 0;
  }
  const placements = computeChordAccidentalPlacements(inputs);
  if (placements.length === 0) {
    return 0;
  }
  return (
    Math.min(...placements.map((p) => p.xOffset)) * -1 + ACCIDENTAL_NOTE_GAP
  );
}

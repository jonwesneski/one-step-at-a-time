/**
 * # Scope explicitly excluded (follow-up work)

- **Cautionary accidentals** (brackets/parentheses around reminders)
- **Octave-specific tracking** (book: each octave needs its own accidental; implementation tracks by letter only)
- **Cross-stave accidental tracking** (multi-stave instruments like piano)
- **Clef-change re-confirmation** (accidental holds only in the clef it was written)
- **System-break repetition on tied notes** (repeat accidental at start of new system for cross-break ties)
- **Down-stem accidental displacement** (move accidental closer to stem than a displaced notehead when room allows)
- **Ornament accidentals** (confirm/cancel altered pitches for trills, turns, etc.)
- **Microtones** other than quarter-tones
 */
import {
  ChordElementType,
  NoteChordOrRestElementType,
  NoteElementType,
} from '../types/elements';
import {
  AccidentalType,
  ConventionalAccidentalType,
  Mode,
  Note,
  QuarterTone,
} from '../types/theory';
import { isChordNodeName, isNoteNodeName } from '../utils/consts';
import {
  ACCIDENTAL_ARROW_HEAD_WIDTH_PX,
  ACCIDENTAL_ARROW_OVERSHOOT_PX,
  ACCIDENTAL_ARROW_PAREN_GAP_PX,
  ACCIDENTAL_ARROW_STROKES,
  ACCIDENTAL_NOTE_GAP,
  ACCIDENTAL_PITCH_RATIO,
  ACCIDENTAL_REMINDER_PAREN_WIDTH_PX,
  ACCIDENTAL_SYMBOL_HEIGHT,
  ACCIDENTAL_SYMBOL_WIDTH,
  NATURAL_LEFT_STROKE_INSET_PX,
  STAFF_LINE_SPACING,
} from '../utils/notationDimensions';
import type { ObstacleRect } from './connectorPlacementRules';
import { isTriangle } from './noteheadRules';
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

export type NoteAccidentals = {
  noteShowAccidentals: Map<NoteElementType, AccidentalType | null>;
  chordNoteAccidentals: Map<
    ChordElementType,
    (AccidentalType | null | undefined)[]
  >;
  graceShowAccidentals: Map<
    NoteElementType | ChordElementType,
    (AccidentalType | null)[]
  >;
  trillFinishShowAccidentals: Map<
    NoteElementType | ChordElementType,
    (AccidentalType | null)[]
  >;
  parenthesizedAccidentals: Set<NoteElementType>;
  chordParenthesizedAccidentals: Map<ChordElementType, boolean[]>;
  // What a note's `bend-to` draws: its own accidental, or a natural where one
  // in force would otherwise carry over to it.
  bendTargetAccidentals: Map<NoteElementType, AccidentalType | null>;
};

export function computeNoteAccidentals(
  elements: NoteChordOrRestElementType[],
  keySig: Note,
  mode: Mode
): NoteAccidentals {
  const keySigAccidentals = getKeySignatureAccidentals(keySig, mode);
  const inMeasureState = new Map<string, AccidentalType | null>();

  // A natural written earlier in the bar is recorded as null and still
  // overrides the key, so the lookup checks presence, not the value.
  const stateFor = (letter: string): AccidentalType | null =>
    inMeasureState.has(letter)
      ? inMeasureState.get(letter) ?? null
      : keySigAccidentals.get(letter) ?? null;

  const noteShowAccidentals = new Map<NoteElementType, AccidentalType | null>();
  const chordNoteAccidentals = new Map<
    ChordElementType,
    (AccidentalType | null | undefined)[]
  >();
  const graceShowAccidentals = new Map<
    NoteElementType | ChordElementType,
    (AccidentalType | null)[]
  >();
  const trillFinishShowAccidentals = new Map<
    NoteElementType | ChordElementType,
    (AccidentalType | null)[]
  >();
  const parenthesizedAccidentals = new Set<NoteElementType>();
  const chordParenthesizedAccidentals = new Map<ChordElementType, boolean[]>();
  const bendTargetAccidentals = new Map<
    NoteElementType,
    AccidentalType | null
  >();

  // Shared by both ornament kinds (a leading grace group and a trill's
  // finishing grace note(s)) — same suffix-vs-in-measure-state resolution as
  // a plain note, just keyed by a pitch list instead of one pitch.
  const resolveOrnamentAccidentals = (
    pitches: Note[] | null,
    quarterTones: readonly (QuarterTone | null)[] | null,
    target: Map<NoteElementType | ChordElementType, (AccidentalType | null)[]>,
    hostElement: NoteElementType | ChordElementType
  ): void => {
    if (pitches == null || pitches.length === 0) {
      return;
    }
    const resolved = pitches.map((pitch, i) => {
      const letter = pitch[0].toUpperCase();
      const accidental = pitchAccidental(pitch, quarterTones?.[i] ?? null);
      const effectiveState = stateFor(letter);
      const showAccidental = resolveAccidental(accidental, effectiveState);
      inMeasureState.set(letter, accidental);
      return showAccidental;
    });
    target.set(hostElement, resolved);
  };

  // A bend's target never alters the rest of the bar.
  const resolveBendTarget = (noteElement: NoteElementType): void => {
    const bendTo = noteElement.bendTo ?? null;
    if (bendTo !== null) {
      bendTargetAccidentals.set(
        noteElement,
        pitchAccidental(bendTo, noteElement.bendToQuarterTone) ??
          (stateFor(bendTo[0]) === null ? null : 'natural')
      );
    }
  };

  for (const element of elements) {
    if (isNoteNodeName(element.nodeName)) {
      const noteElement = element as NoteElementType;
      // A leading grace group sounds before the host note, a trill's
      // finishing grace note(s) sound after it — both fold into
      // inMeasureState in that chronological order, independent of whether
      // the host note itself re-sounds (tie="end" below).
      resolveOrnamentAccidentals(
        noteElement.grace,
        noteElement.graceQuarterTone,
        graceShowAccidentals,
        noteElement
      );
      // A triangle's nominal pitch is undefined, so like a tied note it neither
      // shows an accidental nor changes the measure's state. Its ornaments do.
      // A dotted tie across a barline is not literal enough to carry the
      // accidental, so its end note shows it again.
      if (
        (noteElement.tie === 'end' && !noteElement.dottedTieAcrossBarline) ||
        isTriangle(noteElement.notehead)
      ) {
        noteShowAccidentals.set(noteElement, null);
        resolveBendTarget(noteElement);
        resolveOrnamentAccidentals(
          noteElement.trillFinish,
          noteElement.trillFinishQuarterTone,
          trillFinishShowAccidentals,
          noteElement
        );
        continue;
      }
      const letter = noteElement.note[0].toUpperCase();
      const noteAccidental = pitchAccidental(
        noteElement.note,
        noteElement.quarterTone
      );
      const effectiveState = stateFor(letter);
      const { accidental, parenthesized } = withReminder(
        resolveAccidental(noteAccidental, effectiveState),
        noteAccidental,
        noteElement.accidentalReminder
      );
      noteShowAccidentals.set(noteElement, accidental);
      if (parenthesized) {
        parenthesizedAccidentals.add(noteElement);
      }
      inMeasureState.set(letter, noteAccidental);
      resolveBendTarget(noteElement);
      resolveOrnamentAccidentals(
        noteElement.trillFinish,
        noteElement.trillFinishQuarterTone,
        trillFinishShowAccidentals,
        noteElement
      );
    } else if (isChordNodeName(element.nodeName)) {
      const chordElement = element as ChordElementType;
      resolveOrnamentAccidentals(
        chordElement.grace,
        chordElement.graceQuarterTone,
        graceShowAccidentals,
        chordElement
      );
      if (chordElement.tie === 'end' && !chordElement.dottedTieAcrossBarline) {
        chordNoteAccidentals.set(
          chordElement,
          chordElement.notes.map(() => null)
        );
        resolveOrnamentAccidentals(
          chordElement.trillFinish,
          chordElement.trillFinishQuarterTone,
          trillFinishShowAccidentals,
          chordElement
        );
        continue;
      }
      const accidentals: (AccidentalType | null | undefined)[] = [];
      const parenthesized: boolean[] = [];
      const reminders = chordElement.toneAccidentalReminders;
      const quarterTones = chordElement.toneQuarterTones;
      chordElement.notes.forEach((chordNote, toneIndex) => {
        const letter = chordNote.value[0].toUpperCase();
        const noteAccidental = pitchAccidental(
          chordNote.value,
          quarterTones[toneIndex]
        );
        const effectiveState = stateFor(letter);
        const shown = withReminder(
          resolveAccidental(noteAccidental, effectiveState),
          noteAccidental,
          reminders[toneIndex] ?? false
        );
        accidentals.push(shown.accidental);
        parenthesized.push(shown.parenthesized);
        inMeasureState.set(letter, noteAccidental);
      });
      chordNoteAccidentals.set(chordElement, accidentals);
      if (parenthesized.some(Boolean)) {
        chordParenthesizedAccidentals.set(chordElement, parenthesized);
      }
      resolveOrnamentAccidentals(
        chordElement.trillFinish,
        chordElement.trillFinishQuarterTone,
        trillFinishShowAccidentals,
        chordElement
      );
    }
  }

  return {
    noteShowAccidentals,
    chordNoteAccidentals,
    graceShowAccidentals,
    trillFinishShowAccidentals,
    parenthesizedAccidentals,
    chordParenthesizedAccidentals,
    bendTargetAccidentals,
  };
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

export function suffixToType(
  suffix: AccidentalSuffix
): ConventionalAccidentalType | null {
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

/** The `Note` suffix that spells an accidental; a natural has none. */
export function accidentalSuffix(
  accidental: AccidentalType | null
): AccidentalSuffix {
  switch (accidental === null ? null : baseAccidental(accidental)) {
    case 'sharp':
      return '#';
    case 'flat':
      return 'b';
    case 'double-sharp':
      return '##';
    case 'double-flat':
      return 'bb';
    default:
      return '';
  }
}

// ─── Quarter-tones ─────────────────────────────────────────────────────────────

/** An arrow goes on the pitch's own accidental, a plain pitch's on a natural. */
export function withQuarterTone(
  accidental: ConventionalAccidentalType | null,
  quarterTone: QuarterTone | null | undefined
): AccidentalType | null {
  return quarterTone ? `${accidental ?? 'natural'}-${quarterTone}` : accidental;
}

/** The accidental a pitch is spelled with, shown or not; null for a natural. */
export function pitchAccidental(
  note: Note,
  quarterTone: QuarterTone | null | undefined = null
): AccidentalType | null {
  return withQuarterTone(
    suffixToType(parseAccidentalSuffix(note)),
    quarterTone
  );
}

export function quarterToneOf(accidental: AccidentalType): QuarterTone | null {
  return accidental.endsWith('-up')
    ? 'up'
    : accidental.endsWith('-down')
    ? 'down'
    : null;
}

/** The accidental without its arrow. */
export function baseAccidental(
  accidental: AccidentalType
): ConventionalAccidentalType {
  return accidental.replace(/-(up|down)$/, '') as ConventionalAccidentalType;
}

export type AccidentalOverhangs = {
  left: number;
  right: number;
  above: number;
  below: number;
};

/** How far (px) an accidental's arrow reaches outside its glyph's own box. */
export function accidentalArrowOverhangs(
  accidental: AccidentalType
): AccidentalOverhangs {
  const quarterTone = quarterToneOf(accidental);
  if (quarterTone === null) {
    return { left: 0, right: 0, above: 0, below: 0 };
  }
  const base = baseAccidental(accidental);
  const { x, endY } = ACCIDENTAL_ARROW_STROKES[base][quarterTone];
  const halfHead = ACCIDENTAL_ARROW_HEAD_WIDTH_PX / 2;
  const up = quarterTone === 'up';
  return {
    left: Math.max(0, halfHead - x),
    right: Math.max(0, x + halfHead - ACCIDENTAL_SYMBOL_WIDTH[base]),
    above: up ? ACCIDENTAL_ARROW_OVERSHOOT_PX - endY : 0,
    below: up
      ? 0
      : endY + ACCIDENTAL_ARROW_OVERSHOOT_PX - ACCIDENTAL_SYMBOL_HEIGHT[base],
  };
}

// ─── Accidental resolution ─────────────────────────────────────────────────────

/**
 * An accidental's box width, with its parentheses when it's a reminder. Only
 * a reminder's box takes in a quarter-tone arrow, since its parentheses
 * enclose it; a plain glyph's box stays the glyph's, so it keeps its place
 * beside the head and the arrow reaches outside it.
 */
export function accidentalSymbolWidth(
  accidental: AccidentalType,
  parenthesized = false
): number {
  const width = ACCIDENTAL_SYMBOL_WIDTH[baseAccidental(accidental)];
  if (!parenthesized) {
    return width;
  }
  const { left, right } = accidentalReminderPadding(accidental);
  return width + left + right + ACCIDENTAL_REMINDER_PAREN_WIDTH_PX * 2;
}

/** Room (px) a reminder leaves between its glyph and each parenthesis. */
export function accidentalReminderPadding(accidental: AccidentalType): {
  left: number;
  right: number;
} {
  const { left, right } = accidentalArrowOverhangs(accidental);
  const padding = (overhang: number): number =>
    overhang > 0 ? overhang + ACCIDENTAL_ARROW_PAREN_GAP_PX : 0;
  return { left: padding(left), right: padding(right) };
}

/** From the right edge of an accidental's box to its leftmost ink (px). */
export function accidentalReach(
  accidental: AccidentalType,
  parenthesized = false
): number {
  return (
    accidentalSymbolWidth(accidental, parenthesized) +
    (parenthesized ? 0 : accidentalArrowOverhangs(accidental).left)
  );
}

/** The height of a reminder's parentheses; they outgrow a short glyph. */
export function accidentalReminderParenHeight(
  accidental: AccidentalType
): number {
  const { above, below } = accidentalArrowOverhangs(accidental);
  return Math.max(
    (accidentalSymbolHeight(accidental) + above + below) * 0.8,
    STAFF_LINE_SPACING * 2
  );
}

/**
 * An accidental's box height, with its parentheses when it's a reminder. A
 * quarter-tone arrow reaches outside it (`accidentalArrowOverhangs`).
 */
export function accidentalSymbolHeight(
  accidental: AccidentalType,
  parenthesized = false
): number {
  const height = ACCIDENTAL_SYMBOL_HEIGHT[baseAccidental(accidental)];
  return parenthesized
    ? Math.max(height, accidentalReminderParenHeight(accidental))
    : height;
}

/** From the top of an accidental's box down to the pitch it alters (px). */
export function accidentalPitchOffset(accidental: AccidentalType): number {
  const base = baseAccidental(accidental);
  return ACCIDENTAL_SYMBOL_HEIGHT[base] * ACCIDENTAL_PITCH_RATIO[base];
}

/**
 * The middle of a reminder's parentheses, from the top of its glyph's box.
 * Around a flat they sit between the glyph's middle and its bowl's.
 */
export function accidentalReminderParenCenter(
  accidental: AccidentalType
): number {
  const { above, below } = accidentalArrowOverhangs(accidental);
  const inkCenter = (accidentalSymbolHeight(accidental) - above + below) / 2;
  return quarterToneOf(accidental) === null
    ? (inkCenter + accidentalPitchOffset(accidental)) / 2
    : inkCenter;
}

/** How far (px) an accidental's ink reaches above and below its pitch. */
export function accidentalVerticalExtent(
  accidental: AccidentalType,
  parenthesized = false
): { above: number; below: number } {
  const pitch = accidentalPitchOffset(accidental);
  const arrow = accidentalArrowOverhangs(accidental);
  const above = pitch + arrow.above;
  const below = accidentalSymbolHeight(accidental) - pitch + arrow.below;
  if (!parenthesized) {
    return { above, below };
  }
  const parenCenter = accidentalReminderParenCenter(accidental) - pitch;
  const parenHalfHeight = accidentalReminderParenHeight(accidental) / 2;
  return {
    above: Math.max(above, parenHalfHeight - parenCenter),
    below: Math.max(below, parenHalfHeight + parenCenter),
  };
}

/**
 * The box of an accidental's ink, arrow and parentheses included, for a glyph
 * whose own box starts at `left` and whose pitch is at `pitchY`.
 */
export function accidentalInkRect(
  accidental: AccidentalType,
  left: number,
  pitchY: number,
  { parenthesized = false, scale = 1 } = {}
): ObstacleRect {
  const { above, below } = accidentalVerticalExtent(accidental, parenthesized);
  const arrow = accidentalArrowOverhangs(accidental);
  const width = accidentalSymbolWidth(accidental, parenthesized);
  return {
    left: left - (parenthesized ? 0 : arrow.left * scale),
    right: left + (width + (parenthesized ? 0 : arrow.right)) * scale,
    top: pitchY - above * scale,
    bottom: pitchY + below * scale,
  };
}

// A reminder shows the accidental already in force, in parentheses: the
// note's own, or a natural. One that is required anyway draws plainly.
function withReminder(
  shown: AccidentalType | null,
  noteAccidental: AccidentalType | null,
  reminder: boolean
): { accidental: AccidentalType | null; parenthesized: boolean } {
  if (!reminder || shown !== null) {
    return { accidental: shown, parenthesized: false };
  }
  return { accidental: noteAccidental ?? 'natural', parenthesized: true };
}

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

// A sixth: closer than that, the higher accidental keeps the nearer column.
const FLAT_MIN_CLEARANCE_PX = STAFF_LINE_SPACING * 2.5;

// Keeps a flat's stem from joining up with the accidental above it.
const FLAT_INK_GAP_PX = STAFF_LINE_SPACING * 0.1;

export type AccidentalPlacementInput = {
  noteIndex: number;
  accidental: AccidentalType;
  yPixel: number;
  /** A reminder, drawn in parentheses. */
  parenthesized?: boolean;
};

export type AccidentalPlacement = AccidentalPlacementInput & {
  xOffset: number;
};

function hasVerticalStrokes(type: AccidentalType): boolean {
  const base = baseAccidental(type);
  return base === 'sharp' || base === 'natural';
}

function isFlat(type: AccidentalType): boolean {
  const base = baseAccidental(type);
  return base === 'flat' || base === 'double-flat';
}

// A flat reaches much further up than down, so what it clears depends on
// which of the two is higher.
function flatVerticalClearance(
  upper: AccidentalPlacementInput,
  lower: AccidentalPlacementInput
): number {
  const upperBelow = accidentalVerticalExtent(
    upper.accidental,
    upper.parenthesized
  ).below;
  const lowerAbove = accidentalVerticalExtent(
    lower.accidental,
    lower.parenthesized
  ).above;
  const inset =
    isFlat(lower.accidental) &&
    upper.accidental === 'natural' &&
    !upper.parenthesized
      ? NATURAL_LEFT_STROKE_INSET_PX
      : 0;
  return Math.max(
    FLAT_MIN_CLEARANCE_PX,
    upperBelow + lowerAbove - inset + FLAT_INK_GAP_PX
  );
}

function minVerticalClearance(
  a: AccidentalPlacementInput,
  b: AccidentalPlacementInput
): number {
  const [upper, lower] = a.yPixel <= b.yPixel ? [a, b] : [b, a];
  if (isFlat(upper.accidental) || isFlat(lower.accidental)) {
    return flatVerticalClearance(upper, lower);
  }
  // Arrows that point at each other need room on top of the glyphs' own.
  const facingArrows =
    accidentalArrowOverhangs(upper.accidental).below +
    accidentalArrowOverhangs(lower.accidental).above;
  if (
    hasVerticalStrokes(upper.accidental) ||
    hasVerticalStrokes(lower.accidental)
  ) {
    // Vertical strokes must not join — require clearance just over a sixth (~25px).
    return 26 + facingArrows;
  }
  return (
    (accidentalSymbolHeight(upper.accidental, upper.parenthesized) +
      accidentalSymbolHeight(lower.accidental, lower.parenthesized)) /
      2 +
    facingArrows
  );
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
          minVerticalClearance(existing, item)
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
      Math.max(
        ...col.map((i) => accidentalReach(i.accidental, i.parenthesized))
      ) + COLUMN_GAP
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
        xOffset: -(
          cumulativeX[col] +
          accidentalSymbolWidth(item.accidental, item.parenthesized)
        ),
      };
    }
  }

  return placements.filter((p): p is AccidentalPlacement => p !== undefined);
}

export function totalChordAccidentalWidth(
  noteAccidentals: (AccidentalType | null | undefined)[],
  staffYCoordinates: number[],
  parenthesized: readonly boolean[] = []
): number {
  const inputs: AccidentalPlacementInput[] = [];
  for (let i = 0; i < noteAccidentals.length; i++) {
    const acc = noteAccidentals[i];
    if (acc) {
      inputs.push({
        noteIndex: i,
        accidental: acc,
        yPixel: staffYCoordinates[i],
        parenthesized: parenthesized[i] ?? false,
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
    Math.max(
      ...placements.map(
        (p) =>
          -p.xOffset +
          accidentalReach(p.accidental, p.parenthesized) -
          accidentalSymbolWidth(p.accidental, p.parenthesized)
      )
    ) + ACCIDENTAL_NOTE_GAP
  );
}

import type {
  ChordElementType,
  NoteChordOrRestElementType,
  NoteElementType,
} from '../types/elements';
import type {
  AccidentalType,
  ConventionalAccidentalType,
  DurationType,
  Mode,
  Note,
  NoteLetter,
  Octave,
  QuarterTone,
} from '../types/theory';
import { isChordNodeName, isNoteNodeName } from '../utils/consts';
import {
  getKeySignatureAccidentals,
  pitchAccidental,
  withQuarterTone,
} from './accidentalRules';
import { LETTER_ORDER } from './graceRules';
import { durationToFlagCountMap } from './theoryConsts';

type TrillCapableElement = NoteElementType | ChordElementType;

const isTrillCapable = (
  element: NoteChordOrRestElementType
): element is TrillCapableElement =>
  isNoteNodeName(element.nodeName) || isChordNodeName(element.nodeName);

export type TrillLineSpan = {
  /** Index of the trill-marked element that starts this span. */
  startIndex: number;
  /**
   * Index of the last element still carrying the trill's own duration
   * (inclusive) — the element `tie`-chain-walked forward from `startIndex`.
   * Equal to `startIndex` for an untied, single note-value trill.
   */
  lastTiedIndex: number;
  /** Whether a wavy line (or end-notch) should be drawn at all — false only when `trill-line="none"` explicitly suppresses it (sign only). */
  hasLine: boolean;
  /**
   * Index the wavy line runs up to (exclusive) — the next element in the
   * stream after `lastTiedIndex`, whose own left edge (or accidental) the
   * line stops short of. Null when there is no following element (the line
   * runs to the measure's own right edge instead).
   */
  endBeforeIndex: number | null;
  /** True when an explicit `trill-stop` cut the span short — draw the end-notch at `lastTiedIndex` rather than running up to `endBeforeIndex`. */
  stopped: boolean;
  /**
   * Index whose own right edge a written trilling notehead (`trill-note`)
   * anchors after. Equal to `startIndex`, except when the start note is a
   * short value (eighth or shorter) and tied forward — there the notehead
   * anchors after the *second* tied note instead, where there is more room,
   * matching standard practice.
   */
  writtenNoteAnchorIndex: number;
};

// Eighth-note-or-shorter — the threshold past which a written trilling
// notehead is deferred to the second tied note to avoid cramping the first.
const isShortDuration = (duration: DurationType): boolean =>
  (durationToFlagCountMap.get(duration) ?? 0) > 0;

// Resolves the trill-attribute source at `index` — null when that position
// isn't trill-capable at all (a rest) or is out of range.
const trillSourceAt = (
  elements: readonly NoteChordOrRestElementType[],
  index: number
): TrillCapableElement | null => {
  if (index < 0 || index >= elements.length) {
    return null;
  }
  const element = elements[index];
  return isTrillCapable(element) ? element : null;
};

// Walks the `tie` chain from `startIndex` (a tie links to the next index),
// stopping at the first `trill-stop`, the start included.
const walkTieChain = (
  elements: readonly NoteChordOrRestElementType[],
  startIndex: number
): { lastTiedIndex: number; stopped: boolean } => {
  let index = startIndex;
  let source = trillSourceAt(elements, index);
  let stopped = source?.trillStop ?? false;

  while (!stopped) {
    if (source === null || source.tie !== 'start') {
      break;
    }
    const nextIndex = index + 1;
    const nextSource = trillSourceAt(elements, nextIndex);
    if (nextSource === null) {
      break;
    }
    index = nextIndex;
    source = nextSource;
    if (source.trillStop) {
      stopped = true;
    }
  }

  return { lastTiedIndex: index, stopped };
};

function buildTrillSpan(
  elements: readonly NoteChordOrRestElementType[],
  startIndex: number
): TrillLineSpan {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- callers only pass a trill-marked index
  const source = trillSourceAt(elements, startIndex)!;
  const { lastTiedIndex, stopped } = walkTieChain(elements, startIndex);
  const hasLine = source.trillLine !== 'none';
  const endBeforeIndex =
    lastTiedIndex + 1 < elements.length ? lastTiedIndex + 1 : null;
  const writtenNoteAnchorIndex =
    lastTiedIndex > startIndex && isShortDuration(source.duration)
      ? startIndex + 1
      : startIndex;

  return {
    startIndex,
    lastTiedIndex,
    hasLine,
    endBeforeIndex,
    stopped,
    writtenNoteAnchorIndex,
  };
}

/**
 * Resolves every `trill`-marked element in a staff's element stream to a
 * same-measure `TrillLineSpan`, by index.
 */
export function resolveTrillSpans(
  elements: readonly NoteChordOrRestElementType[]
): TrillLineSpan[] {
  const spans: TrillLineSpan[] = [];

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (!isTrillCapable(element) || !element.trill) {
      continue;
    }
    spans.push(buildTrillSpan(elements, i));
  }

  return spans;
}

/** One measure's own slice `[startIndex, endIndex)` of a staff-track's global, concatenated element array (see `resolveTrillContinuationSegments`). */
export type TrillMeasureBoundary = {
  startIndex: number;
  endIndex: number;
};

export type TrillContinuationSegment = {
  /** Index into the staff-track's own measure list (not a global element index). */
  measureIndex: number;
  /**
   * Local index (within this measure) of the element the line stops short
   * of — null means the line runs to this measure's own right edge (the
   * span continues into a later measure, or the track itself ends here).
   */
  endBeforeLocalIndex: number | null;
  /** Local index (within this measure) to draw the end-notch at, when an explicit `trill-stop` ends the span here. */
  stopAtLocalIndex: number | null;
};

const measureIndexOfGlobalIndex = (
  measureBoundaries: readonly TrillMeasureBoundary[],
  globalIndex: number
): number => {
  for (let m = 0; m < measureBoundaries.length; m++) {
    if (
      globalIndex >= measureBoundaries[m].startIndex &&
      globalIndex < measureBoundaries[m].endIndex
    ) {
      return m;
    }
  }
  return measureBoundaries.length - 1;
};

/**
 * For a span resolved over a staff-track's concatenated elements, the
 * segments needed in measures after the starting one (whose staff draws its
 * own part). Empty when the tie chain stays in its measure.
 */
export function resolveTrillContinuationSegments(
  measureBoundaries: readonly TrillMeasureBoundary[],
  span: TrillLineSpan
): TrillContinuationSegment[] {
  const startMeasure = measureIndexOfGlobalIndex(
    measureBoundaries,
    span.startIndex
  );
  // Decided by lastTiedIndex: endBeforeIndex can fall in the next measure
  // for an untied trill on a measure's last element, whose line the staff
  // already draws to its edge.
  const lastTiedMeasure = measureIndexOfGlobalIndex(
    measureBoundaries,
    span.lastTiedIndex
  );

  if (startMeasure === lastTiedMeasure) {
    return [];
  }

  const segments: TrillContinuationSegment[] = [];
  for (let m = startMeasure + 1; m <= lastTiedMeasure; m++) {
    const { startIndex: measureStart } = measureBoundaries[m];
    if (m < lastTiedMeasure) {
      segments.push({
        measureIndex: m,
        endBeforeLocalIndex: null,
        stopAtLocalIndex: null,
      });
      continue;
    }
    if (span.stopped) {
      segments.push({
        measureIndex: m,
        endBeforeLocalIndex: null,
        stopAtLocalIndex: span.lastTiedIndex - measureStart,
      });
    } else if (span.endBeforeIndex !== null) {
      segments.push({
        measureIndex: m,
        endBeforeLocalIndex: span.endBeforeIndex - measureStart,
        stopAtLocalIndex: null,
      });
    } else {
      segments.push({
        measureIndex: m,
        endBeforeLocalIndex: null,
        stopAtLocalIndex: null,
      });
    }
  }
  return segments;
}

export type ResolvedTrillPitch = {
  /**
   * The trilling (auxiliary) note's letter — the diatonic step above the
   * written note by default, or whatever `trill-note` names when set.
   */
  letter: NoteLetter;
  /** Accidental to show on the letter, or null when unaltered (no symbol drawn). */
  accidental: AccidentalType | null;
  /**
   * True when `trill-note` was set: drawn as a small parenthesized notehead
   * after the main one, not an accidental above the sign.
   */
  written: boolean;
  /** Octave for the written notehead's staff position — set only when `written` is true. */
  octave: Octave | null;
};

// The octave that places `letter` at the closest pitch at or above
// mainLetter/mainOctave — diatonic neighbors and same-letter (re-accidentalled)
// trilling notes are always within one octave of the written note, so this
// never needs to search further.
const octaveAbove = (
  mainLetter: NoteLetter,
  mainOctave: Octave,
  letter: NoteLetter
): Octave =>
  LETTER_ORDER.indexOf(letter) >= LETTER_ORDER.indexOf(mainLetter)
    ? mainOctave
    : ((mainOctave + 1) as Octave);

/**
 * Resolves the trill's auxiliary pitch. Default: the written note's upper
 * diatonic neighbor, modified by the key signature — e.g. a trill on "F" in a
 * key with F# in its signature implies an upper neighbor of G, not G#, since
 * G is unaltered by that signature. `accidentalOverride` (`trill-accidental`)
 * replaces only the accidental; `noteOverride` (`trill-note`) replaces the
 * whole pitch and wins over it. `quarterTone` then applies to whichever of
 * the three gave the pitch.
 */
export function resolveTrillPitch(
  note: Note,
  octave: Octave,
  keySig: Note,
  mode: Mode,
  accidentalOverride: ConventionalAccidentalType | null,
  noteOverride: Note | null = null,
  quarterTone: QuarterTone | null = null
): ResolvedTrillPitch {
  const mainLetter = note[0] as NoteLetter;

  if (noteOverride !== null) {
    const letter = noteOverride[0] as NoteLetter;
    return {
      letter,
      accidental: pitchAccidental(noteOverride, quarterTone),
      written: true,
      octave: octaveAbove(mainLetter, octave, letter),
    };
  }

  const letter =
    LETTER_ORDER[(LETTER_ORDER.indexOf(mainLetter) + 1) % LETTER_ORDER.length];

  if (accidentalOverride !== null) {
    return {
      letter,
      accidental: withQuarterTone(accidentalOverride, quarterTone),
      written: false,
      octave: null,
    };
  }

  const keySignatureAccidentals = getKeySignatureAccidentals(keySig, mode);
  return {
    letter,
    accidental: withQuarterTone(
      keySignatureAccidentals.get(letter) ?? null,
      quarterTone
    ),
    written: false,
    octave: null,
  };
}

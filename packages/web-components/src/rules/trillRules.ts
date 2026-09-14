import type {
  ChordElementType,
  NoteChordOrRestElementType,
  NoteElementType,
} from '../types/elements';
import type {
  AccidentalType,
  DurationType,
  Mode,
  Note,
  NoteLetter,
  Octave,
} from '../types/theory';
import { MUSIC_CHORD_NODE, MUSIC_NOTE_NODE } from '../utils/consts';
import {
  getKeySignatureAccidentals,
  parseAccidentalSuffix,
  suffixToType,
} from './accidentalRules';
import { LETTER_ORDER } from './graceRules';
import { durationToFlagCountMap } from './theoryConsts';

type TrillCapableElement = NoteElementType | ChordElementType;

const isTrillCapable = (
  element: NoteChordOrRestElementType
): element is TrillCapableElement =>
  element.nodeName === MUSIC_NOTE_NODE || element.nodeName === MUSIC_CHORD_NODE;

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

// Walks forward from `startIndex` through the element's own `tie` chain — in
// a single staff's note stream a tie always connects to the very next
// note/chord (no multi-voice interleaving within one staff), so "next link"
// is simply the next array index. Stops early at the first `trill-stop`
// encountered anywhere in the chain (including on the starting element
// itself), which cuts the span short regardless of how far the ties run.
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
  // Guaranteed non-null: callers only build a span from a position they've
  // already confirmed is trill-marked.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- see above
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
 * Resolves every `trill`-marked element in `elements` (a staff's own
 * rendered note/chord/rest stream, in document order) to a same-measure
 * `TrillLineSpan`. Pure index-based logic — no DOM geometry — so a caller
 * with real pixel positions (`staffClassicalBase.ts`) only has to look up
 * `startIndex` / `endBeforeIndex` / `lastTiedIndex` to draw the line.
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
 * Given a `TrillLineSpan` resolved over a staff-track's global element array
 * (the concatenation of every measure's own note/chord/rest stream, in row
 * order — same-index-based `resolveTrillSpans` already walks a tie chain
 * across that concatenation transparently, since it only ever looks at
 * `elements[index + 1]`), returns the additional segments needed in measures
 * *after* the one the span started in. Empty when the span never leaves its
 * starting measure — that case is already fully drawn by that measure's own
 * staff-local render pass. Pure index math; the caller supplies real
 * geometry per segment (`staffClassicalBase.ts` for the starting measure,
 * `composition.ts` for every measure this returns).
 */
export function resolveTrillContinuationSegments(
  elements: readonly NoteChordOrRestElementType[],
  measureBoundaries: readonly TrillMeasureBoundary[],
  span: TrillLineSpan
): TrillContinuationSegment[] {
  const startMeasure = measureIndexOfGlobalIndex(
    measureBoundaries,
    span.startIndex
  );
  // Whether continuation is needed at all is decided by the tie chain's own
  // end (lastTiedIndex), not by endBeforeIndex — endBeforeIndex is the next
  // element the *line* stops short of, which is always lastTiedIndex + 1 and
  // so can land in the following measure even when the tie chain itself
  // never left the starting measure (an untied trill on a measure's last
  // element). That trailing sliver of line is already drawn by the starting
  // measure's own staff-local render (it simply runs to the measure's own
  // right edge), so it must not also trigger a continuation segment here.
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
   * True when `trill-note` was set — render as a small written notehead in
   * parentheses after the main notehead, rather than an accidental-only
   * symbol above the sign. Required whenever the trilling pitch shares the
   * main note's own letter (only the accidental differs) or otherwise can't
   * be expressed as "the diatonic neighbor, optionally re-accidentalled".
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
 * replaces only the computed accidental, never the letter. `noteOverride`
 * (`trill-note`) replaces the whole resolved pitch — letter and accidental —
 * and takes precedence over `accidentalOverride` when both are set; this is
 * the only path that can express a trilling note sharing the main note's own
 * letter (a chromatic/semitone trill) or one that otherwise isn't the plain
 * diatonic neighbor.
 */
export function resolveTrillPitch(
  note: Note,
  octave: Octave,
  keySig: Note,
  mode: Mode,
  accidentalOverride: AccidentalType | null,
  noteOverride: Note | null = null
): ResolvedTrillPitch {
  const mainLetter = note[0] as NoteLetter;

  if (noteOverride !== null) {
    const letter = noteOverride[0] as NoteLetter;
    return {
      letter,
      accidental: suffixToType(parseAccidentalSuffix(noteOverride)),
      written: true,
      octave: octaveAbove(mainLetter, octave, letter),
    };
  }

  const letter =
    LETTER_ORDER[(LETTER_ORDER.indexOf(mainLetter) + 1) % LETTER_ORDER.length];

  if (accidentalOverride !== null) {
    return {
      letter,
      accidental: accidentalOverride,
      written: false,
      octave: null,
    };
  }

  const keySignatureAccidentals = getKeySignatureAccidentals(keySig, mode);
  return {
    letter,
    accidental: keySignatureAccidentals.get(letter) ?? null,
    written: false,
    octave: null,
  };
}

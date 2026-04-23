import {
  ChordElementType,
  GuitarNoteElementType,
  NoteOrChordElementType,
} from '../types/elements';
import { MUSIC_CHORD_NODE } from './consts';
import {
  SCORED_MIN_FLEX_GROW,
  SCORED_MIN_FLEX_BASIS_PX,
  EMPTY_MEASURE_FLEX_BASIS_PX,
} from './notationDimensions';
import { durationToFactor } from './theoryConsts';

export const LYRIC_CHAR_SATURATION = 40; // exported for testing purposes
const WEIGHT_DURATION = 0.4;
// TODO: uncomment when accidental rendering is supported
// const WEIGHT_ACCIDENTAL = 0.15;
const WEIGHT_CHORD = 0.2;
const WEIGHT_LYRICS = 0.4;
const MAX_BUSYNESS_SCORE = 5;
const BUSYNESS_SCORE_INTERVALS = MAX_BUSYNESS_SCORE - 1; // e.g.: 1→2→3→4→5 = 4

function rawScoreToFinal(rawScore: number): number {
  return Math.max(
    1,
    Math.min(
      MAX_BUSYNESS_SCORE,
      Math.round(rawScore * BUSYNESS_SCORE_INTERVALS) + 1
    )
  );
}

function computeRawScore(elements: NoteOrChordElementType[]): number {
  // ── Duration score ───────────────────────────────────────────────────────
  // Find the shortest (fastest) note; shorter notes require more horizontal space.
  let shortestFactor = 1;
  for (const element of elements) {
    const factor = durationToFactor[element.duration];
    if (factor < shortestFactor) {
      shortestFactor = factor;
    }
  }
  // log2(1/factor) maps whole→0, half→1, quarter→2, ..., 128th→7; divide by 7 to normalize [0,1]
  const durationScore = Math.log2(1 / shortestFactor) / Math.log2(128);

  // ── Accidental score ─────────────────────────────────────────────────────
  // TODO: uncomment when accidental rendering is supported
  // let totalAccidentals = 0;
  // for (const element of elements) {
  //   if (element.nodeName === MUSIC_NOTE_NODE) {
  //     const note = element as NoteElementType;
  //     if (/[#b]/.test(note.value)) {
  //       totalAccidentals++;
  //     }
  //   } else if (element.nodeName === MUSIC_CHORD_NODE) {
  //     const chord = element as ChordElementType;
  //     for (const chordNote of chord.notes) {
  //       if (/[#b]/.test(chordNote.value)) {
  //         totalAccidentals++;
  //       }
  //     }
  //   }
  // }
  // const accidentalScore = Math.min(totalAccidentals, 4) / 4;

  // ── Chord complexity score ───────────────────────────────────────────────
  let maxChordNoteCount = 0;
  for (const element of elements) {
    if (element.nodeName === MUSIC_CHORD_NODE) {
      const chordElement = element as ChordElementType;
      if (chordElement.notes.length > maxChordNoteCount) {
        maxChordNoteCount = chordElement.notes.length;
      }
    }
  }
  const chordScore = Math.min(maxChordNoteCount, 5) / 5;

  return (
    durationScore * WEIGHT_DURATION +
    // accidentalScore * WEIGHT_ACCIDENTAL +  // TODO: uncomment when accidentals are rendered
    chordScore * WEIGHT_CHORD
  );
}

/**
 * Calculates a busyness score (1–5) for classical staves (no lyrics).
 *
 * Factors: fastest duration and chord complexity.
 * Accidental scoring is written but commented out — enable once accidentals
 * are rendered on individual notes.
 */
export function calculateStaffBusynessScore(
  elements: NoteOrChordElementType[]
): number {
  if (elements.length === 0) {
    return 1;
  }
  return rawScoreToFinal(computeRawScore(elements));
}

/**
 * Calculates a busyness score (1–5) for vocal staves (includes lyrics).
 *
 * Builds on calculateStaffBusynessScore and adds lyric character count as the
 * dominant factor.
 */
export function calculateStaffVocalBusynessScore(
  elements: NoteOrChordElementType[],
  lyricCharCount: number
): number {
  if (elements.length === 0) {
    return 1;
  }
  const lyricScore =
    Math.min(lyricCharCount, LYRIC_CHAR_SATURATION) / LYRIC_CHAR_SATURATION;
  return rawScoreToFinal(
    computeRawScore(elements) + lyricScore * WEIGHT_LYRICS
  );
}

/**
 * Calculates a busyness score (1–5) for guitar tab staves.
 *
 * Only considers rhythmic density (fastest duration) — guitar tab notes
 * have no accidentals or lyrics.
 */
export function calculateGuitarTabBusynessScore(
  elements: GuitarNoteElementType[]
): number {
  if (elements.length === 0) {
    return 1;
  }

  let shortestFactor = 1;
  for (const element of elements) {
    const factor = durationToFactor[element.duration];
    if (factor < shortestFactor) {
      shortestFactor = factor;
    }
  }
  const durationScore = Math.log2(1 / shortestFactor) / Math.log2(128);

  return Math.max(
    1,
    Math.min(
      MAX_BUSYNESS_SCORE,
      Math.round(durationScore * BUSYNESS_SCORE_INTERVALS) + 1
    )
  );
}

/**
 * Maps a busyness score (1–5) to a CSS flex-grow value.
 *
 * Score 1 → SCORED_MIN_FLEX_GROW (0.2): five score-1 measures fill one row.
 * Score 5 → 1.0: one dense measure takes a "full slot" in a five-measure row.
 * Empty measures (no score reported) use MIN_FLEX_GROW (≈0.333) via CSS default.
 */
export function scoreToFlexGrow(score: number): number {
  return SCORED_MIN_FLEX_GROW + ((score - 1) / 4) * (1 - SCORED_MIN_FLEX_GROW);
}

/**
 * Maps a busyness score (1–5) to a CSS flex-basis pixel value.
 *
 * Score 1 → SCORED_MIN_FLEX_BASIS_PX (180px): five score-1 measures trigger row wrap.
 * Score 5 → EMPTY_MEASURE_FLEX_BASIS_PX (300px): matches empty-measure basis.
 */
export function scoreToFlexBasis(score: number): number {
  return (
    SCORED_MIN_FLEX_BASIS_PX +
    ((score - 1) / 4) * (EMPTY_MEASURE_FLEX_BASIS_PX - SCORED_MIN_FLEX_BASIS_PX)
  );
}

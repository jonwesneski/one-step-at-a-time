import { NoteChordOrRestElementType } from '../types/elements';
import {
  BeatsInMeasure,
  BeatTypeInMeasure,
  DurationType,
  VoiceNumber,
} from '../types/theory';
import { MUSIC_REST_NODE } from '../utils/consts';
import { durationToFactor } from './theoryConsts';

// Matches the epsilon BeamsBuilder#scan already uses for beat-offset window
// comparisons.
const EPSILON = 1e-9;

/**
 * Detects a fully empty measure — every voice present is 100% rests summing
 * exactly to the measure's beat capacity — the only case a single shared
 * whole-bar rest is engraved instead of one rest inventory per voice.
 * Sum-based, not duration-literal-based: a literal 'whole' rest would
 * already overflow/get dropped in any measure with capacity < 1 (e.g. 3/4,
 * since this library has no dotted durations), so "every voice's rests sum
 * to the full measure" is the only reliable signal. Deliberately narrow: no
 * partial-bar alignment (too fuzzy to specify safely), and no tuplet-ratio
 * scaling (an empty measure built from tupleted rests is not a case this
 * optimization needs to handle — its sum simply won't match exactly, so
 * this safely does not fire rather than mis-detecting).
 *
 * Returns 'whole' when capacity <= 1, 'double-whole' when <= 2 (matching
 * real full-bar-rest convention), or null (skip the optimization) for any
 * larger meter — this library has no numbered whole-bar-rest glyph
 * convention beyond those two values.
 */
export function detectSharedWholeMeasureRest(
  truncatedVoices: ReadonlyMap<
    VoiceNumber,
    readonly NoteChordOrRestElementType[]
  >,
  timeSig: [BeatsInMeasure, BeatTypeInMeasure]
): DurationType | null {
  if (truncatedVoices.size === 0) {
    return null;
  }

  const [beatsInMeasure, beatType] = timeSig;
  const measureCapacity = beatsInMeasure / beatType;

  for (const elements of truncatedVoices.values()) {
    if (elements.length === 0) {
      return null; // an empty voice array isn't "all rests" — it's nothing
    }
    let sum = 0;
    for (const element of elements) {
      if (element.nodeName !== MUSIC_REST_NODE) {
        return null;
      }
      sum += durationToFactor[element.duration];
    }
    if (Math.abs(sum - measureCapacity) >= EPSILON) {
      return null;
    }
  }

  if (measureCapacity <= 1 + EPSILON) {
    return 'whole';
  }
  if (measureCapacity <= 2 + EPSILON) {
    return 'double-whole';
  }
  return null;
}

/**
 * Horizontal position (px) for the synthetic shared rest glyph — centered
 * across the measure's notes area, direction-agnostic (it represents every
 * voice at once, not one voice's own beat-driven position).
 */
export function sharedRestGlyphX(
  describeEndX: number,
  remainingWidth: number,
  noteSvgWidth: number
): number {
  return describeEndX + (remainingWidth - noteSvgWidth) / 2;
}

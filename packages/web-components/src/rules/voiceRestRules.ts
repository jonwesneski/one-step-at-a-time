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
 * Detects a measure where every voice's rests sum exactly to its capacity,
 * which takes one shared whole-bar rest. Sum-based, since a literal whole
 * rest won't fit a 3/4 bar. Tupleted rests don't match, so it doesn't fire.
 * Returns 'whole' for capacity <= 1, 'double-whole' for <= 2, else null.
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

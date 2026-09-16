import { DurationType } from '../types/theory';
import { MIN_NOTE_WIDTH, PIXELS_PER_BEAT } from '../utils/notationDimensions';
import { durationToFactor } from './theoryConsts';

/**
 * Two independent concerns live here, both about a staff's entries
 * (notes/chords/rests):
 *
 * 1. **Position** — `computeMeasureProportionalOffsets` answers "where does
 *    each entry sit within the notes area". An entry's x is its cumulative
 *    beat-offset (from rules/beatRules.ts) as a *fraction of the measure's
 *    fixed beat capacity* (from the time signature — a constant, independent
 *    of how many entries currently exist), scaled by the staff's real
 *    available width. This is what makes a full measure fill the staff,
 *    what makes resizing reflow every entry together (like conventional
 *    notation software), and what makes appending an entry never move an
 *    already-placed one — the fraction's denominator (beat capacity) and the
 *    available width it's scaled by are both untouched by adding a note.
 *
 * 2. **Sizing preference** — `computeSpacingWeights` answers a different
 *    question entirely: "how wide would this measure's box *like* to be,
 *    given how busy it is" — feeding staffWidth.ts's natural-width/flex-basis
 *    calculation (see CLAUDE.md's "Measure Width"). This legitimately scales
 *    with the current entry count/mix (a busier measure should ask for a
 *    wider box) and is unrelated to where an entry is actually drawn.
 *
 * Pure — callers supply a tuplet scale/offset map so this module stays free
 * of the tuplet/SVG dependency chain.
 */

// ─── Position ───────────────────────────────────────────────────────────────

/**
 * Per-entry x-offset (px) within the notes area: `beatOffsets[i] /
 * measureCapacity` (the entry's fraction of the measure's fixed beat
 * capacity) times `availableWidth`. `measureCapacity` and `availableWidth`
 * are both independent of how many entries exist, so an entry's offset is
 * stable once computed — appending a new entry never changes an earlier
 * entry's offset. Callers still layer collision clamps (a MIN_NOTE_WIDTH
 * floor against the previous entry, leftward/rightward decoration footprints)
 * on top of this base position.
 */
export function computeMeasureProportionalOffsets(
  beatOffsets: readonly number[],
  measureCapacity: number,
  availableWidth: number
): number[] {
  if (measureCapacity <= 0) {
    return beatOffsets.map(() => 0);
  }
  const width = Math.max(0, availableWidth);
  return beatOffsets.map(
    (beatOffset) => (beatOffset / measureCapacity) * width
  );
}

// ─── Sizing preference ──────────────────────────────────────────────────────

export interface SpacingWeights {
  /**
   * Per-entry slack (px) beyond the MIN_NOTE_WIDTH strut, parallel to
   * `entries` — floored at 0 (a duration shorter than MIN_NOTE_WIDTH's worth
   * of beats wants no extra slack, not negative slack). Kept separate from
   * the strut because staffWidth.ts's natural-width calculation adds its own
   * noteCount × MIN_NOTE_WIDTH strut term — folding the strut in here would
   * double-count it there.
   */
  weights: number[];
  /** Σ of `weights` — the measure's total slack beyond its strut. */
  totalWeight: number;
}

/**
 * Slack (px) beyond the MIN_NOTE_WIDTH strut for every entry: its own
 * duration × PIXELS_PER_BEAT minus the strut, scaled by
 * `tupletScaleByIndex.get(i)` (normal/actual) when tupleted, floored at 0.
 * Feeds only the measure's sizing *preference* (staffWidth.ts) — not entry
 * position, which is computeMeasureProportionalOffsets above.
 */
export function computeSpacingWeights(
  entries: ReadonlyArray<{ readonly duration: DurationType }>,
  tupletScaleByIndex: ReadonlyMap<number, number> = new Map()
): SpacingWeights {
  let totalWeight = 0;
  const weights = entries.map((entry, i) => {
    const factor = durationToFactor[entry.duration];
    const scale = tupletScaleByIndex.get(i) ?? 1;
    const weight =
      Math.max(0, factor * PIXELS_PER_BEAT - MIN_NOTE_WIDTH) * scale;
    totalWeight += weight;
    return weight;
  });
  return { weights, totalWeight };
}

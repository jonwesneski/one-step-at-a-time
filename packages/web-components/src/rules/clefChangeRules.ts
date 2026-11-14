// A mid-stream clef change takes effect where it is written: at the end of
// the voice-1 entry it follows. Every voice resolves its clef, and its
// horizontal shift past the clef glyph, from that one beat.

/** Tolerance for comparing beats, which are float sums (tuplets). */
export const CLEF_BEAT_EPSILON = 1e-9;

/**
 * The beat (whole-note fraction) a clef change takes effect at: -1 for a
 * change before the first entry, otherwise the end of the voice-1 entry it
 * follows.
 */
export function clefChangeBeat(
  afterElementIndex: number,
  voice1BeatEnds: readonly number[]
): number {
  if (afterElementIndex === -1) {
    return -1;
  }
  return voice1BeatEnds[afterElementIndex] ?? -1;
}

/**
 * Index (into `changeBeats`) of the clef change in effect for an entry
 * starting at `beat`: the latest one at or before it. -1 when none applies.
 */
export function activeClefChangeIndex(
  changeBeats: readonly number[],
  beat: number
): number {
  let active = -1;
  let activeBeat = -Infinity;
  changeBeats.forEach((changeBeat, index) => {
    if (changeBeat <= beat + CLEF_BEAT_EPSILON && changeBeat > activeBeat) {
      active = index;
      activeBeat = changeBeat;
    }
  });
  return active;
}

/** How many clef changes an entry starting at `beat` comes after. */
export function clefChangesReached(
  changeBeats: readonly number[],
  beat: number
): number {
  return changeBeats.filter(
    (changeBeat) => changeBeat <= beat + CLEF_BEAT_EPSILON
  ).length;
}

/**
 * Every clef-change beat from the given staves, sorted, with changes on the
 * same beat merged so they reserve one slot.
 */
export function mergeClefChangeBeats(
  ...lists: readonly (readonly number[])[]
): number[] {
  const merged: number[] = [];
  for (const beat of lists.flat().sort((a, b) => a - b)) {
    const last = merged[merged.length - 1];
    if (last === undefined || beat - last > CLEF_BEAT_EPSILON) {
      merged.push(beat);
    }
  }
  return merged;
}

/** Whether two clef-change beat lists hold the same beats. */
export function sameClefChangeBeats(
  a: readonly number[],
  b: readonly number[]
): boolean {
  return (
    a.length === b.length &&
    a.every((beat, i) => Math.abs(beat - b[i]) <= CLEF_BEAT_EPSILON)
  );
}

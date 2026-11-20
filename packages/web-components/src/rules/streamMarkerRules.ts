// Zero-duration markers in a staff's note stream: a mid-stream clef change
// and a mid-bar barline. Each takes effect where it is written, at the end of
// the voice-1 entry it follows, and reserves horizontal room there for every
// voice and every staff of its measure.

import type { BarlineType } from '../types/theory';

/** Tolerance for comparing beats, which are float sums (tuplets). */
export const MARKER_BEAT_EPSILON = 1e-9;

export type StreamMarkerKind = 'clef' | 'barline';

/** One marker as its measure's staves share it. */
export type MarkerBeat = {
  beat: number;
  kind: StreamMarkerKind;
  /** Room the marker reserves in the note stream (px). */
  width: number;
  /** The design a barline marker draws; null for a clef. */
  barlineType: BarlineType | null;
};

/**
 * The beat (whole-note fraction) a marker takes effect at: -1 for one before
 * the first entry, otherwise the end of the voice-1 entry it follows.
 */
export function markerBeat(
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
    if (changeBeat <= beat + MARKER_BEAT_EPSILON && changeBeat > activeBeat) {
      active = index;
      activeBeat = changeBeat;
    }
  });
  return active;
}

/** Room every marker at or before `beat` reserves, so an entry there follows them. */
export function markerWidthReached(
  markers: readonly MarkerBeat[],
  beat: number
): number {
  return markers
    .filter((marker) => marker.beat <= beat + MARKER_BEAT_EPSILON)
    .reduce((sum, marker) => sum + marker.width, 0);
}

export function totalMarkerWidth(markers: readonly MarkerBeat[]): number {
  return markers.reduce((sum, marker) => sum + marker.width, 0);
}

function sameSlot(a: MarkerBeat, b: MarkerBeat): boolean {
  return a.kind === b.kind && Math.abs(a.beat - b.beat) <= MARKER_BEAT_EPSILON;
}

/**
 * Every marker from the given staves, sorted by beat, with same-kind markers
 * on the same beat merged so they reserve one slot. Markers sharing a beat
 * keep the order of the first list that holds them (stream order); for a
 * barline, the first list's design wins.
 */
export function mergeMarkerBeats(
  ...lists: readonly (readonly MarkerBeat[])[]
): MarkerBeat[] {
  const merged: MarkerBeat[] = [];
  for (const marker of lists.flat()) {
    if (!merged.some((existing) => sameSlot(existing, marker))) {
      merged.push(marker);
    }
  }
  // Array#sort is stable, so same-beat markers keep their insertion order.
  return merged.sort((a, b) =>
    Math.abs(a.beat - b.beat) <= MARKER_BEAT_EPSILON ? 0 : a.beat - b.beat
  );
}

/**
 * One message per mid-bar barline written with different designs on the
 * same beat in different staves of a measure.
 */
export function barlineTypeConflicts(
  ...lists: readonly (readonly MarkerBeat[])[]
): string[] {
  const seen: MarkerBeat[] = [];
  const warnings: string[] = [];
  for (const marker of lists.flat()) {
    if (marker.kind !== 'barline') {
      continue;
    }
    const first = seen.find((existing) => sameSlot(existing, marker));
    if (first === undefined) {
      seen.push(marker);
    } else if (first.barlineType !== marker.barlineType) {
      warnings.push(
        `<music-barline> types "${first.barlineType}" and "${marker.barlineType}" share one beat in this measure; drawing "${first.barlineType}"`
      );
    }
  }
  return warnings;
}

/** Whether two marker lists reserve the same slots. */
export function sameMarkerBeats(
  a: readonly MarkerBeat[],
  b: readonly MarkerBeat[]
): boolean {
  return (
    a.length === b.length &&
    a.every(
      (marker, i) =>
        sameSlot(marker, b[i]) &&
        marker.width === b[i].width &&
        marker.barlineType === b[i].barlineType
    )
  );
}

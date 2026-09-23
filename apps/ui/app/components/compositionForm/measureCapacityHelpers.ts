import type {
  DurationType,
  TimeSignature,
  TupletRatio,
} from '@one-step-at-a-time/web-components';
import {
  DURATIONS,
  durationToFactor,
  parseTupletRatio,
} from '@one-step-at-a-time/web-components';
import { timeSignatureOfEntry } from './timeSignaturesHelpers';
import type {
  CompositionStructure,
  MusicEntry,
  NormalizedStaff,
  NormalizedTuplet,
} from './types';
import { isPitchedEntry } from './types';

// How much of a measure one whole note fills is 1.0; a 4/4 measure holds 1.0,
// a 3/4 measure 0.75, a 6/8 measure 0.75, etc. Mirrors the library's
// measureRules.computeAllowedElementCount, which derives the same
// `beatsInMeasure / beatType` budget and the same tuplet scaling — kept in sync
// because this app is the sole writer and the renderer silently drops entries
// past the budget.

// Duration factors are exact powers of two; comparisons tolerate float drift
// from tuplet scaling (normal/actual divisions).
export const CAPACITY_EPSILON = 1e-9;

export function durationFits(
  duration: DurationType,
  available: number
): boolean {
  return durationToFactor[duration] <= available + CAPACITY_EPSILON;
}

export function measureDuration(timeSig: TimeSignature): number {
  const [beats, beatType] = timeSig.split('/').map(Number);
  return beats / beatType;
}

// One entry's share of the measure budget: its duration factor, scaled by the
// tuplet ratio when it belongs to one. Zero for clef markers.
export function entryFactor(
  entry: MusicEntry,
  tupletsById: Record<string, NormalizedTuplet>
): number {
  if (!isPitchedEntry(entry)) {
    return 0;
  }
  const base = durationToFactor[entry.duration];
  const tuplet = entry.tupletId ? tupletsById[entry.tupletId] : undefined;
  if (!tuplet) {
    return base;
  }
  const { actual, normal } = parseTupletRatio(tuplet.ratio);
  return base * (normal / actual);
}

export function usedDuration(
  entries: MusicEntry[],
  tupletsById: Record<string, NormalizedTuplet>
): number {
  return entries.reduce(
    (sum, entry) => sum + entryFactor(entry, tupletsById),
    0
  );
}

export function remainingDuration(
  entries: MusicEntry[],
  timeSig: TimeSignature,
  tupletsById: Record<string, NormalizedTuplet>
): number {
  return measureDuration(timeSig) - usedDuration(entries, tupletsById);
}

export type StaffVoiceContext = { staff: NormalizedStaff; voiceId: string };

export function staffOfEntryId(
  structure: CompositionStructure,
  entryId: string
): StaffVoiceContext | null {
  for (const staff of Object.values(structure.stavesById)) {
    for (const voiceId of staff.voiceOrder) {
      if (staff.voicesById[voiceId].entryIds.includes(entryId)) {
        return { staff, voiceId };
      }
    }
  }
  return null;
}

// Budget available to `entryId` if its own slot is freed — i.e. the largest a
// single entry at that position may grow to, within its own voice's stream.
// Returns the whole-measure budget when the entry isn't found or carries no
// beat duration.
export function availableForDuration(
  structure: CompositionStructure,
  timeSig: TimeSignature,
  entryId: string
): number {
  const total = measureDuration(timeSig);
  const context = staffOfEntryId(structure, entryId);
  if (!context) {
    return total;
  }
  const entries = context.staff.voicesById[context.voiceId].entryIds.map(
    (id) => structure.entriesById[id]
  );
  const used = usedDuration(entries, structure.tupletsById);
  const self = structure.entriesById[entryId];
  const freed = self ? entryFactor(self, structure.tupletsById) : 0;
  return total - (used - freed);
}

// Whether re-ratioing (or creating) a tuplet over `entryIds` to `ratio` keeps
// the measure within budget. A triplet shrinks the run so it always fits one
// that already did; a duplet grows it (`normal/actual > 1`) and can overfill.
// Mirrors `fittingDurations`' role for the Add controls — the tuplet picker
// filters its options through this.
export function tupletRatioFits(
  structure: CompositionStructure,
  entryIds: string[],
  ratio: TupletRatio
): boolean {
  const context = staffOfEntryId(structure, entryIds[0]);
  if (!context) {
    return true;
  }
  const total = measureDuration(timeSignatureOfEntry(structure, entryIds[0]));
  const entries = context.staff.voicesById[context.voiceId].entryIds.map(
    (id) => structure.entriesById[id]
  );
  const used = usedDuration(entries, structure.tupletsById);
  const currentRun = entryIds.reduce(
    (sum, id) =>
      sum + entryFactor(structure.entriesById[id], structure.tupletsById),
    0
  );
  const { actual, normal } = parseTupletRatio(ratio);
  const nextRun = entryIds.reduce((sum, id) => {
    const entry = structure.entriesById[id];
    return isPitchedEntry(entry)
      ? sum + durationToFactor[entry.duration] * (normal / actual)
      : sum;
  }, 0);
  return used - currentRun + nextRun <= total + CAPACITY_EPSILON;
}

// Durations offerable for an entry currently set to `current`: everything that
// fits `available`, plus `current` and every value shorter than it, so a
// pre-existing overfull measure or a time-signature change never drops the value
// the control is showing.
export function fittingDurations(
  available: number,
  current: DurationType
): DurationType[] {
  const currentIndex = DURATIONS.indexOf(current);
  return DURATIONS.filter(
    (duration, index) =>
      (currentIndex !== -1 && index >= currentIndex) ||
      durationFits(duration, available)
  );
}

// The largest duration that fits `available`, or null when nothing does.
export function largestFittingDuration(available: number): DurationType | null {
  return (
    DURATIONS.find((duration) => durationFits(duration, available)) ?? null
  );
}

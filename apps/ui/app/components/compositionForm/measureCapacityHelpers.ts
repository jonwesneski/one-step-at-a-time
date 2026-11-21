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

// What an entry's beat share depends on beyond itself.
export type FactorSource = Pick<
  CompositionStructure,
  'tupletsById' | 'entriesById'
>;

// Members per tremolo group, cached per entriesById snapshot (structures are
// immutable, so a new edit means a new object).
const tremoloSizeCache = new WeakMap<object, Map<string, number>>();

function tremoloSize(source: FactorSource, tremoloId: string): number {
  let sizes = tremoloSizeCache.get(source.entriesById);
  if (!sizes) {
    sizes = new Map();
    for (const entry of Object.values(source.entriesById)) {
      if (isPitchedEntry(entry) && entry.tremoloId) {
        sizes.set(entry.tremoloId, (sizes.get(entry.tremoloId) ?? 0) + 1);
      }
    }
    tremoloSizeCache.set(source.entriesById, sizes);
  }
  return sizes.get(tremoloId) ?? 1;
}

// An entry's share before any tuplet scaling: its duration factor, 1/N of it
// for each of a tremolo's N members, and nothing for a written-out arpeggio's
// run note. Mirrors the library's rules/beatRules.ts#durationContribution.
export function entryFactorBeforeTuplet(
  entry: MusicEntry,
  source: FactorSource
): number {
  if (entry.type === 'guitar-note') {
    return durationToFactor[entry.duration];
  }
  if (!isPitchedEntry(entry)) {
    return 0;
  }
  if (entry.type === 'note' && entry.arpeggioId) {
    return 0;
  }
  const base = durationToFactor[entry.duration];
  return entry.tremoloId ? base / tremoloSize(source, entry.tremoloId) : base;
}

// One entry's share of the measure budget, scaled by its tuplet's ratio when
// it belongs to one. Zero for clef and barline markers.
export function entryFactor(entry: MusicEntry, source: FactorSource): number {
  const share = entryFactorBeforeTuplet(entry, source);
  if (!isPitchedEntry(entry) || !entry.tupletId) {
    return share;
  }
  const tuplet = source.tupletsById[entry.tupletId];
  if (!tuplet) {
    return share;
  }
  const { actual, normal } = parseTupletRatio(tuplet.ratio);
  return share * (normal / actual);
}

export function usedDuration(
  entries: MusicEntry[],
  source: FactorSource
): number {
  return entries.reduce((sum, entry) => sum + entryFactor(entry, source), 0);
}

export function remainingDuration(
  entries: MusicEntry[],
  timeSig: TimeSignature,
  source: FactorSource
): number {
  return measureDuration(timeSig) - usedDuration(entries, source);
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
  const used = usedDuration(entries, structure);
  const self = structure.entriesById[entryId];
  const freed = self ? entryFactor(self, structure) : 0;
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
  const used = usedDuration(entries, structure);
  const currentRun = entryIds.reduce(
    (sum, id) => sum + entryFactor(structure.entriesById[id], structure),
    0
  );
  const { actual, normal } = parseTupletRatio(ratio);
  const nextRun = entryIds.reduce(
    (sum, id) =>
      sum +
      entryFactorBeforeTuplet(structure.entriesById[id], structure) *
        (normal / actual),
    0
  );
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

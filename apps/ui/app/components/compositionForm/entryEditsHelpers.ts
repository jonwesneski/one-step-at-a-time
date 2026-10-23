import { pruneBrokenTies } from './connectorsHelpers';
import {
  availableForDuration,
  durationFits,
  largestFittingDuration,
} from './measureCapacityHelpers';
import { pruneInvalidNotationLinks } from './notationLinksHelpers';
import { timeSignatureOfEntry } from './timeSignaturesHelpers';
import type { CompositionStructure, MusicEntry } from './types';
import { isPitchedEntry } from './types';

// Replaces one entry in place, keyed by id. Returns the structure unchanged when
// the entry is not present (a stale selection). Kept pure and colocated with a
// test; the `updateEntry` mutator in CompositionInput just wraps this in
// `record()`.
//
// A duration that would overfill the entry's measure (under that measure's
// effective time signature) is clamped down to the largest value that fits — the
// last line of defense behind the filtered `DurationSelect`, so no caller can
// push the measure past its budget (the renderer silently drops entries beyond
// it).
//
// The edit can also break a tie — a new pitch/octave, changed chord notes, a
// note→rest conversion — so `pruneBrokenTies` drops any tie that no longer joins
// a single sustained pitch afterward.
export function applyEntryUpdate(
  structure: CompositionStructure,
  entry: MusicEntry
): CompositionStructure {
  if (!structure.entriesById[entry.id]) {
    return structure;
  }
  return pruneInvalidNotationLinks(
    pruneBrokenTies({
      ...structure,
      entriesById: {
        ...structure.entriesById,
        [entry.id]: clampDuration(structure, entry),
      },
    })
  );
}

function clampDuration(
  structure: CompositionStructure,
  entry: MusicEntry
): MusicEntry {
  const current = structure.entriesById[entry.id];
  if (
    !isPitchedEntry(entry) ||
    !isPitchedEntry(current) ||
    entry.duration === current.duration
  ) {
    return entry;
  }
  const timeSignature = timeSignatureOfEntry(structure, entry.id);
  const available = availableForDuration(structure, timeSignature, entry.id);
  if (durationFits(entry.duration, available)) {
    return entry;
  }
  return {
    ...entry,
    duration: largestFittingDuration(available) ?? current.duration,
  };
}

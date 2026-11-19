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

// Replaces one entry in place, keyed by id; unchanged when the entry is gone.
// A duration that would overfill the measure is clamped to the largest that
// fits (the renderer drops overflow). Ties the edit breaks are pruned.
export function applyEntryUpdate(
  structure: CompositionStructure,
  entry: MusicEntry
): CompositionStructure {
  if (!structure.entriesById[entry.id]) {
    return structure;
  }
  return pruneBrokenTies(
    pruneInvalidNotationLinks({
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

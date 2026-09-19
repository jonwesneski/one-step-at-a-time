import type {
  CompositionStructure,
  MusicEntry,
  NormalizedTuplet,
  PitchedEntry,
  Selection,
} from './types';
import { isPitchedEntry } from './types';

// Tuplet resolution for the composition form. A tuplet groups a contiguous run
// of entries within one staff; membership is a flat `tupletId` on each entry,
// order comes from `staff.entryIds`. Mirrors the shape of staffGroupsHelpers.ts — this
// app is the sole writer, so the helpers only handle well-formed data.
//
// The library renderer wants each `<music-tuplet>` as a direct child of
// `<music-staff>`, and rejects a `<music-clef>` inside one — so a run never
// spans a clef entry (see resolveTupletRuns).

export type TupletRun = {
  tupletId: string | null;
  entries: MusicEntry[];
};

const tupletIdOf = (entry: MusicEntry): string | null =>
  isPitchedEntry(entry) ? entry.tupletId ?? null : null;

// Groups a staff's entries into consecutive runs for rendering: each run is
// either a tuplet (all entries share one non-null tupletId, uninterrupted) or a
// stretch of loose entries (tupletId null). A clef entry always ends the
// current run and forms its own loose run.
export function resolveTupletRuns(
  entryIds: string[],
  entriesById: Record<string, MusicEntry>
): TupletRun[] {
  const runs: TupletRun[] = [];
  let current: TupletRun | null = null;

  for (const entryId of entryIds) {
    const entry = entriesById[entryId];
    if (!entry) {
      continue;
    }
    const tupletId = tupletIdOf(entry);
    if (current && current.tupletId === tupletId && tupletId !== null) {
      current.entries.push(entry);
      continue;
    }
    current = { tupletId, entries: [entry] };
    runs.push(current);
  }

  return runs;
}

// True when the selection is a valid tuplet target: 2+ entries, all in one
// staff's one voice, forming a contiguous run in that voice's entryIds, none
// of them clef markers. Returns the ordered entry ids, or null.
export function tupletCandidate(
  selection: Selection,
  structure: CompositionStructure
): { staffId: string; voiceId: string; entryIds: string[] } | null {
  if (selection.measureIds.length > 0 || selection.staffIds.length > 0) {
    return null;
  }
  if (selection.entryIds.length < 2) {
    return null;
  }
  const selected = new Set(selection.entryIds);

  for (const staff of Object.values(structure.stavesById)) {
    for (const voiceId of staff.voiceOrder) {
      const voice = staff.voicesById[voiceId];
      const indices = voice.entryIds
        .map((id, index) => ({ id, index }))
        .filter((item) => selected.has(item.id));
      if (indices.length === 0) {
        continue;
      }
      if (indices.length !== selected.size) {
        return null;
      }
      const contiguous =
        indices[indices.length - 1].index - indices[0].index ===
        indices.length - 1;
      if (!contiguous) {
        return null;
      }
      const entryIds = indices.map((item) => item.id);
      if (entryIds.some((id) => !isPitchedEntry(structure.entriesById[id]))) {
        return null;
      }
      return { staffId: staff.id, voiceId, entryIds };
    }
  }

  return null;
}

export function tupletOfEntries(
  structure: CompositionStructure,
  entryIds: string[]
): NormalizedTuplet | null {
  const ids = new Set(
    entryIds.map((id) => tupletIdOf(structure.entriesById[id]))
  );
  if (ids.size !== 1) {
    return null;
  }
  const [tupletId] = ids;
  return tupletId ? structure.tupletsById[tupletId] ?? null : null;
}

// Creates (or re-ratios) a tuplet over `entryIds`, clearing any tuplet whose
// members overlap the selection, then stamping the new id on each entry.
// `ratio === null` removes the tuplet the entries currently belong to.
export function setTuplet(
  structure: CompositionStructure,
  entryIds: string[],
  ratio: NormalizedTuplet['ratio'] | null
): CompositionStructure {
  const clearedTupletIds = new Set<string>();
  for (const id of entryIds) {
    const existing = tupletIdOf(structure.entriesById[id]);
    if (existing) {
      clearedTupletIds.add(existing);
    }
  }

  const entriesById = { ...structure.entriesById };
  const withTuplet = (entry: MusicEntry, tupletId: string | null): MusicEntry =>
    isPitchedEntry(entry)
      ? ({ ...entry, tupletId } satisfies PitchedEntry)
      : entry;

  // Drop the stale tuplet from every entry that referenced it, not just the
  // selected ones, so a partial re-selection never leaves a 1-member tuplet.
  for (const [id, entry] of Object.entries(entriesById)) {
    if (
      isPitchedEntry(entry) &&
      entry.tupletId &&
      clearedTupletIds.has(entry.tupletId)
    ) {
      entriesById[id] = withTuplet(entry, null);
    }
  }

  const tupletsById = { ...structure.tupletsById };
  for (const id of clearedTupletIds) {
    delete tupletsById[id];
  }

  if (ratio !== null) {
    const newId = crypto.randomUUID();
    tupletsById[newId] = { id: newId, ratio };
    for (const id of entryIds) {
      entriesById[id] = withTuplet(entriesById[id], newId);
    }
  }

  return { ...structure, entriesById, tupletsById };
}

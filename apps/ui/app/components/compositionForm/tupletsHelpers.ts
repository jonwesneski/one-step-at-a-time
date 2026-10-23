import type { TupletPlacement } from '@one-step-at-a-time/web-components';
import { durationToFactor } from '@one-step-at-a-time/web-components';
import { adjacentStaffPair } from './crossStaffHelpers';
import { CAPACITY_EPSILON } from './measureCapacityHelpers';
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
    // Re-ratioing one existing tuplet keeps its bracket side.
    const [onlyCleared] =
      clearedTupletIds.size === 1 ? [...clearedTupletIds] : [];
    const placement = onlyCleared
      ? structure.tupletsById[onlyCleared]?.placement ?? null
      : null;
    tupletsById[newId] = { id: newId, ratio, placement };
    for (const id of entryIds) {
      entriesById[id] = withTuplet(entriesById[id], newId);
    }
  }

  return { ...structure, entriesById, tupletsById };
}

export function setTupletPlacement(
  structure: CompositionStructure,
  tupletId: string,
  placement: TupletPlacement | null
): CompositionStructure {
  const tuplet = structure.tupletsById[tupletId];
  if (!tuplet || (tuplet.placement ?? null) === placement) {
    return structure;
  }
  return {
    ...structure,
    tupletsById: {
      ...structure.tupletsById,
      [tupletId]: { ...tuplet, placement },
    },
  };
}

// Cross-staff tuplets (`tuplet-group`): one tuplet indication over a line
// passed between the hands, with no shared beam. Mirrors the library's
// rules/crossStaffTupletRules.ts#resolveCrossStaffTupletGroups — one tuplet
// per staff on two adjacent staves of one measure, same ratio, same total
// duration, notes on both staves, no beam-group members. Each staff's run
// holds that hand's notes plus rests for the other hand's beats, which are
// hidden so only one hand's note shows at each beat.

export type CrossStaffTupletRun = {
  staffId: string;
  voiceId: string;
  entryIds: string[];
};

export type CrossStaffTupletCandidate = {
  measureId: string;
  runs: [CrossStaffTupletRun, CrossStaffTupletRun];
};

function writtenTotal(
  structure: CompositionStructure,
  entryIds: readonly string[]
): number {
  return entryIds.reduce((sum, id) => {
    const entry = structure.entriesById[id];
    return sum + (isPitchedEntry(entry) ? durationToFactor[entry.duration] : 0);
  }, 0);
}

function crossStaffRunsAreValid(
  structure: CompositionStructure,
  runs: readonly CrossStaffTupletRun[]
): boolean {
  if (runs.length !== 2) {
    return false;
  }
  const entries = runs.flatMap((run) =>
    run.entryIds.map((id) => structure.entriesById[id])
  );
  const hasNotes = (run: CrossStaffTupletRun) =>
    run.entryIds.some((id) => {
      const type = structure.entriesById[id]?.type;
      return type === 'note' || type === 'chord';
    });
  return (
    runs.every(hasNotes) &&
    Math.abs(
      writtenTotal(structure, runs[0].entryIds) -
        writtenTotal(structure, runs[1].entryIds)
    ) < CAPACITY_EPSILON &&
    entries.every((entry) => !isPitchedEntry(entry) || !entry.beamGroupId)
  );
}

function measureAndOrder(
  structure: CompositionStructure,
  staffIdA: string,
  staffIdB: string
): { measureId: string; topStaffId: string } | null {
  for (const measureId of structure.measureOrder) {
    const pair = adjacentStaffPair(structure, measureId, staffIdA, staffIdB);
    if (pair) {
      return { measureId, topStaffId: pair.topStaffId };
    }
  }
  return null;
}

// Two contiguous single-voice runs, one on each of two adjacent staves of one
// measure, that can be bracketed as one tuplet.
export function crossStaffTupletCandidate(
  selection: Selection,
  structure: CompositionStructure
): CrossStaffTupletCandidate | null {
  if (selection.measureIds.length > 0 || selection.staffIds.length > 0) {
    return null;
  }
  const byStaff = new Map<string, string[]>();
  for (const staff of Object.values(structure.stavesById)) {
    const ids = selection.entryIds.filter((id) =>
      staff.voiceOrder.some((voiceId) =>
        staff.voicesById[voiceId].entryIds.includes(id)
      )
    );
    if (ids.length > 0) {
      byStaff.set(staff.id, ids);
    }
  }
  if (byStaff.size !== 2) {
    return null;
  }
  const runs = [...byStaff.values()].map((entryIds) =>
    tupletCandidate({ measureIds: [], staffIds: [], entryIds }, structure)
  );
  if (runs.some((run) => run === null)) {
    return null;
  }
  const [first, second] = runs as CrossStaffTupletRun[];
  const placement = measureAndOrder(structure, first.staffId, second.staffId);
  if (!placement || !crossStaffRunsAreValid(structure, [first, second])) {
    return null;
  }
  return {
    measureId: placement.measureId,
    runs:
      placement.topStaffId === first.staffId
        ? [first, second]
        : [second, first],
  };
}

// The linked pair of tuplets already covering exactly the candidate's runs.
export function crossStaffTupletOf(
  structure: CompositionStructure,
  candidate: CrossStaffTupletCandidate
): [NormalizedTuplet, NormalizedTuplet] | null {
  const [top, bottom] = candidate.runs.map((run) =>
    tupletOfEntries(structure, run.entryIds)
  );
  if (
    !top ||
    !bottom ||
    !top.crossStaffGroupId ||
    top.crossStaffGroupId !== bottom.crossStaffGroupId
  ) {
    return null;
  }
  return [top, bottom];
}

function setRestsHidden(
  structure: CompositionStructure,
  entryIds: readonly string[],
  hidden: boolean
): CompositionStructure {
  const entriesById = { ...structure.entriesById };
  for (const id of entryIds) {
    const entry = entriesById[id];
    if (entry?.type === 'rest') {
      entriesById[id] = { ...entry, hidden };
    }
  }
  return { ...structure, entriesById };
}

// Brackets both runs as one cross-staff tuplet (`ratio`), hiding the rests
// inside them when `hideRests`; `ratio === null` removes both tuplets and
// shows those rests again.
export function setCrossStaffTuplet(
  structure: CompositionStructure,
  candidate: CrossStaffTupletCandidate,
  ratio: NormalizedTuplet['ratio'] | null,
  { hideRests }: { hideRests: boolean } = { hideRests: true }
): CompositionStructure {
  const allEntryIds = candidate.runs.flatMap((run) => run.entryIds);
  if (ratio === null) {
    let next = setRestsHidden(structure, allEntryIds, false);
    for (const run of candidate.runs) {
      next = setTuplet(next, run.entryIds, null);
    }
    return next;
  }

  let next = structure;
  for (const run of candidate.runs) {
    next = setTuplet(next, run.entryIds, ratio);
  }
  const crossStaffGroupId = crypto.randomUUID();
  const tupletsById = { ...next.tupletsById };
  for (const run of candidate.runs) {
    const tuplet = tupletOfEntries(next, run.entryIds);
    if (tuplet) {
      tupletsById[tuplet.id] = { ...tuplet, crossStaffGroupId };
    }
  }
  next = { ...next, tupletsById };
  return hideRests ? setRestsHidden(next, allEntryIds, true) : next;
}

// Unlinks every cross-staff pair the library would drop (see above); each
// tuplet stays as an ordinary one-staff tuplet.
export function pruneInvalidCrossStaffTuplets(
  structure: CompositionStructure
): CompositionStructure {
  const membersByTuplet = new Map<string, string[]>();
  const staffVoiceOfEntry = new Map<
    string,
    { staffId: string; voiceId: string }
  >();
  for (const staff of Object.values(structure.stavesById)) {
    for (const voiceId of staff.voiceOrder) {
      for (const id of staff.voicesById[voiceId].entryIds) {
        staffVoiceOfEntry.set(id, { staffId: staff.id, voiceId });
        const tupletId = tupletIdOf(structure.entriesById[id]);
        if (tupletId) {
          membersByTuplet.set(tupletId, [
            ...(membersByTuplet.get(tupletId) ?? []),
            id,
          ]);
        }
      }
    }
  }

  const tupletsByGroup = new Map<string, NormalizedTuplet[]>();
  for (const tuplet of Object.values(structure.tupletsById)) {
    if (tuplet.crossStaffGroupId) {
      tupletsByGroup.set(tuplet.crossStaffGroupId, [
        ...(tupletsByGroup.get(tuplet.crossStaffGroupId) ?? []),
        tuplet,
      ]);
    }
  }

  let tupletsById = structure.tupletsById;
  for (const tuplets of tupletsByGroup.values()) {
    const runs = tuplets.map((tuplet) => {
      const entryIds = membersByTuplet.get(tuplet.id) ?? [];
      const location = staffVoiceOfEntry.get(entryIds[0]);
      return location ? { ...location, entryIds } : null;
    });
    const valid =
      tuplets.length === 2 &&
      tuplets[0].ratio === tuplets[1].ratio &&
      runs.every((run) => run !== null) &&
      measureAndOrder(structure, runs[0]!.staffId, runs[1]!.staffId) !== null &&
      crossStaffRunsAreValid(structure, runs as CrossStaffTupletRun[]);
    if (!valid) {
      tupletsById = { ...tupletsById };
      for (const tuplet of tuplets) {
        tupletsById[tuplet.id] = { ...tuplet, crossStaffGroupId: null };
      }
    }
  }
  return tupletsById === structure.tupletsById
    ? structure
    : { ...structure, tupletsById };
}

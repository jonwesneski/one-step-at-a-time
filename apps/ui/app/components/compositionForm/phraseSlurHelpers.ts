import { staffOfEntry } from './connectorsHelpers';
import { entryOnset } from './crossStaffHelpers';
import { CAPACITY_EPSILON } from './measureCapacityHelpers';
import type { CompositionStructure, MusicEntry, Selection } from './types';

// Cross-staff phrase slurs (`slur-group`): one continuous slur over a line
// passed between the hands. The library joins a group's members in rendered
// x order (connectorsBuilder.ts#collectPhraseSlurPairs) and expects only the
// breakpoints to carry the key — the first and last note of each one-staff
// leg — so the user selects the whole passage and this file derives them.

export type PhraseSlurCandidate = {
  startEntryId: string;
  breakpointEntryIds: string[];
  legCount: number;
};

type Placed = {
  id: string;
  staffIndex: number;
  measureIndex: number;
  onset: number;
};

const isNoteOrChord = (entry: MusicEntry | undefined): boolean =>
  entry?.type === 'note' || entry?.type === 'chord';

// The selected notes/chords as a phrase across exactly two adjacent staff
// positions (any number of measures), with at least two legs. Null when the
// selection isn't one: a single staff (use a plain slur), non-adjacent
// staves, or two selected entries sounding together on different staves (no
// single line passes through both).
export function phraseSlurCandidate(
  selection: Selection,
  structure: CompositionStructure
): PhraseSlurCandidate | null {
  if (selection.measureIds.length > 0 || selection.staffIds.length > 0) {
    return null;
  }
  const placed: Placed[] = [];
  for (const id of selection.entryIds) {
    if (!isNoteOrChord(structure.entriesById[id])) {
      continue;
    }
    const context = staffOfEntry(structure, id);
    const onset = entryOnset(structure, id);
    if (!context || onset === null) {
      return null;
    }
    placed.push({
      id,
      staffIndex: context.staffIndex,
      measureIndex: context.measureIndex,
      onset,
    });
  }
  const staffIndices = [...new Set(placed.map((p) => p.staffIndex))];
  if (
    staffIndices.length !== 2 ||
    Math.abs(staffIndices[0] - staffIndices[1]) !== 1
  ) {
    return null;
  }

  placed.sort(
    (a, b) =>
      a.measureIndex - b.measureIndex ||
      a.onset - b.onset ||
      a.staffIndex - b.staffIndex
  );
  for (let i = 1; i < placed.length; i++) {
    const previous = placed[i - 1];
    const current = placed[i];
    if (
      previous.staffIndex !== current.staffIndex &&
      previous.measureIndex === current.measureIndex &&
      Math.abs(previous.onset - current.onset) < CAPACITY_EPSILON
    ) {
      return null;
    }
  }

  const breakpointEntryIds: string[] = [];
  let legCount = 0;
  let legStart = 0;
  for (let i = 1; i <= placed.length; i++) {
    if (
      i === placed.length ||
      placed[i].staffIndex !== placed[i - 1].staffIndex
    ) {
      const first = placed[legStart].id;
      const last = placed[i - 1].id;
      breakpointEntryIds.push(first);
      if (last !== first) {
        breakpointEntryIds.push(last);
      }
      legStart = i;
      legCount++;
    }
  }
  return { startEntryId: placed[0].id, breakpointEntryIds, legCount };
}

function slurGroupIdOf(entry: MusicEntry | undefined): string | null {
  return entry?.type === 'note' || entry?.type === 'chord'
    ? entry.slurGroupId ?? null
    : null;
}

// The phrase slur every selected note/chord that carries one belongs to — so
// selecting part of an existing phrase (even one note) can remove it.
export function selectedPhraseSlurId(
  selection: Selection,
  structure: CompositionStructure
): string | null {
  const ids = new Set(
    selection.entryIds
      .map((id) => slurGroupIdOf(structure.entriesById[id]))
      .filter((id): id is string => id !== null)
  );
  if (ids.size !== 1) {
    return null;
  }
  const [id] = ids;
  return id;
}

export function phraseSlurMemberIds(
  structure: CompositionStructure,
  slurGroupId: string
): string[] {
  return Object.values(structure.entriesById)
    .filter((entry) => slurGroupIdOf(entry) === slurGroupId)
    .map((entry) => entry.id);
}

function withSlurGroup(
  entry: MusicEntry,
  slurGroupId: string | null
): MusicEntry {
  return entry.type === 'note' || entry.type === 'chord'
    ? { ...entry, slurGroupId }
    : entry;
}

// Marks `breakpointEntryIds` as one new phrase. A breakpoint taken from an
// older phrase may leave it with one member; the prune pass removes it.
export function setPhraseSlur(
  structure: CompositionStructure,
  breakpointEntryIds: readonly string[]
): CompositionStructure {
  if (breakpointEntryIds.length < 2) {
    return structure;
  }
  const slurGroupId = crypto.randomUUID();
  const entriesById = { ...structure.entriesById };
  for (const id of breakpointEntryIds) {
    entriesById[id] = withSlurGroup(entriesById[id], slurGroupId);
  }
  return pruneInvalidPhraseSlurs({ ...structure, entriesById });
}

export function clearPhraseSlur(
  structure: CompositionStructure,
  slurGroupId: string
): CompositionStructure {
  const members = phraseSlurMemberIds(structure, slurGroupId);
  if (members.length === 0) {
    return structure;
  }
  const entriesById = { ...structure.entriesById };
  for (const id of members) {
    entriesById[id] = withSlurGroup(entriesById[id], null);
  }
  return { ...structure, entriesById };
}

// A phrase needs two breakpoints to draw anything.
export function pruneInvalidPhraseSlurs(
  structure: CompositionStructure
): CompositionStructure {
  const counts = new Map<string, number>();
  for (const entry of Object.values(structure.entriesById)) {
    const id = slurGroupIdOf(entry);
    if (id) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  let next = structure;
  for (const [id, count] of counts) {
    if (count < 2) {
      next = clearPhraseSlur(next, id);
    }
  }
  return next;
}

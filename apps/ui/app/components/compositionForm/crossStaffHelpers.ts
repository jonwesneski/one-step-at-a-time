import { staffOfEntry } from './entryLocationHelpers';
import { CAPACITY_EPSILON, entryFactor } from './measureCapacityHelpers';
import type {
  ChordEntry,
  CompositionStructure,
  NoteEntry,
  Selection,
} from './types';

// Whole-note offset of `entryId` from the start of its own measure, within its
// own voice. Mirrors the library's rules/beatRules.ts#computeBeatOffsets — the
// shared coordinate the library uses to tell which entries on sibling staves
// sound together.
export function entryOnset(
  structure: CompositionStructure,
  entryId: string
): number | null {
  const context = staffOfEntry(structure, entryId);
  if (!context) {
    return null;
  }
  const staff = structure.stavesById[context.staffId];
  let onset = 0;
  for (const id of staff.voicesById[context.voiceId].entryIds) {
    if (id === entryId) {
      return onset;
    }
    onset += entryFactor(structure.entriesById[id], structure.tupletsById);
  }
  return null;
}

export type AdjacentStaffPair = { topStaffId: string; bottomStaffId: string };

// The two staves ordered top-to-bottom when they are immediately adjacent
// siblings in `measureId` — the only shape the library's cross-staff
// features (beam-group, tuplet-group, shared stems) accept.
export function adjacentStaffPair(
  structure: CompositionStructure,
  measureId: string,
  staffIdA: string,
  staffIdB: string
): AdjacentStaffPair | null {
  const staffIds = structure.measuresById[measureId]?.staffIds ?? [];
  const indexA = staffIds.indexOf(staffIdA);
  const indexB = staffIds.indexOf(staffIdB);
  if (indexA === -1 || indexB === -1 || Math.abs(indexA - indexB) !== 1) {
    return null;
  }
  return indexA < indexB
    ? { topStaffId: staffIdA, bottomStaffId: staffIdB }
    : { topStaffId: staffIdB, bottomStaffId: staffIdA };
}

// Whether the "shared between hands" toggle means anything for `entryId`: it
// carries a dynamic or starts a hairpin, and its staff has a partner staff in
// the same measure (the library centres a shared mark in that gap).
export function canShareDynamic(
  structure: CompositionStructure,
  entryId: string
): boolean {
  const entry = structure.entriesById[entryId];
  if (!entry || (entry.type !== 'note' && entry.type !== 'chord')) {
    return false;
  }
  const context = staffOfEntry(structure, entryId);
  if (!context) {
    return false;
  }
  if ((structure.measuresById[context.measureId]?.staffIds.length ?? 0) < 2) {
    return false;
  }
  const startsHairpin = Object.values(structure.connectorsById).some(
    (connector) =>
      connector.startEntryId === entryId &&
      (connector.kind === 'crescendo' || connector.kind === 'decrescendo')
  );
  return Boolean(entry.dynamic) || startsHairpin;
}

// Shared stems (`shared-stem-for`): both hands striking one beat together in
// otherwise single-part writing, joined by one stem. Mirrors the library's
// rules/sharedStemRules.ts#resolveSharedStemPairs (two staves, each element
// in at most one pair), plus what the library leaves to the author: the two
// sound together for the same value, on adjacent staves of one measure, and
// the value has a stem but no flag (the library doesn't draw a flag on a
// shared stem yet). The link is stored on the lower staff's entry.

const SHARED_STEM_DURATIONS = new Set(['half', 'quarter']);

function noteOrChord(
  structure: CompositionStructure,
  entryId: string
): NoteEntry | ChordEntry | null {
  const entry = structure.entriesById[entryId];
  return entry?.type === 'note' || entry?.type === 'chord' ? entry : null;
}

function sharedStemPartnerIds(
  structure: CompositionStructure,
  entryId: string
): string[] {
  const own = noteOrChord(structure, entryId)?.sharedStemWithEntryId;
  const pointingHere = Object.values(structure.entriesById)
    .filter(
      (entry) =>
        (entry.type === 'note' || entry.type === 'chord') &&
        entry.sharedStemWithEntryId === entryId
    )
    .map((entry) => entry.id);
  return own ? [own, ...pointingHere] : pointingHere;
}

export type SharedStemPair = {
  measureId: string;
  upperEntryId: string;
  lowerEntryId: string;
};

// Why `upperEntryId`/`lowerEntryId` can't share a stem, or null if they can.
export function sharedStemProblem(
  structure: CompositionStructure,
  { upperEntryId, lowerEntryId }: Omit<SharedStemPair, 'measureId'>
): string | null {
  const upper = noteOrChord(structure, upperEntryId);
  const lower = noteOrChord(structure, lowerEntryId);
  if (!upper || !lower) {
    return 'Only notes and chords can share a stem.';
  }
  const upperOnset = entryOnset(structure, upperEntryId);
  const lowerOnset = entryOnset(structure, lowerEntryId);
  if (
    upperOnset === null ||
    lowerOnset === null ||
    Math.abs(upperOnset - lowerOnset) > CAPACITY_EPSILON
  ) {
    return 'They must start on the same beat.';
  }
  if (upper.duration !== lower.duration) {
    return 'They must have the same duration.';
  }
  if (!SHARED_STEM_DURATIONS.has(upper.duration)) {
    return 'Only quarters and halves can share a stem for now.';
  }
  if (upper.beamGroupId || lower.beamGroupId) {
    return 'One of them is already in a cross-staff beam.';
  }
  const pairedElsewhere = (id: string, partner: string) =>
    sharedStemPartnerIds(structure, id).some((other) => other !== partner);
  if (
    pairedElsewhere(upperEntryId, lowerEntryId) ||
    pairedElsewhere(lowerEntryId, upperEntryId)
  ) {
    return 'One of them already shares a stem with another note.';
  }
  return null;
}

// Two note/chord entries on adjacent staves of one measure, ordered top to
// bottom — or null for any other selection.
export function sharedStemCandidate(
  selection: Selection,
  structure: CompositionStructure
): SharedStemPair | null {
  if (
    selection.entryIds.length !== 2 ||
    selection.measureIds.length > 0 ||
    selection.staffIds.length > 0
  ) {
    return null;
  }
  const [a, b] = selection.entryIds;
  const contextA = staffOfEntry(structure, a);
  const contextB = staffOfEntry(structure, b);
  if (
    !contextA ||
    !contextB ||
    contextA.measureId !== contextB.measureId ||
    !noteOrChord(structure, a) ||
    !noteOrChord(structure, b)
  ) {
    return null;
  }
  const pair = adjacentStaffPair(
    structure,
    contextA.measureId,
    contextA.staffId,
    contextB.staffId
  );
  if (!pair) {
    return null;
  }
  const aIsUpper = pair.topStaffId === contextA.staffId;
  return {
    measureId: contextA.measureId,
    upperEntryId: aIsUpper ? a : b,
    lowerEntryId: aIsUpper ? b : a,
  };
}

export function isSharedStem(
  structure: CompositionStructure,
  { upperEntryId, lowerEntryId }: Omit<SharedStemPair, 'measureId'>
): boolean {
  return (
    noteOrChord(structure, lowerEntryId)?.sharedStemWithEntryId === upperEntryId
  );
}

export function setSharedStem(
  structure: CompositionStructure,
  pair: Omit<SharedStemPair, 'measureId'>,
  joined: boolean
): CompositionStructure {
  const lower = noteOrChord(structure, pair.lowerEntryId);
  if (!lower || (joined && sharedStemProblem(structure, pair) !== null)) {
    return structure;
  }
  const sharedStemWithEntryId = joined ? pair.upperEntryId : null;
  if ((lower.sharedStemWithEntryId ?? null) === sharedStemWithEntryId) {
    return structure;
  }
  return {
    ...structure,
    entriesById: {
      ...structure.entriesById,
      [lower.id]: { ...lower, sharedStemWithEntryId },
    },
  };
}

// Clears every shared-stem link that no longer holds (see sharedStemProblem),
// or that points from the upper staff down.
export function pruneInvalidSharedStems(
  structure: CompositionStructure
): CompositionStructure {
  let next = structure;
  for (const entry of Object.values(structure.entriesById)) {
    if (
      (entry.type !== 'note' && entry.type !== 'chord') ||
      !entry.sharedStemWithEntryId
    ) {
      continue;
    }
    const lowerContext = staffOfEntry(next, entry.id);
    const upperContext = staffOfEntry(next, entry.sharedStemWithEntryId);
    const pair = {
      upperEntryId: entry.sharedStemWithEntryId,
      lowerEntryId: entry.id,
    };
    const stillValid =
      lowerContext !== null &&
      upperContext !== null &&
      lowerContext.measureId === upperContext.measureId &&
      adjacentStaffPair(
        next,
        lowerContext.measureId,
        upperContext.staffId,
        lowerContext.staffId
      )?.bottomStaffId === lowerContext.staffId &&
      sharedStemProblem(next, pair) === null;
    if (!stillValid) {
      next = {
        ...next,
        entriesById: {
          ...next.entriesById,
          [entry.id]: { ...entry, sharedStemWithEntryId: null },
        },
      };
    }
  }
  return next;
}

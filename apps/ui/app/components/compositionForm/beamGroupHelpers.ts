import type { DurationType } from '@one-step-at-a-time/web-components';
import { durationToFactor } from '@one-step-at-a-time/web-components';
import { adjacentStaffPair } from './crossStaffHelpers';
import { staffOfEntry } from './entryLocationHelpers';
import type { CompositionStructure, MusicEntry, Selection } from './types';

// Double-stemmed (cross-staff) beam groups for the composition form. Mirrors
// the library's rules/doubleStemmedBeamRules.ts#resolveDoubleStemmedBeamGroups
// — one measure, exactly two immediately adjacent staves, at least two
// non-rest members — plus two constraints the library leaves to the author:
// every note/chord member is a flagged (beamable) value, and no member sits
// in a cross-staff tuplet (rules/crossStaffTupletRules.ts drops the tuplet
// otherwise). A rest carries the key only to be positioned against the beam.

export function isBeamableDuration(duration: DurationType): boolean {
  return durationToFactor[duration] < durationToFactor.quarter;
}

function inCrossStaffTuplet(
  structure: CompositionStructure,
  entry: MusicEntry
): boolean {
  if (entry.type === 'clef' || !entry.tupletId) {
    return false;
  }
  return Boolean(structure.tupletsById[entry.tupletId]?.crossStaffGroupId);
}

// Whether `entryIds` can form one beam group, as a list of members — or null.
function validBeamGroupMembers(
  structure: CompositionStructure,
  entryIds: readonly string[]
): { measureId: string } | null {
  const contexts = entryIds.map((id) => staffOfEntry(structure, id));
  if (contexts.length === 0 || contexts.some((context) => !context)) {
    return null;
  }
  const measureIds = new Set(contexts.map((context) => context!.measureId));
  const staffIds = [...new Set(contexts.map((context) => context!.staffId))];
  if (measureIds.size !== 1 || staffIds.length !== 2) {
    return null;
  }
  const [measureId] = measureIds;
  if (!adjacentStaffPair(structure, measureId, staffIds[0], staffIds[1])) {
    return null;
  }
  let nonRestCount = 0;
  for (const id of entryIds) {
    const entry = structure.entriesById[id];
    if (
      !entry ||
      entry.type === 'clef' ||
      inCrossStaffTuplet(structure, entry)
    ) {
      return null;
    }
    if (entry.type !== 'rest') {
      if (!isBeamableDuration(entry.duration)) {
        return null;
      }
      nonRestCount++;
    }
  }
  return nonRestCount >= 2 ? { measureId } : null;
}

export type BeamGroupCandidate = { measureId: string; entryIds: string[] };

// Interprets a selection as a cross-staff beam: entries on two adjacent
// staves of one measure, or the two staves themselves (the marquee promotes a
// drag over most of a staff to a staff selection, so a drag over a whole
// two-handed passage arrives that way) — expanded to every entry they hold.
export function beamGroupCandidate(
  selection: Selection,
  structure: CompositionStructure
): BeamGroupCandidate | null {
  if (selection.measureIds.length > 0) {
    return null;
  }
  let entryIds = selection.entryIds;
  if (selection.staffIds.length > 0) {
    if (selection.staffIds.length !== 2 || selection.entryIds.length > 0) {
      return null;
    }
    entryIds = selection.staffIds.flatMap((staffId) => {
      const staff = structure.stavesById[staffId];
      return staff
        ? staff.voiceOrder
            .flatMap((voiceId) => staff.voicesById[voiceId].entryIds)
            .filter((id) => structure.entriesById[id]?.type !== 'clef')
        : [];
    });
  }
  const valid = validBeamGroupMembers(structure, entryIds);
  return valid ? { measureId: valid.measureId, entryIds } : null;
}

function beamGroupIdOf(entry: MusicEntry | undefined): string | null {
  return entry && entry.type !== 'clef' ? entry.beamGroupId ?? null : null;
}

// The group every one of `entryIds` already belongs to, if they share one.
export function sharedBeamGroupId(
  structure: CompositionStructure,
  entryIds: readonly string[]
): string | null {
  const ids = new Set(
    entryIds.map((id) => beamGroupIdOf(structure.entriesById[id]))
  );
  if (ids.size !== 1) {
    return null;
  }
  const [id] = ids;
  return id;
}

function withBeamGroup(
  entry: MusicEntry,
  beamGroupId: string | null
): MusicEntry {
  if (entry.type === 'clef') {
    return entry;
  }
  if (entry.type === 'rest') {
    return beamGroupId === null
      ? { ...entry, beamGroupId: null, restStaffSide: null }
      : { ...entry, beamGroupId };
  }
  // The measure owns a member's stem (top staff down, bottom staff up), so an
  // authored stem direction would fight it.
  return beamGroupId === null
    ? { ...entry, beamGroupId: null }
    : { ...entry, beamGroupId, stemDirection: null };
}

// Joins `entryIds` into one new group. Entries leaving an older group may
// leave it invalid; the prune pass dissolves that group.
export function setBeamGroup(
  structure: CompositionStructure,
  entryIds: readonly string[]
): CompositionStructure {
  if (!validBeamGroupMembers(structure, entryIds)) {
    return structure;
  }
  const beamGroupId = crypto.randomUUID();
  const entriesById = { ...structure.entriesById };
  for (const id of entryIds) {
    entriesById[id] = withBeamGroup(entriesById[id], beamGroupId);
  }
  return pruneInvalidBeamGroups({ ...structure, entriesById });
}

export function clearBeamGroup(
  structure: CompositionStructure,
  beamGroupId: string
): CompositionStructure {
  let changed = false;
  const entriesById = { ...structure.entriesById };
  for (const [id, entry] of Object.entries(entriesById)) {
    if (beamGroupIdOf(entry) === beamGroupId) {
      entriesById[id] = withBeamGroup(entry, null);
      changed = true;
    }
  }
  return changed ? { ...structure, entriesById } : structure;
}

// Dissolves every group the library would warn about and drop (see the file
// header), and clears a rest position left on a rest outside any group.
export function pruneInvalidBeamGroups(
  structure: CompositionStructure
): CompositionStructure {
  const membersByGroup = new Map<string, string[]>();
  for (const entry of Object.values(structure.entriesById)) {
    const groupId = beamGroupIdOf(entry);
    if (groupId) {
      membersByGroup.set(groupId, [
        ...(membersByGroup.get(groupId) ?? []),
        entry.id,
      ]);
    }
  }
  let next = structure;
  for (const [groupId, members] of membersByGroup) {
    if (!validBeamGroupMembers(next, members)) {
      next = clearBeamGroup(next, groupId);
    }
  }
  for (const entry of Object.values(next.entriesById)) {
    if (entry.type === 'rest' && entry.restStaffSide && !entry.beamGroupId) {
      next = {
        ...next,
        entriesById: {
          ...next.entriesById,
          [entry.id]: { ...entry, restStaffSide: null },
        },
      };
    }
  }
  return next;
}

import { isTieEndpoint } from './connectorsHelpers';
import { staffOfEntry } from './entryLocationHelpers';
import { tupletCandidate } from './tupletsHelpers';
import type {
  CompositionStructure,
  MusicEntry,
  NormalizedArpeggio,
  Selection,
} from './types';
import { isPitchedEntry } from './types';

// Written-out arpeggios (`<music-arpeggio>`): a run of notes, each tied by the
// library to its matching tone of the note or chord right after them. Mirrors
// the library's arpeggio/arpeggio.ts and utils/slotElements.ts
// #flattenArpeggio: run members are plain notes, the target is the last
// child, the run takes no beat time, and the group is never inside a tuplet.
// The editor also keeps the run out of tremolos and explicit ties, which the
// arpeggio's own ties would clash with.

export type ArpeggioCandidate = {
  staffId: string;
  voiceId: string;
  runEntryIds: string[];
  targetEntryId: string;
  problem: string | null;
};

const arpeggioIdOf = (entry: MusicEntry | undefined): string | null =>
  entry?.type === 'note' ? entry.arpeggioId ?? null : null;

function targetedArpeggio(
  structure: CompositionStructure,
  entryId: string
): NormalizedArpeggio | null {
  return (
    Object.values(structure.arpeggiosById).find(
      (arpeggio) => arpeggio.targetEntryId === entryId
    ) ?? null
  );
}

function groupProblem(
  structure: CompositionStructure,
  runEntryIds: readonly string[],
  targetEntryId: string,
  ownArpeggioId: string | null
): string | null {
  const target = structure.entriesById[targetEntryId];
  if (!target || (target.type !== 'note' && target.type !== 'chord')) {
    return 'The last selected entry must be the note or chord the run leads to.';
  }
  if (runEntryIds.length === 0) {
    return 'Select the run notes and the chord they lead to.';
  }
  const members = [...runEntryIds, targetEntryId].map(
    (id) => structure.entriesById[id]
  );
  if (members.some((entry) => isPitchedEntry(entry) && entry.tupletId)) {
    return 'A written-out arpeggio can’t sit inside a tuplet.';
  }
  if (members.some((entry) => isPitchedEntry(entry) && entry.tremoloId)) {
    return 'A tremolo member can’t be part of a written-out arpeggio.';
  }
  for (const id of runEntryIds) {
    const entry = structure.entriesById[id];
    if (entry?.type !== 'note') {
      return 'The run before the target must be single notes.';
    }
    const other = arpeggioIdOf(entry);
    if (other && other !== ownArpeggioId) {
      return 'A run note already belongs to another arpeggio.';
    }
    if (isTieEndpoint(structure, id)) {
      return 'A run note is already tied; the arpeggio ties it for you.';
    }
    if (targetedArpeggio(structure, id)) {
      return 'A run note is already another arpeggio’s target.';
    }
  }
  const existing = targetedArpeggio(structure, targetEntryId);
  if (existing && existing.id !== ownArpeggioId) {
    return 'That chord already ends another arpeggio.';
  }
  return null;
}

// A contiguous run in one voice, read as run notes then target.
export function arpeggioCandidate(
  selection: Selection,
  structure: CompositionStructure
): ArpeggioCandidate | null {
  const run = tupletCandidate(selection, structure);
  if (!run) {
    return null;
  }
  const targetEntryId = run.entryIds[run.entryIds.length - 1];
  const runEntryIds = run.entryIds.slice(0, -1);
  const own = targetedArpeggio(structure, targetEntryId);
  return {
    staffId: run.staffId,
    voiceId: run.voiceId,
    runEntryIds,
    targetEntryId,
    problem: groupProblem(
      structure,
      runEntryIds,
      targetEntryId,
      own?.id ?? null
    ),
  };
}

// The arpeggio made of exactly these run notes and target, or null.
export function arpeggioOf(
  structure: CompositionStructure,
  candidate: Pick<ArpeggioCandidate, 'runEntryIds' | 'targetEntryId'>
): NormalizedArpeggio | null {
  const arpeggio = targetedArpeggio(structure, candidate.targetEntryId);
  if (!arpeggio) {
    return null;
  }
  const members = Object.values(structure.entriesById)
    .filter((entry) => arpeggioIdOf(entry) === arpeggio.id)
    .map((entry) => entry.id);
  return members.length === candidate.runEntryIds.length &&
    candidate.runEntryIds.every((id) => members.includes(id))
    ? arpeggio
    : null;
}

function removeArpeggio(
  structure: CompositionStructure,
  arpeggioId: string
): CompositionStructure {
  const entriesById = { ...structure.entriesById };
  for (const [id, entry] of Object.entries(entriesById)) {
    if (arpeggioIdOf(entry) === arpeggioId && entry.type === 'note') {
      entriesById[id] = { ...entry, arpeggioId: null };
    }
  }
  const arpeggiosById = { ...structure.arpeggiosById };
  delete arpeggiosById[arpeggioId];
  return { ...structure, entriesById, arpeggiosById };
}

// Replaces whatever arpeggio the target ends with one over these run notes;
// `settings === null` just removes it.
export function setArpeggio(
  structure: CompositionStructure,
  candidate: Pick<ArpeggioCandidate, 'runEntryIds' | 'targetEntryId'>,
  settings: Omit<NormalizedArpeggio, 'id' | 'targetEntryId'> | null
): CompositionStructure {
  const existing = targetedArpeggio(structure, candidate.targetEntryId);
  let next = existing ? removeArpeggio(structure, existing.id) : structure;
  if (settings === null) {
    return next;
  }
  if (
    groupProblem(next, candidate.runEntryIds, candidate.targetEntryId, null) !==
    null
  ) {
    return structure;
  }
  const id = crypto.randomUUID();
  const entriesById = { ...next.entriesById };
  for (const runId of candidate.runEntryIds) {
    const entry = entriesById[runId];
    if (entry?.type === 'note') {
      entriesById[runId] = { ...entry, arpeggioId: id };
    }
  }
  next = {
    ...next,
    entriesById,
    arpeggiosById: {
      ...next.arpeggiosById,
      [id]: { ...settings, id, targetEntryId: candidate.targetEntryId },
    },
  };
  return next;
}

export function updateArpeggio(
  structure: CompositionStructure,
  arpeggioId: string,
  patch: Partial<Omit<NormalizedArpeggio, 'id' | 'targetEntryId'>>
): CompositionStructure {
  const arpeggio = structure.arpeggiosById[arpeggioId];
  if (!arpeggio) {
    return structure;
  }
  const next = { ...arpeggio, ...patch };
  return JSON.stringify(next) === JSON.stringify(arpeggio)
    ? structure
    : {
        ...structure,
        arpeggiosById: { ...structure.arpeggiosById, [arpeggioId]: next },
      };
}

// Dissolves an arpeggio whose run no longer sits directly before its target
// in one voice, or that otherwise stopped being one (see groupProblem).
export function pruneInvalidArpeggios(
  structure: CompositionStructure
): CompositionStructure {
  let next = structure;
  for (const arpeggio of Object.values(structure.arpeggiosById)) {
    const context = staffOfEntry(next, arpeggio.targetEntryId);
    const voiceEntryIds = context
      ? next.stavesById[context.staffId].voicesById[context.voiceId].entryIds
      : [];
    const targetIndex = voiceEntryIds.indexOf(arpeggio.targetEntryId);
    const runEntryIds = Object.values(next.entriesById)
      .filter((entry) => arpeggioIdOf(entry) === arpeggio.id)
      .map((entry) => entry.id);
    const expectedRun = voiceEntryIds.slice(
      Math.max(0, targetIndex - runEntryIds.length),
      Math.max(0, targetIndex)
    );
    const contiguous =
      targetIndex > 0 &&
      runEntryIds.length === expectedRun.length &&
      expectedRun.every((id) => runEntryIds.includes(id));
    if (
      !contiguous ||
      groupProblem(next, expectedRun, arpeggio.targetEntryId, arpeggio.id) !==
        null
    ) {
      next = removeArpeggio(next, arpeggio.id);
    }
  }
  return next;
}

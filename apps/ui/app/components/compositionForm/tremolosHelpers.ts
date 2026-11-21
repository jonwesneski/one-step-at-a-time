import type { TremoloStrokeCount } from '@one-step-at-a-time/web-components';
import { durationToBase } from '@one-step-at-a-time/web-components';
import { isTieEndpoint } from './connectorsHelpers';
import { adjacentStaffPair, entryOnset } from './crossStaffHelpers';
import { staffOfEntry } from './entryLocationHelpers';
import { CAPACITY_EPSILON } from './measureCapacityHelpers';
import { tupletCandidate } from './tupletsHelpers';
import type {
  CompositionStructure,
  MusicEntry,
  NormalizedTremolo,
  Selection,
} from './types';
import { isPitchedEntry } from './types';

// Two-note (and multi-note) tremolos (`<music-tremolo>`). Mirrors the
// library's utils/slotElements.ts#flattenTremolo: two or more notes/chords of
// one written duration, contiguous in one voice; members carry no tremolo of
// their own, no cross-staff beam or shared stem, and no tie. A cross-staff
// pair (`tremolo-group`, rules/crossStaffTremoloRules.ts) is one wrapper per
// adjacent staff of one measure, with the same strokes and duration, starting
// together, not inside a tuplet; each side holds hidden rests for the other
// hand's share.

export type TremoloRun = {
  staffId: string;
  voiceId: string;
  entryIds: string[];
};

export const DEFAULT_TREMOLO_STROKES: TremoloStrokeCount = 3;

const tremoloIdOf = (entry: MusicEntry | undefined): string | null =>
  entry && isPitchedEntry(entry) ? entry.tremoloId ?? null : null;

// Why `entryIds` (a contiguous run in one voice) can't form a tremolo, or
// null. Rests are allowed only as a cross-staff side's spacers.
function membersProblem(
  structure: CompositionStructure,
  entryIds: readonly string[],
  { allowRests }: { allowRests: boolean }
): string | null {
  const entries = entryIds.map((id) => structure.entriesById[id]);
  if (entries.some((entry) => !entry || !isPitchedEntry(entry))) {
    return 'Only notes and chords can alternate.';
  }
  const pitched = entries.filter(isPitchedEntry);
  if (!allowRests && pitched.some((entry) => entry.type === 'rest')) {
    return 'A rest can’t be part of a tremolo.';
  }
  const notes = pitched.filter((entry) => entry.type !== 'rest');
  if (notes.length === 0 || (!allowRests && notes.length < 2)) {
    return 'Select two or more notes or chords.';
  }
  if (new Set(pitched.map((entry) => entry.duration)).size > 1) {
    return 'Every note of a tremolo is written with the same duration.';
  }
  if (new Set(pitched.map((entry) => entry.tupletId ?? null)).size > 1) {
    return 'They must all be inside the same tuplet, or none.';
  }
  for (const entry of notes) {
    if (entry.beamGroupId || entry.sharedStemWithEntryId) {
      return 'A cross-staff beam or shared stem can’t join a tremolo.';
    }
    if (entry.type === 'note' && entry.arpeggioId) {
      return 'A written-out arpeggio note can’t join a tremolo.';
    }
    if (isTieEndpoint(structure, entry.id)) {
      return 'A tied note can’t join a tremolo; slur the figure instead.';
    }
  }
  return null;
}

export type TremoloCandidate = TremoloRun & { problem: string | null };

// A contiguous run in one voice that could become (or already is) a tremolo.
export function tremoloCandidate(
  selection: Selection,
  structure: CompositionStructure
): TremoloCandidate | null {
  const run = tupletCandidate(selection, structure);
  if (!run) {
    return null;
  }
  return {
    ...run,
    problem: membersProblem(structure, run.entryIds, { allowRests: false }),
  };
}

// The tremolo `entryIds` make up exactly, or null.
export function tremoloOfEntries(
  structure: CompositionStructure,
  entryIds: readonly string[]
): NormalizedTremolo | null {
  const ids = new Set(
    entryIds.map((id) => tremoloIdOf(structure.entriesById[id]))
  );
  if (ids.size !== 1) {
    return null;
  }
  const [id] = ids;
  if (!id) {
    return null;
  }
  const memberCount = Object.values(structure.entriesById).filter(
    (entry) => tremoloIdOf(entry) === id
  ).length;
  return memberCount === entryIds.length
    ? structure.tremolosById[id] ?? null
    : null;
}

function withTremoloId(
  entry: MusicEntry,
  tremoloId: string | null
): MusicEntry {
  if (!isPitchedEntry(entry)) {
    return entry;
  }
  // A member's own single-note tremolo is ignored inside a group.
  return entry.type === 'rest'
    ? { ...entry, tremoloId }
    : { ...entry, tremoloId, ...(tremoloId ? { tremolo: null } : {}) };
}

// Removes every tremolo the entries belong to (all its members, so none is
// left with one member), then, unless `settings` is null, groups `entryIds`
// into a new one.
export function setTremolo(
  structure: CompositionStructure,
  entryIds: readonly string[],
  settings: Omit<NormalizedTremolo, 'id'> | null
): CompositionStructure {
  const cleared = new Set(
    entryIds
      .map((id) => tremoloIdOf(structure.entriesById[id]))
      .filter((id): id is string => id !== null)
  );
  const entriesById = { ...structure.entriesById };
  for (const [id, entry] of Object.entries(entriesById)) {
    const tremoloId = tremoloIdOf(entry);
    if (tremoloId && cleared.has(tremoloId)) {
      entriesById[id] = withTremoloId(entry, null);
    }
  }
  const tremolosById = { ...structure.tremolosById };
  for (const id of cleared) {
    delete tremolosById[id];
  }
  if (settings !== null) {
    const id = crypto.randomUUID();
    tremolosById[id] = { ...settings, id };
    for (const entryId of entryIds) {
      entriesById[entryId] = withTremoloId(entriesById[entryId], id);
    }
  }
  return { ...structure, entriesById, tremolosById };
}

export function updateTremolo(
  structure: CompositionStructure,
  tremoloId: string,
  patch: Partial<Omit<NormalizedTremolo, 'id' | 'crossStaffGroupId'>>
): CompositionStructure {
  const tremolo = structure.tremolosById[tremoloId];
  if (!tremolo) {
    return structure;
  }
  const next = { ...tremolo, ...patch };
  const linked = tremolo.crossStaffGroupId
    ? Object.values(structure.tremolosById).filter(
        (other) => other.crossStaffGroupId === tremolo.crossStaffGroupId
      )
    : [tremolo];
  // Both sides of a cross-staff tremolo keep one stroke count.
  const tremolosById = { ...structure.tremolosById };
  for (const member of linked) {
    tremolosById[member.id] = { ...member, ...patch, id: member.id };
  }
  return JSON.stringify(next) === JSON.stringify(tremolo)
    ? structure
    : { ...structure, tremolosById };
}

// `beam-attach` only means something on a minim tremolo.
export function canAttachBeams(
  structure: CompositionStructure,
  tremoloId: string
): boolean {
  const member = Object.values(structure.entriesById).find(
    (entry) => tremoloIdOf(entry) === tremoloId
  );
  return (
    member !== undefined &&
    isPitchedEntry(member) &&
    durationToBase[member.duration] === 'half'
  );
}

// ─── Cross-staff ─────────────────────────────────────────────────────────

export type CrossStaffTremoloCandidate = {
  measureId: string;
  runs: [TremoloRun, TremoloRun];
  problem: string | null;
};

function crossStaffProblem(
  structure: CompositionStructure,
  runs: readonly TremoloRun[]
): string | null {
  for (const run of runs) {
    const problem = membersProblem(structure, run.entryIds, {
      allowRests: true,
    });
    if (problem) {
      return problem;
    }
  }
  const [top, bottom] = runs.map((run) =>
    run.entryIds.map((id) => structure.entriesById[id])
  );
  const durations = new Set(
    [...top, ...bottom].map((entry) =>
      isPitchedEntry(entry) ? entry.duration : null
    )
  );
  if (durations.size !== 1) {
    return 'Both hands must use the same written duration.';
  }
  if (
    [...top, ...bottom].some((entry) => isPitchedEntry(entry) && entry.tupletId)
  ) {
    return 'A cross-staff tremolo can’t sit inside a tuplet.';
  }
  const onsets = runs.map((run) => entryOnset(structure, run.entryIds[0]));
  if (
    onsets[0] === null ||
    onsets[1] === null ||
    Math.abs(onsets[0] - onsets[1]) > CAPACITY_EPSILON
  ) {
    return 'Both hands must start on the same beat.';
  }
  return null;
}

// One contiguous run on each of two adjacent staves of one measure.
export function crossStaffTremoloCandidate(
  selection: Selection,
  structure: CompositionStructure
): CrossStaffTremoloCandidate | null {
  if (selection.measureIds.length > 0 || selection.staffIds.length > 0) {
    return null;
  }
  const byStaff = new Map<string, string[]>();
  for (const id of selection.entryIds) {
    const context = staffOfEntry(structure, id);
    if (!context) {
      return null;
    }
    byStaff.set(context.staffId, [...(byStaff.get(context.staffId) ?? []), id]);
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
  const [first, second] = runs as TremoloRun[];
  const firstContext = staffOfEntry(structure, first.entryIds[0]);
  if (!firstContext) {
    return null;
  }
  const pair = adjacentStaffPair(
    structure,
    firstContext.measureId,
    first.staffId,
    second.staffId
  );
  if (!pair) {
    return null;
  }
  const ordered: [TremoloRun, TremoloRun] =
    pair.topStaffId === first.staffId ? [first, second] : [second, first];
  return {
    measureId: firstContext.measureId,
    runs: ordered,
    problem: crossStaffProblem(structure, ordered),
  };
}

export function crossStaffTremoloOf(
  structure: CompositionStructure,
  candidate: Pick<CrossStaffTremoloCandidate, 'runs'>
): [NormalizedTremolo, NormalizedTremolo] | null {
  const [top, bottom] = candidate.runs.map((run) =>
    tremoloOfEntries(structure, run.entryIds)
  );
  return top &&
    bottom &&
    top.crossStaffGroupId &&
    top.crossStaffGroupId === bottom.crossStaffGroupId
    ? [top, bottom]
    : null;
}

// Joins both runs into one tremolo between the hands, hiding their rests;
// `strokes === null` removes both and shows the rests again.
export function setCrossStaffTremolo(
  structure: CompositionStructure,
  candidate: Pick<CrossStaffTremoloCandidate, 'runs'>,
  strokes: TremoloStrokeCount | null
): CompositionStructure {
  let next = structure;
  for (const run of candidate.runs) {
    next = setTremolo(next, run.entryIds, null);
  }
  const allIds = candidate.runs.flatMap((run) => run.entryIds);
  const entriesById = { ...next.entriesById };
  for (const id of allIds) {
    const entry = entriesById[id];
    if (entry?.type === 'rest') {
      entriesById[id] = { ...entry, hidden: strokes !== null };
    }
  }
  next = { ...next, entriesById };
  if (strokes === null) {
    return next;
  }
  const crossStaffGroupId = crypto.randomUUID();
  for (const run of candidate.runs) {
    next = setTremolo(next, run.entryIds, { strokes, crossStaffGroupId });
  }
  return next;
}

// ─── Repair ──────────────────────────────────────────────────────────────

// Each voice's tremolo members, in order.
function tremoloRuns(
  structure: CompositionStructure
): Map<string, TremoloRun[]> {
  const runs = new Map<string, TremoloRun[]>();
  for (const staff of Object.values(structure.stavesById)) {
    for (const voiceId of staff.voiceOrder) {
      let previous: string | null = null;
      for (const id of staff.voicesById[voiceId].entryIds) {
        const tremoloId = tremoloIdOf(structure.entriesById[id]);
        if (tremoloId) {
          const list = runs.get(tremoloId) ?? [];
          if (previous !== tremoloId) {
            list.push({ staffId: staff.id, voiceId, entryIds: [] });
          }
          list[list.length - 1].entryIds.push(id);
          runs.set(tremoloId, list);
        }
        previous = tremoloId;
      }
    }
  }
  return runs;
}

// Dissolves a tremolo whose members no longer make one (split up, a member
// gone, durations diverged, a tie added …), unlinks a cross-staff pair that
// no longer lines up, and drops a minim-only beam attachment from any other
// value.
export function pruneInvalidTremolos(
  structure: CompositionStructure
): CompositionStructure {
  let next = unlinkInvalidCrossStaffTremolos(structure);
  // After unlinking, so a former cross-staff side holding spacer rests is
  // judged as the single-staff tremolo it now is.
  const runsById = tremoloRuns(next);
  for (const tremolo of Object.values(next.tremolosById)) {
    const runs = runsById.get(tremolo.id) ?? [];
    const valid =
      runs.length === 1 &&
      membersProblem(next, runs[0].entryIds, {
        allowRests: Boolean(tremolo.crossStaffGroupId),
      }) === null;
    if (!valid) {
      next = setTremolo(
        next,
        runs.flatMap((run) => run.entryIds),
        null
      );
      if (next.tremolosById[tremolo.id]) {
        const tremolosById = { ...next.tremolosById };
        delete tremolosById[tremolo.id];
        next = { ...next, tremolosById };
      }
    }
  }
  for (const tremolo of Object.values(next.tremolosById)) {
    if (tremolo.beamAttach && !canAttachBeams(next, tremolo.id)) {
      next = updateTremolo(next, tremolo.id, { beamAttach: null });
    }
  }
  return next;
}

function unlinkInvalidCrossStaffTremolos(
  structure: CompositionStructure
): CompositionStructure {
  const groups = new Map<string, NormalizedTremolo[]>();
  for (const tremolo of Object.values(structure.tremolosById)) {
    if (tremolo.crossStaffGroupId) {
      groups.set(tremolo.crossStaffGroupId, [
        ...(groups.get(tremolo.crossStaffGroupId) ?? []),
        tremolo,
      ]);
    }
  }
  const runsById = tremoloRuns(structure);
  let next = structure;
  for (const pair of groups.values()) {
    const runs = pair.map((tremolo) => runsById.get(tremolo.id));
    const ordered = orderedCrossStaffRuns(structure, runs);
    if (
      !ordered ||
      pair[0].strokes !== pair[1]?.strokes ||
      crossStaffProblem(structure, ordered) !== null
    ) {
      const tremolosById = { ...next.tremolosById };
      for (const tremolo of pair) {
        tremolosById[tremolo.id] = { ...tremolo, crossStaffGroupId: null };
      }
      next = { ...next, tremolosById };
    }
  }
  return next;
}

// Two single-run sides on adjacent staves of one measure, top first.
function orderedCrossStaffRuns(
  structure: CompositionStructure,
  sides: (TremoloRun[] | undefined)[]
): [TremoloRun, TremoloRun] | null {
  if (sides.length !== 2 || sides.some((side) => side?.length !== 1)) {
    return null;
  }
  const [a, b] = sides.map((side) => side![0]);
  const context = staffOfEntry(structure, a.entryIds[0]);
  const pair =
    context &&
    adjacentStaffPair(structure, context.measureId, a.staffId, b.staffId);
  if (!pair) {
    return null;
  }
  return pair.topStaffId === a.staffId ? [a, b] : [b, a];
}

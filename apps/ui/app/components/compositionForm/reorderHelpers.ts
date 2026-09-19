import { flattenEntryOrder, pruneBrokenTies } from './connectorsHelpers';
import type { CompositionStructure, NormalizedVoice } from './types';
import { isPitchedEntry } from './types';

// Moves one entry within its staff's entry stream and repairs what the move can
// break. Mirrors the sibling helpers (deleteSelectionHelpers.ts,
// entryEditsHelpers.ts): this app is the sole writer of the composition data, so
// only well-formed input is handled.
//
// `toIndex` is the desired final position in the voice's `entryIds`
// (0..length), as produced by `reorderTargetIndex`.
export function moveEntryInVoice(
  structure: CompositionStructure,
  staffId: string,
  voiceId: string,
  entryId: string,
  toIndex: number
): CompositionStructure {
  const staff = structure.stavesById[staffId];
  const voice = staff?.voicesById[voiceId];
  if (!staff || !voice) {
    return structure;
  }
  const from = voice.entryIds.indexOf(entryId);
  if (from === -1) {
    return structure;
  }

  const without = voice.entryIds.filter((id) => id !== entryId);
  const insertAt = Math.max(
    0,
    Math.min(without.length, toIndex > from ? toIndex - 1 : toIndex)
  );
  if (insertAt === from) {
    return structure;
  }
  const entryIds = [
    ...without.slice(0, insertAt),
    entryId,
    ...without.slice(insertAt),
  ];

  let next: CompositionStructure = {
    ...structure,
    stavesById: {
      ...structure.stavesById,
      [staffId]: {
        ...staff,
        voicesById: {
          ...staff.voicesById,
          [voiceId]: { ...voice, entryIds },
        },
      },
    },
  };

  next = dissolveDiscontiguousTuplets(next, staffId, voiceId);
  next = normalizeConnectorEndpointOrder(next);
  next = pruneBrokenTies(next);
  return next;
}

// Moves an entry to a different voice of the same staff — a genuinely
// different structural operation from moveEntryInVoice above, not a variant
// call of it (that one only ever reorders within a single voice's own
// entryIds). Always appends at the end of the target voice; the entry's
// exact position within its new voice can be fixed up afterward with the
// existing single-voice reorder-drag. A tuplet run can't span voices, so the
// moved entry's own tupletId is cleared rather than carried over.
export function moveEntryToVoice(
  structure: CompositionStructure,
  staffId: string,
  entryId: string,
  fromVoiceId: string,
  toVoiceId: string
): CompositionStructure {
  const staff = structure.stavesById[staffId];
  const fromVoice = staff?.voicesById[fromVoiceId];
  const toVoice = staff?.voicesById[toVoiceId];
  if (
    !staff ||
    !fromVoice ||
    !toVoice ||
    fromVoiceId === toVoiceId ||
    !fromVoice.entryIds.includes(entryId)
  ) {
    return structure;
  }

  const voicesById: Record<string, NormalizedVoice> = {
    ...staff.voicesById,
    [fromVoiceId]: {
      ...fromVoice,
      entryIds: fromVoice.entryIds.filter((id) => id !== entryId),
    },
    [toVoiceId]: { ...toVoice, entryIds: [...toVoice.entryIds, entryId] },
  };

  const entry = structure.entriesById[entryId];
  const entriesById =
    isPitchedEntry(entry) && entry.tupletId
      ? { ...structure.entriesById, [entryId]: { ...entry, tupletId: null } }
      : structure.entriesById;

  // A voice left with zero entries is dropped, mirroring
  // deleteSelectionHelpers.ts's own repair — but the staff always keeps at
  // least its first voice, even if empty.
  const voiceOrder = staff.voiceOrder.filter(
    (voiceId, index) => index === 0 || voicesById[voiceId].entryIds.length > 0
  );
  const survivingVoicesById = Object.fromEntries(
    voiceOrder.map((voiceId) => [voiceId, voicesById[voiceId]])
  );

  let next: CompositionStructure = {
    ...structure,
    entriesById,
    stavesById: {
      ...structure.stavesById,
      [staffId]: { ...staff, voiceOrder, voicesById: survivingVoicesById },
    },
  };

  if (survivingVoicesById[fromVoiceId]) {
    next = dissolveDiscontiguousTuplets(next, staffId, fromVoiceId);
  }
  next = normalizeConnectorEndpointOrder(next);
  next = pruneBrokenTies(next);
  return next;
}

// A tuplet must be a single uninterrupted run of 2+ entries in one voice (the
// library renders it as one `<music-tuplet>` wrapper). A reorder can pull a
// member out of the run or drop a non-member into it; dissolve any tuplet that
// is no longer contiguous rather than trying to guess a new grouping.
function dissolveDiscontiguousTuplets(
  structure: CompositionStructure,
  staffId: string,
  voiceId: string
): CompositionStructure {
  const entryIds = structure.stavesById[staffId].voicesById[voiceId].entryIds;
  const runs = new Map<
    string,
    { first: number; last: number; count: number }
  >();
  entryIds.forEach((id, index) => {
    const entry = structure.entriesById[id];
    if (!entry || !isPitchedEntry(entry) || !entry.tupletId) {
      return;
    }
    const run = runs.get(entry.tupletId);
    if (run) {
      run.last = index;
      run.count += 1;
    } else {
      runs.set(entry.tupletId, { first: index, last: index, count: 1 });
    }
  });

  const broken = new Set<string>();
  for (const [tupletId, run] of runs) {
    if (run.count < 2 || run.last - run.first + 1 !== run.count) {
      broken.add(tupletId);
    }
  }
  if (broken.size === 0) {
    return structure;
  }

  const entriesById = Object.fromEntries(
    Object.entries(structure.entriesById).map(([id, entry]) => [
      id,
      isPitchedEntry(entry) && entry.tupletId && broken.has(entry.tupletId)
        ? { ...entry, tupletId: null }
        : entry,
    ])
  );
  const tupletsById = Object.fromEntries(
    Object.entries(structure.tupletsById).filter(([id]) => !broken.has(id))
  );
  return { ...structure, entriesById, tupletsById };
}

// `NormalizedConnector` requires `startEntryId` to precede `endEntryId` in
// document order (tie/slur role resolution keys off it). Dragging one endpoint
// past the other inverts that; swap them back so the connector still renders the
// right way round (`pruneBrokenTies` afterward drops a tie that is no longer
// valid regardless).
function normalizeConnectorEndpointOrder(
  structure: CompositionStructure
): CompositionStructure {
  const indexOf = new Map(
    flattenEntryOrder(structure).map((id, index) => [id, index])
  );
  let changed = false;
  const connectorsById = Object.fromEntries(
    Object.entries(structure.connectorsById).map(([id, connector]) => {
      const startIndex = indexOf.get(connector.startEntryId) ?? -1;
      const endIndex = indexOf.get(connector.endEntryId) ?? -1;
      if (startIndex >= 0 && endIndex >= 0 && startIndex > endIndex) {
        changed = true;
        return [
          id,
          {
            ...connector,
            startEntryId: connector.endEntryId,
            endEntryId: connector.startEntryId,
          },
        ];
      }
      return [id, connector];
    })
  );
  return changed ? { ...structure, connectorsById } : structure;
}

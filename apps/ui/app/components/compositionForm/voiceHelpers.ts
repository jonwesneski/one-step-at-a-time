import { pruneConnectorsForEntries } from './connectorsHelpers';
import type {
  CompositionStructure,
  NormalizedStaff,
  NormalizedVoice,
} from './types';
import { isPitchedEntry } from './types';

// Voice resolution for the composition form. A staff's `voiceOrder`/
// `voicesById` mirror the library's `<music-voice>` model directly — position
// in `voiceOrder` IS the voice number, at most 3 (mirrors the library's
// MAX_VOICES). This app is the sole writer of the composition data, so the
// helpers here only ever handle well-formed data.

const MAX_VOICES = 3;

export function createDefaultVoice(): NormalizedVoice {
  return { id: crypto.randomUUID(), entryIds: [] };
}

// Every entry in `staff`, in voice order, regardless of which voice it's in —
// for anything that genuinely needs "the whole staff's stream" rather than one
// voice's own: deletion cascades, staff-wide search, marquee hit-testing.
export function staffEntryIds(staff: NormalizedStaff): string[] {
  return staff.voiceOrder.flatMap((id) => staff.voicesById[id].entryIds);
}

// Appends a new empty voice to `staffId`. A no-op (warns) past MAX_VOICES,
// mirroring the library's own cap.
export function addVoiceToStaff(
  structure: CompositionStructure,
  staffId: string
): CompositionStructure {
  const staff = structure.stavesById[staffId];
  if (!staff) {
    return structure;
  }
  if (staff.voiceOrder.length >= MAX_VOICES) {
    console.warn(
      `[voiceHelpers] a staff supports at most ${MAX_VOICES} voices; ignoring`
    );
    return structure;
  }
  const voice = createDefaultVoice();
  return {
    ...structure,
    stavesById: {
      ...structure.stavesById,
      [staffId]: {
        ...staff,
        voiceOrder: [...staff.voiceOrder, voice.id],
        voicesById: { ...staff.voicesById, [voice.id]: voice },
      },
    },
  };
}

// Removes a voice from a staff and cascades the repair: deletes its entries
// from `entriesById`, drops any tuplet left under 2 members (mirrors
// deleteSelectionHelpers.ts's own repair — this app's sole-writer contract
// means neither file can just call the other without a circular import, since
// deleteSelectionHelpers.ts already depends on staffEntryIds below), and
// drops any tie/slur/hairpin whose endpoint was one of the removed entries
// via `pruneConnectorsForEntries` (kind-agnostic — mirrors
// deleteSelectionHelpers.ts's own delete-cascade connector filter). A no-op
// (warns) when it's the staff's only voice — a staff always needs at least
// one.
export function removeVoiceFromStaff(
  structure: CompositionStructure,
  staffId: string,
  voiceId: string
): CompositionStructure {
  const staff = structure.stavesById[staffId];
  const voice = staff?.voicesById[voiceId];
  if (!staff || !voice) {
    return structure;
  }
  if (staff.voiceOrder.length <= 1) {
    console.warn(
      '[voiceHelpers] a staff must keep at least one voice; ignoring'
    );
    return structure;
  }

  const removedEntryIds = new Set(voice.entryIds);
  const voiceOrder = staff.voiceOrder.filter((id) => id !== voiceId);
  const voicesById = { ...staff.voicesById };
  delete voicesById[voiceId];
  const stavesById = {
    ...structure.stavesById,
    [staffId]: { ...staff, voiceOrder, voicesById },
  };

  let entriesById = Object.fromEntries(
    Object.entries(structure.entriesById).filter(
      ([id]) => !removedEntryIds.has(id)
    )
  );

  const survivingMembers = new Map<string, number>();
  for (const entry of Object.values(entriesById)) {
    if (isPitchedEntry(entry) && entry.tupletId) {
      survivingMembers.set(
        entry.tupletId,
        (survivingMembers.get(entry.tupletId) ?? 0) + 1
      );
    }
  }
  const tupletsById = Object.fromEntries(
    Object.entries(structure.tupletsById).filter(
      ([id]) => (survivingMembers.get(id) ?? 0) >= 2
    )
  );
  entriesById = Object.fromEntries(
    Object.entries(entriesById).map(([id, entry]) => [
      id,
      isPitchedEntry(entry) && entry.tupletId && !tupletsById[entry.tupletId]
        ? { ...entry, tupletId: null }
        : entry,
    ])
  );

  return pruneConnectorsForEntries(
    {
      ...structure,
      stavesById,
      entriesById,
      tupletsById,
    },
    removedEntryIds
  );
}

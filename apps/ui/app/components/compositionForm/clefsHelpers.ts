import type {
  ClefType,
  Note,
  Octave,
} from '@one-step-at-a-time/web-components';
import { CAPACITY_EPSILON, entryFactor } from './measureCapacityHelpers';
import type { ChordNote, CompositionStructure } from './types';

// Effective clef and clef-derived octave for a note/chord entry. Mirrors the
// library's render-time resolution: `staffClassicalBase.ts` tracks mid-stream
// `<music-clef>` markers (`#activeClefAt`) and, for a note with no explicit
// octave, searches the active clef's octave list for the first pitch that lands
// on the staff (`noteToYCoordinate`); chords stack bare notes into an ascending
// close voicing (`#resolveChordStaffYCoordinates`). The per-clef ranges/lists
// come from `rules/clefRules.ts` `CLEF_DEFINITIONS` + `generateYCoordinates`
// (treble spans C4–C6, bass E2–E4, inclusive). This app is the sole writer of
// the composition data, so only well-formed input is handled.

const DIATONIC = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// A note's position in diatonic steps, for range/stacking comparisons.
export function step(letter: string, octave: number): number {
  return octave * 7 + DIATONIC.indexOf(letter);
}

// Inverse of `step` — a diatonic-step index back to a natural pitch. Accidentals
// are not modelled here (vertical staff position is diatonic).
export function stepToPitch(diatonicStep: number): {
  value: Note;
  octave: Octave;
} {
  const octave = Math.floor(diatonicStep / 7) as Octave;
  const index = ((diatonicStep % 7) + 7) % 7;
  return { value: DIATONIC[index] as Note, octave };
}

export type ClefRange = {
  octaves: Octave[];
  lowStep: number;
  highStep: number;
};

export const CLEF_RANGES: Record<ClefType, ClefRange> = {
  treble: { octaves: [4, 5, 6], lowStep: step('C', 4), highStep: step('C', 6) },
  bass: { octaves: [2, 3, 4], lowStep: step('E', 2), highStep: step('E', 4) },
};

// The beat offset of `targetId` within `entryIds` — the cumulative duration
// of every entry before it (a clef marker's own `entryFactor` is 0, so it
// never shifts the offset of what follows it). Mirrors the library's own
// computeBeatOffsets, adapted to this app's normalized entry lists instead
// of live DOM elements.
function beatOffsetOf(
  structure: CompositionStructure,
  entryIds: string[],
  targetId: string
): number {
  let cumulative = 0;
  for (const id of entryIds) {
    if (id === targetId) {
      return cumulative;
    }
    const entry = structure.entriesById[id];
    cumulative += entry ? entryFactor(entry, structure.tupletsById) : 0;
  }
  return cumulative;
}

// The clef in effect at `entryId`: the containing staff's base clef,
// overridden by any `ClefEntry` earlier in that staff's stream. A clef
// change is staff-wide but only ever authored in voice 1 (see
// NormalizedStaff's own doc comment), so this resolves `entryId`'s own beat
// offset within its own voice, then walks voice 1's stream comparing each
// clef marker's beat offset against it — correct for an entry in voice 1
// itself (array position in that same stream) and for one in voice 2/3
// (compared by beat offset, not document position, since the two voices'
// streams aren't otherwise comparable).
export function effectiveClefOfEntry(
  structure: CompositionStructure,
  entryId: string
): ClefType {
  const staff = Object.values(structure.stavesById).find((s) =>
    s.voiceOrder.some((voiceId) =>
      s.voicesById[voiceId].entryIds.includes(entryId)
    )
  );
  if (!staff) {
    return 'treble';
  }
  const ownVoice = staff.voiceOrder
    .map((voiceId) => staff.voicesById[voiceId])
    .find((voice) => voice.entryIds.includes(entryId));
  const entryBeatOffset = ownVoice
    ? beatOffsetOf(structure, ownVoice.entryIds, entryId)
    : 0;

  const firstVoice = staff.voicesById[staff.voiceOrder[0]];
  let clef: ClefType = staff.type;
  let cumulative = 0;
  for (const id of firstVoice.entryIds) {
    if (cumulative > entryBeatOffset + CAPACITY_EPSILON) {
      break;
    }
    const entry = structure.entriesById[id];
    if (entry?.type === 'clef') {
      clef = entry.clef;
    }
    cumulative += entry ? entryFactor(entry, structure.tupletsById) : 0;
  }
  return clef;
}

// The octave each note renders at under `clef`: an explicit octave is used as
// given; an absent one resolves to the lowest in-range octave that keeps the
// chord ascending (for a lone note, simply the lowest in-range octave).
export function resolveEntryOctaves(
  clef: ClefType,
  notes: ChordNote[]
): Octave[] {
  const { octaves, lowStep, highStep } = CLEF_RANGES[clef];
  let previousStep = -Infinity;
  return notes.map((note) => {
    if (note.octave != null) {
      previousStep = step(note.value[0].toUpperCase(), note.octave);
      return note.octave;
    }
    const letter = note.value[0].toUpperCase();
    const inRange = octaves.filter((octave) => {
      const s = step(letter, octave);
      return s >= lowStep && s <= highStep;
    });
    const above = inRange.filter(
      (octave) => step(letter, octave) > previousStep
    );
    const resolved =
      above.length > 0
        ? above.reduce((a, b) => (step(letter, a) <= step(letter, b) ? a : b))
        : inRange[0];
    previousStep = step(letter, resolved);
    return resolved;
  });
}

// The rendered octave of a single note entry under `clef`.
export function resolveNoteOctave(
  clef: ClefType,
  value: Note,
  octave: Octave | null | undefined
): Octave {
  return resolveEntryOctaves(clef, [{ value, octave }])[0];
}

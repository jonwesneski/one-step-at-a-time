import type {
  ClefType,
  Note,
  Octave,
} from '@one-step-at-a-time/web-components';
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

// The clef in effect at `entryId`: the containing staff's base clef,
// overridden by any `ClefEntry` earlier in that staff's stream. A clef
// change is staff-wide but only ever authored in voice 1 (see
// NormalizedStaff's own doc comment), so this always walks voice 1's own
// entryIds looking for the last clef marker before `entryId`'s position.
//
// When `entryId` itself is in voice 1, this is exact — array position in
// voice 1's own stream is a real ordering. When it's in a different voice
// (unreachable this phase — nothing in the UI can create a 2nd voice yet),
// comparing array positions across two different voices' streams isn't
// meaningful without a real beat-offset (the same problem the library's own
// Phase 3 solved with computeBeatOffsets); rather than build that now for an
// unreachable case, this falls back to "the last clef anywhere in voice 1" —
// a known, documented gap for Phase 5, not a silent wrong answer.
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
  const firstVoice = staff.voicesById[staff.voiceOrder[0]];
  const inFirstVoice = firstVoice.entryIds.includes(entryId);
  let clef: ClefType = staff.type;
  for (const id of firstVoice.entryIds) {
    if (inFirstVoice && id === entryId) {
      break;
    }
    const entry = structure.entriesById[id];
    if (entry?.type === 'clef') {
      clef = entry.clef;
    }
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

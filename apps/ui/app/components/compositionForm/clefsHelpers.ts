import type {
  ClefType,
  Note,
  Octave,
  VocalType,
} from '@one-step-at-a-time/web-components';
import { CAPACITY_EPSILON, entryFactor } from './measureCapacityHelpers';
import type { ChordNote, CompositionStructure, NormalizedStaff } from './types';

// Effective clef and clef-derived octave for a note/chord entry, mirroring the
// library's resolution (staffNotationBase.ts#activeClefAt and
// noteToYCoordinate; chords stack into an ascending close voicing). Only
// well-formed input is handled, since this app is the sole writer.

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

// A clef, or one of the vocal staff's own ranges (staffVocal.ts: mezzo and
// alto on treble positions with a lower reach, tenor on treble-8vb).
export type StaffRangeKey = ClefType | 'mezzo' | 'alto' | 'tenor';

export const CLEF_RANGES: Record<StaffRangeKey, ClefRange> = {
  treble: { octaves: [4, 5, 6], lowStep: step('C', 4), highStep: step('C', 6) },
  bass: { octaves: [2, 3, 4], lowStep: step('E', 2), highStep: step('E', 4) },
  mezzo: {
    octaves: [3, 4, 5, 6],
    lowStep: step('A', 3),
    highStep: step('C', 6),
  },
  alto: { octaves: [3, 4, 5], lowStep: step('F', 3), highStep: step('A', 5) },
  tenor: { octaves: [3, 4, 5], lowStep: step('C', 3), highStep: step('C', 5) },
};

const VOCAL_RANGES: Record<VocalType, StaffRangeKey> = {
  soprano: 'treble',
  mezzo: 'mezzo',
  alto: 'alto',
  tenor: 'tenor',
  baritone: 'bass',
  bass: 'bass',
};

// The range a staff starts in: its clef, or its voice type's range.
export function staffRangeKey(staff: NormalizedStaff): StaffRangeKey {
  if (staff.type === 'vocal') {
    return VOCAL_RANGES[staff.voiceType];
  }
  return staff.type === 'bass' ? 'bass' : 'treble';
}

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
    cumulative += entry ? entryFactor(entry, structure) : 0;
  }
  return cumulative;
}

// The clef (or vocal range) in effect at `entryId`: the staff's own,
// overridden by any earlier `ClefEntry`. Clefs live in voice 1, so markers are compared by beat offset.
export function effectiveClefOfEntry(
  structure: CompositionStructure,
  entryId: string
): StaffRangeKey {
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
  let clef: StaffRangeKey = staffRangeKey(staff);
  let cumulative = 0;
  for (const id of firstVoice.entryIds) {
    if (cumulative > entryBeatOffset + CAPACITY_EPSILON) {
      break;
    }
    const entry = structure.entriesById[id];
    if (entry?.type === 'clef') {
      clef = entry.clef;
    }
    cumulative += entry ? entryFactor(entry, structure) : 0;
  }
  return clef;
}

// The octave each note renders at under `clef`: an explicit octave is used as
// given; an absent one resolves to the lowest in-range octave that keeps the
// chord ascending (for a lone note, simply the lowest in-range octave).
export function resolveEntryOctaves(
  clef: StaffRangeKey,
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
  clef: StaffRangeKey,
  value: Note,
  octave: Octave | null | undefined
): Octave {
  return resolveEntryOctaves(clef, [{ value, octave }])[0];
}

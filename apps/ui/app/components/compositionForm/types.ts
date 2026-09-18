import type {
  ArticulationType,
  ClefType,
  ConnectorRole,
  DurationType,
  DynamicMarking,
  GraceDuration,
  GraceSlur,
  GraceType,
  Mode,
  Note,
  Octave,
  StaffGroupType,
  StressType,
  TimeSignature,
  TupletRatio,
} from '@one-step-at-a-time/web-components';
import { DURATIONS, MODES, TIMES } from '@one-step-at-a-time/web-components';

export type { ConnectorRole };

// Re-export the library's option arrays so form controls have one source of
// truth. `KEY_SIGNATURE_OPTIONS` below stays local — it is a deliberate
// circle-of-fifths subset with no library equivalent.
export { DURATIONS as DURATION_OPTIONS, TIMES as TIME_SIGNATURE_OPTIONS };
export const MODE_OPTIONS = MODES;

export type StaffType = 'treble' | 'bass';

// `octave: null` (or absent) means "let the staff clef pick the octave" —
// matches the library's optional `octave` attribute and `ChordNote` shape.
export type ChordNote = { value: Note; octave?: Octave | null };

// A grace-note group preceding a note/chord. `octaves` / `articulations` are
// aligned by index with `notes` (a null slot = "no value for that grace note").
// Serialized to the seven `grace-*` attributes by graceHelpers.ts.
export type GraceGroup = {
  notes: Note[];
  octaves?: (Octave | null)[];
  articulations?: (ArticulationType | null)[];
  type?: GraceType;
  duration?: GraceDuration;
  slur?: GraceSlur;
  dynamic?: DynamicMarking;
};

// Expression marks shared by notes and chords. Every field is optional/nullable
// and maps 1:1 to a `<music-note>` / `<music-chord>` attribute.
export type EntryMarkings = {
  dynamic?: DynamicMarking | null;
  articulation?: ArticulationType | null;
  stress?: StressType | null;
  grace?: GraceGroup | null;
};

// A note/chord/rest belongs to at most one tuplet, referenced by id. The
// tuplet's member order and position come from its own voice's `entryIds` —
// there is no separate order array. Nested tuplets are not modelled (one
// tupletId per entry), though the library renderer does support them.
export type TupletMembership = { tupletId?: string | null };

export type NoteEntry = EntryMarkings &
  TupletMembership & {
    id: string;
    type: 'note';
    value: Note;
    octave?: Octave | null;
    duration: DurationType;
  };
export type ChordEntry = EntryMarkings &
  TupletMembership & {
    id: string;
    type: 'chord';
    notes: ChordNote[];
    duration: DurationType;
  };
export type RestEntry = TupletMembership & {
  id: string;
  type: 'rest';
  duration: DurationType;
};
// A mid-stream clef change. Lives in a voice's `entryIds` like any entry
// (always voice 1's — see NormalizedStaff's own doc comment), but carries no
// beat duration and cannot belong to a tuplet.
export type ClefEntry = {
  id: string;
  type: 'clef';
  clef: ClefType;
};
export type MusicEntry = NoteEntry | ChordEntry | RestEntry | ClefEntry;

// note/chord/rest — an entry that occupies beat time and can carry markings /
// tuplet membership. Excludes ClefEntry.
export type PitchedEntry = NoteEntry | ChordEntry | RestEntry;
export function isPitchedEntry(entry: MusicEntry): entry is PitchedEntry {
  return entry.type !== 'clef';
}

// Entry shape before an id is assigned (used by the Add* panels)
export type DraftMusicEntry =
  | Omit<NoteEntry, 'id'>
  | Omit<ChordEntry, 'id'>
  | Omit<RestEntry, 'id'>
  | Omit<ClefEntry, 'id'>;

// Flat normalized nodes. `time` is a sparse time signature override: set only on
// a measure where the time signature changes; absent/null means "inherit the
// effective time signature from earlier measures" (ultimately the composition
// `timeSig`). Measure 1 never carries one — its time signature is the composition
// `timeSig`.
export type NormalizedMeasure = {
  id: string;
  staffIds: string[];
  time?: TimeSignature | null;
};
// Structural nesting mirrors <music-voice> directly (see the library's
// polyphonic-notation design) — position in voiceOrder IS the voice number.
// A ClefEntry always lives in voiceOrder[0] (voice 1) — a clef change is
// staff-wide, but the library only honors a mid-stream <music-clef> nested
// in the first <music-voice> (voice 1 is the canonical timeline every other
// voice's position is judged against).
export type NormalizedVoice = { id: string; entryIds: string[] };

export type NormalizedStaff = {
  id: string;
  type: StaffType;
  voiceOrder: string[]; // ascending = voice 1..3, always >=1 entry
  voicesById: Record<string, NormalizedVoice>;
  group: StaffGroupType | null;
  groupId: string | null;
};

// tie / slur pair by document order with id/for disambiguation for interleaving
// spans; crescendo / decrescendo are hairpins the library pairs by nearest end
// of the same kind (no id/for). `diminuendo` is not modelled — it is a display
// label that writes `decrescendo` (the library treats it as a pure alias).
export type ConnectorKind = 'tie' | 'slur' | 'crescendo' | 'decrescendo';

// A tie / slur / hairpin between two note/chord entries. References entry ids
// only, so it is independent of which staff/measure the endpoints live in (any
// of them may span a barline). startEntryId is always earlier than endEntryId in
// document order (measure → staff → entry).
export type NormalizedConnector = {
  id: string;
  kind: ConnectorKind;
  startEntryId: string;
  endEntryId: string;
};

// A tuplet grouping a contiguous run of entries in one voice. Which entries and
// in what order is derived from the entries carrying this id in that voice's
// `entryIds`.
export type NormalizedTuplet = { id: string; ratio: TupletRatio };

// The undoable structural slice. `timeSig` lives here (not just on the root form
// values) so a time signature change — which also re-bars the music — is one undo
// step.
export type CompositionStructure = {
  timeSig: TimeSignature;
  measureOrder: string[];
  measuresById: Record<string, NormalizedMeasure>;
  stavesById: Record<string, NormalizedStaff>;
  entriesById: Record<string, MusicEntry>;
  connectorsById: Record<string, NormalizedConnector>;
  connectorOrder: string[];
  tupletsById: Record<string, NormalizedTuplet>;
};

export type Selection = {
  measureIds: string[];
  staffIds: string[];
  entryIds: string[];
};

export const EMPTY_SELECTION: Selection = {
  measureIds: [],
  staffIds: [],
  entryIds: [],
};

export function isSelectionEmpty(selection: Selection): boolean {
  return (
    selection.measureIds.length === 0 &&
    selection.staffIds.length === 0 &&
    selection.entryIds.length === 0
  );
}

// Exactly one entry and nothing else — the selection an entry editor needs.
export function isSingleEntrySelection(selection: Selection): boolean {
  return (
    selection.entryIds.length === 1 &&
    selection.measureIds.length === 0 &&
    selection.staffIds.length === 0
  );
}

// Root form shape (BasicInfo fields + structure). `timeSig` comes in via
// `CompositionStructure`.
export type CompositionFormValues = {
  title: string;
  keySig: Note;
  mode: Mode;
} & CompositionStructure;

export const KEY_SIGNATURE_OPTIONS: Note[] = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'Db',
  'Ab',
  'Eb',
  'Bb',
  'F',
];

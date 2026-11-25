import type {
  ArpeggioType,
  ArticulationType,
  BarlineType,
  ClefType,
  ConnectorRole,
  ConventionalAccidentalType,
  DurationType,
  DynamicMarking,
  EndingNumbering,
  GlissandoHint,
  GraceDuration,
  GraceSlur,
  GraceType,
  GuitarFret,
  HairpinKind,
  MeasureEndBarline,
  MeasureNumberDisplay,
  Mode,
  Note,
  NoteheadType,
  Octave,
  OctaveContinuationMode,
  OctaveDisplayMode,
  OctaveShiftAmount,
  RestStaffSide,
  StaffGroupType,
  StemDirection,
  StressType,
  TieStyle,
  TimeSignature,
  TremoloBeamAttach,
  TremoloBeamPosition,
  TremoloLabel,
  TremoloStrokeCount,
  TremoloValue,
  TrillContinuationMode,
  TrillFinishSlur,
  TrillLineMode,
  TupletPlacement,
  TupletRatio,
  VocalType,
} from '@one-step-at-a-time/web-components';
import {
  BARLINE_TYPES,
  DURATIONS,
  ENDING_NUMBERINGS,
  MEASURE_END_BARLINES,
  MEASURE_NUMBER_DISPLAYS,
  MODES,
  OCTAVE_CONTINUATION_MODES,
  OCTAVE_DISPLAY_MODES,
  OCTAVE_SHIFT_AMOUNTS,
  REST_STAFF_SIDES,
  STEM_DIRECTIONS,
  TIMES,
  TUPLET_PLACEMENTS,
} from '@one-step-at-a-time/web-components';

export type { ConnectorRole };

// Re-export the library's option arrays so form controls have one source of
// truth. `KEY_SIGNATURE_OPTIONS` below stays local — it is a deliberate
// circle-of-fifths subset with no library equivalent.
export { DURATIONS as DURATION_OPTIONS, TIMES as TIME_SIGNATURE_OPTIONS };
export const MODE_OPTIONS = MODES;
export const MEASURE_NUMBER_DISPLAY_OPTIONS = MEASURE_NUMBER_DISPLAYS;
export const BARLINE_TYPE_OPTIONS = BARLINE_TYPES;
export const MEASURE_END_BARLINE_OPTIONS = MEASURE_END_BARLINES;
export const ENDING_NUMBERING_OPTIONS = ENDING_NUMBERINGS;
export const STEM_DIRECTION_OPTIONS = STEM_DIRECTIONS;
export const REST_STAFF_SIDE_OPTIONS = REST_STAFF_SIDES;
export const TUPLET_PLACEMENT_OPTIONS = TUPLET_PLACEMENTS;
export const OCTAVE_SHIFT_AMOUNT_OPTIONS = OCTAVE_SHIFT_AMOUNTS;
export const OCTAVE_DISPLAY_MODE_OPTIONS = OCTAVE_DISPLAY_MODES;
export const OCTAVE_CONTINUATION_MODE_OPTIONS = OCTAVE_CONTINUATION_MODES;

export type ClassicalStaffType = 'treble' | 'bass';

// `octave: null` (or absent) means "let the staff clef pick the octave" —
// matches the library's optional `octave` attribute and `ChordNote` shape.
export type ChordNote = {
  value: Note;
  octave?: Octave | null;
  // Overrides the chord's own `notehead` for this tone.
  notehead?: NoteheadType | null;
  accidentalReminder?: boolean;
};

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
  noteheads?: (NoteheadType | null)[];
};

// A trill on the entry it starts from; its line runs through the entry's own
// tie chain. `note` and `accidental` both name the trilling pitch, so only
// one is kept. `finish` is the closing grace figure after the trill.
export type TrillMarking = {
  line?: TrillLineMode | null;
  stop?: boolean;
  accidental?: ConventionalAccidentalType | null;
  note?: Note | null;
  continuation?: TrillContinuationMode | null;
  finish?: {
    notes: Note[];
    octaves?: (Octave | null)[];
    slur?: TrillFinishSlur | null;
  } | null;
};

// Expression marks shared by notes and chords. Every field is optional/nullable
// and maps 1:1 to a `<music-note>` / `<music-chord>` attribute.
export type EntryMarkings = {
  dynamic?: DynamicMarking | null;
  articulation?: ArticulationType | null;
  stress?: StressType | null;
  grace?: GraceGroup | null;
  stemDirection?: StemDirection | null;
  // `dynamic` (and any hairpin this entry starts) applies to both hands —
  // drawn once, in the gap between this staff and its partner.
  dynamicShared?: boolean;
  // A standalone "(loco)" reminder. A span's own closing loco is
  // NormalizedOctaveSpan.end instead.
  loco?: boolean;
  dynamicReminder?: boolean;
  accidentalReminder?: boolean;
  notehead?: NoteheadType | null;
  tremolo?: TremoloValue | null;
  tremoloTuplet?: number | null;
  // `non-trem` usually sits on a plain note, so it doesn't need `tremolo`.
  tremoloLabel?: TremoloLabel | null;
  articulationRepeat?: boolean;
  trill?: TrillMarking | null;
  arpeggio?: ArpeggioType | null;
  arpeggioHairpin?: HairpinKind | null;
  arpeggioHairpinFrom?: DynamicMarking | null;
  arpeggioHairpinTo?: DynamicMarking | null;
  // Start/end of a "sempre arpeggiando" passage.
  arpeggiate?: ConnectorRole | null;
  // An open "let ring" tie. It uses the element's one `tie` attribute, so an
  // entry with it is never a tie endpoint.
  laissezVibrer?: { label?: boolean; style?: TieStyle | null } | null;
};

// Cross-staff links shared by notes and chords, each mapping 1:1 to a library
// attribute. `beamGroupId` (`beam-group`) and `slurGroupId` (`slur-group`)
// are N:M shared keys across the members on two adjacent staves;
// `sharedStemWithEntryId` (`shared-stem-for`) and `arpeggioWithEntryId`
// (`arpeggio-for`) point at the other staff's entry and are written on the
// lower staff's end. Validity is enforced by
// notationLinksHelpers.ts#pruneInvalidNotationLinks.
export type CrossStaffLinks = {
  beamGroupId?: string | null;
  slurGroupId?: string | null;
  sharedStemWithEntryId?: string | null;
  // `arpeggio-for`: written on the lower staff's entry, pointing up.
  arpeggioWithEntryId?: string | null;
};

// A note/chord/rest belongs to at most one tuplet, referenced by id. The
// tuplet's member order and position come from its own voice's `entryIds` —
// there is no separate order array. Nested tuplets are not modelled (one
// tupletId per entry), though the library renderer does support them.
export type TupletMembership = { tupletId?: string | null };

// A two-note (or multi-note) tremolo groups a contiguous run of one voice's
// entries, like a tuplet: each member carries the group's id and takes 1/N of
// its written value.
export type TremoloMembership = { tremoloId?: string | null };

export type NoteEntry = EntryMarkings &
  CrossStaffLinks &
  TupletMembership &
  TremoloMembership & {
    id: string;
    type: 'note';
    value: Note;
    octave?: Octave | null;
    duration: DurationType;
    // A run note of a written-out arpeggio (NormalizedArpeggio); it takes no
    // beat time.
    arpeggioId?: string | null;
  };
export type ChordEntry = EntryMarkings &
  CrossStaffLinks &
  TupletMembership &
  TremoloMembership & {
    id: string;
    type: 'chord';
    notes: ChordNote[];
    duration: DurationType;
  };
export type RestEntry = TupletMembership &
  TremoloMembership & {
    id: string;
    type: 'rest';
    duration: DurationType;
    // Keeps its beat time but draws nothing — a spacer, e.g. for the other
    // hand's beats inside a cross-staff tuplet.
    hidden?: boolean;
    // A rest inside a cross-staff beam: membership only (it never joins the
    // beam line), plus where it sits against that beam.
    beamGroupId?: string | null;
    restStaffSide?: RestStaffSide | null;
  };
// A mid-stream clef change. Lives in a voice's `entryIds` like any entry
// (always voice 1's — see NormalizedStaff's own doc comment), but carries no
// beat duration and cannot belong to a tuplet.
export type ClefEntry = {
  id: string;
  type: 'clef';
  clef: ClefType;
};
// A mid-bar barline (`<music-barline>`), drawn through every staff of its
// measure. Like a clef change: zero duration, voice 1 only, never in a tuplet.
export type BarlineEntry = {
  id: string;
  type: 'barline';
  barlineType: BarlineType;
};
// A tablature note: a fret on a string. Lives only on a guitar-tab staff,
// which draws no rhythm but spaces by duration.
export type GuitarNoteEntry = {
  id: string;
  type: 'guitar-note';
  fret: GuitarFret;
  // 1 = highest string.
  string: number;
  duration: DurationType;
};

export type MusicEntry =
  | NoteEntry
  | ChordEntry
  | RestEntry
  | ClefEntry
  | BarlineEntry
  | GuitarNoteEntry;

// A zero-duration stream marker: a clef change or a mid-bar barline.
export type MarkerEntry = ClefEntry | BarlineEntry;
export function isMarkerEntry(entry: MusicEntry): entry is MarkerEntry {
  return entry.type === 'clef' || entry.type === 'barline';
}

// note/chord/rest — a notation-staff entry that occupies beat time and can
// carry markings / tuplet membership.
export type PitchedEntry = NoteEntry | ChordEntry | RestEntry;
export function isPitchedEntry(entry: MusicEntry): entry is PitchedEntry {
  return (
    entry.type === 'note' || entry.type === 'chord' || entry.type === 'rest'
  );
}

// Anything with a duration: a notation entry or a tab note.
export type TimedEntry = PitchedEntry | GuitarNoteEntry;
export function isTimedEntry(entry: MusicEntry): entry is TimedEntry {
  return isPitchedEntry(entry) || entry.type === 'guitar-note';
}

// Entry shape before an id is assigned (used by the Add* panels)
export type DraftMusicEntry =
  | Omit<NoteEntry, 'id'>
  | Omit<ChordEntry, 'id'>
  | Omit<RestEntry, 'id'>
  | Omit<ClefEntry, 'id'>
  | Omit<BarlineEntry, 'id'>
  | Omit<GuitarNoteEntry, 'id'>;

// Flat normalized nodes. `time` is a sparse time signature override: set only on
// a measure where the time signature changes; absent/null means "inherit the
// effective time signature from earlier measures" (ultimately the composition
// `timeSig`). Measure 1 never carries one — its time signature is the composition
// `timeSig`.
export type NormalizedMeasure = {
  id: string;
  staffIds: string[];
  time?: TimeSignature | null;
  // Repeats and endings, as the measure's own attributes.
  repeatStart?: boolean;
  barline?: MeasureEndBarline | null;
  // The passes this bar is played on, sorted ("1,2" → [1, 2]).
  ending?: number[] | null;
  endingLabel?: string | null;
};
// Structural nesting mirrors <music-voice> directly (see the library's
// polyphonic-notation design) — position in voiceOrder IS the voice number.
// A ClefEntry always lives in voiceOrder[0] (voice 1) — a clef change is
// staff-wide, but the library only honors a mid-stream <music-clef> nested
// in the first <music-voice> (voice 1 is the canonical timeline every other
// voice's position is judged against).
export type NormalizedVoice = { id: string; entryIds: string[] };

type StaffCommon = {
  id: string;
  voiceOrder: string[]; // ascending = voice 1..3, always >=1 entry
  voicesById: Record<string, NormalizedVoice>;
  group: StaffGroupType | null;
  groupId: string | null;
  // Margin text (instrument name, r.h./l.h.). Set on every measure's staff at
  // one staff index: the library draws it only at the start of each row.
  label?: string | null;
  // The part a guitar-tab staff in the same measure can follow (`tab-for`).
  part?: string | null;
};

export type ClassicalStaff = StaffCommon & { type: ClassicalStaffType };

// One verse of one measure's lyrics: syllables split on spaces and `-`, with
// a trailing `_` for a melisma (the library's <music-lyrics> syntax).
export type LyricVerse = { verse: number; text: string };

// A vocal staff's clef and range follow its voice type.
export type VocalStaff = StaffCommon & {
  type: 'vocal';
  voiceType: VocalType;
  lyrics?: LyricVerse[];
};

export type GuitarTabStaff = StaffCommon & {
  type: 'guitar-tab';
  // The `part` of the notation staff it mirrors.
  tabFor?: string | null;
};

export type NormalizedStaff = ClassicalStaff | VocalStaff | GuitarTabStaff;
export type StaffType = NormalizedStaff['type'];

// tie / slur / glissando pair by document order with id/for disambiguation for
// interleaving spans; crescendo / decrescendo are hairpins the library pairs by nearest end
// of the same kind (no id/for). `diminuendo` is not modelled — it is a display
// label that writes `decrescendo` (the library treats it as a pure alias).
export type ConnectorKind =
  | 'tie'
  | 'slur'
  | 'crescendo'
  | 'decrescendo'
  | 'glissando'
  // Guitar-tab techniques between two tab notes.
  | 'hammer-on'
  | 'pull-off'
  | 'slide';

// A tie / slur / hairpin between two note/chord entries. References entry ids
// only, so it is independent of which staff/measure the endpoints live in (any
// of them may span a barline). startEntryId is always earlier than endEntryId in
// document order (measure → staff → entry).
export type NormalizedConnector = {
  id: string;
  kind: ConnectorKind;
  startEntryId: string;
  endEntryId: string;
  // tie only: a dotted tie, as some editions draw for unmeasured tremolos.
  style?: TieStyle | null;
  // glissando only: which keys it slides across.
  hint?: GlissandoHint | null;
};

// A tuplet grouping a contiguous run of entries in one voice. Which entries and
// in what order is derived from the entries carrying this id in that voice's
// `entryIds`.
export type NormalizedTuplet = {
  id: string;
  ratio: TupletRatio;
  placement?: TupletPlacement | null;
  // Shared with the one tuplet on the adjacent staff it joins into a single
  // cross-staff tuplet (`tuplet-group`).
  crossStaffGroupId?: string | null;
};

export type NormalizedTremolo = {
  id: string;
  strokes: TremoloStrokeCount;
  // A minim tremolo's beams joined to the stems.
  beamAttach?: TremoloBeamAttach | null;
  // Beams between the heads, for two notes an octave or more apart.
  beamPosition?: TremoloBeamPosition | null;
  // Shared with the tremolo on the adjacent staff it joins (`tremolo-group`);
  // each side holds hidden rests for the other hand's share.
  crossStaffGroupId?: string | null;
};

// A written-out arpeggio: a run of notes (each carrying this id) that ties
// into `targetEntryId`, the note or chord right after them. The run takes no
// beat time.
export type NormalizedArpeggio = {
  id: string;
  targetEntryId: string;
  // A run note whose pitch isn't in the target: an l.v. tie, or no tie.
  unmatched?: 'lv' | 'skip' | null;
  lvLabel?: boolean;
};

// An octave-transposition line over a run of one staff track's voice (same
// staff index + voice index), possibly across barlines. Members are every
// entry between the endpoints on that track. Pitches are stored as written:
// applying a span moves its members' written octaves so they keep sounding
// where they were (octaveHelpers.ts).
export type OctaveSpanEnd = 'stop' | 'loco';
export type NormalizedOctaveSpan = {
  id: string;
  amount: OctaveShiftAmount;
  mode: OctaveDisplayMode;
  continuation: OctaveContinuationMode;
  end: OctaveSpanEnd;
  startEntryId: string;
  endEntryId: string;
};

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
  octaveSpansById: Record<string, NormalizedOctaveSpan>;
  tremolosById: Record<string, NormalizedTremolo>;
  arpeggiosById: Record<string, NormalizedArpeggio>;
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
  measureNumbers: MeasureNumberDisplay;
  // A thin double barline before a mid-piece start repeat.
  doubleBarBeforeRepeat: boolean;
  endingNumbering: EndingNumbering;
  // px cap on the score's width; 'none' fills the page; null keeps the
  // library default.
  maxWidth: number | 'none' | null;
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

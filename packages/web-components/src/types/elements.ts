import type {
  AccidentalType,
  ArpeggioType,
  ArticulationType,
  Chord,
  ClefType,
  DurationType,
  DynamicMarking,
  GlissandoHint,
  GraceDuration,
  GraceSlur,
  GraceType,
  HairpinKind,
  HairpinRole,
  Mode,
  Note,
  NoteLetter,
  Octave,
  StaffGroupType,
  StressType,
  TimeSignature,
  TrillContinuationMode,
  TrillFinishSlur,
  TrillLineMode,
  TupletRatio,
} from './theory';

export type NoteLetterOctave = `${NoteLetter}${Octave}`;

/** Which end of a tie, slur, or technique connector an element marks. */
export type ConnectorRole = 'start' | 'end';

/**
 * Value of the `tie` attribute: a `start`/`end` endpoint, or `laissez-vibrer`
 * — an open-ended tie curving off the notehead into empty space, for a note
 * left to ring (not held to a matching next notehead).
 */
export type TieValue = ConnectorRole | 'laissez-vibrer';

// The three array-valued grace properties reflect a comma-separated string
// attribute. Reads return the parsed array (internal renderers rely on that);
// writes also accept the raw string, since React and Storybook assign the JSX
// prop as a property rather than an attribute.
export type GraceNotesType = Note[] | string | null;
export type GraceOctavesType = (Octave | null)[] | string | null;
export type GraceArticulationsType =
  | (ArticulationType | null)[]
  | string
  | null;

export interface INoteElement {
  duration: DurationType;
  note: Note;
  octave: Octave | null;
  stemUp: boolean;
  stemExtension: number;
  noFlags: boolean;
  noStem: boolean;
  tie: TieValue | null;
  slur: ConnectorRole | null;
  /** Draw an `l.v.` label on a `tie="laissez-vibrer"` tie. */
  lvLabel: boolean;
  glissando: ConnectorRole | null;
  /** Which register of key the glissando line starts on — shown as text. */
  glissandoHint: GlissandoHint | null;
  dynamic: DynamicMarking | null;
  /** Centers `dynamic` between this staff and its neighbor instead of locally. */
  dynamicShared: boolean;
  crescendo: HairpinRole | null;
  decrescendo: HairpinRole | null;
  // Alias for decrescendo — always mirrors it.
  diminuendo: HairpinRole | null;
  articulation: ArticulationType | null;
  stress: StressType | null;
  // Arpeggio (rolled chord) sign drawn left of the element, spanning its
  // notehead range. On a lone note the sign is ~1 notehead tall.
  arpeggio: ArpeggioType | null;
  // `id` of the upper-staff element this element continues an unbroken
  // cross-staff arpeggio from (grand staff).
  arpeggioFor: string | null;
  // A dynamic change during the roll: a vertical hairpin wedge drawn just left
  // of the arpeggio sign, spanning the chord's vertical extent, with a dynamic
  // letter outside the staff at each end. Honoured only alongside a wave-variant
  // `arpeggio`.
  arpeggioHairpin: HairpinKind | null;
  // Dynamic letter at the start of the roll (bottom end for an upward roll).
  arpeggioHairpinFrom: DynamicMarking | null;
  // Dynamic letter at the end of the roll (top end for an upward roll).
  arpeggioHairpinTo: DynamicMarking | null;
  // Set false by an ancestor <music-measure> when this element is one end of a
  // continuous cross-staff arpeggio it draws itself; the element then skips its
  // own local sign. Not an attribute.
  renderArpeggioSign: boolean;
  // Marks the start / end of a `sempre arpeggiando` passage.
  arpeggiate: ConnectorRole | null;
  // Set by the staff to `'up'` for elements inside a `sempre arpeggiando`
  // passage that carry no explicit `arpeggio`; null otherwise. Not an attribute.
  impliedArpeggio: ArpeggioType | null;
  // Marks a trill start. The "tr" sign renders above the stave (or, standalone,
  // above the notehead). The trill line spans forward through this element's
  // own `tie` chain — no attribute is needed on the notes it continues into.
  trill: boolean;
  // 'auto' (default) draws the wavy extension line, matching standard
  // engraving practice; 'none' suppresses it (e.g. for a bare-sign-only
  // isolated, untied note-value).
  trillLine: TrillLineMode;
  // Draws a vertical end-notch here instead of letting the line run to the
  // next notehead.
  trillStop: boolean;
  // Overrides only the accidental of the trilling (auxiliary) pitch —
  // normally the diatonic upper neighbor as modified by the key signature.
  // Never changes the letter itself. Ignored (with a warning) when
  // `trillNote` is also set.
  trillAccidental: AccidentalType | null;
  // Full override of the trilling (auxiliary) pitch — letter and accidental
  // — rendered as a small written notehead in parentheses after the main
  // notehead rather than an accidental-only symbol above the sign. Required
  // whenever the trilling pitch shares the main note's own letter (a
  // chromatic/semitone trill) or otherwise isn't the plain diatonic
  // neighbor. Wins over `trillAccidental` when both are set.
  trillNote: Note | null;
  // Controls how a trill's line restates itself after a system break, once
  // the tie chain has carried it into the new row: 'bracketed' (default)
  // redraws the sign in parentheses there; 'line-only' resumes the line with
  // no restated sign. Ignored at an ordinary same-row barline, where the line
  // always resumes silently regardless of this value. Meaningful only on the
  // element that started the trill.
  trillContinuation: TrillContinuationMode;
  // Set by the staff to the resolved trilling pitch for a trill-marked
  // element. null when not trilling, or in standalone mode (trills render
  // nothing without a staff). Not an attribute.
  resolvedTrillPitch: {
    letter: NoteLetter;
    accidental: AccidentalType | null;
    written: boolean;
    octave: Octave | null;
  } | null;
  // Staff-written px to raise the trill sign glyph above its own nominal
  // position, when another voice's own content occupies that territory in
  // a multi-voice staff. Not an attribute; mirrors stemExtension's own
  // staff-internal, non-author-set pattern.
  trillSignExtraLift: number;
  get grace(): Note[] | null;
  set grace(value: GraceNotesType);
  // Per-grace-note octave, aligned by index with `grace`. A null slot (or a
  // missing trailing slot) falls back to the host element's own octave.
  get graceOctave(): (Octave | null)[] | null;
  set graceOctave(value: GraceOctavesType);
  // Per-grace-note articulation, aligned by index with `grace`. A null slot
  // (or a missing trailing slot) means no mark for that grace note.
  get graceArticulation(): (ArticulationType | null)[] | null;
  set graceArticulation(value: GraceArticulationsType);
  graceType: GraceType;
  graceDuration: GraceDuration | null;
  graceSlur: GraceSlur;
  // Key-signature-resolved accidentals for the grace pitches, set by the
  // staff. null = standalone mode (suffix-driven accidentals).
  resolvedGraceAccidentals: (AccidentalType | null)[] | null;
  // A single dynamic for the whole grace group, independent of the host
  // note's own `dynamic`. Rendered by the staff under the first grace note.
  graceDynamic: DynamicMarking | null;
  // Grace note(s) placed *after* this element (a trill's finishing/closing
  // figure) rather than before it — same comma-separated-or-array shape as
  // `grace`. Always rendered as plain unslashed noteheads (no `grace-type`
  // equivalent) at a fixed eighth-note-or-group written value.
  get trillFinish(): Note[] | null;
  set trillFinish(value: GraceNotesType);
  // Per-trill-finish-note octave, aligned by index with `trillFinish` — same
  // shape and fallback behavior as `graceOctave`.
  get trillFinishOctave(): (Octave | null)[] | null;
  set trillFinishOctave(value: GraceOctavesType);
  // Which slur(s) a trill's finishing grace note(s) draw: back to this
  // element ('to-main', default), forward to the next element ('to-next'),
  // 'both', or 'none'.
  trillFinishSlur: TrillFinishSlur;
  // Key-signature-resolved accidentals for the trill-finish pitches, set by
  // the staff — same fallback shape as `resolvedGraceAccidentals`.
  resolvedTrillFinishAccidentals: (AccidentalType | null)[] | null;
  // undefined = auto-detect from note attribute (standalone)
  // AccidentalType = show this symbol (set by staff)
  // null = suppress (key sig or in-measure state covers it)
  showAccidental: AccidentalType | null | undefined;
  // Set by the staff to enable ledger line rendering. null in standalone mode.
  staffY: number | null;
  batchUpdate(fn: () => void): void;
}

export type ChordNote = {
  value: Note;
  octave: Octave | null;
  duration: DurationType;
};
export interface IChordElement {
  duration: DurationType;
  chord: Chord | null;
  readonly notes: ChordNote[];
  stemUp: boolean;
  stemExtension: number;
  noFlags: boolean;
  staffYCoordinates: number[] | null;
  noteAccidentals: (AccidentalType | null | undefined)[];
  tie: TieValue | null;
  slur: ConnectorRole | null;
  /** Draw an `l.v.` label on a `tie="laissez-vibrer"` tie. */
  lvLabel: boolean;
  glissando: ConnectorRole | null;
  /** Which register of key the glissando line starts on — shown as text. */
  glissandoHint: GlissandoHint | null;
  dynamic: DynamicMarking | null;
  /** Centers `dynamic` between this staff and its neighbor instead of locally. */
  dynamicShared: boolean;
  crescendo: HairpinRole | null;
  decrescendo: HairpinRole | null;
  // Alias for decrescendo — always mirrors it.
  diminuendo: HairpinRole | null;
  articulation: ArticulationType | null;
  stress: StressType | null;
  // Arpeggio (rolled chord) sign drawn left of the element, spanning its
  // notehead range. On a lone note the sign is ~1 notehead tall.
  arpeggio: ArpeggioType | null;
  // `id` of the upper-staff element this element continues an unbroken
  // cross-staff arpeggio from (grand staff).
  arpeggioFor: string | null;
  // A dynamic change during the roll: a vertical hairpin wedge drawn just left
  // of the arpeggio sign, spanning the chord's vertical extent, with a dynamic
  // letter outside the staff at each end. Honoured only alongside a wave-variant
  // `arpeggio`.
  arpeggioHairpin: HairpinKind | null;
  // Dynamic letter at the start of the roll (bottom end for an upward roll).
  arpeggioHairpinFrom: DynamicMarking | null;
  // Dynamic letter at the end of the roll (top end for an upward roll).
  arpeggioHairpinTo: DynamicMarking | null;
  // Set false by an ancestor <music-measure> when this element is one end of a
  // continuous cross-staff arpeggio it draws itself; the element then skips its
  // own local sign. Not an attribute.
  renderArpeggioSign: boolean;
  // Marks the start / end of a `sempre arpeggiando` passage.
  arpeggiate: ConnectorRole | null;
  // Set by the staff to `'up'` for elements inside a `sempre arpeggiando`
  // passage that carry no explicit `arpeggio`; null otherwise. Not an attribute.
  impliedArpeggio: ArpeggioType | null;
  // Marks a trill start. The "tr" sign renders above the stave (or, standalone,
  // above the notehead). The trill line spans forward through this element's
  // own `tie` chain — no attribute is needed on the notes it continues into.
  trill: boolean;
  // 'auto' (default) draws the wavy extension line, matching standard
  // engraving practice; 'none' suppresses it (e.g. for a bare-sign-only
  // isolated, untied note-value).
  trillLine: TrillLineMode;
  // Draws a vertical end-notch here instead of letting the line run to the
  // next notehead.
  trillStop: boolean;
  // Overrides only the accidental of the trilling (auxiliary) pitch —
  // normally the diatonic upper neighbor as modified by the key signature.
  // Never changes the letter itself. Ignored (with a warning) when
  // `trillNote` is also set.
  trillAccidental: AccidentalType | null;
  // Full override of the trilling (auxiliary) pitch — letter and accidental
  // — rendered as a small written notehead in parentheses after the main
  // notehead rather than an accidental-only symbol above the sign. Required
  // whenever the trilling pitch shares the main note's own letter (a
  // chromatic/semitone trill) or otherwise isn't the plain diatonic
  // neighbor. Wins over `trillAccidental` when both are set.
  trillNote: Note | null;
  // Controls how a trill's line restates itself after a system break, once
  // the tie chain has carried it into the new row: 'bracketed' (default)
  // redraws the sign in parentheses there; 'line-only' resumes the line with
  // no restated sign. Ignored at an ordinary same-row barline, where the line
  // always resumes silently regardless of this value. Meaningful only on the
  // element that started the trill.
  trillContinuation: TrillContinuationMode;
  // Set by the staff to the resolved trilling pitch for a trill-marked
  // element. null when not trilling, or in standalone mode (trills render
  // nothing without a staff). Not an attribute.
  resolvedTrillPitch: {
    letter: NoteLetter;
    accidental: AccidentalType | null;
    written: boolean;
    octave: Octave | null;
  } | null;
  // Staff-written px to raise the trill sign glyph above its own nominal
  // position, when another voice's own content occupies that territory in
  // a multi-voice staff. Not an attribute; mirrors stemExtension's own
  // staff-internal, non-author-set pattern.
  trillSignExtraLift: number;
  get grace(): Note[] | null;
  set grace(value: GraceNotesType);
  // Per-grace-note octave, aligned by index with `grace`. A null slot (or a
  // missing trailing slot) falls back to the host element's reference octave.
  get graceOctave(): (Octave | null)[] | null;
  set graceOctave(value: GraceOctavesType);
  // Per-grace-note articulation, aligned by index with `grace`. A null slot
  // (or a missing trailing slot) means no mark for that grace note.
  get graceArticulation(): (ArticulationType | null)[] | null;
  set graceArticulation(value: GraceArticulationsType);
  graceType: GraceType;
  graceDuration: GraceDuration | null;
  graceSlur: GraceSlur;
  // Key-signature-resolved accidentals for the grace pitches, set by the
  // staff. null = standalone mode (suffix-driven accidentals).
  resolvedGraceAccidentals: (AccidentalType | null)[] | null;
  // A single dynamic for the whole grace group, independent of the host
  // note's own `dynamic`. Rendered by the staff under the first grace note.
  graceDynamic: DynamicMarking | null;
  // Grace note(s) placed *after* this element (a trill's finishing/closing
  // figure) rather than before it — same comma-separated-or-array shape as
  // `grace`. Always rendered as plain unslashed noteheads (no `grace-type`
  // equivalent) at a fixed eighth-note-or-group written value.
  get trillFinish(): Note[] | null;
  set trillFinish(value: GraceNotesType);
  // Per-trill-finish-note octave, aligned by index with `trillFinish` — same
  // shape and fallback behavior as `graceOctave`.
  get trillFinishOctave(): (Octave | null)[] | null;
  set trillFinishOctave(value: GraceOctavesType);
  // Which slur(s) a trill's finishing grace note(s) draw: back to this
  // element ('to-main', default), forward to the next element ('to-next'),
  // 'both', or 'none'.
  trillFinishSlur: TrillFinishSlur;
  // Key-signature-resolved accidentals for the trill-finish pitches, set by
  // the staff — same fallback shape as `resolvedGraceAccidentals`.
  resolvedTrillFinishAccidentals: (AccidentalType | null)[] | null;
  batchUpdate(fn: () => void): void;
}

export type GuitarFret = number | 'x';
export interface IGuitarNoteElement {
  fret: GuitarFret;
  string: number;
  duration: DurationType;
  tie: ConnectorRole | null;
  slur: ConnectorRole | null;
  hammerOn: ConnectorRole | null;
  pullOff: ConnectorRole | null;
  slide: ConnectorRole | null;
  // todo
  //bend: SOMETHING | null;
}

export interface IRestElement {
  duration: DurationType;
}

export interface IClefElement {
  clef: ClefType;
}

export interface ITupletElement {
  ratio: TupletRatio;
  readonly flatElements: NoteChordOrRestElementType[];
}

/**
 * `<music-arpeggio>` — the written-out arpeggiated chord: a beamed run of
 * `<music-note>`s followed by the target `<music-chord>` (or a single
 * `<music-note>`), each run note tied to its matching-pitch chord tone. This is
 * the consecutive-pitch notation; the wavy vertical line is the `arpeggio`
 * attribute on `<music-note>` / `<music-chord>`.
 */
export interface IArpeggioElement {
  /** Note value drawn for run notes that have no `duration` of their own. */
  runDuration: DurationType;
  /** What to do with a run note whose pitch is not in the target chord. */
  unmatched: 'lv' | 'skip';
  /** Draw an `l.v.` label on the laissez-vibrer ties this group produces. */
  lvLabel: boolean;
  readonly flatElements: NoteChordOrRestElementType[];
  /** The run `<music-note>`s — every `<music-note>` child except the last element child. */
  readonly runElements: NoteElementType[];
  /** The target chord/note — the last element child, or null when malformed. */
  readonly targetElement: NoteOrChordElementType | null;
}

/**
 * `<music-voice>` — groups one contrapuntal voice's entire ordered
 * note/chord/rest/tuplet/arpeggio subtree within a staff. Purely a grouping
 * wrapper (no shadow DOM, no attributes) — voice number (1/2/3) is derived
 * from sibling position among a staff's `<music-voice>` children, not stored
 * on the element itself; see utils/slotElements.ts.
 */
export interface IVoiceElement {
  readonly flatElements: NoteChordOrRestElementType[];
}

export interface IStaffElementBase {
  group: StaffGroupType | null;
  groupId: string | null;
  /** Short margin text to the left of the staff (e.g. "r.h."/"l.h."). */
  label: string | null;
  time: TimeSignature;
  readonly staffHeight: number;
  readonly staffLineCount: number;
}

export interface IStaffElement extends IStaffElementBase {
  keySig: Note;
  mode: Mode;
  clef: ClefType;
}

export type NoteElementType = HTMLElement & INoteElement;
export type ChordElementType = HTMLElement & IChordElement;
export type RestElementType = HTMLElement & IRestElement;
export type GuitarNoteElementType = HTMLElement & IGuitarNoteElement;
export type TupletElementType = HTMLElement & ITupletElement;
export type ArpeggioElementType = HTMLElement & IArpeggioElement;
export type VoiceElementType = HTMLElement & IVoiceElement;
export type ClefElementType = HTMLElement & IClefElement;
export type StaffElementBaseType = HTMLElement & IStaffElementBase;
export type StaffElementType = HTMLElement & IStaffElement;
export type NoteOrChordElementType = NoteElementType | ChordElementType;
export type NoteChordOrRestElementType =
  | NoteElementType
  | ChordElementType
  | RestElementType;
export type NoteLikeElementType =
  | NoteElementType
  | GuitarNoteElementType
  | ChordElementType;

// A <music-clef> encountered in a staff's slotted content, marking a
// mid-stream clef change. `afterElementIndex` is the index (into the
// resulting flatElements array) of the note/chord/rest this marker follows;
// -1 means the marker appears before any note/chord/rest. On a multi-voice
// staff this is always relative to voice 1's own flatElements array — a
// clef change is staff-wide, so it's only ever authored inside the first
// <music-voice> (voice.ts rejects it elsewhere) — staffClassicalBase.ts
// converts the index into a beat-offset to apply it to every other voice.
export type ClefMarkerPlacement = {
  afterElementIndex: number;
  element: ClefElementType;
};

// A `<music-arpeggio>` group found in a staff's slotted content. `runIndices`
// and `targetIndex` are indices into the resulting flatElements array (the run
// notes and the final chord/note, which all render as ordinary elements).
export type ArpeggioGroupPlacement = {
  runIndices: number[];
  targetIndex: number;
  element: ArpeggioElementType;
};

export type YCoordinates = Partial<Record<NoteLetterOctave, number>>;

export type KeySignatureYCoordinates = Partial<{
  [key in Note]: number[];
}>;

export type LyricSyllablePosition = {
  text: string;
  x: number;
  y: number;
  isMelisma: boolean;
  isHyphenated: boolean;
};

export interface ILyricsElement {
  syllables: LyricSyllablePosition[];
  verse: string;
  updatePositions(): void;
}

export type LyricsElementType = HTMLElement & ILyricsElement;

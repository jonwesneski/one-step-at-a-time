import {
  AccidentalType,
  ArpeggioType,
  ArticulationType,
  Chord,
  ClefType,
  DurationType,
  DynamicMarking,
  GraceDuration,
  GraceSlur,
  GraceType,
  HairpinRole,
  Mode,
  Note,
  NoteLetter,
  Octave,
  StaffGroupType,
  StressType,
  TimeSignature,
  TupletRatio,
} from './theory';

export type NoteLetterOctave = `${NoteLetter}${Octave}`;

/** Which end of a tie, slur, or technique connector an element marks. */
export type ConnectorRole = 'start' | 'end';

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
  tie: ConnectorRole | null;
  slur: ConnectorRole | null;
  dynamic: DynamicMarking | null;
  crescendo: HairpinRole | null;
  decrescendo: HairpinRole | null;
  // Alias for decrescendo — always mirrors it.
  diminuendo: HairpinRole | null;
  articulation: ArticulationType | null;
  stress: StressType | null;
  // Arpeggio (rolled chord) sign drawn left of the element, spanning its
  // notehead range. On a lone note the sign is ~1 notehead tall.
  arpeggio: ArpeggioType | null;
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
  tie: ConnectorRole | null;
  slur: ConnectorRole | null;
  dynamic: DynamicMarking | null;
  crescendo: HairpinRole | null;
  decrescendo: HairpinRole | null;
  // Alias for decrescendo — always mirrors it.
  diminuendo: HairpinRole | null;
  articulation: ArticulationType | null;
  stress: StressType | null;
  // Arpeggio (rolled chord) sign drawn left of the element, spanning its
  // notehead range. On a lone note the sign is ~1 notehead tall.
  arpeggio: ArpeggioType | null;
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

export interface IStaffElementBase {
  group: StaffGroupType | null;
  groupId: string | null;
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
// -1 means the marker appears before any note/chord/rest.
export type ClefMarkerPlacement = {
  afterElementIndex: number;
  element: ClefElementType;
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

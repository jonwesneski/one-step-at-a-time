import {
  AccidentalType,
  ArticulationType,
  Chord,
  DurationType,
  DynamicMarking,
  HairpinRole,
  Note,
  NoteLetter,
  Octave,
  StressType,
  TupletRatio,
} from './theory';

export type NoteLetterOctave = `${NoteLetter}${Octave}`;

export type ConnectorRole = 'start' | 'end';

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
  // Articulation — a single enumerated slot of legal accent/length/hold
  // combinations (see theory.ts), plus the orthogonal Schoenberg stress slot.
  // Illegal combinations are not expressible as values.
  articulation: ArticulationType | null;
  stress: StressType | null;
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
  // Chord-level articulation — one mark set for the whole chord, drawn once on
  // the notehead on the correct side of the stem (see theory.ts).
  articulation: ArticulationType | null;
  stress: StressType | null;
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
  //bend: SOMETHING | null;
}

export interface IRestElement {
  duration: DurationType;
}

export interface ITupletElement {
  ratio: TupletRatio;
  readonly flatElements: NoteChordOrRestElementType[];
}

export type NoteElementType = HTMLElement & INoteElement;
export type ChordElementType = HTMLElement & IChordElement;
export type RestElementType = HTMLElement & IRestElement;
export type GuitarNoteElementType = HTMLElement & IGuitarNoteElement;
export type TupletElementType = HTMLElement & ITupletElement;
export type NoteOrChordElementType = NoteElementType | ChordElementType;
export type NoteChordOrRestElementType =
  | NoteElementType
  | ChordElementType
  | RestElementType;
export type NoteLikeElementType =
  | NoteElementType
  | GuitarNoteElementType
  | ChordElementType;

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

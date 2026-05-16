import {
  AccidentalType,
  Chord,
  DurationType,
  Letter,
  LetterNote,
  Note,
  Octave,
} from './theory';

export type LetterOctave = `${Letter}${Octave}`;

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
  // undefined = auto-detect from note attribute (standalone)
  // AccidentalType = show this symbol (set by staff)
  // null = suppress (key sig or in-measure state covers it)
  showAccidental: AccidentalType | null | undefined;
  batchUpdate(fn: () => void): void;
}

export type ChordNote = {
  value: LetterNote;
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

export type NoteElementType = HTMLElement & INoteElement;
export type ChordElementType = HTMLElement & IChordElement;
export type GuitarNoteElementType = HTMLElement & IGuitarNoteElement;
export type NoteOrChordElementType = NoteElementType | ChordElementType;
export type NoteLikeElementType =
  | NoteElementType
  | GuitarNoteElementType
  | ChordElementType;

export type YCoordinates = Partial<Record<LetterOctave, number>>;

export type KeySignatureYCoordinates = Partial<{
  [key in LetterNote]: number[];
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

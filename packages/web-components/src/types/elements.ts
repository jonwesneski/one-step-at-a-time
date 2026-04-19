import { Chord, DurationType, LetterNote, LetterOctave, Note } from './theory';

export type ConnectorRole = 'start' | 'end';

export interface INoteElement {
  duration: DurationType;
  value: Note;
  stemUp: boolean;
  stemExtension: number;
  noFlags: boolean;
  noStem: boolean;
  tie: ConnectorRole | null;
  slur: ConnectorRole | null;
  batchUpdate(fn: () => void): void;
}

export type ChordNote = { value: LetterNote; duration: DurationType };
export interface IChordElement {
  duration: DurationType;
  value: Chord | null;
  readonly notes: ChordNote[];
  stemUp: boolean;
  stemExtension: number;
  noFlags: boolean;
  staffYCoordinates: number[] | null;
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
export type NoteLikeElementType = NoteElementType | GuitarNoteElementType;

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

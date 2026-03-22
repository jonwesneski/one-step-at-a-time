import { Chord, DurationType, LetterNote, LetterOctave, Note } from './theory';

export interface INoteElement {
  readonly duration: DurationType;
  readonly value: Note;
  // Staff-controlled rendering properties
  stemUp: boolean;
  stemExtension: number;
  noFlags: boolean;
  noStem: boolean;
}

export type ChordNote = { value: LetterNote; duration: DurationType };
export interface IChordElement {
  readonly duration: DurationType;
  readonly value: Chord | null;
  readonly notes: ChordNote[];
  // Staff-controlled rendering properties
  stemUp: boolean;
  stemExtension: number;
  noFlags: boolean;
  staffYCoordinates: number[] | null;
}

export type NoteElementType = HTMLElement & INoteElement;
export type ChordElementType = HTMLElement & IChordElement;
export type NoteOrChordElementType = NoteElementType | ChordElementType;

export type YCoordinates = Partial<Record<LetterOctave, number>>;

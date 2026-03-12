import { Chord, DurationType, LetterNote, LetterOctave, Note } from './theory';

export interface INoteElement {
  readonly duration: DurationType;
  readonly value: Note;
}

export type ChordNote = { value: LetterNote; duration: DurationType };
export interface IChordElement {
  readonly duration: DurationType;
  readonly value: Chord | null;
  readonly notes: ChordNote[];
}

export type NoteElementType = HTMLElement & INoteElement;
export type ChordElementType = HTMLElement & IChordElement;
export type NoteOrChordElementType = NoteElementType | ChordElementType;

export type YCoordinates = Partial<Record<LetterOctave, number>>;

import { ChordElementType, NoteElementType } from '../types/elements';
import { DurationType, Note, Octave } from '../types/theory';
import { MUSIC_CHORD, MUSIC_NOTE } from '../utils';

export interface MakeNoteOptions {
  note: Note;
  octave?: Octave;
  duration?: DurationType;
  tie?: 'start' | 'end';
}

export const makeNote = ({
  note,
  octave = 4,
  duration = 'quarter',
  tie,
}: MakeNoteOptions): NoteElementType => {
  const element = document.createElement(MUSIC_NOTE);
  element.setAttribute('note', note);
  element.setAttribute('octave', String(octave));
  element.setAttribute('duration', duration);
  if (tie) {
    element.setAttribute('tie', tie);
  }
  return element as unknown as NoteElementType;
};

export interface MakeChordNoteOptions {
  note: Note;
  octave: Octave;
}

export interface MakeChordOptions {
  notes: MakeChordNoteOptions[];
  duration?: DurationType;
  tie?: 'start' | 'end';
}

export const makeChord = ({
  notes,
  duration = 'quarter',
  tie,
}: MakeChordOptions): ChordElementType => {
  const element = document.createElement(MUSIC_CHORD);
  element.setAttribute('duration', duration);
  if (tie) {
    element.setAttribute('tie', tie);
  }
  for (const { note, octave } of notes) {
    const noteElement = document.createElement(MUSIC_NOTE);
    noteElement.setAttribute('note', note);
    noteElement.setAttribute('octave', String(octave));
    element.appendChild(noteElement);
  }
  return element as unknown as ChordElementType;
};

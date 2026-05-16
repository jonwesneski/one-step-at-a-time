import { DurationType, LetterNote, Octave } from '../types/theory';
import { ChordElementType, NoteElementType } from '../types/elements';

export interface MakeNoteOptions {
  note: LetterNote;
  octave: Octave;
  duration?: DurationType;
  tie?: 'start' | 'end';
}

export const makeNote = ({
  note,
  octave,
  duration = 'quarter',
  tie,
}: MakeNoteOptions): NoteElementType => {
  const el = document.createElement('music-note');
  el.setAttribute('note', note);
  el.setAttribute('octave', String(octave));
  el.setAttribute('duration', duration);
  if (tie) {
    el.setAttribute('tie', tie);
  }
  return el as unknown as NoteElementType;
};

export interface MakeChordNoteOptions {
  note: LetterNote;
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
  const el = document.createElement('music-chord');
  el.setAttribute('duration', duration);
  if (tie) {
    el.setAttribute('tie', tie);
  }
  for (const { note, octave } of notes) {
    const noteEl = document.createElement('music-note');
    noteEl.setAttribute('note', note);
    noteEl.setAttribute('octave', String(octave));
    el.appendChild(noteEl);
  }
  return el as unknown as ChordElementType;
};

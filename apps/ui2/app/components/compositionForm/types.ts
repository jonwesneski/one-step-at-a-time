import type { DurationType, LetterNote, Mode, Note } from '@one-step-at-a-time/web-components';

export type StaffType = 'treble' | 'bass';

export type NoteEntry = { type: 'note'; value: Note; duration: DurationType };
export type ChordEntry = { type: 'chord'; notes: Note[]; duration: DurationType };
export type MusicEntry = NoteEntry | ChordEntry;

export type Staff = { type: StaffType; entries: MusicEntry[] };
export type Measure = { id: string; staves: Staff[] };

export type Selection = { measureId: string | null; staffType: StaffType | null };

export type CompositionFormValues = {
  title: string;
  keySig: LetterNote;
  timeSig: string;
  mode: Mode;
  tab: 'note' | 'chord';
  noteValue: Note;
  noteDuration: DurationType;
  chordNotes: Array<{ value: Note }>;
  chordDuration: DurationType;
};

/** @deprecated Use CompositionFormValues */
export type NoteFormValues = CompositionFormValues;

export const NOTE_OPTIONS: Note[] = [
  'A', 'A#', 'Bb', 'B', 'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'rest',
];

export const DURATION_OPTIONS: DurationType[] = [
  'whole', 'half', 'quarter', 'eighth', 'sixteenth', 'thirtysecond', 'sixtyfourth', 'hundredtwentyeighth',
];

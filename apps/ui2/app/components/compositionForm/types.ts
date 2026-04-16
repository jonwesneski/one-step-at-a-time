import type {
  DurationType,
  LetterNote,
  Mode,
  Note,
} from '@one-step-at-a-time/web-components';

export type StaffType = 'treble' | 'bass';

export type NoteEntry = {
  id: string;
  type: 'note';
  value: Note;
  duration: DurationType;
};
export type ChordEntry = {
  id: string;
  type: 'chord';
  notes: Note[];
  duration: DurationType;
};
export type MusicEntry = NoteEntry | ChordEntry;
// Entry shape before an id is assigned (used when constructing entries in NoteChordInput)
export type DraftMusicEntry = Omit<NoteEntry, 'id'> | Omit<ChordEntry, 'id'>;

// Flat normalized nodes
export type NormalizedMeasure = { id: string; staffIds: string[] };
export type NormalizedStaff = {
  id: string;
  type: StaffType;
  entryIds: string[];
};

// The undoable structural slice
export type CompositionStructure = {
  measureOrder: string[];
  measuresById: Record<string, NormalizedMeasure>;
  stavesById: Record<string, NormalizedStaff>;
  entriesById: Record<string, MusicEntry>;
};

export type Selection = { measureId: string | null; staffId: string | null };

// Root form shape (BasicInfo fields + structure)
export type CompositionFormValues = {
  title: string;
  keySig: LetterNote;
  timeSig: string;
  mode: Mode;
} & CompositionStructure;

export const KEY_SIGNATURE_OPTIONS: LetterNote[] = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'Db',
  'Ab',
  'Eb',
  'Bb',
  'F',
];

export const TIME_SIGNATURE_OPTIONS = [
  '4/4',
  '3/4',
  '2/4',
  '2/2',
  '6/8',
  '9/8',
  '12/8',
  '3/8',
  '5/4',
  '7/4',
];

export const MODE_OPTIONS: Mode[] = ['major', 'minor'];

export const NOTE_OPTIONS: Note[] = [
  'A',
  'A#',
  'Bb',
  'B',
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
  'rest',
];

export const DURATION_OPTIONS: DurationType[] = [
  'whole',
  'half',
  'quarter',
  'eighth',
  'sixteenth',
  'thirtysecond',
  'sixtyfourth',
  'hundredtwentyeighth',
];

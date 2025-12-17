export type DurationType =
  | 'thirtysecond'
  | 'sixteenth'
  | 'eighth'
  | 'quarter'
  | 'half'
  | 'whole';

export type Note =
  | 'A'
  | 'A#'
  | 'Bb'
  | 'B'
  | 'C'
  | 'C#'
  | 'Db'
  | 'D#'
  | 'E'
  | 'F'
  | 'F#'
  | 'Gb'
  | 'G'
  | 'G#'
  | 'Ab';

export type ChordType = '' | 'Min' | 'Maj' | 'Sus' | 'Aug';
export type Extension = '' | '5' | '7' | '9';

type NormalChord = `${Note}${ChordType}${Extension}`;

// Slash chord where the bass note is different from root
type SlashChord<Bass extends Note, Root extends Note> = Bass extends Root
  ? never
  : `${Bass}/${Root}${ChordType}${Extension}`;

// Helper to generate all slash chords
type AllSlashChords = {
  [B in Note]: {
    [R in Note]: SlashChord<B, R>;
  }[Note];
}[Note];

export type Chord = NormalChord | AllSlashChords;

export type BeatsInMeasure = 2 | 3 | 4 | 6 | 9 | 12;
export type BeatTypeInMeasure = 2 | 3 | 4;

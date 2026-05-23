export type DurationType =
  | 'whole'
  | 'half'
  | 'quarter'
  | 'eighth'
  | 'sixteenth'
  | 'thirtysecond'
  | 'sixtyfourth'
  | 'hundredtwentyeighth';

export type Letter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type Octave = 2 | 3 | 4 | 5 | 6;
export type Sharp = '#';
export type Flat = 'b';

export type AccidentalType =
  | 'sharp'
  | 'flat'
  | 'natural'
  | 'double-sharp'
  | 'double-flat';

export type Note =
  | 'A'
  | 'A#'
  | 'Abb'
  | 'A##'
  | 'Bb'
  | 'Bbb'
  | 'B'
  | 'B#'
  | 'B##'
  | 'Cb'
  | 'Cbb'
  | 'C'
  | 'C#'
  | 'C##'
  | 'D'
  | 'Db'
  | 'Dbb'
  | 'D#'
  | 'D##'
  | 'Eb'
  | 'Ebb'
  | 'E'
  | 'E#'
  | 'E##'
  | 'F'
  | 'Fb'
  | 'Fbb'
  | 'F#'
  | 'F##'
  | 'Gb'
  | 'Gbb'
  | 'G'
  | 'G#'
  | 'G##'
  | 'Ab';

type MinorType =
  | 'min'
  | 'min(add9)'
  | 'min6'
  | 'min7'
  | 'min7b5'
  | 'min(maj7)'
  | 'min9'
  | 'min11';
type MajorType = '' | 'maj' | '6' | 'maj7' | 'maj9' | 'add9' | 'maj7#11';

type PowerType = '5';
type DominantType = '7' | '7sus4' | '7b5' | '9' | '7#9' | '11' | '13';
type SuspendedType = 'sus2' | 'sus4';
type AugmentedType = 'aug' | '+' | '7#5';
type DimineshedType = 'dim' | 'dim7';
export type ChordType =
  | MinorType
  | MajorType
  | PowerType
  | DominantType
  | SuspendedType
  | AugmentedType
  | DimineshedType;

type NormalChord = `${Note}${ChordType}`;

// Slash chord where the bass note is different from root
type SlashChord<Bass extends Note, Root extends Note> = Bass extends Root
  ? never
  : `${Bass}/${Root}${ChordType}`;

// Helper to generate all slash chords
type AllSlashChords = {
  [B in Note]: {
    [R in Note]: SlashChord<B, R>;
  }[Note];
}[Note];

export type Chord = NormalChord | AllSlashChords;

export type BeatsInMeasure = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 9 | 12;
export type BeatTypeInMeasure = 2 | 4 | 8;

export type TimeSignature =
  | '1/4'
  | '2/2'
  | '2/4'
  | '3/2'
  | '3/4'
  | '3/8'
  | '4/4'
  | '5/4'
  | '5/8'
  | '6/4'
  | '6/8'
  | '7/4'
  | '7/8'
  | '9/8'
  | '12/8';

export type Mode = 'major' | 'minor';

export type VoiceType =
  | 'soprano'
  | 'mezzo'
  | 'alto'
  | 'tenor'
  | 'baritone'
  | 'bass';

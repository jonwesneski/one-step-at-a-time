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
export type LetterOctave = `${Letter}${Octave}`;

export type LetterNote =
  | 'A'
  | 'A#'
  | 'Bb'
  | 'B'
  | 'C'
  | 'C#'
  | 'D'
  | 'Db'
  | 'D#'
  | 'Eb'
  | 'E'
  | 'F'
  | 'F#'
  | 'Gb'
  | 'G'
  | 'G#'
  | 'Ab';

export type Note = 'rest' | LetterNote;

type MinorType =
  | 'min'
  | 'min(add9)'
  | 'min6'
  | 'min7'
  | 'min7b5'
  | 'min(maj7)'
  | 'min9'
  | 'min11';
type MajorType = '' | 'maj' | '6' | 'maj7' | 'maj9' | 'maj7#11';

type DominantType = '7' | '7sus4' | '7b5' | '9' | '7#9' | '11' | '13';
type AugmentedType = 'aug' | '+' | '7#5';
type DimineshedType = 'dim' | 'dim7';
type ChordType =
  | MinorType
  | MajorType
  | DominantType
  | AugmentedType
  | DimineshedType;

type NormalChord = `${LetterNote}${ChordType}`;

// Slash chord where the bass note is different from root
type SlashChord<
  Bass extends LetterNote,
  Root extends LetterNote
> = Bass extends Root ? never : `${Bass}/${Root}${ChordType}`;

// Helper to generate all slash chords
type AllSlashChords = {
  [B in LetterNote]: {
    [R in LetterNote]: SlashChord<B, R>;
  }[LetterNote];
}[LetterNote];

export type Chord = NormalChord | AllSlashChords;

export type BeatsInMeasure = 2 | 3 | 4 | 6 | 9 | 12;
export type BeatTypeInMeasure = 2 | 3 | 4 | 8 | 16;

export type Mode = 'major' | 'minor';

export type VoiceType =
  | 'soprano'
  | 'mezzo'
  | 'alto'
  | 'tenor'
  | 'baritone'
  | 'bass';

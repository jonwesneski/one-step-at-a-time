export type DurationType =
  | 'double-whole'
  | 'whole'
  | 'half'
  | 'quarter'
  | 'eighth'
  | 'sixteenth'
  | 'thirtysecond'
  | 'sixtyfourth'
  | 'hundredtwentyeighth';

export type NoteLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
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
  | '4/2'
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

export type Voice =
  | 'soprano'
  | 'mezzo'
  | 'alto'
  | 'tenor'
  | 'baritone'
  | 'bass';

export type DynamicMarking =
  | 'ppp'
  | 'pp'
  | 'p'
  | 'mp'
  | 'mf'
  | 'f'
  | 'ff'
  | 'fff'
  | 'sfz'
  | 'sf'
  | 'fz'
  | 'rfz'
  | 'fp';

export type HairpinRole = 'start' | 'end';

export type HairpinKind = 'crescendo' | 'decrescendo';

// Articulation marks split into three orthogonal families. Each family is a
// single optional slot on a note/chord, so within-family illegal combinations
// (e.g. two accents at once, or staccato AND staccatissimo) are unrepresentable,
// while every cross-family combination — all of which are musically legal — is
// expressible. See Gould, "Behind Bars", Articulation Marks.

// Accent family — an attack strength. At most one.
//   'accent'  = standard accent (>)
//   'marcato' = strong accent (^)
export type AccentType = 'accent' | 'marcato';

// Length family — how the note's duration is shaped. At most one.
// The only two legal within-family combinations are pre-enumerated as single
// values so that illegal ones (e.g. staccato + staccatissimo) cannot be formed:
//   'staccato'             = staccato dot (•)
//   'staccatissimo'        = staccato wedge (▾), a heavier staccato
//   'tenuto'               = tenuto line (—)
//   'portato'              = tenuto + staccato (mezzo-staccato); lengthens the note
//   'tenuto-staccatissimo' = tenuto + staccato wedge
export type ArticulationType =
  | 'staccato'
  | 'staccatissimo'
  | 'tenuto'
  | 'portato'
  | 'tenuto-staccatissimo';

// Schoenberg stress family — placed outermost, above the stave. At most one.
//   'stressed'   = stressed note
//   'unstressed' = unstressed note
export type StressType = 'stressed' | 'unstressed';

export type TupletRatio =
  // Simple form (numeral only — normal count inferred by defaultNormalCount)
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | '11'
  | '13'
  | '15'
  | '16'
  | '17'
  | '32'
  // Full form (actual:normal) — simple-time quarter-note beat
  | '3:2'
  | '5:4'
  | '6:4'
  | '7:4'
  | '9:8'
  | '10:8'
  | '11:8'
  | '17:16'
  | '17:32'
  // Full form — compound-time dotted-quarter-note beat
  | '4:3'
  | '5:3'
  | '7:6'
  | '8:6'
  | '10:6'
  | '11:6'
  | '13:12'
  // Full form — no literal ratio equivalents
  | '8:5'
  | '6:5'
  | '8:7'
  | '9:7';

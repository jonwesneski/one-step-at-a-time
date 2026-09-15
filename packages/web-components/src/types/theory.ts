/** Note/rest value, from `double-whole` (breve) down to `hundredtwentyeighth`. */
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
/** Scientific-pitch octave number supported by the staves. */
export type Octave = 2 | 3 | 4 | 5 | 6;
export type Sharp = '#';
export type Flat = 'b';

/** A drawn accidental glyph. */
export type AccidentalType =
  | 'sharp'
  | 'flat'
  | 'natural'
  | 'double-sharp'
  | 'double-flat';

/** Pitch letter `A`–`G` with an optional accidental suffix (`#`, `b`, `##`, `bb`). */
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
/** Chord-quality suffix that follows the root, e.g. `''` (major), `min7`, `sus4`, `dim`. */
export type ChordType =
  | MinorType
  | MajorType
  | PowerType
  | DominantType
  | SuspendedType
  | AugmentedType
  | DimineshedType;

type NormalChord = `${Note}${ChordType}`;

type SlashChord<Bass extends Note, Root extends Note> = Bass extends Root
  ? never
  : `${Bass}/${Root}${ChordType}`;

// Helper to generate all slash chords
type AllSlashChords = {
  [B in Note]: {
    [R in Note]: SlashChord<B, R>;
  }[Note];
}[Note];

/** A chord name: a root plus `ChordType`, optionally over a slash bass (`G/B`). */
export type Chord = NormalChord | AllSlashChords;

/** Numerator of a time signature (beats per measure). */
export type BeatsInMeasure = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 9 | 12;
/** Denominator of a time signature (which note value gets the beat). */
export type BeatTypeInMeasure = 2 | 4 | 8;

/** Time signature as a `"beats/beatType"` string, e.g. `4/4`, `6/8`. */
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

/** The six standard voice types for `<music-staff-vocal>`. */
export type Voice =
  | 'soprano'
  | 'mezzo'
  | 'alto'
  | 'tenor'
  | 'baritone'
  | 'bass';

/**
 * Clef available on a staff.
 *
 * TODO: extend with 'alto' | 'tenor' | ... once CLEF_DEFINITIONS in
 * rules/clefRules.ts has data for them.
 */
export type ClefType = 'treble' | 'bass';

/**
 * Kind of connector joining grouped staves: `grand` draws a brace (piano/harp),
 * `bracket` draws a bracket (choir/section). See a staff's `group` attribute.
 */
export type StaffGroupType = 'grand' | 'bracket';

/** Dynamic marking drawn under a note/chord. */
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

/** Which end of a hairpin (or tie/slur) an element marks. */
export type HairpinRole = 'start' | 'end';

export type HairpinKind = 'crescendo' | 'decrescendo';

export type AccentType = 'accent' | 'marcato';

// Length/hold family — internal helper; the token following the accent prefix.
export type ArticulationLength =
  | 'staccato'
  | 'staccatissimo'
  | 'tenuto'
  | 'portato'
  | 'tenuto-staccatissimo'
  | 'fermata';

/**
 * Articulation mark on a note/chord. Combines an optional accent prefix
 * (`accent-` / `marcato-`) with a length/hold token (`staccato`, `tenuto`, …).
 */
export type ArticulationType =
  // length / hold only (no accent)
  | 'staccato'
  | 'staccatissimo'
  | 'tenuto'
  | 'portato'
  | 'tenuto-staccatissimo'
  | 'fermata'
  // accent only
  | 'accent'
  | 'marcato'
  // standard accent + length/hold
  | 'accent-staccato'
  | 'accent-staccatissimo'
  | 'accent-tenuto'
  | 'accent-portato'
  | 'accent-tenuto-staccatissimo'
  | 'accent-fermata'
  // strong accent (marcato) + length/hold
  | 'marcato-staccato'
  | 'marcato-staccatissimo'
  | 'marcato-tenuto'
  | 'marcato-portato'
  | 'marcato-tenuto-staccatissimo'
  | 'marcato-fermata';

/** Schoenberg stress family. */
export type StressType = 'stressed' | 'unstressed';

/**
 * Arpeggio (rolled / spread chord) sign, drawn as a vertical wavy line left of
 * the chord — left of any accidentals — spanning the top-to-bottom notehead
 * range, not the stems.
 * - `up`             plain wavy line: arpeggiate bottom→top (the default reading)
 * - `up-arrow`       wavy line with an arrowhead at the top: explicit upward roll
 *                    (disambiguates from a nearby downward one)
 * - `down`           wavy line with an arrowhead at the bottom: arpeggiate top→bottom
 * - `non-arpeggiate` vertical square bracket, no wave: a chord NOT to be spread,
 *                    inside an otherwise-arpeggiated passage
 */
export type ArpeggioType = 'up' | 'up-arrow' | 'down' | 'non-arpeggiate';

/**
 * Grace-note style. Grace notes never consume beat budget. `'trill'` is a
 * plain unslashed notehead, distinct from `'acciaccatura'`'s crossed-through
 * slash — used for a leading grace note that introduces a trill rather than
 * ornamenting a main pitch.
 */
export type GraceType = 'acciaccatura' | 'appoggiatura' | 'trill';

/** Note value a grace note is drawn with. */
export type GraceDuration = Extract<
  DurationType,
  'half' | 'quarter' | 'eighth' | 'sixteenth' | 'thirtysecond' | 'sixtyfourth'
>;

/** Whether the slur from a grace group to its main note is drawn (`auto`) or not (`none`). */
export type GraceSlur = 'auto' | 'none';

/**
 * `'auto'` (default) draws the wavy extension line, matching standard
 * engraving practice; `'none'` suppresses it for the rare case an engraver
 * wants the bare sign only on an isolated, untied note-value.
 */
export type TrillLineMode = 'auto' | 'none';

/**
 * Controls how a trill's line restates itself after a system break, once its
 * tie chain has already carried it into the new row: `'bracketed'` (default)
 * redraws the sign in parentheses at the start of the new row; `'line-only'`
 * lets the line resume with no restated sign. Meaningless (ignored) at an
 * ordinary same-row barline, where the line always resumes with no restated
 * sign regardless of this value.
 */
export type TrillContinuationMode = 'bracketed' | 'line-only';

/**
 * Controls the slur(s) drawn from a trill's finishing grace note(s)
 * (`trill-finish`) — grace notes placed *after* the main note rather than
 * before it. `'to-main'` (default) slurs back to the note they finish;
 * `'to-next'` slurs forward to the following note/chord instead; `'both'`
 * draws both; `'none'` draws neither.
 */
export type TrillFinishSlur = 'none' | 'to-main' | 'to-next' | 'both';

/**
 * Tuplet ratio: either a bare actual count (`'3'` → triplet) or a full
 * `actual:normal` form (`'3:2'`).
 */
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

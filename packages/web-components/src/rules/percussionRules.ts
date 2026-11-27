import type { StaffPosition } from '../types/elements';
import type { PercussionInstrument } from '../types/theory';

/**
 * Staff position and notehead per drumset instrument, read as treble-clef
 * positions on the neutral clef: drums on spaces with normal heads, cymbals on
 * or above the top line with x heads, feet below the middle line. Provisional
 * until a drum-key reference is settled; positions may change.
 */
export const PERCUSSION_INSTRUMENT_MAP: Record<
  PercussionInstrument,
  StaffPosition
> = {
  'hi-hat-pedal': { note: 'D', octave: 4, notehead: 'x' },
  kick: { note: 'F', octave: 4, notehead: 'normal' },
  'floor-tom': { note: 'A', octave: 4, notehead: 'normal' },
  snare: { note: 'C', octave: 5, notehead: 'normal' },
  'mid-tom': { note: 'D', octave: 5, notehead: 'normal' },
  'high-tom': { note: 'E', octave: 5, notehead: 'normal' },
  ride: { note: 'F', octave: 5, notehead: 'x' },
  'hi-hat': { note: 'G', octave: 5, notehead: 'x' },
  crash: { note: 'A', octave: 5, notehead: 'x' },
};

export function parsePercussionInstrument(
  value: string | null
): PercussionInstrument | null {
  return value !== null && Object.hasOwn(PERCUSSION_INSTRUMENT_MAP, value)
    ? (value as PercussionInstrument)
    : null;
}

// Notation that doesn't depend on pitch, shared by drum notes and chords.
const DRUM_SHARED_ATTRIBUTES = [
  'duration',
  'notehead',
  'for',
  'tie',
  'lv-label',
  'tie-style',
  'slur',
  'slur-style',
  'slur-group',
  'dynamic',
  'dynamic-shared',
  'dynamic-reminder',
  'swell',
  'crescendo',
  'decrescendo',
  'diminuendo',
  'articulation',
  'articulation-repeat',
  'stress',
  'stem-direction',
  'stem-mark',
  'sign',
  'size',
  'beam-group',
  'shared-stem-for',
  'tremolo',
  'tremolo-tuplet',
  'tremolo-label',
  'technique-text',
  'technique-text-placement',
  'technique-text-style',
  'dynamic-text',
  'dynamic-end',
];

// Attributes <music-note>/<music-chord> have and the drum elements withhold:
// pitch-dependent ones, plus grace notes, which drums don't support yet.
const PITCH_ONLY_SHARED_ATTRIBUTES = [
  'breath-mark',
  'glissando',
  'glissando-hint',
  'glissando-shape',
  'glissando-label',
  'bend',
  'bend-to',
  'bend-to-quarter-tone',
  'bend-contour',
  'phonemes',
  'accidental-reminder',
  'quarter-tone',
  'arpeggio',
  'arpeggio-for',
  'arpeggio-hairpin',
  'arpeggio-hairpin-from',
  'arpeggio-hairpin-to',
  'arpeggiate',
  'grace',
  'grace-octave',
  'grace-quarter-tone',
  'grace-articulation',
  'grace-type',
  'grace-duration',
  'grace-slur',
  'grace-dynamic',
  'grace-notehead',
  'trill',
  'trill-line',
  'trill-stop',
  'trill-accidental',
  'trill-quarter-tone',
  'trill-note',
  'trill-continuation',
  'trill-finish',
  'trill-finish-octave',
  'trill-finish-quarter-tone',
  'trill-finish-slur',
  'octave-shift',
  'octave-mode',
  'octave-stop',
  'loco',
  'octave-continuation',
];

export const DRUM_NOTE_ATTRIBUTES: readonly string[] = [
  'instrument',
  ...DRUM_SHARED_ATTRIBUTES,
];
export const DRUM_CHORD_ATTRIBUTES: readonly string[] = DRUM_SHARED_ATTRIBUTES;

export const PITCH_ONLY_NOTE_ATTRIBUTES: readonly string[] = [
  'note',
  'octave',
  'unpitched',
  ...PITCH_ONLY_SHARED_ATTRIBUTES,
];
export const PITCH_ONLY_CHORD_ATTRIBUTES: readonly string[] = [
  'chord',
  ...PITCH_ONLY_SHARED_ATTRIBUTES,
];

// The authored attributes a drum element ignores, for its warning.
export function unsupportedDrumAttributes(
  authored: readonly string[],
  pitchOnly: readonly string[]
): string[] {
  return authored.filter((name) => pitchOnly.includes(name));
}

// A drum's position is its instrument, so a drum note always shows a head.
export const drumAttributeValue = (
  name: string,
  value: string | null
): string | null => (name === 'notehead' && value === 'none' ? null : value);

export const DRUM_HEADLESS_WARNING =
  'notehead="none" is ignored: a drum is placed by its instrument, so it keeps a head';

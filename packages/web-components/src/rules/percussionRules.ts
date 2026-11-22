import type {
  NoteheadType,
  NoteLetter,
  Octave,
  PercussionInstrument,
} from '../types/theory';

export type PercussionInstrumentPosition = {
  note: NoteLetter;
  octave: Octave;
  notehead: NoteheadType;
};

/**
 * Staff position and notehead per drumset instrument, read as treble-clef
 * positions on the neutral clef: drums on spaces with normal heads, cymbals on
 * or above the top line with x heads, feet below the middle line. Provisional
 * until a drum-key reference is settled; positions may change.
 */
export const PERCUSSION_INSTRUMENT_MAP: Record<
  PercussionInstrument,
  PercussionInstrumentPosition
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

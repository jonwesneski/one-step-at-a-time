import { PERCUSSION_INSTRUMENTS } from '../utils/consts';
import {
  PERCUSSION_INSTRUMENT_MAP,
  parsePercussionInstrument,
} from './percussionRules';

describe('PERCUSSION_INSTRUMENT_MAP', () => {
  it('maps every listed instrument', () => {
    expect(Object.keys(PERCUSSION_INSTRUMENT_MAP).sort()).toEqual(
      [...PERCUSSION_INSTRUMENTS].sort()
    );
  });

  it('puts snare on the third space and kick on the first', () => {
    expect(PERCUSSION_INSTRUMENT_MAP.snare).toEqual({
      note: 'C',
      octave: 5,
      notehead: 'normal',
    });
    expect(PERCUSSION_INSTRUMENT_MAP.kick).toEqual({
      note: 'F',
      octave: 4,
      notehead: 'normal',
    });
  });

  it('gives cymbals x noteheads', () => {
    for (const cymbal of ['ride', 'hi-hat', 'crash', 'hi-hat-pedal'] as const) {
      expect(PERCUSSION_INSTRUMENT_MAP[cymbal].notehead).toBe('x');
    }
  });

  it('gives every instrument its own staff position', () => {
    const positions = Object.values(PERCUSSION_INSTRUMENT_MAP).map(
      ({ note, octave }) => `${note}${octave}`
    );
    expect(new Set(positions).size).toBe(positions.length);
  });
});

describe('parsePercussionInstrument', () => {
  it('accepts a known instrument', () => {
    expect(parsePercussionInstrument('floor-tom')).toBe('floor-tom');
  });

  it('rejects unknown values and inherited object keys', () => {
    expect(parsePercussionInstrument(null)).toBeNull();
    expect(parsePercussionInstrument('cowbell')).toBeNull();
    expect(parsePercussionInstrument('toString')).toBeNull();
  });
});

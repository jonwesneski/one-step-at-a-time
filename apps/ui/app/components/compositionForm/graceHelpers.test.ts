import { describe, expect, it } from 'vitest';
import { serializeGrace } from './graceHelpers';

describe('serializeGrace', () => {
  it('returns nothing for null or an empty group', () => {
    expect(serializeGrace(null)).toEqual({});
    expect(serializeGrace({ notes: [] })).toEqual({});
  });

  it('comma-joins the pitches', () => {
    expect(serializeGrace({ notes: ['F#', 'G'] }).grace).toBe('F#,G');
  });

  it('aligns octaves and articulations by index, blank for gaps', () => {
    const attrs = serializeGrace({
      notes: ['C', 'D', 'E'],
      octaves: [5, null, 6],
      articulations: [null, 'staccato', null],
    });
    expect(attrs['grace-octave']).toBe('5,,6');
    expect(attrs['grace-articulation']).toBe(',staccato');
  });

  it('trims a trailing run of empty slots', () => {
    expect(
      serializeGrace({ notes: ['C', 'D'], octaves: [4, null] })['grace-octave']
    ).toBe('4');
    expect(
      serializeGrace({ notes: ['C', 'D'], octaves: [null, null] })[
        'grace-octave'
      ]
    ).toBeUndefined();
  });

  it('passes the scalar fields straight through, omitting unset ones', () => {
    const attrs = serializeGrace({
      notes: ['C'],
      type: 'appoggiatura',
      duration: 'eighth',
      slur: 'none',
    });
    expect(attrs['grace-type']).toBe('appoggiatura');
    expect(attrs['grace-duration']).toBe('eighth');
    expect(attrs['grace-slur']).toBe('none');
    expect(attrs['grace-dynamic']).toBeUndefined();
  });

  it('aligns noteheads by index', () => {
    const attrs = serializeGrace({
      notes: ['C', 'D', 'E'],
      noteheads: [null, 'x', null],
    });
    expect(attrs['grace-notehead']).toBe(',x');
  });
});

import type { TieValue } from '../types/elements';
import { matchTieStart, tiedInto, tiesOn, type TiePitch } from './tieRules';

describe('tie roles', () => {
  const ties: (TieValue | null)[] = [
    'start',
    'continue',
    'end',
    'laissez-vibrer',
    null,
  ];

  it('reads continue as both ends of a chain', () => {
    expect(ties.map((tie) => tiesOn(tie))).toEqual([
      true,
      true,
      false,
      false,
      false,
    ]);
    expect(ties.map((tie) => tiedInto(tie))).toEqual([
      false,
      true,
      true,
      false,
      false,
    ]);
  });
});

describe('matchTieStart', () => {
  const pitch = (note: string, octave: number | null = 4): TiePitch => ({
    kind: 'pitch',
    note,
    octave,
    quarterTone: null,
  });

  it('closes the most recent start of the same pitch', () => {
    const open = [pitch('C'), pitch('E'), pitch('G')];
    expect(matchTieStart(open, pitch('C'))).toBe(0);
    expect(matchTieStart(open, pitch('E'))).toBe(1);
    expect(matchTieStart(open, pitch('G'))).toBe(2);
    expect(matchTieStart([pitch('C'), pitch('C')], pitch('C'))).toBe(1);
  });

  it('tells octaves and quarter-tones apart, and lets a missing octave match any', () => {
    const open = [pitch('C', 4), pitch('C', 5)];
    expect(matchTieStart(open, pitch('C', 4))).toBe(0);
    expect(matchTieStart(open, pitch('C', null))).toBe(1);
    expect(
      matchTieStart(
        [
          { kind: 'pitch', note: 'C', octave: 4, quarterTone: 'up' },
          pitch('C'),
        ],
        { kind: 'pitch', note: 'C', octave: 4, quarterTone: 'up' }
      )
    ).toBe(0);
  });

  it('matches unpitched placements and guitar string and fret', () => {
    expect(
      matchTieStart([{ kind: 'placement', placement: 'top' }, pitch('C')], {
        kind: 'placement',
        placement: 'top',
      })
    ).toBe(0);
    expect(
      matchTieStart(
        [
          { kind: 'fret', string: 2, fret: 3 },
          { kind: 'fret', string: 3, fret: 3 },
        ],
        { kind: 'fret', string: 2, fret: 3 }
      )
    ).toBe(0);
  });

  it('falls back to the most recent start when nothing matches', () => {
    expect(matchTieStart([pitch('C'), pitch('E')], pitch('F'))).toBe(1);
    expect(matchTieStart([pitch('C'), null], null)).toBe(1);
    expect(matchTieStart([], pitch('C'))).toBe(-1);
  });

  it('leaves the starts later ends match to them', () => {
    const open = [pitch('C'), pitch('E'), pitch('G')];
    expect(matchTieStart(open, pitch('F'), [pitch('G')])).toBe(1);
    expect(
      matchTieStart(open, pitch('F'), [pitch('C'), pitch('E'), pitch('G')])
    ).toBe(2);
  });
});

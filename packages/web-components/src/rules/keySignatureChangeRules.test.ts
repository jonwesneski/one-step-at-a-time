import type { Mode, Note } from '../types/theory';
import {
  COURTESY_CLEF_WIDTH_PX,
  END_WARNING_GAP_PX,
  KEY_SIG_CANCEL_GAP_PX,
  KEY_SIG_FLAT_WIDTH,
  KEY_SIG_NATURAL_WIDTH,
  KEY_SIG_SHARP_WIDTH,
  TIME_SIG_DIGIT_WIDTH_PX,
} from '../utils/notationDimensions';
import {
  type EndWarnings,
  endWarningsEqual,
  endWarningWidth,
  keyChangeWidth,
  keySignatureEquals,
  type KeySignatureState,
  mergeEndWarnings,
  resolveCancellationNaturals,
} from './keySignatureChangeRules';

const key = (keySig: Note, mode: Mode = 'major'): KeySignatureState => ({
  keySig,
  mode,
});

const warnings = (partial: Partial<EndWarnings>): EndWarnings => ({
  clef: null,
  key: null,
  time: null,
  reservesWidth: false,
  ...partial,
});

describe('keySignatureEquals', () => {
  it('compares the accidental set, not the name', () => {
    expect(keySignatureEquals(key('C'), key('A', 'minor'))).toBe(true);
    expect(keySignatureEquals(key('G'), key('E', 'minor'))).toBe(true);
    expect(keySignatureEquals(key('D'), key('C'))).toBe(false);
    expect(keySignatureEquals(key('F'), key('G'))).toBe(false);
  });
});

describe('resolveCancellationNaturals', () => {
  it('cancels every accidental going to C major', () => {
    expect(resolveCancellationNaturals(key('D'), key('C'))).toEqual([
      { letter: 'F', orderIndex: 0 },
      { letter: 'C', orderIndex: 1 },
    ]);
  });

  it('cancels every flat going to sharps', () => {
    expect(resolveCancellationNaturals(key('Bb'), key('D'))).toEqual([
      { letter: 'B', orderIndex: 0 },
      { letter: 'E', orderIndex: 1 },
    ]);
  });

  it('cancels only what the new key drops', () => {
    expect(resolveCancellationNaturals(key('E'), key('A'))).toEqual([
      { letter: 'D', orderIndex: 3 },
    ]);
  });

  it('cancels nothing when the new key keeps every accidental', () => {
    expect(resolveCancellationNaturals(key('F'), key('Bb'))).toEqual([]);
    expect(resolveCancellationNaturals(key('C'), key('A', 'minor'))).toEqual(
      []
    );
  });
});

describe('keyChangeWidth', () => {
  it('adds the naturals, the gap after them, and the new key', () => {
    expect(keyChangeWidth({ from: key('Bb'), to: key('D') })).toBeCloseTo(
      2 * KEY_SIG_NATURAL_WIDTH +
        KEY_SIG_CANCEL_GAP_PX +
        2 * KEY_SIG_SHARP_WIDTH
    );
    expect(keyChangeWidth({ from: key('D'), to: key('C') })).toBeCloseTo(
      2 * KEY_SIG_NATURAL_WIDTH
    );
    expect(keyChangeWidth({ from: key('F'), to: key('Bb') })).toBeCloseTo(
      2 * KEY_SIG_FLAT_WIDTH
    );
  });
});

describe('endWarningWidth', () => {
  it('is 0 with no warnings', () => {
    expect(endWarningWidth(null)).toBe(0);
    expect(endWarningWidth(warnings({}))).toBe(0);
  });

  it('adds a gap per group', () => {
    expect(endWarningWidth(warnings({ clef: 'bass' }))).toBeCloseTo(
      COURTESY_CLEF_WIDTH_PX + END_WARNING_GAP_PX
    );
    expect(endWarningWidth(warnings({ time: '12/8' }))).toBeCloseTo(
      2 * TIME_SIG_DIGIT_WIDTH_PX + END_WARNING_GAP_PX
    );
  });

  it('grows with every group added', () => {
    const clef = endWarningWidth(warnings({ clef: 'bass' }));
    const clefAndKey = endWarningWidth(
      warnings({ clef: 'bass', key: { from: key('D'), to: key('C') } })
    );
    const all = endWarningWidth(
      warnings({
        clef: 'bass',
        key: { from: key('D'), to: key('C') },
        time: '3/4',
      })
    );
    expect(clefAndKey).toBeGreaterThan(clef);
    expect(all).toBeGreaterThan(clefAndKey);
  });
});

describe('mergeEndWarnings', () => {
  it('keeps either side alone', () => {
    const courtesy = warnings({ clef: 'bass' });
    expect(mergeEndWarnings(courtesy, null)).toBe(courtesy);
    expect(mergeEndWarnings(null, courtesy)).toBe(courtesy);
    expect(mergeEndWarnings(null, null)).toBeNull();
  });

  it('lets the repeat warning win per component and reserve width', () => {
    const merged = mergeEndWarnings(
      warnings({ clef: 'bass', key: { from: key('D'), to: key('C') } }),
      warnings({ clef: 'treble', time: '3/4', reservesWidth: true })
    );
    expect(merged).toEqual({
      clef: 'treble',
      key: { from: key('D'), to: key('C') },
      time: '3/4',
      reservesWidth: true,
    });
  });
});

describe('endWarningsEqual', () => {
  it('compares by value', () => {
    const change = () => ({ from: key('D'), to: key('C') });
    expect(
      endWarningsEqual(warnings({ key: change() }), warnings({ key: change() }))
    ).toBe(true);
    expect(
      endWarningsEqual(
        warnings({ key: change() }),
        warnings({ key: change(), reservesWidth: true })
      )
    ).toBe(false);
    expect(endWarningsEqual(null, warnings({}))).toBe(false);
  });
});

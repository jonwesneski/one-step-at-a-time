import type { FlutterEntry } from './flutterTongueRules';
import {
  missingFlutterCancelWarning,
  resolveFlutterPassages,
} from './flutterTongueRules';

const plain: FlutterEntry = { tremolo: false, label: null, tie: null };
const trem: FlutterEntry = { tremolo: true, label: null, tie: null };
const rest: FlutterEntry = plain;

describe('resolveFlutterPassages', () => {
  it('opens a passage at each flutter label', () => {
    for (const label of ['flz', 'flt', 'frull'] as const) {
      const { flutterTongued, openAtEnd } = resolveFlutterPassages(
        [{ ...trem, label }, trem],
        false
      );
      expect([...flutterTongued]).toEqual([0, 1]);
      expect(openAtEnd).toBe(true);
    }
  });

  it('closes a passage at any other label', () => {
    for (const label of ['ord', 'nat', 'norm', 'trem', 'non-trem'] as const) {
      const { flutterTongued, openAtEnd } = resolveFlutterPassages(
        [{ ...trem, label: 'flz' }, { ...plain, label }, trem],
        false
      );
      expect([...flutterTongued]).toEqual([0]);
      expect(openAtEnd).toBe(false);
    }
  });

  it('leaves tremolos outside a passage alone', () => {
    expect([
      ...resolveFlutterPassages([trem, trem], false).flutterTongued,
    ]).toEqual([]);
  });

  it('keeps a passage open across plain notes and rests', () => {
    const { flutterTongued, missingCancels } = resolveFlutterPassages(
      [{ ...trem, label: 'flz' }, plain, rest, trem],
      false
    );
    expect([...flutterTongued]).toEqual([0, 3]);
    expect(missingCancels).toEqual([]);
  });

  it('needs no ord. on a plain note that is not tied in (C, bar 1)', () => {
    const bar1: FlutterEntry[] = [
      { tremolo: true, label: 'flz', tie: 'start' },
      { tremolo: true, label: null, tie: 'end' },
      plain,
    ];
    expect(resolveFlutterPassages(bar1, false).missingCancels).toEqual([]);
  });

  it('flags a plain note tied in from flutter-tonguing (C, bars 2–3)', () => {
    const bars: FlutterEntry[] = [
      rest,
      { tremolo: true, label: 'flz', tie: 'start' },
      { tremolo: false, label: null, tie: 'end' },
      plain,
    ];
    expect(resolveFlutterPassages(bars, false).missingCancels).toEqual([2]);
    bars[2] = { ...bars[2], label: 'ord' };
    const fixed = resolveFlutterPassages(bars, false);
    expect(fixed.missingCancels).toEqual([]);
    expect(fixed.openAtEnd).toBe(false);
  });

  it('carries a passage in from the previous measure', () => {
    const { flutterTongued, missingCancels } = resolveFlutterPassages(
      [trem, { ...plain, tie: 'end' }],
      true
    );
    expect([...flutterTongued]).toEqual([0]);
    expect(missingCancels).toEqual([1]);
  });

  it('reports a passage left open', () => {
    expect(
      resolveFlutterPassages([{ ...trem, label: 'flz' }, rest], false).openAtEnd
    ).toBe(true);
    expect(resolveFlutterPassages([], true).openAtEnd).toBe(true);
    expect(resolveFlutterPassages([plain], false).openAtEnd).toBe(false);
  });
});

describe('missingFlutterCancelWarning', () => {
  it('names where the note is and what to add', () => {
    expect(missingFlutterCancelWarning('measure 3')).toMatch(
      /^measure 3: .*tremolo-label="ord"/
    );
  });
});

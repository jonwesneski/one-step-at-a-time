/**
 * @jest-environment jsdom
 */
import '../chord/index';
import '../note/index';
import type { ChordElementType, NoteElementType } from '../types/elements';
import type { ArpeggioType, HairpinKind } from '../types/theory';
import { MUSIC_CHORD, MUSIC_NOTE } from '../utils/consts';
import {
  ARPEGGIO_FOOTPRINT_PX,
  ARPEGGIO_FOOTPRINT_WITH_ACCIDENTAL_PX,
  ARPEGGIO_HAIRPIN_FOOTPRINT_PX,
} from '../utils/notationDimensions';
import {
  type ArpeggioEntry,
  computeArpeggioFootprintWidth,
  computeArpeggioHairpinFootprintWidth,
  resolveArpeggioSpans,
  resolveArpeggioTiePairings,
} from './arpeggioRules';

describe('computeArpeggioFootprintWidth', () => {
  const variants: ArpeggioType[] = ['up', 'up-arrow', 'down', 'non-arpeggiate'];

  it('reserves nothing when there is no arpeggio', () => {
    expect(computeArpeggioFootprintWidth(null, false)).toBe(0);
    expect(computeArpeggioFootprintWidth(null, true)).toBe(0);
  });

  it.each(variants)(
    'reserves the no-accidental footprint for "%s" without an accidental',
    (variant) => {
      expect(computeArpeggioFootprintWidth(variant, false)).toBe(
        ARPEGGIO_FOOTPRINT_PX
      );
    }
  );

  it.each(variants)(
    'reserves the wider footprint for "%s" when an accidental is shown',
    (variant) => {
      expect(computeArpeggioFootprintWidth(variant, true)).toBe(
        ARPEGGIO_FOOTPRINT_WITH_ACCIDENTAL_PX
      );
    }
  );

  it('reserves more room alongside an accidental than without one', () => {
    expect(computeArpeggioFootprintWidth('up', true)).toBeGreaterThan(
      computeArpeggioFootprintWidth('up', false)
    );
  });
});

describe('computeArpeggioHairpinFootprintWidth', () => {
  it('reserves nothing when there is no hairpin', () => {
    expect(computeArpeggioHairpinFootprintWidth(null)).toBe(0);
  });

  it.each(['crescendo', 'decrescendo'] as HairpinKind[])(
    'reserves the hairpin footprint for "%s"',
    (kind) => {
      expect(computeArpeggioHairpinFootprintWidth(kind)).toBe(
        ARPEGGIO_HAIRPIN_FOOTPRINT_PX
      );
    }
  );
});

describe('resolveArpeggioSpans', () => {
  const entry = (over: Partial<ArpeggioEntry>): ArpeggioEntry => ({
    staffIndex: 0,
    entryIndex: 0,
    id: null,
    arpeggio: 'up',
    arpeggioFor: null,
    ...over,
  });

  it('does not pair two unlinked arpeggio marks at the same index (broken form)', () => {
    const { spans, warnings } = resolveArpeggioSpans([
      entry({ staffIndex: 0, entryIndex: 2, arpeggio: 'up' }),
      entry({ staffIndex: 1, entryIndex: 2, arpeggio: 'up' }),
    ]);
    expect(spans).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('pairs explicitly via arpeggio-for', () => {
    const { spans, warnings } = resolveArpeggioSpans([
      entry({
        staffIndex: 0,
        entryIndex: 1,
        id: 'top',
        arpeggio: 'up-arrow',
      }),
      entry({
        staffIndex: 1,
        entryIndex: 4,
        arpeggio: 'up-arrow',
        arpeggioFor: 'top',
      }),
    ]);
    expect(warnings).toEqual([]);
    expect(spans).toEqual([
      {
        upper: { staffIndex: 0, entryIndex: 1 },
        lower: { staffIndex: 1, entryIndex: 4 },
        arpeggio: 'up-arrow',
      },
    ]);
  });

  it('warns and skips when arpeggio-for matches nothing', () => {
    const { spans, warnings } = resolveArpeggioSpans([
      entry({ staffIndex: 1, arpeggioFor: 'missing' }),
    ]);
    expect(spans).toEqual([]);
    expect(warnings[0]).toMatch(/matches no element/);
  });

  it('warns and keeps the lower value when the two ends disagree', () => {
    const { spans, warnings } = resolveArpeggioSpans([
      entry({ staffIndex: 0, id: 'a', arpeggio: 'up' }),
      entry({ staffIndex: 1, arpeggio: 'down', arpeggioFor: 'a' }),
    ]);
    expect(spans[0].arpeggio).toBe('down');
    expect(warnings[0]).toMatch(/disagree/);
  });

  it('rejects a second reference to an already-paired endpoint', () => {
    const { spans, warnings } = resolveArpeggioSpans([
      entry({ staffIndex: 0, entryIndex: 0, id: 'top', arpeggio: 'up' }),
      entry({
        staffIndex: 1,
        entryIndex: 1,
        arpeggio: 'up',
        arpeggioFor: 'top',
      }),
      entry({
        staffIndex: 1,
        entryIndex: 2,
        arpeggio: 'up',
        arpeggioFor: 'top',
      }),
    ]);
    expect(spans).toEqual([
      {
        upper: { staffIndex: 0, entryIndex: 0 },
        lower: { staffIndex: 1, entryIndex: 1 },
        arpeggio: 'up',
      },
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/already paired/);
  });

  it('rejects the third link of an arpeggio-for chain', () => {
    const { spans, warnings } = resolveArpeggioSpans([
      entry({ staffIndex: 0, entryIndex: 0, id: 'a', arpeggio: 'up' }),
      entry({
        staffIndex: 1,
        entryIndex: 0,
        id: 'b',
        arpeggio: 'up',
        arpeggioFor: 'a',
      }),
      entry({
        staffIndex: 0,
        entryIndex: 1,
        arpeggio: 'up',
        arpeggioFor: 'b',
      }),
    ]);
    expect(spans).toEqual([
      {
        upper: { staffIndex: 0, entryIndex: 0 },
        lower: { staffIndex: 1, entryIndex: 0 },
        arpeggio: 'up',
      },
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/arpeggio-for="b".*already paired/);
  });

  it('never produces a span for non-arpeggiate, even when linked', () => {
    const { spans, warnings } = resolveArpeggioSpans([
      entry({
        staffIndex: 0,
        entryIndex: 0,
        id: 'top',
        arpeggio: 'non-arpeggiate',
      }),
      entry({
        staffIndex: 1,
        entryIndex: 0,
        arpeggio: 'non-arpeggiate',
        arpeggioFor: 'top',
      }),
    ]);
    expect(spans).toEqual([]);
    expect(warnings[0]).toMatch(/no wave variant/);
  });
});

describe('resolveArpeggioTiePairings', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const runNote = (pitch: string, octave = 4): NoteElementType => {
    const el = document.createElement(MUSIC_NOTE) as NoteElementType;
    el.setAttribute('note', pitch);
    el.setAttribute('octave', `${octave}`);
    document.body.appendChild(el);
    return el;
  };
  const targetChord = (name: string): ChordElementType => {
    const el = document.createElement(MUSIC_CHORD) as ChordElementType;
    el.setAttribute('chord', name);
    document.body.appendChild(el);
    return el;
  };

  it('pairs each run note with its matching chord tone by pitch class', () => {
    const run = [runNote('C'), runNote('E'), runNote('G')];
    const { pairings, warnings } = resolveArpeggioTiePairings(
      run,
      targetChord('Cmaj'),
      'lv'
    );
    expect(warnings).toEqual([]);
    expect(pairings.map((p) => p.variant)).toEqual([
      'run-to-chord',
      'run-to-chord',
      'run-to-chord',
    ]);
    expect(pairings.map((p) => p.targetToneIndex)).toEqual([0, 1, 2]);
  });

  it('matches enharmonically (Gb ties to F#)', () => {
    const { pairings } = resolveArpeggioTiePairings(
      [runNote('Gb')],
      targetChord('Dmaj'), // D F# A
      'lv'
    );
    expect(pairings).toHaveLength(1);
    expect(pairings[0].variant).toBe('run-to-chord');
  });

  it('makes an unmatched run note a laissez-vibrer pairing (unmatched: lv)', () => {
    const { pairings, warnings } = resolveArpeggioTiePairings(
      [runNote('C'), runNote('D')],
      targetChord('Cmaj'),
      'lv'
    );
    expect(pairings.map((p) => p.variant)).toEqual([
      'run-to-chord',
      'laissez-vibrer',
    ]);
    expect(warnings.some((w) => /no matching tone/.test(w))).toBe(true);
  });

  it('drops an unmatched run note when unmatched: skip', () => {
    const { pairings } = resolveArpeggioTiePairings(
      [runNote('C'), runNote('D')],
      targetChord('Cmaj'),
      'skip'
    );
    expect(pairings).toHaveLength(1);
  });

  it('skips a run note that carries an authored tie', () => {
    const authored = runNote('C');
    authored.setAttribute('tie', 'start');
    const { pairings, warnings } = resolveArpeggioTiePairings(
      [authored, runNote('E')],
      targetChord('Cmaj'),
      'lv'
    );
    expect(pairings).toHaveLength(1);
    expect(pairings[0].targetToneIndex).toBe(1);
    expect(warnings.some((w) => /authored tie/.test(w))).toBe(true);
  });
});

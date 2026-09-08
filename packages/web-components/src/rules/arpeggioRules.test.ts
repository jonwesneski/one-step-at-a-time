/**
 * @jest-environment jsdom
 */
import type { ArpeggioType } from '../types/theory';
import {
  ARPEGGIO_FOOTPRINT_PX,
  ARPEGGIO_FOOTPRINT_WITH_ACCIDENTAL_PX,
} from '../utils/notationDimensions';
import {
  type ArpeggioEntry,
  computeArpeggioFootprintWidth,
  resolveArpeggioSpans,
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

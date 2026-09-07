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

  it('pairs a grand-staff pair implicitly by matching entry index', () => {
    const { spans, warnings } = resolveArpeggioSpans(
      [
        entry({ staffIndex: 0, entryIndex: 2, arpeggio: 'up' }),
        entry({ staffIndex: 1, entryIndex: 2, arpeggio: 'up' }),
      ],
      true
    );
    expect(warnings).toEqual([]);
    expect(spans).toEqual([
      {
        upper: { staffIndex: 0, entryIndex: 2 },
        lower: { staffIndex: 1, entryIndex: 2 },
        arpeggio: 'up',
      },
    ]);
  });

  it('does not pair implicitly when the first staff is not a grand staff', () => {
    const { spans } = resolveArpeggioSpans(
      [
        entry({ staffIndex: 0, entryIndex: 0 }),
        entry({ staffIndex: 1, entryIndex: 0 }),
      ],
      false
    );
    expect(spans).toEqual([]);
  });

  it('pairs explicitly via arpeggio-for regardless of grand-staff status', () => {
    const { spans, warnings } = resolveArpeggioSpans(
      [
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
      ],
      false
    );
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
    const { spans, warnings } = resolveArpeggioSpans(
      [entry({ staffIndex: 1, arpeggioFor: 'missing' })],
      false
    );
    expect(spans).toEqual([]);
    expect(warnings[0]).toMatch(/matches no element/);
  });

  it('warns and keeps the lower value when the two ends disagree', () => {
    const { spans, warnings } = resolveArpeggioSpans(
      [
        entry({ staffIndex: 0, id: 'a', arpeggio: 'up' }),
        entry({ staffIndex: 1, arpeggio: 'down', arpeggioFor: 'a' }),
      ],
      false
    );
    expect(spans[0].arpeggio).toBe('down');
    expect(warnings[0]).toMatch(/disagree/);
  });

  it('never produces a span for non-arpeggiate', () => {
    const { spans } = resolveArpeggioSpans(
      [
        entry({ staffIndex: 0, entryIndex: 0, arpeggio: 'non-arpeggiate' }),
        entry({ staffIndex: 1, entryIndex: 0, arpeggio: 'non-arpeggiate' }),
      ],
      true
    );
    expect(spans).toEqual([]);
  });
});

/**
 * @jest-environment jsdom
 */
import type { ArpeggioType } from '../types/theory';
import {
  ARPEGGIO_FOOTPRINT_PX,
  ARPEGGIO_FOOTPRINT_WITH_ACCIDENTAL_PX,
} from '../utils/notationDimensions';
import { computeArpeggioFootprintWidth } from './arpeggioRules';

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

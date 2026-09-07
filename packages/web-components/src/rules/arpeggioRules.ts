import type { ArpeggioType } from '../types/theory';
import {
  ARPEGGIO_FOOTPRINT_PX,
  ARPEGGIO_FOOTPRINT_WITH_ACCIDENTAL_PX,
} from '../utils/notationDimensions';

/**
 * Leftward horizontal footprint (px) the staff reserves for an arpeggio sign,
 * in front of the element's own accidental footprint (and behind any grace
 * group). When the element shows an accidental the sign clears the whole
 * accidental column, so the reservation is larger and is added on top of the
 * accidental footprint the caller computes separately. Every variant reserves
 * the same width — the arrowhead extends only vertically, and the
 * non-arpeggiate bracket is the wave width by construction.
 */
export function computeArpeggioFootprintWidth(
  arpeggio: ArpeggioType | null,
  hasShownAccidental: boolean
): number {
  if (arpeggio === null) {
    return 0;
  }
  return hasShownAccidental
    ? ARPEGGIO_FOOTPRINT_WITH_ACCIDENTAL_PX
    : ARPEGGIO_FOOTPRINT_PX;
}

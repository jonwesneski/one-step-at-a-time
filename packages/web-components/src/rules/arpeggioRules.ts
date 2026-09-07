import type { ArpeggioType } from '../types/theory';
import {
  ARPEGGIO_FOOTPRINT_PX,
  ARPEGGIO_FOOTPRINT_WITH_ACCIDENTAL_PX,
} from '../utils/notationDimensions';

// ─── Cross-staff (grand staff) unbroken arpeggio ─────────────────────────────
//
// Pure resolution/validation, kept out of measure.ts so it is unit-testable
// (jsdom's ResizeObserver polyfill never fires, so measure.ts's real render
// path only runs in browser tests). Mirrors resolveStaffGroups.

export type ArpeggioEntry = {
  /** Ordinal of the staff this element sits in, within the measure. */
  staffIndex: number;
  /** Flattened note/chord index within that staff. */
  entryIndex: number;
  /** The element's own `id`, or null. */
  id: string | null;
  arpeggio: ArpeggioType | null;
  /** `arpeggio-for` — the `id` of the upper element to continue from. */
  arpeggioFor: string | null;
};

export type ArpeggioSpan = {
  upper: { staffIndex: number; entryIndex: number };
  lower: { staffIndex: number; entryIndex: number };
  /** The variant to draw — never `non-arpeggiate` (that stays a per-staff sign). */
  arpeggio: Exclude<ArpeggioType, 'non-arpeggiate'>;
};

export type ArpeggioSpanResolution = {
  spans: ArpeggioSpan[];
  warnings: string[];
};

const isWaveVariant = (
  value: ArpeggioType | null
): value is Exclude<ArpeggioType, 'non-arpeggiate'> =>
  value === 'up' || value === 'up-arrow' || value === 'down';

/**
 * Pairs the two ends of each unbroken cross-staff arpeggio.
 *
 * - Explicit: a lower element with `arpeggio-for="<id>"` pairs with the element
 *   whose `id` matches, when that element is in a different staff. If both
 *   carry `arpeggio` and disagree, the lower element's value wins (with a
 *   warning).
 * - Implicit (only when the measure's first staff is `group="grand"`): an
 *   element with `arpeggio` and no `arpeggio-for` at entry index _i_ of staff 0
 *   pairs with an `arpeggio`, no-`arpeggio-for` element at index _i_ of staff 1.
 *
 * Any failure produces a warning and no span — the two elements then keep their
 * own per-staff signs.
 */
export function resolveArpeggioSpans(
  entries: ArpeggioEntry[],
  firstStaffIsGrand: boolean
): ArpeggioSpanResolution {
  const spans: ArpeggioSpan[] = [];
  const warnings: string[] = [];
  const byId = new Map<string, ArpeggioEntry>();
  for (const entry of entries) {
    if (entry.id !== null) {
      byId.set(entry.id, entry);
    }
  }
  const paired = new Set<ArpeggioEntry>();

  for (const lower of entries) {
    if (lower.arpeggioFor === null) {
      continue;
    }
    const upper = byId.get(lower.arpeggioFor);
    if (!upper) {
      warnings.push(
        `arpeggio-for="${lower.arpeggioFor}" matches no element; drawing per-staff signs instead`
      );
      continue;
    }
    if (upper.staffIndex === lower.staffIndex) {
      warnings.push(
        `arpeggio-for="${lower.arpeggioFor}" points to an element on the same staff; a cross-staff arpeggio spans two staves`
      );
      continue;
    }
    const variant = isWaveVariant(lower.arpeggio)
      ? lower.arpeggio
      : isWaveVariant(upper.arpeggio)
      ? upper.arpeggio
      : null;
    if (variant === null) {
      warnings.push(
        `arpeggio-for="${lower.arpeggioFor}" pairing has no wave variant on either end; drawing per-staff signs instead`
      );
      continue;
    }
    if (
      isWaveVariant(lower.arpeggio) &&
      isWaveVariant(upper.arpeggio) &&
      lower.arpeggio !== upper.arpeggio
    ) {
      warnings.push(
        `cross-staff arpeggio ends disagree ("${upper.arpeggio}" vs "${lower.arpeggio}"); using "${lower.arpeggio}"`
      );
    }
    const [top, bottom] =
      upper.staffIndex < lower.staffIndex ? [upper, lower] : [lower, upper];
    spans.push({
      upper: { staffIndex: top.staffIndex, entryIndex: top.entryIndex },
      lower: { staffIndex: bottom.staffIndex, entryIndex: bottom.entryIndex },
      arpeggio: variant,
    });
    paired.add(upper);
    paired.add(lower);
  }

  if (firstStaffIsGrand) {
    const staffZero = entries.filter(
      (e) => e.staffIndex === 0 && e.arpeggioFor === null && !paired.has(e)
    );
    for (const upper of staffZero) {
      if (!isWaveVariant(upper.arpeggio)) {
        continue;
      }
      const lower = entries.find(
        (e) =>
          e.staffIndex === 1 &&
          e.entryIndex === upper.entryIndex &&
          e.arpeggioFor === null &&
          !paired.has(e) &&
          isWaveVariant(e.arpeggio)
      );
      if (!lower) {
        continue;
      }
      spans.push({
        upper: { staffIndex: upper.staffIndex, entryIndex: upper.entryIndex },
        lower: { staffIndex: lower.staffIndex, entryIndex: lower.entryIndex },
        arpeggio: upper.arpeggio,
      });
      paired.add(upper);
      paired.add(lower);
    }
  }

  return { spans, warnings };
}

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

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
//
// A cross-staff span is only ever formed by an explicit `arpeggio-for`. Two
// unlinked `arpeggio` marks — even a same-index pair on a grand staff — stay
// as independent per-staff signs (the "broken" grand-staff form), which is
// otherwise impossible to express.

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
 * A pair is formed only by an explicit `arpeggio-for="<id>"` on the lower
 * element, matching the element whose `id` it names when that element is in a
 * different staff. If both ends carry `arpeggio` and disagree, the lower
 * element's value wins (with a warning). Two `arpeggio` marks with no
 * `arpeggio-for` between them are never joined — they stay as separate
 * per-staff signs (the "broken" form), whether or not the measure is a grand
 * staff.
 *
 * Each element is an endpoint of at most one span; an `arpeggio-for` that
 * references an element already paired (by an earlier reference, or as the
 * upper end of another span) is rejected so connectors never branch from a
 * shared notehead.
 *
 * Any failure produces a warning and no span — the two elements then keep their
 * own per-staff signs.
 */
export function resolveArpeggioSpans(
  entries: ArpeggioEntry[]
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
    if (paired.has(upper) || paired.has(lower)) {
      warnings.push(
        `arpeggio-for="${lower.arpeggioFor}" reuses an element already paired in another cross-staff arpeggio; drawing per-staff signs instead`
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

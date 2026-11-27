import { TUPLET_NUMERAL_FONT_SIZE } from '../utils/notationDimensions';
import {
  TupletBracketGeometry,
  tupletDisplayOf,
  tupletLabelExtents,
} from './tupletRules';

/**
 * Computes the above-staff SVG coordinate budget (px above y=0) needed to
 * render all tuplet brackets without clipping. Based on actual computed geometry
 * so the budget reflects real numeral/bracket positions rather than estimates.
 * Returns 0 when no above-staff budget is required.
 */
export function computeAboveStaffBudget(
  geometries: TupletBracketGeometry[]
): number {
  let maxBudget = 0;
  for (const geometry of geometries) {
    if (!geometry.stemUp) {
      continue;
    }
    // The topmost rendered element is either the bracket arm (at baseY for bracket groups)
    // or the numeral top edge (numeralY - font/2 for omitBracket groups).
    const { far } = tupletLabelExtents(tupletDisplayOf(geometry.group), true);
    const topY = geometry.omitBracket
      ? geometry.numeralY - far
      : Math.min(geometry.baseY, geometry.numeralY) -
        far -
        TUPLET_NUMERAL_FONT_SIZE / 2;
    if (topY < 0) {
      maxBudget = Math.max(maxBudget, Math.ceil(-topY) + 2);
    }
  }
  return maxBudget;
}

import {
  STAFF_TOP_LINE_Y,
  STAFF_Y_PADDING,
  TUPLET_BRACKET_LEVEL_OFFSET_PX,
  TUPLET_HOOK_LENGTH_PX,
  TUPLET_NUMERAL_FONT_SIZE,
  TUPLET_STAFF_CLEARANCE_PX,
} from '../utils/notationDimensions';
import { TupletGroup } from './tupletRules';

/**
 * Computes the above-staff SVG coordinate budget (px above y=0) needed to
 * render all tuplet brackets for the current groups without clipping.
 * Returns 0 when no above-staff budget is required (no stem-up tuplets).
 */
export function computeAboveStaffBudget(
  groups: TupletGroup[],
  stemDirections: boolean[],
  maxNestingLevel: number
): number {
  let maxBudget = 0;
  for (const group of groups) {
    const upVotes = group.indices.filter(
      (i) => stemDirections[i] === true
    ).length;
    const stemUp = upVotes >= group.indices.length / 2;
    if (!stemUp) {
      continue;
    }
    const depthFromOutside = maxNestingLevel - group.nestingLevel;
    const baseY =
      STAFF_TOP_LINE_Y -
      STAFF_Y_PADDING -
      TUPLET_STAFF_CLEARANCE_PX -
      TUPLET_HOOK_LENGTH_PX -
      depthFromOutside * TUPLET_BRACKET_LEVEL_OFFSET_PX;
    const numeralTop = baseY - TUPLET_NUMERAL_FONT_SIZE;
    if (numeralTop < 0) {
      maxBudget = Math.max(maxBudget, Math.ceil(-numeralTop) + 2);
    }
  }
  return maxBudget;
}

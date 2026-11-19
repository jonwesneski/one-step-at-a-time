import { BaseDurationType, DurationType } from '../types/theory';
import { BASE_DURATIONS } from '../utils/consts';
import { VOICE_REST_DISPLACEMENT_PX } from '../utils/notationDimensions';
import {
  getFirstBallYPx,
  HALF_RECT_BOTTOM_PX,
  hookCountMap,
  QUARTER_SY_PX,
  WHOLE_RECT_TOP_PX,
} from '../utils/svgCreator/rest';
import { durationToBase } from './theoryConsts';
import { VoiceDirection } from './voiceRules';

// Absolute staff line positions (px from staff-wrapper top), clef-agnostic
const LINE_1 = 28; // top staff line
const LINE_2 = 38;
const LINE_3 = 48; // middle line
const BETWEEN_LINE1_LINE2 = 33; // midpoint between lines 1 and 2
const BETWEEN_LINE2_LINE3 = 43; // midpoint between lines 2 and 3

// Distance (px) from a rest's box-top (`style.top`) to its reference feature:
// the rectangle top (whole/double-whole), rectangle bottom (half), a fixed
// offset (quarter) or the first hook-ball (eighth+). Subtract it to place
// that feature at a target Y.
export function restGlyphOffsetFromBoxTop(duration: DurationType): number {
  const base = durationToBase[duration];
  if (base === 'double-whole' || base === 'whole') {
    return WHOLE_RECT_TOP_PX;
  }
  if (base === 'half') {
    return HALF_RECT_BOTTOM_PX;
  }
  if (base === 'quarter') {
    return QUARTER_SY_PX - 2; // just a tiny bit lower;
  }
  return getFirstBallYPx(hookCountMap[base]);
}

function computeTopY(base: BaseDurationType): number {
  const offset = restGlyphOffsetFromBoxTop(base);
  if (base === 'double-whole' || base === 'whole') {
    return LINE_2 - offset;
  }
  if (base === 'half') {
    return LINE_3 - offset;
  }
  if (base === 'quarter') {
    return LINE_1 - offset;
  }
  const hookCount = hookCountMap[base];
  const ballTarget = hookCount <= 2 ? BETWEEN_LINE2_LINE3 : BETWEEN_LINE1_LINE2;
  return ballTarget - offset;
}

const restTopMap = Object.fromEntries(
  BASE_DURATIONS.map((base) => [base, computeTopY(base)])
) as Record<BaseDurationType, number>;

export type VoiceRestContext = { direction: VoiceDirection };

/**
 * A double-stemmed beam rest's placement, resolved by the measure.
 * `targetY` is the glyph feature's staff-local Y, not the box-top.
 */
export type RestCrossStaffContext = {
  targetY: number;
};

/**
 * Duration-keyed Y position, optionally displaced for a voice sharing a
 * staff with another voice — voice 1's rests shift up, voice 2's shift
 * down. `crossStaffContext` replaces the position entirely (beside a
 * double-stemmed beam, or centred in the gap).
 */
export function restToYCoordinate(
  duration: DurationType,
  voiceContext?: VoiceRestContext,
  crossStaffContext?: RestCrossStaffContext
): number {
  if (crossStaffContext) {
    return crossStaffContext.targetY - restGlyphOffsetFromBoxTop(duration);
  }
  const top = restTopMap[durationToBase[duration]];
  if (!voiceContext) {
    return top;
  }
  return voiceContext.direction === 'up'
    ? top - VOICE_REST_DISPLACEMENT_PX
    : top + VOICE_REST_DISPLACEMENT_PX;
}

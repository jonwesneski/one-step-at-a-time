import { BaseDurationType, DurationType } from '../types/theory';
import { BASE_DURATIONS } from '../utils/consts';
import {
  REST_BEAM_CLEARANCE_PX,
  STAFF_LINE_SPACING,
  VOICE_REST_DISPLACEMENT_PX,
} from '../utils/notationDimensions';
import {
  getFirstBallYPx,
  HALF_RECT_BOTTOM_PX,
  hookCountMap,
  QUARTER_SY_PX,
  WHOLE_RECT_TOP_PX,
} from '../utils/svgCreator/rest';
import { durationToBase, durationToFlagCountMap } from './theoryConsts';
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

/** Why a rest's `beam-over` has no effect, or null when it can join a beam. */
export function beamOverWarning(
  duration: DurationType,
  beamGroup: string | null
): string | null {
  if ((durationToFlagCountMap.get(duration) ?? 0) === 0) {
    return `beam-over only applies to rests shorter than a crotchet; ignoring it on a ${duration} rest`;
  }
  if (beamGroup !== null) {
    return 'beam-over is ignored on a rest in a cross-staff beam-group, which places its own rests';
  }
  return null;
}

/**
 * How far (px, +down) a rest under or over a beam moves, by whole spaces
 * away from it, to stand REST_BEAM_CLEARANCE_PX clear.
 */
export function restShiftClearOfBeam(input: {
  inkTop: number;
  inkBottom: number;
  beamTop: number;
  beamBottom: number;
  beamAbove: boolean;
}): number {
  const { inkTop, inkBottom, beamTop, beamBottom, beamAbove } = input;
  const overlap = beamAbove
    ? beamBottom + REST_BEAM_CLEARANCE_PX - inkTop
    : inkBottom - (beamTop - REST_BEAM_CLEARANCE_PX);
  if (overlap <= 0) {
    return 0;
  }
  const spaces = Math.ceil(overlap / STAFF_LINE_SPACING - 1e-9);
  return (beamAbove ? 1 : -1) * spaces * STAFF_LINE_SPACING;
}

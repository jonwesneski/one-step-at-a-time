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

// The distance (px) from a rest's own box-top (what `element.style.top`
// sets) down to its characteristic visual feature — the rectangle top for
// whole/double-whole, the rectangle bottom for half, a fixed offset for
// quarter, or the first hook-ball for eighth+. `element.style.top` always
// positions the box's own origin, never the glyph's visible feature
// directly, so any caller wanting a specific feature to land on a specific
// target Y must subtract this first (computeTopY below does; so must a
// cross-staff caller computing its own arbitrary real-Y target — exported
// for measure.ts, which resolves that target from real beam/notehead
// geometry no staff-line constant here captures).
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
 * A rest's real cross-staff placement, resolved by the ancestor
 * <music-measure> for a rest that's a member of an active double-stemmed
 * beam-group — the beam-relative or gap-centered position, already backed
 * off from any nearby real notehead the flat beam/gap math alone can't see
 * (measure.ts checks real geometry; restRules.ts stays DOM-free). `targetY`
 * is this rest's own visible glyph feature's target Y, already converted
 * to this rest's own staff-local coordinate space — NOT the box-top.
 */
export type RestCrossStaffContext = {
  targetY: number;
};

/**
 * Duration-keyed Y position, optionally displaced for a voice sharing a
 * staff with another voice — voice 1's rests shift up, voice 2's shift
 * down, clearly avoiding the other voice's notes (and, when the rest sits
 * beside a beamed group in the same voice, automatically on the same side
 * as that group, since both read the same `direction`). Omitting
 * `voiceContext` reproduces today's exact single-voice behavior.
 *
 * `crossStaffContext`, when given, overrides the ordinary duration-keyed
 * position entirely — a rest placed either just above/below a
 * double-stemmed beam, or centered in the real gap between the two staves.
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

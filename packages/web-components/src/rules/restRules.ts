import { DurationType } from '../types/theory';
import { DURATIONS } from '../utils';
import {
  getFirstBallYPx,
  HALF_RECT_BOTTOM_PX,
  hookCountMap,
  QUARTER_SY_PX,
  WHOLE_RECT_TOP_PX,
} from '../utils/svgCreator/rest';

// Absolute staff line positions (px from staff-wrapper top), clef-agnostic
const LINE_1 = 28; // top staff line
const LINE_2 = 38;
const LINE_3 = 48; // middle line
const BETWEEN_LINE1_LINE2 = 33; // midpoint between lines 1 and 2
const BETWEEN_LINE2_LINE3 = 43; // midpoint between lines 2 and 3

function computeTopY(duration: DurationType): number {
  if (duration === 'double-whole') {
    return LINE_2 - WHOLE_RECT_TOP_PX;
  }
  if (duration === 'whole') {
    return LINE_2 - WHOLE_RECT_TOP_PX;
  }
  if (duration === 'half') {
    return LINE_3 - HALF_RECT_BOTTOM_PX;
  }
  if (duration === 'quarter') {
    return LINE_1 - QUARTER_SY_PX + 2; // just a tiny bit lower;
  }
  const hookCount = hookCountMap[duration];
  const ballTarget = hookCount <= 2 ? BETWEEN_LINE2_LINE3 : BETWEEN_LINE1_LINE2;
  return ballTarget - getFirstBallYPx(hookCount);
}

const restTopMap: Record<DurationType, number> = Object.fromEntries(
  DURATIONS.map((d) => [d, computeTopY(d)])
) as Record<DurationType, number>;

export function restToYCoordinate(duration: DurationType): number {
  return restTopMap[duration];
}

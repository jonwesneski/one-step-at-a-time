import type {
  AccidentalType,
  BaseDurationType,
  VoiceNumber,
} from '../types/theory';
import {
  ACCIDENTAL_SYMBOL_WIDTH,
  UNISON_STEM_CLEARANCE_PX,
} from '../utils/notationDimensions';
import { isOpenDuration, isStemlessDuration } from './theoryConsts';
import type { VoiceDirection, VoicePartGeometry } from './voiceRules';

export type UnisonHeadClass = 'stemless' | 'open' | 'black';

// What one part contributes at a unison.
export type UnisonPartDescriptor = {
  duration: BaseDurationType;
  // The pitch's own accidental, shown or not.
  pitchAccidental: AccidentalType | null;
  // The accidental actually drawn left of the head, if any.
  shownAccidental: AccidentalType | null;
  isChord: boolean;
};

export type UnisonPartInput = UnisonPartDescriptor & {
  voiceNumber: VoiceNumber;
  direction: VoiceDirection;
  dotCount: number;
  geometry: VoicePartGeometry;
};

export type UnisonPairMode = 'stemless' | 'shared-head' | 'separate-stems';

export type UnisonPairLayout = {
  mode: UnisonPairMode;
  leftVoiceNumber: VoiceNumber;
  leftOffsetPx: number;
  rightOffsetPx: number;
  // The part that draws no head of its own.
  omitsHeadVoiceNumber: VoiceNumber | null;
};

export function headClassOf(duration: BaseDurationType): UnisonHeadClass {
  if (isStemlessDuration(duration)) {
    return 'stemless';
  }
  return isOpenDuration(duration) ? 'open' : 'black';
}

/**
 * Two parts on one staff position share a head when each takes its own stem
 * (opposite directions), both are notes, and nothing about the head differs:
 * black heads share across any black durations, open heads only with open
 * heads, stemless heads never.
 */
export function canShareNotehead(
  a: UnisonPartInput,
  b: UnisonPartInput
): boolean {
  if (a.isChord || b.isChord || a.direction === b.direction) {
    return false;
  }
  const headClass = headClassOf(a.duration);
  return (
    headClass !== 'stemless' &&
    headClass === headClassOf(b.duration) &&
    a.pitchAccidental === b.pitchAccidental &&
    a.dotCount === b.dotCount
  );
}

const headCenterX = (geometry: VoicePartGeometry): number =>
  (geometry.headLeftX + geometry.headRightX) / 2;

/**
 * Horizontal placement of two parts that sound the same staff position:
 *  - shared head: the down-stem part moves until its head sits on the
 *    up-stem part's, leaving the up-stem on the right and the down-stem on
 *    the left; it draws no head of its own;
 *  - otherwise the upper part (lower voice number) stays on the beat and the
 *    lower part moves right until its head, and the accidental it carries,
 *    clear the upper head by UNISON_STEM_CLEARANCE_PX.
 */
export function resolveUnisonPair(
  a: UnisonPartInput,
  b: UnisonPartInput
): UnisonPairLayout {
  const [left, right] = a.voiceNumber < b.voiceNumber ? [a, b] : [b, a];

  if (canShareNotehead(a, b)) {
    const [up, down] = a.direction === 'up' ? [a, b] : [b, a];
    const downOffset = headCenterX(up.geometry) - headCenterX(down.geometry);
    return {
      mode: 'shared-head',
      leftVoiceNumber: left.voiceNumber,
      leftOffsetPx: left === down ? downOffset : 0,
      rightOffsetPx: right === down ? downOffset : 0,
      omitsHeadVoiceNumber: down.voiceNumber,
    };
  }

  const clearHeadX = left.geometry.headRightX + UNISON_STEM_CLEARANCE_PX;
  const plainOffset = clearHeadX - right.geometry.headLeftX;
  return {
    mode:
      headClassOf(left.duration) === 'stemless' &&
      headClassOf(right.duration) === 'stemless'
        ? 'stemless'
        : 'separate-stems',
    leftVoiceNumber: left.voiceNumber,
    leftOffsetPx: 0,
    rightOffsetPx: right.shownAccidental
      ? Math.max(
          plainOffset,
          clearHeadX + ACCIDENTAL_SYMBOL_WIDTH[right.shownAccidental]
        )
      : plainOffset,
    omitsHeadVoiceNumber: null,
  };
}

// Ascending chromatic order, flat to sharp; no accidental ranks as natural.
const ACCIDENTAL_RANK: Record<AccidentalType, number> = {
  'double-flat': -2,
  flat: -1,
  natural: 0,
  sharp: 1,
  'double-sharp': 2,
};

export function accidentalChromaticRank(type: AccidentalType | null): number {
  return type === null ? 0 : ACCIDENTAL_RANK[type];
}

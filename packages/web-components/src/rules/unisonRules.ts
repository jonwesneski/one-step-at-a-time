import type {
  AccidentalType,
  BaseDurationType,
  ConventionalAccidentalType,
  VoiceNumber,
} from '../types/theory';
import {
  AUGMENTATION_DOT_SPACING_GAP_PX,
  UNISON_STEM_CLEARANCE_PX,
} from '../utils/notationDimensions';
import {
  accidentalReach,
  baseAccidental,
  quarterToneOf,
} from './accidentalRules';
import type { NoteheadGlyph } from './noteheadRules';
import { isOpenDuration, isStemlessDuration } from './theoryConsts';
import type { VoiceDirection, VoicePartGeometry } from './voiceRules';

export type UnisonHeadClass = 'stemless' | 'open' | 'black';

// One tone of a chord part.
export type UnisonTone = {
  staffY: number;
  pitchAccidental: AccidentalType | null;
  shownAccidental: AccidentalType | null;
  // Where its head sits, in the part's own px.
  headCenterX: number;
  headLeftX: number;
  headRightX: number;
  // Null for the plain oval head.
  notehead?: NoteheadGlyph | null;
};

// What one part contributes at a unison.
export type UnisonPartDescriptor = {
  duration: BaseDurationType;
  // The pitch's own accidental, shown or not.
  pitchAccidental: AccidentalType | null;
  // The accidental actually drawn left of the head, if any.
  shownAccidental: AccidentalType | null;
  // The glyph drawn for the head; null for the plain oval.
  notehead?: NoteheadGlyph | null;
  isChord: boolean;
  // A chord part: one entry per tone, so the tone at the unison is found by
  // staff Y (the fields above are then unused).
  tones?: readonly UnisonTone[];
  // A chord's whole accidental column; replaces the width of one accidental.
  accidentalReachPx?: number;
};

export type UnisonPartInput = UnisonPartDescriptor & {
  voiceNumber: VoiceNumber;
  direction: VoiceDirection;
  dotCount: number;
  geometry: VoicePartGeometry;
  // Every staff Y the part sounds (a chord has several).
  staffYs?: readonly number[];
  // The head at the unison, when it is not the middle of the part's extent.
  headCenterX?: number;
  // Where the part sits (px), so parts that are not on the same x line up.
  originX?: number;
};

const accidentalReachOf = (part: UnisonPartInput): number =>
  part.accidentalReachPx ??
  (part.shownAccidental ? accidentalReach(part.shownAccidental) : 0);

const hasAccidentalShown = (part: UnisonPartInput): boolean =>
  accidentalReachOf(part) > 0;

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
 * (opposite directions), at most one is a chord, and nothing about the head
 * differs: the same glyph, black heads across any black durations, open heads
 * only with open heads, stemless heads never. The note, not the chord, then
 * draws no head of its own.
 */
export function canShareNotehead(
  a: UnisonPartInput,
  b: UnisonPartInput
): boolean {
  if ((a.isChord && b.isChord) || a.direction === b.direction) {
    return false;
  }
  const headClass = headClassOf(a.duration);
  return (
    headClass !== 'stemless' &&
    headClass === headClassOf(b.duration) &&
    a.pitchAccidental === b.pitchAccidental &&
    a.dotCount === b.dotCount &&
    (a.notehead ?? null) === (b.notehead ?? null)
  );
}

const originOf = (part: UnisonPartInput): number => part.originX ?? 0;

// In px from the parts' common origin, not the part's own.
// How far right a part's own ink reaches beside its head: the head, or an
// up-stem's tails.
const rightReachOf = (part: UnisonPartInput): number =>
  Math.max(part.geometry.headRightX, part.geometry.tailRightX ?? -Infinity);

const headCenter = (part: UnisonPartInput): number =>
  originOf(part) +
  (part.headCenterX ??
    (part.geometry.headLeftX + part.geometry.headRightX) / 2);

/**
 * Horizontal placement of two parts that sound the same staff position, each
 * measured from its own `originX`:
 *  - shared head: the down-stem part moves until its head sits on the
 *    up-stem part's, leaving the up-stem on the right and the down-stem on
 *    the left; it draws no head of its own. When the down-stem part sits
 *    further right (it made room for something on its left), the up-stem part
 *    moves right instead, so the head stays clear of both parts' accidentals;
 *  - otherwise the upper part (lower voice number) stays put and the lower
 *    part moves right, never left, until its head, and the accidental it
 *    carries, clear the upper head by UNISON_STEM_CLEARANCE_PX.
 * `allowShare: false` keeps two heads for a part that already shares one.
 */
export function resolveUnisonPair(
  a: UnisonPartInput,
  b: UnisonPartInput,
  allowShare = true
): UnisonPairLayout {
  const [left, right] = a.voiceNumber < b.voiceNumber ? [a, b] : [b, a];

  if (allowShare && canShareNotehead(a, b)) {
    // The note lands on the chord's head; two notes: the down-stem part lands
    // on the up-stem part's.
    const [anchor, mover] = a.isChord
      ? [a, b]
      : b.isChord
      ? [b, a]
      : a.direction === 'up'
      ? [a, b]
      : [b, a];
    const anchorOffset = Math.max(0, originOf(mover) - originOf(anchor));
    const moverOffset = headCenter(anchor) + anchorOffset - headCenter(mover);
    return {
      mode: 'shared-head',
      leftVoiceNumber: left.voiceNumber,
      leftOffsetPx: left === mover ? moverOffset : anchorOffset,
      rightOffsetPx: right === mover ? moverOffset : anchorOffset,
      omitsHeadVoiceNumber: mover.voiceNumber,
    };
  }

  const clearHeadX =
    originOf(left) + rightReachOf(left) + UNISON_STEM_CLEARANCE_PX;
  const plainOffset = clearHeadX - originOf(right) - right.geometry.headLeftX;
  return {
    mode:
      headClassOf(left.duration) === 'stemless' &&
      headClassOf(right.duration) === 'stemless'
        ? 'stemless'
        : 'separate-stems',
    leftVoiceNumber: left.voiceNumber,
    leftOffsetPx: 0,
    rightOffsetPx: Math.max(
      0,
      hasAccidentalShown(right)
        ? Math.max(
            plainOffset,
            clearHeadX + accidentalReachOf(right) - originOf(right)
          )
        : plainOffset
    ),
    omitsHeadVoiceNumber: null,
  };
}

// Ascending chromatic order, flat to sharp; no accidental ranks as natural.
const ACCIDENTAL_RANK: Record<ConventionalAccidentalType, number> = {
  'double-flat': -2,
  flat: -1,
  natural: 0,
  sharp: 1,
  'double-sharp': 2,
};

/** In semitones, a quarter-tone counting half. */
export function accidentalChromaticRank(type: AccidentalType | null): number {
  if (type === null) {
    return 0;
  }
  const quarterTone = quarterToneOf(type);
  const arrow = quarterTone === null ? 0 : quarterTone === 'up' ? 0.5 : -0.5;
  return ACCIDENTAL_RANK[baseAccidental(type)] + arrow;
}

export type UnisonPartRef = { voiceNumber: VoiceNumber; localIndex: number };

export type StemlessCluster = { staffY: number; members: UnisonPartRef[] };

export type UnisonGroupPlacement = UnisonPartRef & {
  staffYCoordinates: readonly number[];
  unison?: UnisonPartDescriptor;
};

/**
 * The parts that sound each shared staff position, topmost first. A part sits
 * in at most one group: the first position it shares with another part.
 */
export function groupUnisonPlacements<
  T extends { staffYCoordinates: readonly number[] }
>(placements: readonly T[]): Map<number, T[]> {
  const groups = new Map<number, T[]>();
  const used = new Set<T>();
  const staffYs = [
    ...new Set(placements.flatMap((placement) => placement.staffYCoordinates)),
  ].sort((a, b) => a - b);
  for (const staffY of staffYs) {
    const members = placements.filter(
      (placement) =>
        !used.has(placement) && placement.staffYCoordinates.includes(staffY)
    );
    if (members.length >= 2) {
      groups.set(staffY, members);
      members.forEach((member) => used.add(member));
    }
  }
  return groups;
}

/**
 * Stemless parts on one staff position whose pitches differ by accidental: a
 * cluster, drawn with a square bracket over its heads.
 */
export function resolveStemlessClusters(
  placements: readonly UnisonGroupPlacement[]
): StemlessCluster[] {
  const clusters: StemlessCluster[] = [];
  for (const [staffY, members] of groupUnisonPlacements(
    placements.filter((placement) => placement.unison)
  )) {
    const allStemless = members.every(
      (part) =>
        !!part.unison && headClassOf(part.unison.duration) === 'stemless'
    );
    const accidentalAt = (
      part: UnisonGroupPlacement
    ): AccidentalType | null => {
      const tone = part.unison?.tones?.find((entry) => entry.staffY === staffY);
      return tone ? tone.pitchAccidental : part.unison?.pitchAccidental ?? null;
    };
    if (allStemless && new Set(members.map(accidentalAt)).size > 1) {
      clusters.push({
        staffY,
        members: members.map(({ voiceNumber, localIndex }) => ({
          voiceNumber,
          localIndex,
        })),
      });
    }
  }
  return clusters;
}

export type AlteredGroupPartLayout = UnisonPartRef & { xOffsetPx: number };

export type AlteredSingleStemLayout = { parts: AlteredGroupPartLayout[] };

type GroupPart = UnisonPartInput & UnisonPartRef;

/**
 * One stemmed part with stemless parts on its staff position, their pitches
 * differing by accidental. Heads run left to right in ascending chromatic
 * order, flat to sharp, the first on the beat, each after its own accidental.
 * Every part draws itself: the stemmed part keeps its own stem on its own
 * head, and no semibreve is joined to it, since a semibreve on a stem reads as
 * a minim. The gap after each head keeps a stem clear of the next head.
 */
export function resolveAlteredSingleStemGroup(
  parts: readonly GroupPart[]
): AlteredSingleStemLayout | null {
  const stemmedCount = parts.filter(
    (part) => headClassOf(part.duration) !== 'stemless'
  ).length;
  if (
    parts.length < 2 ||
    stemmedCount !== 1 ||
    new Set(parts.map((part) => part.pitchAccidental)).size < 2
  ) {
    return null;
  }
  const rank = (part: GroupPart): number =>
    accidentalChromaticRank(part.pitchAccidental);
  const sorted = [...parts].sort(
    (a, b) => rank(a) - rank(b) || a.voiceNumber - b.voiceNumber
  );

  const offsets = new Map<GroupPart, number>();
  offsets.set(sorted[0], 0);
  for (let index = 1; index < sorted.length; index++) {
    const previous = sorted[index - 1];
    const part = sorted[index];
    const previousLeft = originOf(previous) + (offsets.get(previous) ?? 0);
    const edge = Math.max(
      previousLeft + rightReachOf(previous) + UNISON_STEM_CLEARANCE_PX,
      previous.geometry.dotsRightEdgeX === null
        ? -Infinity
        : previousLeft +
            previous.geometry.dotsRightEdgeX +
            AUGMENTATION_DOT_SPACING_GAP_PX
    );
    const target = hasAccidentalShown(part)
      ? Math.max(edge - part.geometry.headLeftX, edge + accidentalReachOf(part))
      : edge - part.geometry.headLeftX;
    offsets.set(part, Math.max(0, target - originOf(part)));
  }

  return {
    parts: sorted.map((part) => ({
      voiceNumber: part.voiceNumber,
      localIndex: part.localIndex,
      xOffsetPx: offsets.get(part) ?? 0,
    })),
  };
}

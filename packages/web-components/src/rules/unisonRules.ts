import type {
  AccidentalType,
  BaseDurationType,
  VoiceNumber,
} from '../types/theory';
import {
  ACCIDENTAL_SYMBOL_WIDTH,
  AUGMENTATION_DOT_SPACING_GAP_PX,
  DIAGONAL_STEM_JOIN_CLEARANCE_PX,
  FLAG_STEM_STEP_PX,
  PRONG_LIFT_PX,
  UNISON_STEM_CLEARANCE_PX,
} from '../utils/notationDimensions';
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
  // The unison moves this tone alone, leaving the chord's other tones put:
  // only possible while its stem, if any, stays with the others.
  movesAlone: boolean;
};

// What one part contributes at a unison.
export type UnisonPartDescriptor = {
  duration: BaseDurationType;
  // The pitch's own accidental, shown or not.
  pitchAccidental: AccidentalType | null;
  // The accidental actually drawn left of the head, if any.
  shownAccidental: AccidentalType | null;
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
};

const accidentalReachOf = (part: UnisonPartInput): number =>
  part.accidentalReachPx ??
  (part.shownAccidental ? ACCIDENTAL_SYMBOL_WIDTH[part.shownAccidental] : 0);

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
 * differs: black heads share across any black durations, open heads only with
 * open heads, stemless heads never. The note, not the chord, then draws no
 * head of its own.
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
    a.dotCount === b.dotCount
  );
}

const headCenter = (part: UnisonPartInput): number =>
  part.headCenterX ?? (part.geometry.headLeftX + part.geometry.headRightX) / 2;

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
    // The note lands on the chord's head; two notes: the down-stem part lands
    // on the up-stem part's.
    const [anchor, mover] = a.isChord
      ? [a, b]
      : b.isChord
      ? [b, a]
      : a.direction === 'up'
      ? [a, b]
      : [b, a];
    const moverOffset = headCenter(anchor) - headCenter(mover);
    return {
      mode: 'shared-head',
      leftVoiceNumber: left.voiceNumber,
      leftOffsetPx: left === mover ? moverOffset : 0,
      rightOffsetPx: right === mover ? moverOffset : 0,
      omitsHeadVoiceNumber: mover.voiceNumber,
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
    rightOffsetPx: hasAccidentalShown(right)
      ? Math.max(plainOffset, clearHeadX + accidentalReachOf(right))
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

export type UnisonPartRef = { voiceNumber: VoiceNumber; localIndex: number };

export type UnisonStemGroup =
  | {
      kind: 'single-stem';
      staffY: number;
      owner: UnisonPartRef;
      others: UnisonPartRef[];
    }
  | { kind: 'stemless-cluster'; staffY: number; members: UnisonPartRef[] };

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
 * The unison groups in one beat column that need stem or bracket drawing:
 *  - one stemmed part with stemless parts on its staff position share that
 *    part's stem;
 *  - stemless parts whose pitches differ by accidental are a cluster and get
 *    a square bracket.
 */
export function resolveUnisonStemGroups(
  placements: readonly UnisonGroupPlacement[]
): UnisonStemGroup[] {
  const groups: UnisonStemGroup[] = [];
  for (const [staffY, members] of groupUnisonPlacements(
    placements.filter((placement) => placement.unison)
  )) {
    const isStemless = (part: UnisonGroupPlacement): boolean =>
      !!part.unison && headClassOf(part.unison.duration) === 'stemless';
    const stemmed = members.filter((part) => !isStemless(part));
    const stemless = members.filter(isStemless);
    const ref = ({ voiceNumber, localIndex }: UnisonGroupPlacement) => ({
      voiceNumber,
      localIndex,
    });
    const accidentalAt = (
      part: UnisonGroupPlacement
    ): AccidentalType | null => {
      const tone = part.unison?.tones?.find((entry) => entry.staffY === staffY);
      return tone ? tone.pitchAccidental : part.unison?.pitchAccidental ?? null;
    };
    if (stemmed.length === 1 && stemless.length >= 1) {
      groups.push({
        kind: 'single-stem',
        staffY,
        owner: ref(stemmed[0]),
        others: stemless.map(ref),
      });
    } else if (
      stemmed.length === 0 &&
      new Set(stemless.map(accidentalAt)).size > 1
    ) {
      groups.push({
        kind: 'stemless-cluster',
        staffY,
        members: stemless.map(ref),
      });
    }
  }
  return groups;
}

export type UnisonStemSegment = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

/**
 * The diagonal that joins a displaced head to a single stem: it leaves the
 * vertical stem near its far end (past the tails or beams, which stay on the
 * vertical stem) and runs to the head's far edge on the stem's side of it (top
 * for an up-stem, bottom for a down-stem), so it passes above an up-stem
 * head's accidental and below a down-stem head's.
 */
export function resolveUnisonDiagonal({
  stemUp,
  stemX,
  stemTipY,
  flagCount,
  headFarEdgeX,
  headCenterY,
  headHalfHeight,
}: {
  stemUp: boolean;
  stemX: number;
  stemTipY: number;
  flagCount: number;
  headFarEdgeX: number;
  headCenterY: number;
  headHalfHeight: number;
}): UnisonStemSegment {
  const joinDrop =
    DIAGONAL_STEM_JOIN_CLEARANCE_PX + flagCount * FLAG_STEM_STEP_PX;
  return {
    fromX: stemX,
    fromY: stemUp ? stemTipY + joinDrop : stemTipY - joinDrop,
    toX: headFarEdgeX,
    toY: stemUp ? headCenterY - headHalfHeight : headCenterY + headHalfHeight,
  };
}

export type AlteredGroupPartLayout = UnisonPartRef & { xOffsetPx: number };

export type AlteredSingleStemLayout = {
  // 'prong' for two heads that are notes, 'diagonal' otherwise.
  shape: 'prong' | 'diagonal';
  parts: AlteredGroupPartLayout[];
  owner: UnisonPartRef;
  // Where the owner's stem moves from its own, and how far its base lifts.
  stemShiftPx: number;
  stemLiftPx: number;
  // The stem is at the last head and the others run to its left.
  mirrored: boolean;
};

type GroupPart = UnisonPartInput & UnisonPartRef;

// Free horizontal room (px) beside a unison's column, from its beat x.
export type UnisonRoom = { beforePx: number; afterPx: number };

/**
 * A single-stem unison whose heads differ by accidental. Heads run left to
 * right in ascending chromatic order, flat to sharp, each after its own
 * accidental; the first stays on the beat and carries the stem, which the
 * other heads reach by diagonals. Two heads that are notes instead fork from
 * one stem centred over both, its base lifted (a prong). The one stemmed part
 * draws that stem, shifted off its own head; a stemmed chord, whose stem
 * cannot leave its heads, always takes the stem's place in the order.
 *
 * When the room after the column is too small for the heads but the room
 * before it is larger, the order is mirrored: the last head stays on the beat
 * with the stem, and the others run to its left.
 */
export function resolveAlteredSingleStemGroup(
  parts: readonly GroupPart[],
  room?: UnisonRoom
): AlteredSingleStemLayout | null {
  const owners = parts.filter(
    (part) => headClassOf(part.duration) !== 'stemless'
  );
  if (
    parts.length < 2 ||
    owners.length !== 1 ||
    new Set(parts.map((part) => part.pitchAccidental)).size < 2
  ) {
    return null;
  }
  const owner = owners[0];
  const rank = (part: GroupPart): number =>
    accidentalChromaticRank(part.pitchAccidental);
  const byChromaticOrder = [...parts].sort(
    (a, b) => rank(a) - rank(b) || a.voiceNumber - b.voiceNumber
  );
  const stemUp = owner.direction === 'up';
  const prong = parts.length === 2 && parts.every((part) => !part.isChord);

  const layoutFor = (mirrored: boolean) => {
    let sorted = byChromaticOrder;
    if (owner.isChord) {
      const rest = byChromaticOrder.filter((part) => part !== owner);
      sorted = mirrored ? [...rest, owner] : [owner, ...rest];
    }
    const offsets = new Map<UnisonPartRef, number>();
    // How far right of its own origin a part's heads and dots reach.
    const rightLocal = (part: GroupPart): number =>
      Math.max(
        part.geometry.headRightX,
        part.geometry.dotsRightEdgeX === null
          ? -Infinity
          : part.geometry.dotsRightEdgeX +
              AUGMENTATION_DOT_SPACING_GAP_PX -
              UNISON_STEM_CLEARANCE_PX
      );

    if (mirrored) {
      const last = sorted[sorted.length - 1];
      offsets.set(last, 0);
      for (let index = sorted.length - 2; index >= 0; index--) {
        const next = sorted[index + 1];
        const nextOffset = offsets.get(next) ?? 0;
        const boundary = hasAccidentalShown(next)
          ? nextOffset - accidentalReachOf(next)
          : nextOffset + next.geometry.headLeftX;
        offsets.set(
          sorted[index],
          boundary - UNISON_STEM_CLEARANCE_PX - rightLocal(sorted[index])
        );
      }
    } else {
      offsets.set(sorted[0], 0);
      for (let index = 1; index < sorted.length; index++) {
        const previous = sorted[index - 1];
        const part = sorted[index];
        const previousOffset = offsets.get(previous) ?? 0;
        const edge = Math.max(
          previousOffset +
            previous.geometry.headRightX +
            UNISON_STEM_CLEARANCE_PX,
          previous.geometry.dotsRightEdgeX === null
            ? -Infinity
            : previousOffset +
                previous.geometry.dotsRightEdgeX +
                AUGMENTATION_DOT_SPACING_GAP_PX
        );
        offsets.set(
          part,
          hasAccidentalShown(part)
            ? Math.max(
                edge - part.geometry.headLeftX,
                edge + accidentalReachOf(part)
              )
            : edge - part.geometry.headLeftX
        );
      }
    }

    const stemHead = mirrored ? sorted[sorted.length - 1] : sorted[0];
    const centerOf = (part: GroupPart): number =>
      (offsets.get(part) ?? 0) + headCenter(part);
    const stemX = prong
      ? (centerOf(sorted[0]) + centerOf(sorted[1])) / 2
      : (offsets.get(stemHead) ?? 0) +
        (stemUp ? stemHead.geometry.headRightX : stemHead.geometry.headLeftX);
    const rightExtent = Math.max(
      ...sorted.map((part) => (offsets.get(part) ?? 0) + rightLocal(part))
    );
    return { sorted, offsets, stemX, rightExtent };
  };

  let mirrored = false;
  let layout = layoutFor(false);
  if (
    room &&
    room.beforePx > room.afterPx &&
    room.afterPx < layout.rightExtent
  ) {
    mirrored = true;
    layout = layoutFor(true);
  }

  const ownStemX =
    (layout.offsets.get(owner) ?? 0) +
    (owner.geometry.stemX ?? owner.geometry.headRightX);

  return {
    shape: prong ? 'prong' : 'diagonal',
    parts: layout.sorted.map((part) => ({
      voiceNumber: part.voiceNumber,
      localIndex: part.localIndex,
      xOffsetPx: layout.offsets.get(part) ?? 0,
    })),
    owner: { voiceNumber: owner.voiceNumber, localIndex: owner.localIndex },
    stemShiftPx: layout.stemX - ownStemX,
    stemLiftPx: prong ? PRONG_LIFT_PX : 0,
    mirrored,
  };
}

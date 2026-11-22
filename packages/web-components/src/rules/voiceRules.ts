import { VoiceNumber } from '../types/theory';
import {
  ACCIDENTAL_SYMBOL_WIDTH,
  AUGMENTATION_DOT_SPACING_GAP_PX,
  CROSSED_VOICE_CLEARANCE_PX,
  STAFF_Y_STEP,
} from '../utils/notationDimensions';
import {
  ADJACENT_NOTE_X_DISPLACEMENT_PX,
  OPPOSITE_STEM_ALIGN_OFFSET_PX,
} from '../utils/svgCreator/note';
import {
  resolveChordDotStaffYs,
  resolveNoteDotStaffY,
  resolveUnisonDotStaffYs,
} from './augmentationDotRules';
import {
  canShareNotehead,
  groupUnisonPlacements,
  headClassOf,
  resolveAlteredSingleStemGroup,
  resolveUnisonPair,
  type UnisonPartDescriptor,
  type UnisonPartInput,
} from './unisonRules';

export type VoiceDirection = 'up' | 'down';

// One voice's element at a given beat-offset (whole-note fraction, shared
// coordinate space across every voice), with its resolved staff-Y tones —
// the minimal shape resolveMiddleVoiceDirection needs to compare voices
// without depending on staffNotationBase.ts's own element/render types.
export type VoiceDirectionInput = {
  staffYs: readonly number[];
  beatOffset: number;
};

/**
 * Voice 1 always stems up and voice 2 down, whatever the pitch; voice 3 is
 * contextual (resolveMiddleVoiceDirection). `staffYsByVoice` is read only
 * with three voices.
 */
export function resolveVoiceDirections(
  voiceNumbers: readonly VoiceNumber[],
  staffYsByVoice?: ReadonlyMap<VoiceNumber, readonly VoiceDirectionInput[]>
): ReadonlyMap<VoiceNumber, VoiceDirection> {
  const result = new Map<VoiceNumber, VoiceDirection>();
  for (const voiceNumber of voiceNumbers) {
    if (voiceNumber === 1) {
      result.set(voiceNumber, 'up');
    } else if (voiceNumber === 2) {
      result.set(voiceNumber, 'down');
    } else {
      result.set(
        voiceNumber,
        resolveMiddleVoiceDirection(
          staffYsByVoice?.get(3) ?? [],
          staffYsByVoice?.get(1) ?? [],
          staffYsByVoice?.get(2) ?? []
        )
      );
    }
  }
  return result;
}

/**
 * Voice 3's direction for one measure. For each of its elements, the
 * nearest-by-beat voice-1 and voice-2 elements are compared, and voice 3
 * leans away from the closer one (near voice 1: down; near voice 2: up). The
 * majority holds for the whole measure; ties go 'down'.
 */
export function resolveMiddleVoiceDirection(
  voice3: readonly VoiceDirectionInput[],
  voice1: readonly VoiceDirectionInput[],
  voice2: readonly VoiceDirectionInput[]
): VoiceDirection {
  let upVotes = 0;
  let downVotes = 0;

  for (const entry of voice3) {
    const nearest1 = nearestByBeatOffset(voice1, entry.beatOffset);
    const nearest2 = nearestByBeatOffset(voice2, entry.beatOffset);
    const gapToVoice1 = nearest1
      ? closestCollision(entry.staffYs, nearest1.staffYs)?.distance ?? Infinity
      : Infinity;
    const gapToVoice2 = nearest2
      ? closestCollision(entry.staffYs, nearest2.staffYs)?.distance ?? Infinity
      : Infinity;

    if (gapToVoice2 < gapToVoice1) {
      upVotes++;
    } else {
      downVotes++;
    }
  }

  return upVotes > downVotes ? 'up' : 'down';
}

// The closest-by-beat-offset entry in `entries` to `beatOffset` — how
// resolveMiddleVoiceDirection finds which voice-1/voice-2 element is
// concurrently sounding with a given voice-3 element.
function nearestByBeatOffset(
  entries: readonly VoiceDirectionInput[],
  beatOffset: number
): VoiceDirectionInput | null {
  let best: VoiceDirectionInput | null = null;
  let bestDistance = Infinity;
  for (const entry of entries) {
    const distance = Math.abs(entry.beatOffset - beatOffset);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = entry;
    }
  }
  return best;
}

// Element-local px of one part, before any cross-voice offset.
export type VoicePartGeometry = {
  headLeftX: number;
  headRightX: number;
  // null for a stemless value.
  stemX: number | null;
  // Right ink edge of its own dot row, or null when undotted.
  dotsRightEdgeX: number | null;
  // Right ink edge of an unbeamed up-stem's tails, which reach past the head.
  tailRightX?: number | null;
};

export type VoiceNoteheadPlacement = {
  voiceNumber: VoiceNumber;
  localIndex: number;
  staffYCoordinates: readonly number[];
  direction: VoiceDirection;
  hasFlagOrBeam: boolean;
  dotCount?: number;
  // Without it, dots never move a part.
  geometry?: VoicePartGeometry;
  // Without it (or without geometry) a unison keeps the symmetric nudge.
  unison?: UnisonPartDescriptor;
  // Where the part sits (px, any origin shared by the column): voices are
  // spaced separately, so one may sit further right than another.
  x?: number;
};

export type VoiceNoteheadDisplacement = {
  voiceNumber: VoiceNumber;
  localIndex: number;
  xOffset: number;
  isUnison: boolean;
  // Shared head: this part draws no head of its own.
  omitsHead: boolean;
  // Stemless heads that overlap or cross another part's: drawn as separate
  // heads, though stemmed notes would show the part progression better.
  overlappingSemibreves: boolean;
};

/**
 * Resolves horizontal displacement for all voices' notes/chords sharing one
 * beat-offset column:
 *  - an exact unison between two voices adjacent by voice number — see
 *    rules/unisonRules.ts#resolveUnisonPair: a shared head with two stems, or
 *    two heads with the upper part kept on the beat x. A part shares at most
 *    one head, so a third part keeps its own head beside the shared one;
 *  - a second between an up-stem and a down-stem part (either above the
 *    other) — the up-stem part stays left and the down-stem part moves right
 *    until the two stems share one x;
 *  - a second between two parts resolved to the same direction (only
 *    reachable with a 3rd voice) — the physically lower notehead moves right
 *    by the full displacement, unless it has a flag/beam (then the plain
 *    notehead moves instead);
 *  - crossed parts further apart (an up-stem part below a down-stem one) —
 *    the up-stem part moves right until neither stem crosses the other
 *    part's head, and its stem stays clear of the other part's dots;
 *  - otherwise — no displacement.
 * On top of that, when the left part of a unison or second is dotted and its
 * dot would sit against the right part's head, the right part moves further
 * so the dot separates the two parts.
 */
export function computeCrossVoiceDisplacements(
  placements: readonly VoiceNoteheadPlacement[]
): VoiceNoteheadDisplacement[] {
  const offsets = new Map<VoiceNoteheadPlacement, number>();
  const unisons = new Set<VoiceNoteheadPlacement>();
  const headless = new Set<VoiceNoteheadPlacement>();
  const groupOf = new Map<VoiceNoteheadPlacement, number>();
  const overlappingSemibreves = new Set<VoiceNoteheadPlacement>();
  const sharesHead = new Set<VoiceNoteheadPlacement>();
  const halfDisplacement = ADJACENT_NOTE_X_DISPLACEMENT_PX / 2;
  const dotRows = resolveCrossVoiceDotRows(placements);
  const dotShifts = new Set(
    dotRows
      .filter((rows) => rows.columnShiftPx > 0)
      .map((rows) =>
        placements.find(
          (placement) =>
            placement.voiceNumber === rows.voiceNumber &&
            placement.localIndex === rows.localIndex
        )
      )
      .filter((placement): placement is VoiceNoteheadPlacement => !!placement)
  );
  const rowsOf = (placement: VoiceNoteheadPlacement): number[] =>
    dotRows.find(
      (rows) =>
        rows.voiceNumber === placement.voiceNumber &&
        rows.localIndex === placement.localIndex
    )?.rowStaffYs ?? [];
  const accidentalReach = (input: UnisonPartInput): number =>
    input.accidentalReachPx ??
    (input.shownAccidental
      ? ACCIDENTAL_SYMBOL_WIDTH[input.shownAccidental]
      : 0);
  const dotsFollowGroup = (placement: VoiceNoteheadPlacement): boolean =>
    dotShifts.has(placement);
  const addOffset = (placement: VoiceNoteheadPlacement, offset: number) => {
    offsets.set(placement, (offsets.get(placement) ?? 0) + offset);
  };
  const offsetOf = (placement: VoiceNoteheadPlacement): number =>
    offsets.get(placement) ?? 0;
  // The part's position so far: where it sits plus what it has moved.
  const unisonInputAt = (
    placement: VoiceNoteheadPlacement,
    staffY: number
  ): UnisonPartInput | null =>
    toUnisonInput(placement, staffY, offsetOf(placement));
  // Pushes `right` far enough that `left`'s dots sit between the two heads.
  const separateByDots = (
    left: VoiceNoteheadPlacement,
    right: VoiceNoteheadPlacement,
    rightAccidentalReachPx = 0
  ) => {
    const leftDotsRight = left.geometry?.dotsRightEdgeX ?? null;
    if (leftDotsRight === null || !right.geometry) {
      return;
    }
    const rows = rowsOf(left);
    const touches = rows.some((row) =>
      right.staffYCoordinates.some((y) => Math.abs(row - y) <= STAFF_Y_STEP)
    );
    // The right part's accidental is as tall as a few stave spaces, so it
    // sits in the dots' way whatever row they are on.
    if (!touches && !(rightAccidentalReachPx > 0 && rows.length > 0)) {
      return;
    }
    const needed =
      (left.x ?? 0) +
      offsetOf(left) +
      leftDotsRight +
      AUGMENTATION_DOT_SPACING_GAP_PX +
      (rightAccidentalReachPx > 0
        ? rightAccidentalReachPx
        : -right.geometry.headLeftX) -
      (right.x ?? 0);
    const current = offsetOf(right);
    if (needed > current) {
      addOffset(right, needed - current);
    }
  };

  let groupIndex = 0;
  for (const [staffY, members] of groupUnisonPlacements(
    placements.filter((placement) =>
      toUnisonInput(placement, placement.staffYCoordinates[0])
    )
  )) {
    const layout = resolveAlteredSingleStemGroup(
      members.flatMap((member) => {
        const input = toUnisonInput(member, staffY);
        return input ? [{ ...input, localIndex: member.localIndex }] : [];
      })
    );
    if (!layout) {
      continue;
    }
    groupIndex++;
    for (const part of layout.parts) {
      const member = members.find(
        (candidate) =>
          candidate.voiceNumber === part.voiceNumber &&
          candidate.localIndex === part.localIndex
      );
      if (!member) {
        continue;
      }
      addOffset(member, part.xOffsetPx);
      unisons.add(member);
      groupOf.set(member, groupIndex);
    }
  }

  // Voice order, so a unison's adjacent pairs resolve left to right.
  const ordered = [...placements].sort((a, b) => a.voiceNumber - b.voiceNumber);
  for (let i = 0; i < ordered.length; i++) {
    for (let j = i + 1; j < ordered.length; j++) {
      const a = ordered[i];
      const b = ordered[j];

      const collision = closestCollision(
        a.staffYCoordinates,
        b.staffYCoordinates
      );
      if (collision === null) {
        continue;
      }

      if (
        collision.distance === 0 &&
        isStemless(a) &&
        isStemless(b) &&
        !groupOf.has(a)
      ) {
        overlappingSemibreves.add(a);
        overlappingSemibreves.add(b);
      }

      if (collision.distance === 0) {
        if (groupOf.has(a) && groupOf.get(a) === groupOf.get(b)) {
          continue;
        }
        const between = ordered
          .slice(i + 1, j)
          .some((other) => other.staffYCoordinates.includes(collision.aY));
        if (between) {
          continue;
        }
        const aInput = unisonInputAt(a, collision.aY);
        const bInput = unisonInputAt(b, collision.bY);
        if (aInput && bInput) {
          const layout = resolveUnisonPair(
            aInput,
            bInput,
            !sharesHead.has(a) && !sharesHead.has(b)
          );
          const [left, right] = a.voiceNumber < b.voiceNumber ? [a, b] : [b, a];
          addOffset(left, layout.leftOffsetPx);
          addOffset(right, layout.rightOffsetPx);
          if (layout.omitsHeadVoiceNumber !== null) {
            headless.add(
              layout.omitsHeadVoiceNumber === left.voiceNumber ? left : right
            );
            sharesHead.add(left);
            sharesHead.add(right);
          }
          unisons.add(left);
          unisons.add(right);
          if (layout.mode !== 'shared-head' && !dotsFollowGroup(left)) {
            separateByDots(
              left,
              right,
              aInput.voiceNumber === right.voiceNumber
                ? accidentalReach(aInput)
                : accidentalReach(bInput)
            );
          }
          continue;
        }
        // No geometry to measure: both heads nudged symmetrically apart,
        // lower voice number to the left.
        const [left, right] = a.voiceNumber < b.voiceNumber ? [a, b] : [b, a];
        addOffset(left, -halfDisplacement);
        addOffset(right, halfDisplacement);
        unisons.add(left);
        unisons.add(right);
        separateByDots(left, right);
        continue;
      }

      if (collision.distance === STAFF_Y_STEP && a.direction !== b.direction) {
        const [up, down] = a.direction === 'up' ? [a, b] : [b, a];
        const upY = up === a ? collision.aY : collision.bY;
        const downY = up === a ? collision.bY : collision.aY;
        if (isStemless(up) || isStemless(down)) {
          if (upY > downY) {
            overlappingSemibreves.add(up);
            overlappingSemibreves.add(down);
          }
          const [first, second] = upY > downY ? [down, up] : [up, down];
          addOffset(second, ADJACENT_NOTE_X_DISPLACEMENT_PX);
          separateByDots(first, second);
          continue;
        }
        // An up-stem part a step below the down-stem part overlaps it: the
        // down-stem part stays left, unless only the up-stem part is dotted
        // (its dot then separates the two) or both are (they may overlap).
        const upDots = up.dotCount ?? 0;
        if (upY > downY && upDots === 0) {
          addOffset(up, ADJACENT_NOTE_X_DISPLACEMENT_PX);
          separateByDots(down, up);
          continue;
        }
        addOffset(down, OPPOSITE_STEM_ALIGN_OFFSET_PX);
        separateByDots(up, down);
        continue;
      }

      if (collision.distance === STAFF_Y_STEP) {
        // Same-direction diatonic second: the physically lower notehead
        // (larger staffY) moves right, unless it has a flag/beam — then
        // the other (plain) notehead moves instead.
        const aIsLower = collision.aY > collision.bY;
        let mover = aIsLower ? a : b;
        const other = mover === a ? b : a;
        if (mover.hasFlagOrBeam && !other.hasFlagOrBeam) {
          mover = other;
        }
        addOffset(mover, ADJACENT_NOTE_X_DISPLACEMENT_PX);
        continue;
      }

      if (a.direction !== b.direction) {
        const [up, down] = a.direction === 'up' ? [a, b] : [b, a];
        const offset = crossedPartOffset(up, down);
        if (offset > 0) {
          addOffset(up, offset);
        }
      }
    }
  }

  return [...offsets].map(([placement, xOffset]) => ({
    voiceNumber: placement.voiceNumber,
    localIndex: placement.localIndex,
    xOffset,
    isUnison: unisons.has(placement),
    omitsHead: headless.has(placement),
    overlappingSemibreves: overlappingSemibreves.has(placement),
  }));
}

const isStemless = (placement: VoiceNoteheadPlacement): boolean =>
  !!placement.unison && headClassOf(placement.unison.duration) === 'stemless';

// The part as it sounds at one staff position: a chord part's accidental,
// notehead and head centre there come from its tone at that Y; the chord
// still moves as a unit, so its whole extent is measured.
function toUnisonInput(
  placement: VoiceNoteheadPlacement,
  staffY: number,
  offsetPx = 0
): UnisonPartInput | null {
  if (!placement.unison || !placement.geometry) {
    return null;
  }
  const tone = placement.unison.tones?.find((entry) => entry.staffY === staffY);
  return {
    ...placement.unison,
    ...(tone
      ? {
          pitchAccidental: tone.pitchAccidental,
          shownAccidental: tone.shownAccidental,
          headCenterX: tone.headCenterX,
          notehead: tone.notehead ?? null,
        }
      : {}),
    staffYs: placement.staffYCoordinates,
    voiceNumber: placement.voiceNumber,
    direction: placement.direction,
    dotCount: placement.dotCount ?? 0,
    geometry: placement.geometry,
    originX: (placement.x ?? 0) + offsetPx,
  };
}

function isAlteredUnison(
  a: VoiceNoteheadPlacement,
  b: VoiceNoteheadPlacement,
  staffY: number
): boolean {
  const aInput = toUnisonInput(a, staffY);
  const bInput = toUnisonInput(b, staffY);
  return (
    !!aInput && !!bInput && aInput.pitchAccidental !== bInput.pitchAccidental
  );
}

// A unison where only the upper part is dotted: its dot sits after the whole
// group, in its own row (the space above a line), which is what ties it to the
// upper note. The shift is how far past its own head that column starts.
function resolveUnisonDotShifts(
  placements: readonly VoiceNoteheadPlacement[]
): Map<VoiceNoteheadPlacement, number> {
  const shifts = new Map<VoiceNoteheadPlacement, number>();
  for (const dotted of placements) {
    for (const other of placements) {
      if (
        dotted === other ||
        (dotted.dotCount ?? 0) === 0 ||
        (other.dotCount ?? 0) > 0 ||
        dotted.voiceNumber > other.voiceNumber ||
        dotted.staffYCoordinates.length !== 1 ||
        other.staffYCoordinates.length !== 1 ||
        dotted.staffYCoordinates[0] !== other.staffYCoordinates[0]
      ) {
        continue;
      }
      const dottedInput = toUnisonInput(dotted, dotted.staffYCoordinates[0]);
      const otherInput = toUnisonInput(other, other.staffYCoordinates[0]);
      if (!dottedInput || !otherInput) {
        continue;
      }
      // A single-stem group with accidentals dots each head after itself.
      if (
        isAlteredUnison(dotted, other, dotted.staffYCoordinates[0]) &&
        (headClassOf(dottedInput.duration) === 'stemless' ||
          headClassOf(otherInput.duration) === 'stemless')
      ) {
        continue;
      }
      const layout = resolveUnisonPair(dottedInput, otherInput);
      shifts.set(
        dotted,
        (other.x ?? 0) +
          layout.rightOffsetPx +
          otherInput.geometry.headRightX -
          (dotted.x ?? 0) -
          dottedInput.geometry.headRightX
      );
    }
  }
  return shifts;
}

// Dot rows for two equally dotted single-note parts on one staff position:
// a shared head is one note and dots like one; two heads take one dot each, in
// a column after the right head, in separate stave spaces. Null for chord parts.
function resolveUnisonDotRows(
  left: VoiceNoteheadPlacement,
  right: VoiceNoteheadPlacement
): { left: number[]; right: number[] } | null {
  if (
    left.staffYCoordinates.length !== 1 ||
    right.staffYCoordinates.length !== 1
  ) {
    return null;
  }
  const [staffY] = left.staffYCoordinates;
  const leftInput = toUnisonInput(left, staffY);
  const rightInput = toUnisonInput(right, staffY);
  if (leftInput && rightInput && canShareNotehead(leftInput, rightInput)) {
    return { left: [resolveNoteDotStaffY(staffY)], right: [] };
  }
  return { left: [], right: resolveUnisonDotStaffYs(staffY, 2) };
}

// How far an up-stem part sitting below a down-stem part must move right so
// neither stem runs through the other head and its stem doesn't come
// between the down-stem part's head and dots. 0 when the parts don't cross.
function crossedPartOffset(
  up: VoiceNoteheadPlacement,
  down: VoiceNoteheadPlacement
): number {
  if (
    !up.geometry ||
    !down.geometry ||
    Math.max(...up.staffYCoordinates) <= Math.min(...down.staffYCoordinates)
  ) {
    return 0;
  }
  const needs: number[] = [];
  if (up.geometry.stemX !== null) {
    needs.push(
      down.geometry.headRightX + CROSSED_VOICE_CLEARANCE_PX - up.geometry.stemX
    );
    if (down.geometry.dotsRightEdgeX !== null) {
      needs.push(
        down.geometry.dotsRightEdgeX +
          CROSSED_VOICE_CLEARANCE_PX -
          up.geometry.stemX
      );
    }
  }
  if (down.geometry.stemX !== null) {
    needs.push(
      down.geometry.stemX + CROSSED_VOICE_CLEARANCE_PX - up.geometry.headLeftX
    );
  }
  return Math.max(0, ...needs);
}

export type VoiceDotRows = {
  voiceNumber: VoiceNumber;
  localIndex: number;
  // Staff Ys of the dot rows this part draws; empty when another part draws
  // its dots for it.
  rowStaffYs: number[];
  // Px to move this part's dot column right, past the other part's head.
  columnShiftPx: number;
};

/**
 * Dot rows for every dotted part in one beat column of 2+ voices:
 *  - the lowest down-stem part drops a line-tone bottom note's dot to the
 *    space below, so it can't be read as the upper part's;
 *  - when both parts of a unison or second carry the same dots, one aligned
 *    column after the right-hand part draws them all (the left part draws
 *    none);
 *  - otherwise each part keeps its own column.
 */
export function resolveCrossVoiceDotRows(
  placements: readonly VoiceNoteheadPlacement[]
): VoiceDotRows[] {
  const dotted = placements.filter((p) => (p.dotCount ?? 0) > 0);
  if (dotted.length === 0 || placements.length < 2) {
    return [];
  }
  const lowestY = Math.max(...placements.flatMap((p) => p.staffYCoordinates));
  const isLowestDownPart = (placement: VoiceNoteheadPlacement): boolean =>
    placement.direction === 'down' &&
    Math.max(...placement.staffYCoordinates) === lowestY;

  const rows = new Map<VoiceNoteheadPlacement, number[]>(
    dotted.map((placement) => [
      placement,
      resolveChordDotStaffYs(placement.staffYCoordinates, {
        lowestLineToneBelow: isLowestDownPart(placement),
      }),
    ])
  );

  for (let i = 0; i < dotted.length; i++) {
    for (let j = i + 1; j < dotted.length; j++) {
      const a = dotted[i];
      const b = dotted[j];
      const collision = closestCollision(
        a.staffYCoordinates,
        b.staffYCoordinates
      );
      if (
        collision === null ||
        collision.distance > STAFF_Y_STEP ||
        a.dotCount !== b.dotCount ||
        (collision.distance === STAFF_Y_STEP && a.direction === b.direction)
      ) {
        continue;
      }
      const [left, right] =
        collision.distance === 0
          ? a.voiceNumber < b.voiceNumber
            ? [a, b]
            : [b, a]
          : a.direction === 'up'
          ? [a, b]
          : [b, a];
      if (collision.distance === 0) {
        if (isAlteredUnison(left, right, collision.aY)) {
          // Different pitches: each head keeps its own dot after it.
          continue;
        }
        const unisonRows = resolveUnisonDotRows(left, right);
        if (unisonRows) {
          rows.set(left, unisonRows.left);
          rows.set(right, unisonRows.right);
          continue;
        }
      }
      const union = [...left.staffYCoordinates, ...right.staffYCoordinates];
      rows.set(left, []);
      rows.set(
        right,
        resolveChordDotStaffYs(union, {
          lowestLineToneBelow:
            isLowestDownPart(right) || isLowestDownPart(left),
        })
      );
    }
  }

  const shifts = resolveUnisonDotShifts(placements);
  return [...rows].map(([placement, rowStaffYs]) => ({
    voiceNumber: placement.voiceNumber,
    localIndex: placement.localIndex,
    rowStaffYs,
    columnShiftPx: shifts.get(placement) ?? 0,
  }));
}

// The closest (smallest-distance) pair of staffY values between two
// placements' tone sets — this is what determines whether two chords collide
// at all, and by how much, without needing every tone to line up.
function closestCollision(
  aYs: readonly number[],
  bYs: readonly number[]
): { distance: number; aY: number; bY: number } | null {
  let best: { distance: number; aY: number; bY: number } | null = null;
  for (const aY of aYs) {
    for (const bY of bYs) {
      const distance = Math.abs(aY - bY);
      if (best === null || distance < best.distance) {
        best = { distance, aY, bY };
      }
    }
  }
  return best;
}

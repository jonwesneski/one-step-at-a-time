import { VoiceNumber } from '../types/theory';
import { ADJACENT_NOTE_X_DISPLACEMENT_PX } from '../utils/svgCreator/note';
import { STAFF_Y_STEP } from '../utils/notationDimensions';

export type VoiceDirection = 'up' | 'down';

// One voice's element at a given beat-offset (whole-note fraction, shared
// coordinate space across every voice), with its resolved staff-Y tones —
// the minimal shape resolveMiddleVoiceDirection needs to compare voices
// without depending on staffClassicalBase.ts's own element/render types.
export type VoiceDirectionInput = {
  staffYs: readonly number[];
  beatOffset: number;
};

/**
 * Voice 1 (top) always stems up, voice 2 (bottom) always stems down —
 * unconditionally, not pitch-driven. Voice 3 (middle, only reachable with
 * all three voices active) is contextual — see resolveMiddleVoiceDirection.
 * This is what distinguishes multi-voice stem direction from the
 * pitch-driven single-voice logic in staffNoteRules.ts#determineStemDirections,
 * which is untouched and still used whenever only one voice is active.
 *
 * `staffYsByVoice` is only read for a 3-voice call — omit it (or call with
 * only 1-2 voice numbers) and the 1/2-voice behavior is unchanged.
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
 * Contextual middle-voice (voice 3) direction for one measure: for each of
 * voice 3's own elements, finds the concurrently-sounding voice-1 and
 * voice-2 element (nearest by beat-offset — the shared "physical time"
 * coordinate every voice's positions already align on) and measures which
 * neighbor voice 3 sits closer to (smaller staff-Y gap = more crowded).
 * Voice 3 leans AWAY from whichever neighbor crowds it more on a given
 * element — crowds voice 1 (above) -> stems down; crowds voice 2 (below) ->
 * stems up — real engraving practice (never introduce an avoidable stem/
 * notehead collision with a genuine neighboring voice). One direction is
 * then held for every note in the measure (majority vote across voice 3's
 * own elements) rather than flipping per-note, per standard practice. Ties
 * (per-element or overall) break toward 'down', matching voice 3's prior
 * unconditional placeholder so behavior degrades gracefully when there's too
 * little voice-1/voice-2 content in the measure to meaningfully compare.
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

export type VoiceNoteheadPlacement = {
  voiceNumber: VoiceNumber;
  localIndex: number;
  staffYCoordinates: readonly number[];
  direction: VoiceDirection;
  hasFlagOrBeam: boolean;
};

export type VoiceNoteheadDisplacement = {
  voiceNumber: VoiceNumber;
  localIndex: number;
  xOffset: number;
  isUnison: boolean;
};

/**
 * Resolves horizontal displacement for all voices' notes/chords sharing one
 * beat-offset column:
 *  - an exact unison (identical staffY) between two voices — both
 *    noteheads are kept (never merged, per the "single instance of a
 *    unison renders as two noteheads" engraving rule) and nudged ± half of
 *    ADJACENT_NOTE_X_DISPLACEMENT_PX so they sit symmetric about the
 *    shared beat x;
 *  - a diatonic second (one staff-step apart) between two voices resolved
 *    to the *same* direction (only reachable once a 3rd voice exists,
 *    Phase 3) — the physically lower notehead of the pair moves right by
 *    the full displacement, overlapping where possible, UNLESS it has a
 *    flag/beam (never displaced — the plain notehead moves instead);
 *  - otherwise — no displacement (voice 1 up / voice 2 down several
 *    staff-steps apart already clears visually, the common case).
 */
export function computeCrossVoiceDisplacements(
  placements: readonly VoiceNoteheadPlacement[]
): VoiceNoteheadDisplacement[] {
  const displacements: VoiceNoteheadDisplacement[] = [];
  const halfDisplacement = ADJACENT_NOTE_X_DISPLACEMENT_PX / 2;

  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const a = placements[i];
      const b = placements[j];

      const collision = closestCollision(
        a.staffYCoordinates,
        b.staffYCoordinates
      );
      if (collision === null) {
        continue;
      }

      if (collision.distance === 0) {
        // Exact unison: both noteheads kept, nudged symmetrically apart.
        // Lower-numbered voice goes left, the other right, regardless of
        // stem direction (this is about visual separation, not stems).
        const [left, right] = a.voiceNumber < b.voiceNumber ? [a, b] : [b, a];
        displacements.push({
          voiceNumber: left.voiceNumber,
          localIndex: left.localIndex,
          xOffset: -halfDisplacement,
          isUnison: true,
        });
        displacements.push({
          voiceNumber: right.voiceNumber,
          localIndex: right.localIndex,
          xOffset: halfDisplacement,
          isUnison: true,
        });
        continue;
      }

      if (collision.distance === STAFF_Y_STEP && a.direction === b.direction) {
        // Same-direction diatonic second: the physically lower notehead
        // (larger staffY) moves right, unless it has a flag/beam — then
        // the other (plain) notehead moves instead.
        const aIsLower = collision.aY > collision.bY;
        let mover = aIsLower ? a : b;
        const other = mover === a ? b : a;
        if (mover.hasFlagOrBeam && !other.hasFlagOrBeam) {
          mover = other;
        }
        displacements.push({
          voiceNumber: mover.voiceNumber,
          localIndex: mover.localIndex,
          xOffset: ADJACENT_NOTE_X_DISPLACEMENT_PX,
          isUnison: false,
        });
      }
    }
  }

  return displacements;
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

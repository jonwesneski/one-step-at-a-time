import { VoiceNumber } from '../types/theory';
import { ADJACENT_NOTE_X_DISPLACEMENT_PX } from '../utils/svgCreator/note';
import { STAFF_Y_STEP } from '../utils/notationDimensions';

export type VoiceDirection = 'up' | 'down';

/**
 * Voice 1 (top) always stems up, voice 2 (bottom) always stems down —
 * unconditionally, not pitch-driven. This is what distinguishes multi-voice
 * stem direction from the pitch-driven single-voice logic in
 * staffNoteRules.ts#determineStemDirections, which is untouched and still
 * used whenever only one voice is active.
 */
export function resolveVoiceDirections(
  voiceNumbers: readonly VoiceNumber[]
): ReadonlyMap<VoiceNumber, VoiceDirection> {
  const result = new Map<VoiceNumber, VoiceDirection>();
  for (const voiceNumber of voiceNumbers) {
    if (voiceNumber === 1) {
      result.set(voiceNumber, 'up');
    } else {
      result.set(voiceNumber, 'down');
    }
  }
  return result;
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

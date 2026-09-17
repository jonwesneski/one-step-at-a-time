import { VoiceNumber } from '../types/theory';
import { ADJACENT_NOTE_X_DISPLACEMENT_PX } from '../utils/svgCreator/note';
import { STAFF_Y_STEP } from '../utils/notationDimensions';
import {
  computeCrossVoiceDisplacements,
  resolveVoiceDirections,
  VoiceNoteheadPlacement,
} from './voiceRules';

describe('resolveVoiceDirections', () => {
  it('resolves voice 1 to up and voice 2 to down', () => {
    const result = resolveVoiceDirections([1, 2]);
    expect(result.get(1)).toBe('up');
    expect(result.get(2)).toBe('down');
  });

  it('resolves voice 3 to down as the Phase 2 placeholder (Phase 3 makes it contextual)', () => {
    const result = resolveVoiceDirections([1, 2, 3]);
    expect(result.get(3)).toBe('down');
  });

  it('handles a single voice', () => {
    const result = resolveVoiceDirections([1]);
    expect(result.get(1)).toBe('up');
  });
});

describe('computeCrossVoiceDisplacements', () => {
  function placement(
    voiceNumber: VoiceNumber,
    staffYCoordinates: number[],
    direction: 'up' | 'down',
    hasFlagOrBeam = false
  ): VoiceNoteheadPlacement {
    return {
      voiceNumber,
      localIndex: 0,
      staffYCoordinates,
      direction,
      hasFlagOrBeam,
    };
  }

  it('returns no displacement when voices are far apart', () => {
    const result = computeCrossVoiceDisplacements([
      placement(1, [30], 'up'),
      placement(2, [60], 'down'),
    ]);
    expect(result).toHaveLength(0);
  });

  it('splits an exact unison symmetrically, lower voice number to the left', () => {
    const result = computeCrossVoiceDisplacements([
      placement(1, [50], 'up'),
      placement(2, [50], 'down'),
    ]);
    expect(result).toHaveLength(2);
    const v1 = result.find((d) => d.voiceNumber === 1);
    const v2 = result.find((d) => d.voiceNumber === 2);
    expect(v1?.isUnison).toBe(true);
    expect(v2?.isUnison).toBe(true);
    expect(v1?.xOffset).toBe(-ADJACENT_NOTE_X_DISPLACEMENT_PX / 2);
    expect(v2?.xOffset).toBe(ADJACENT_NOTE_X_DISPLACEMENT_PX / 2);
  });

  it('displaces the lower notehead right when two voices share direction a diatonic second apart', () => {
    const result = computeCrossVoiceDisplacements([
      placement(1, [40], 'up'),
      placement(3, [40 + STAFF_Y_STEP], 'up'),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].voiceNumber).toBe(3); // physically lower (larger staffY)
    expect(result[0].xOffset).toBe(ADJACENT_NOTE_X_DISPLACEMENT_PX);
    expect(result[0].isUnison).toBe(false);
  });

  it('does not displace a same-direction second apart when stems differ (common voice1-up/voice2-down case)', () => {
    const result = computeCrossVoiceDisplacements([
      placement(1, [40], 'up'),
      placement(2, [40 + STAFF_Y_STEP], 'down'),
    ]);
    expect(result).toHaveLength(0);
  });

  it('moves the plain notehead instead of a beamed/flagged one on a same-direction collision', () => {
    const result = computeCrossVoiceDisplacements([
      placement(1, [40], 'up', true), // flagged/beamed, physically higher
      placement(3, [40 + STAFF_Y_STEP], 'up', false), // plain, physically lower
    ]);
    expect(result).toHaveLength(1);
    // The lower notehead (voice 3) would normally move, and it has no
    // flag/beam, so it still moves — this case is not actually overridden.
    expect(result[0].voiceNumber).toBe(3);
  });

  it('overrides "lower notehead moves" when the lower one is beamed/flagged and the higher one is plain', () => {
    const result = computeCrossVoiceDisplacements([
      placement(1, [40], 'up', false), // plain, physically higher
      placement(3, [40 + STAFF_Y_STEP], 'up', true), // beamed/flagged, physically lower
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].voiceNumber).toBe(1);
  });

  it('resolves the closest pair of tones between two chords, not just the first', () => {
    const result = computeCrossVoiceDisplacements([
      placement(1, [30, 50], 'up'),
      placement(2, [50, 70], 'down'),
    ]);
    // closest collision is the shared 50 (distance 0) -> unison split
    expect(result).toHaveLength(2);
    expect(result.every((d) => d.isUnison)).toBe(true);
  });
});

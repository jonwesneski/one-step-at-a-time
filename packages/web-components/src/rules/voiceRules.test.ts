import { VoiceNumber } from '../types/theory';
import { STAFF_Y_STEP } from '../utils/notationDimensions';
import { ADJACENT_NOTE_X_DISPLACEMENT_PX } from '../utils/svgCreator/note';
import {
  computeCrossVoiceDisplacements,
  resolveMiddleVoiceDirection,
  resolveVoiceDirections,
  VoiceDirectionInput,
  VoiceNoteheadPlacement,
} from './voiceRules';

describe('resolveVoiceDirections', () => {
  it('resolves voice 1 to up and voice 2 to down', () => {
    const result = resolveVoiceDirections([1, 2]);
    expect(result.get(1)).toBe('up');
    expect(result.get(2)).toBe('down');
  });

  it("resolves voice 3 to down when no staff-Y data is supplied (matches resolveMiddleVoiceDirection's own no-data tie-break)", () => {
    const result = resolveVoiceDirections([1, 2, 3]);
    expect(result.get(3)).toBe('down');
  });

  it('handles a single voice', () => {
    const result = resolveVoiceDirections([1]);
    expect(result.get(1)).toBe('up');
  });

  it('resolves voice 3 contextually when staff-Y data is supplied for all three voices', () => {
    const staffYsByVoice = new Map<VoiceNumber, VoiceDirectionInput[]>([
      [1, [{ staffYs: [20], beatOffset: 0 }]], // high, up top
      [2, [{ staffYs: [90], beatOffset: 0 }]], // low, down bottom
      [3, [{ staffYs: [30], beatOffset: 0 }]], // crowds voice 1
    ]);
    const result = resolveVoiceDirections([1, 2, 3], staffYsByVoice);
    expect(result.get(3)).toBe('down');
  });
});

describe('resolveMiddleVoiceDirection', () => {
  function entry(staffY: number, beatOffset = 0): VoiceDirectionInput {
    return { staffYs: [staffY], beatOffset };
  }

  it('leans down when voice 3 crowds voice 1 (above)', () => {
    const direction = resolveMiddleVoiceDirection(
      [entry(25)],
      [entry(20)], // voice 1, 5 away
      [entry(90)] // voice 2, 65 away
    );
    expect(direction).toBe('down');
  });

  it('leans up when voice 3 crowds voice 2 (below)', () => {
    const direction = resolveMiddleVoiceDirection(
      [entry(85)],
      [entry(20)], // voice 1, 65 away
      [entry(90)] // voice 2, 5 away
    );
    expect(direction).toBe('up');
  });

  it('holds one direction for the whole measure via majority vote, not per-note', () => {
    const direction = resolveMiddleVoiceDirection(
      [entry(25, 0), entry(25, 0.25), entry(85, 0.5)],
      [entry(20, 0), entry(20, 0.25), entry(20, 0.5)],
      [entry(90, 0), entry(90, 0.25), entry(90, 0.5)]
    );
    // 2 of 3 elements crowd voice 1 -> majority is 'down'.
    expect(direction).toBe('down');
  });

  it('finds the concurrently-sounding voice-1/voice-2 element by nearest beat-offset, not array position', () => {
    const direction = resolveMiddleVoiceDirection(
      [entry(85, 0.5)],
      [entry(20, 0), entry(20, 0.75)], // nearest to 0.5 is still far (65 away)
      [entry(90, 0), entry(90, 0.5)] // exact match at 0.5, 5 away
    );
    expect(direction).toBe('up');
  });

  it('ties break toward down, both per-element and overall', () => {
    expect(
      resolveMiddleVoiceDirection([entry(55)], [entry(20)], [entry(90)])
    ).toBe('down');
    // no voice-3 content at all
    expect(resolveMiddleVoiceDirection([], [entry(20)], [entry(90)])).toBe(
      'down'
    );
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

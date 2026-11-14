import { VoiceNumber } from '../types/theory';
import {
  AUGMENTATION_DOT_SPACING_GAP_PX,
  CROSSED_VOICE_CLEARANCE_PX,
  STAFF_Y_STEP,
} from '../utils/notationDimensions';
import {
  ADJACENT_NOTE_X_DISPLACEMENT_PX,
  OPPOSITE_STEM_ALIGN_OFFSET_PX,
} from '../utils/svgCreator/note';
import {
  computeCrossVoiceDisplacements,
  resolveCrossVoiceDotRows,
  resolveMiddleVoiceDirection,
  resolveVoiceDirections,
  VoiceDirectionInput,
  VoiceNoteheadPlacement,
  VoicePartGeometry,
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

  it('lines up the stems of an up/down second by moving the down-stem part right', () => {
    const result = computeCrossVoiceDisplacements([
      placement(1, [40], 'up'),
      placement(2, [40 + STAFF_Y_STEP], 'down'),
    ]);
    expect(result).toEqual([
      expect.objectContaining({
        voiceNumber: 2,
        xOffset: OPPOSITE_STEM_ALIGN_OFFSET_PX,
      }),
    ]);
  });

  it('keeps the up-stem part left when it sits a second below the down-stem part', () => {
    const result = computeCrossVoiceDisplacements([
      placement(1, [40 + STAFF_Y_STEP], 'up'),
      placement(2, [40], 'down'),
    ]);
    expect(result).toEqual([
      expect.objectContaining({
        voiceNumber: 2,
        xOffset: OPPOSITE_STEM_ALIGN_OFFSET_PX,
      }),
    ]);
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

// Element-local px matching the note SVG: heads ±4.27 around 15.47 (up) /
// 17.17 (down), dots half a space after the head.
const UP_STEM_X = 19.47;
const UP_GEOMETRY: VoicePartGeometry = {
  headLeftX: 11.2,
  headRightX: 19.74,
  stemX: UP_STEM_X,
  dotsRightEdgeX: null,
};
const DOWN_GEOMETRY: VoicePartGeometry = {
  headLeftX: 12.9,
  headRightX: 21.44,
  stemX: 13.17,
  dotsRightEdgeX: null,
};

function part(
  voiceNumber: VoiceNumber,
  staffYCoordinates: number[],
  direction: 'up' | 'down',
  dotCount = 0
): VoiceNoteheadPlacement {
  const base = direction === 'up' ? UP_GEOMETRY : DOWN_GEOMETRY;
  return {
    voiceNumber,
    localIndex: 0,
    staffYCoordinates,
    direction,
    hasFlagOrBeam: false,
    dotCount,
    geometry: {
      ...base,
      dotsRightEdgeX: dotCount > 0 ? base.headRightX + 9 : null,
    },
  };
}

const offsetOf = (
  result: ReturnType<typeof computeCrossVoiceDisplacements>,
  voiceNumber: VoiceNumber
) => result.find((d) => d.voiceNumber === voiceNumber)?.xOffset ?? 0;

describe('computeCrossVoiceDisplacements with dots', () => {
  it('lets a dotted upper part in a space separate the parts with its dot', () => {
    // Upper A4 (space) dotted, lower G4 a step below: the dot sits level with
    // the lower head, so the lower part moves past it.
    const result = computeCrossVoiceDisplacements([
      part(1, [55], 'up', 1),
      part(2, [60], 'down'),
    ]);
    expect(offsetOf(result, 1)).toBe(0);
    expect(offsetOf(result, 2)).toBeCloseTo(
      UP_GEOMETRY.headRightX +
        9 +
        AUGMENTATION_DOT_SPACING_GAP_PX -
        DOWN_GEOMETRY.headLeftX
    );
  });

  it('needs no gap when the upper part is on a line and its dot sits above the lower head', () => {
    const result = computeCrossVoiceDisplacements([
      part(1, [50], 'up', 1),
      part(2, [55], 'down'),
    ]);
    expect(offsetOf(result, 2)).toBeCloseTo(OPPOSITE_STEM_ALIGN_OFFSET_PX);
  });

  it('separates a dotted lower up-stem part from the crossing part above it', () => {
    const result = computeCrossVoiceDisplacements([
      part(1, [60], 'up', 1),
      part(2, [55], 'down'),
    ]);
    expect(offsetOf(result, 2)).toBeGreaterThan(OPPOSITE_STEM_ALIGN_OFFSET_PX);
  });

  it('moves a crossed up-stem part clear of the down-stem head', () => {
    const result = computeCrossVoiceDisplacements([
      part(1, [70], 'up'),
      part(2, [45], 'down'),
    ]);
    expect(offsetOf(result, 2)).toBe(0);
    expect(offsetOf(result, 1)).toBeCloseTo(
      DOWN_GEOMETRY.headRightX + CROSSED_VOICE_CLEARANCE_PX - UP_STEM_X
    );
  });

  it("keeps a crossed up-stem's stem from coming between the other part's head and dot", () => {
    const result = computeCrossVoiceDisplacements([
      part(1, [70], 'up'),
      part(2, [45], 'down', 1),
    ]);
    expect(offsetOf(result, 1)).toBeCloseTo(
      DOWN_GEOMETRY.headRightX + 9 + CROSSED_VOICE_CLEARANCE_PX - UP_STEM_X
    );
  });

  it('leaves parts in their normal order alone', () => {
    const result = computeCrossVoiceDisplacements([
      part(1, [40], 'up', 1),
      part(2, [60], 'down', 1),
    ]);
    expect(result).toHaveLength(0);
  });

  it('pushes the right note of a unison past the left note’s dot', () => {
    const result = computeCrossVoiceDisplacements([
      part(1, [55], 'up', 1),
      part(2, [55], 'down'),
    ]);
    expect(offsetOf(result, 1)).toBeCloseTo(
      -ADJACENT_NOTE_X_DISPLACEMENT_PX / 2
    );
    expect(offsetOf(result, 2)).toBeGreaterThan(
      ADJACENT_NOTE_X_DISPLACEMENT_PX / 2
    );
  });
});

describe('resolveCrossVoiceDotRows', () => {
  const rowsOf = (
    result: ReturnType<typeof resolveCrossVoiceDotRows>,
    voiceNumber: VoiceNumber
  ) => result.find((r) => r.voiceNumber === voiceNumber)?.rowStaffYs;

  it('drops the lower part’s dot below its line', () => {
    const result = resolveCrossVoiceDotRows([
      part(1, [45], 'up', 1),
      part(2, [60], 'down', 1),
    ]);
    expect(rowsOf(result, 1)).toEqual([45]);
    expect(rowsOf(result, 2)).toEqual([65]);
  });

  it('keeps the space above for a down-stem part that crosses above the other part', () => {
    const result = resolveCrossVoiceDotRows([
      part(1, [70], 'up'),
      part(2, [60], 'down', 1),
    ]);
    expect(rowsOf(result, 2)).toEqual([55]);
  });

  it('aligns both dots of an adjacent pair in one column after the right part', () => {
    // Upper A4 (space) and lower G4 (line), both dotted.
    const result = resolveCrossVoiceDotRows([
      part(1, [55], 'up', 1),
      part(2, [60], 'down', 1),
    ]);
    expect(rowsOf(result, 1)).toEqual([]);
    expect(rowsOf(result, 2)).toEqual([55, 65]);
  });

  it('keeps separate columns when the dot counts differ', () => {
    const result = resolveCrossVoiceDotRows([
      part(1, [55], 'up', 2),
      part(2, [60], 'down', 1),
    ]);
    expect(rowsOf(result, 1)).toEqual([55]);
    expect(rowsOf(result, 2)).toEqual([65]);
  });

  it('returns nothing for a column with no dots', () => {
    expect(
      resolveCrossVoiceDotRows([part(1, [55], 'up'), part(2, [60], 'down')])
    ).toEqual([]);
  });
});

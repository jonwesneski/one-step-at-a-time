import {
  BEAM_STEP_PX,
  BEAM_THICKNESS_PX,
  MIN_STEM_LENGTH_PX,
  STAFF_BOTTOM_LINE_Y,
  STAFF_LINE_SPACING,
  STAFF_TOP_LINE_Y,
  WIDE_BEAM_STEP_PX,
} from '../utils/notationDimensions';
import {
  type BeamObstacle,
  type BeamPlacement,
  beamSlopeLimits,
  isHorizontalBeamGroup,
  resolveBeamPlacement,
  resolveKneedBeamPlacement,
  resolveKneedBeamSplit,
} from './beamPlacementRules';

const spaces = (count: number) => count * STAFF_LINE_SPACING;

// Treble staff-Ys.
const E6 = 0;
const D6 = 5;
const C6 = 10;
const B5 = 15;
const A5 = 20;
const G5 = 25;
const F5 = 30;
const E5 = 35;
const D5 = 40;
const C5 = 45;
const B4 = 50;
const A4 = 55;
const G4 = 60;
const F4 = 65;
const E4 = 70;
const D4 = 75;
const C4 = 80;
const A3 = 90;

const STAVE_LINES = [0, 1, 2, 3, 4].map(
  (line) => STAFF_TOP_LINE_Y + spaces(line)
);

type Group = {
  heads: number[];
  stemUp: boolean;
  beamCount?: number;
  spacing?: number;
  obstacles?: BeamObstacle[];
};

const notesOf = ({ heads, beamCount = 1, spacing = spaces(4) }: Group) =>
  heads.map((nearestHeadY, i) => ({
    x: i * spacing,
    nearestHeadY,
    beamCount,
  }));

const place = (group: Group) =>
  resolveBeamPlacement({
    notes: notesOf(group),
    stemUp: group.stemUp,
    obstacles: group.obstacles,
  });

const outerEdges = (placement: BeamPlacement, stemUp: boolean) => {
  const toOuter = stemUp ? 0 : BEAM_THICKNESS_PX;
  return [
    placement.primaryTopAtFirst + toOuter,
    placement.primaryTopAtLast + toOuter,
  ];
};

const endStems = (group: Group) => {
  const placement = place(group);
  const [first, last] = outerEdges(placement, group.stemUp);
  return [
    Math.abs(first - group.heads[0]),
    Math.abs(last - group.heads[group.heads.length - 1]),
  ];
};

const slopeOf = (placement: BeamPlacement) =>
  placement.primaryTopAtLast - placement.primaryTopAtFirst;

const levelBands = (placement: BeamPlacement, levels: number) =>
  [placement.primaryTopAtFirst, placement.primaryTopAtLast].flatMap((top) =>
    Array.from({ length: levels }, (_, level) => {
      const bandTop = top + level * placement.levelOffset;
      return [bandTop, bandTop + BEAM_THICKNESS_PX];
    })
  );

const touchesLine = ([top, bottom]: number[]) =>
  STAVE_LINES.some((line) => line >= top - 1e-6 && line <= bottom + 1e-6);

const insideStave = ([top, bottom]: number[]) =>
  bottom >= STAFF_TOP_LINE_Y && top <= STAFF_BOTTOM_LINE_Y;

const everyBeamInStaveAttached = (placement: BeamPlacement, levels: number) =>
  levelBands(placement, levels).filter(insideStave).every(touchesLine);

describe('isHorizontalBeamGroup', () => {
  it('is horizontal when the group begins and ends on the same note', () => {
    expect(isHorizontalBeamGroup([G4, E4, G4], true)).toBe(true);
  });

  it('is horizontal for a repeated pattern of pitches', () => {
    expect(isHorizontalBeamGroup([D4, A4, C5, D4, A4, C5], true)).toBe(true);
    expect(isHorizontalBeamGroup([B4, E5, B4, E5], false)).toBe(true);
  });

  it('is horizontal when an inner note is closer to the beam than both outer notes', () => {
    expect(isHorizontalBeamGroup([G4, C5, A4], true)).toBe(true);
    expect(isHorizontalBeamGroup([C5, G4, B4], false)).toBe(true);
  });

  it('slopes a convex group', () => {
    expect(isHorizontalBeamGroup([C5, G4, D5], true)).toBe(false);
  });

  it('is horizontal when the single odd note at one end is farthest from the beam', () => {
    expect(isHorizontalBeamGroup([F5, A4, A4], false)).toBe(true);
  });

  it('slopes when the single odd note is closest to the beam', () => {
    expect(isHorizontalBeamGroup([A4, A4, F5], true)).toBe(false);
  });

  it('slopes a plain run', () => {
    expect(isHorizontalBeamGroup([C4, E4, G4], true)).toBe(false);
  });
});

describe('beamSlopeLimits', () => {
  const limits = (
    intervalSpaces: number,
    noteCount = 2,
    averageSpacingPx = spaces(4),
    allBeyondFirstLedger = false
  ) =>
    beamSlopeLimits({
      intervalPx: spaces(intervalSpaces),
      noteCount,
      averageSpacingPx,
      allBeyondFirstLedger,
    });

  it('slopes half the interval: ¼ space for a 2nd, ½ for a 3rd, a space for a 5th', () => {
    expect(limits(0.5).ideal).toBeCloseTo(spaces(0.25));
    expect(limits(1).ideal).toBeCloseTo(spaces(0.5));
    expect(limits(2).ideal).toBeCloseTo(spaces(1));
  });

  it('crosses no more than one space for a short group', () => {
    expect(limits(3.5)).toEqual({ ideal: spaces(1), max: spaces(1) });
  });

  it('lets a long group slope up to two spaces', () => {
    expect(limits(3.5, 6).ideal).toBeCloseTo(spaces(1.75));
    expect(limits(5, 6).max).toBeCloseTo(spaces(2));
  });

  it('takes only a slight slope when notes are closer than three spaces', () => {
    expect(limits(0.5, 4, spaces(2))).toEqual({
      ideal: spaces(0.25),
      max: spaces(0.5),
    });
    expect(limits(3, 4, spaces(2)).ideal).toBeCloseTo(spaces(0.5));
  });

  it('takes ¼ or ½ space when every note lies past the first ledger line', () => {
    expect(limits(0.5, 2, spaces(4), true).ideal).toBeCloseTo(spaces(0.25));
    expect(limits(2.5, 2, spaces(4), true).ideal).toBeCloseTo(spaces(0.5));
  });
});

describe('resolveBeamPlacement', () => {
  describe('within the stave', () => {
    it('hangs an up-stem beam from a line, 3½ spaces from heads in a space', () => {
      const placement = place({ heads: [F4, F4], stemUp: true });
      expect(placement.primaryTopAtFirst).toBe(STAFF_TOP_LINE_Y);
      expect(endStems({ heads: [F4, F4], stemUp: true })).toEqual([
        spaces(3.5),
        spaces(3.5),
      ]);
    });

    it('straddles a line, 3¼ spaces from heads on a line', () => {
      expect(endStems({ heads: [G4, G4], stemUp: true })).toEqual([
        spaces(3.25),
        spaces(3.25),
      ]);
      expect(endStems({ heads: [D5, D5], stemUp: false })).toEqual([
        spaces(3.25),
        spaces(3.25),
      ]);
    });

    it('never leaves a one- or two-beam stack in the middle of a space', () => {
      for (const stemUp of [true, false]) {
        for (const head of [D4, E4, F4, G4, A4, B4, C5, D5, E5, F5]) {
          for (const beamCount of [1, 2]) {
            const placement = place({ heads: [head, head], stemUp, beamCount });
            expect(everyBeamInStaveAttached(placement, 2)).toBe(true);
          }
        }
      }
    });

    it('hangs a three-beam up-stem stack and sits a three-beam down-stem stack', () => {
      for (const head of [D4, E4, F4, G4]) {
        const up = place({ heads: [head, head], stemUp: true, beamCount: 3 });
        expect(everyBeamInStaveAttached(up, 3)).toBe(true);
      }
      for (const head of [C5, D5, E5, F5]) {
        const down = place({
          heads: [head, head],
          stemUp: false,
          beamCount: 3,
        });
        expect(everyBeamInStaveAttached(down, 3)).toBe(true);
      }
    });

    it('moves the outer beam outward for additional beams', () => {
      expect(endStems({ heads: [D4, D4], stemUp: true, beamCount: 3 })).toEqual(
        [spaces(4.5), spaces(4.5)]
      );
    });

    it('spreads four beams so each touches a stave line', () => {
      const placement = place({ heads: [A5, A5], stemUp: false, beamCount: 4 });
      expect(placement.levelOffset).toBeCloseTo(-WIDE_BEAM_STEP_PX);
      expect(everyBeamInStaveAttached(placement, 4)).toBe(true);
    });

    it('keeps the standard spacing for four beams outside the stave', () => {
      const placement = place({ heads: [F5, F5], stemUp: true, beamCount: 4 });
      expect(placement.levelOffset).toBeCloseTo(BEAM_STEP_PX);
    });
  });

  describe('notes on ledger lines', () => {
    it('keeps one clear stave line between the innermost beam and the first ledger line', () => {
      for (const beamCount of [2, 3, 4]) {
        const placement = place({
          heads: [C6, C6],
          stemUp: false,
          beamCount,
        });
        const innermostTop =
          placement.primaryTopAtFirst + (beamCount - 1) * placement.levelOffset;
        expect(innermostTop).toBeGreaterThan(STAFF_TOP_LINE_Y);
      }
    });
  });

  describe('angled beams', () => {
    it('slopes in the direction of the outer interval', () => {
      expect(slopeOf(place({ heads: [C4, A4], stemUp: true }))).toBeLessThan(0);
      expect(slopeOf(place({ heads: [D5, C4], stemUp: true }))).toBeGreaterThan(
        0
      );
    });

    it('slopes a short group no more than one space', () => {
      const placement = place({ heads: [C4, C5], stemUp: true });
      expect(Math.abs(slopeOf(placement))).toBeLessThanOrEqual(spaces(1));
    });

    it('shortens the shorter stem, but no further than 3 spaces inside the stave', () => {
      const shorter = Math.min(...endStems({ heads: [C4, C5], stemUp: true }));
      expect(shorter).toBeLessThan(spaces(3.5));
      expect(shorter).toBeGreaterThanOrEqual(spaces(3));
    });

    it('lets a long group slope more than one space but no more than two', () => {
      const placement = place({
        heads: [D6, C6, A5, B5, G5, A5, F5],
        stemUp: false,
      });
      expect(Math.abs(slopeOf(placement))).toBeGreaterThan(spaces(1));
      expect(Math.abs(slopeOf(placement))).toBeLessThanOrEqual(spaces(2));
    });

    it('takes only a slight angle when the notes are close together', () => {
      const placement = place({
        heads: [C4, A4],
        stemUp: true,
        spacing: spaces(2),
      });
      expect(Math.abs(slopeOf(placement))).toBeLessThanOrEqual(spaces(0.5));
    });

    it('takes only a slight angle when every note is past the first ledger line', () => {
      const placement = place({ heads: [C6, E6], stemUp: false });
      expect(Math.abs(slopeOf(placement))).toBeLessThanOrEqual(spaces(0.5));
    });

    it('slants three beams in the stave a whole space or not at all', () => {
      const placement = place({ heads: [E4, G4], stemUp: true, beamCount: 3 });
      expect([0, spaces(1)]).toContain(Math.abs(slopeOf(placement)));
      expect(everyBeamInStaveAttached(placement, 3)).toBe(true);
    });

    it('attaches both ends of a slanted beam to stave lines', () => {
      for (const [first, last] of [
        [E4, G4],
        [F4, A4],
        [G4, B4],
        [D5, B4],
      ]) {
        const stemUp = first > B4;
        const placement = place({ heads: [first, last], stemUp });
        expect(everyBeamInStaveAttached(placement, 2)).toBe(true);
      }
    });
  });

  it('keeps a concave group horizontal', () => {
    expect(slopeOf(place({ heads: [G4, C5, A4], stemUp: true }))).toBe(0);
  });

  it('lengthens stems so the beam stays clear of an obstacle', () => {
    const obstacle = { left: 10, right: 30, top: 0, bottom: 50 };
    const placement = place({
      heads: [G4, G4],
      stemUp: true,
      obstacles: [obstacle],
    });
    expect(placement.primaryTopAtFirst + BEAM_THICKNESS_PX).toBeLessThanOrEqual(
      obstacle.top
    );
  });

  it('keeps every stem its floor when the notes lie far apart', () => {
    const group = { heads: [C4, E6], stemUp: true, beamCount: 4 };
    const placement = place(group);
    const floor = MIN_STEM_LENGTH_PX + 3 * Math.abs(placement.levelOffset);
    for (const stem of endStems(group)) {
      expect(stem).toBeGreaterThanOrEqual(floor - 1e-6);
    }
  });

  it('gives up an obstacle it cannot clear but keeps every stem its floor', () => {
    const everywhere = { left: -1000, right: 1000, top: -1000, bottom: 1000 };
    const group = {
      heads: [F4, C5],
      stemUp: true,
      beamCount: 2,
      obstacles: [everywhere],
    };
    for (const stem of endStems(group)) {
      expect(stem).toBeGreaterThanOrEqual(MIN_STEM_LENGTH_PX + BEAM_STEP_PX);
    }
  });

  it('reports the longest stem', () => {
    expect(place({ heads: [F4, F4], stemUp: true }).longestStemPx).toBe(
      spaces(3.5)
    );
  });
});

describe('kneed beams', () => {
  const note = (highestHeadY: number, lowestHeadY = highestHeadY, i = 0) => ({
    x: i * spaces(4),
    highestHeadY,
    lowestHeadY,
    beamCount: 1,
  });

  it('splits the notes at the widest gap: stems down above it, up below it', () => {
    expect(
      resolveKneedBeamSplit([note(F5, F5, 0), note(A3, A3, 1), note(F5, F5, 2)])
    ).toEqual([false, true, false]);
  });

  it('finds no split when the notes overlap', () => {
    expect(
      resolveKneedBeamSplit([note(A5, G4, 0), note(D5, C4, 1)])
    ).toBeNull();
  });

  it('fits a beam between the heads with every stem at least 2½ spaces', () => {
    const notes = [note(F5, F5, 0), note(A3, A3, 1)];
    const { placement, fits } = resolveKneedBeamPlacement(notes, [false, true]);
    expect(fits).toBe(true);
    const stackTop = Math.min(
      placement.primaryTopAtFirst,
      placement.primaryTopAtLast
    );
    expect(
      placement.primaryTopAtFirst + BEAM_THICKNESS_PX - F5
    ).toBeGreaterThanOrEqual(MIN_STEM_LENGTH_PX);
    expect(A3 - placement.primaryTopAtLast).toBeGreaterThanOrEqual(
      MIN_STEM_LENGTH_PX
    );
    expect(stackTop).toBeGreaterThan(STAFF_TOP_LINE_Y);
  });

  it('rejects, for any spacing, a knee that only fits at some spacings', () => {
    const notes = [note(G5, G5, 0), note(F4, F4, 1), note(D6, D6, 2)];
    const stemUps = [false, true, false];
    expect(resolveKneedBeamPlacement(notes, stemUps).fits).toBe(true);
    const uneven = [0, 32, 100].map((x, i) => ({ ...notes[i], x }));
    expect(resolveKneedBeamPlacement(uneven, stemUps).fits).toBe(false);
    expect(
      resolveKneedBeamPlacement(notes, stemUps, { anySpacing: true }).fits
    ).toBe(false);
  });

  it('keeps a knee accepted for any spacing valid at uneven spacings', () => {
    const heads = [C4, G5, C4, G5];
    const stemUps = [true, false, true, false];
    const at = (xs: number[]) =>
      heads.map((head, i) => ({ ...note(head), x: xs[i] }));
    expect(
      resolveKneedBeamPlacement(at([0, 40, 80, 120]), stemUps, {
        anySpacing: true,
      }).fits
    ).toBe(true);
    for (const xs of [
      [0, 10, 90, 100],
      [0, 80, 85, 100],
      [0, 5, 10, 200],
    ]) {
      expect(resolveKneedBeamPlacement(at(xs), stemUps).fits).toBe(true);
    }
  });

  it('does not fit when every placement crosses an obstacle', () => {
    const acrossStave = { left: 10, right: 30, top: 0, bottom: 100 };
    expect(
      resolveKneedBeamPlacement(
        [note(F5, F5, 0), note(A3, A3, 1)],
        [false, true],
        {
          obstacles: [acrossStave],
        }
      ).fits
    ).toBe(false);
  });

  it('slopes in the direction of the outer interval', () => {
    const { placement } = resolveKneedBeamPlacement(
      [note(C6, C6, 0), note(A3, A3, 1)],
      [false, true]
    );
    expect(slopeOf(placement)).toBeGreaterThan(0);
  });

  it('does not fit when a stem would be shorter than 2½ spaces', () => {
    expect(
      resolveKneedBeamPlacement(
        [note(A5, A5, 0), note(D5, D5, 1)],
        [false, true]
      ).fits
    ).toBe(false);
  });

  it('does not fit when the beam would cover the top stave line', () => {
    expect(
      resolveKneedBeamPlacement(
        [note(E6, E6, 0), note(B4, B4, 1)],
        [false, true]
      ).fits
    ).toBe(false);
  });
});

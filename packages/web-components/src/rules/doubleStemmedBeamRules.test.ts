import { MUSIC_NOTE_NODE, MUSIC_REST_NODE } from '../utils/consts';
import type { BeamLineDescriptor } from './beamStructureRules';
import {
  classifyAutoRestStaffSide,
  DoubleStemmedBeamAttachedShape,
  DoubleStemmedBeamEntry,
  DoubleStemmedBeamKeepOut,
  DoubleStemmedBeamMember,
  DoubleStemmedBeamNotehead,
  DoubleStemmedBeamPoint,
  doubleStemmedBeamYAtX,
  resolveDoubleStemmedBeamClearance,
  resolveDoubleStemmedBeamGroups,
  resolveDoubleStemmedBeamLine,
  resolveGroupSecondaryBeamSide,
  resolveSecondaryBeamVerticalSide,
} from './doubleStemmedBeamRules';

function note(
  staffIndex: number,
  entryIndex: number,
  beamGroup: string | null
): DoubleStemmedBeamEntry {
  return { staffIndex, entryIndex, beamGroup, nodeName: MUSIC_NOTE_NODE };
}

function rest(
  staffIndex: number,
  entryIndex: number,
  beamGroup: string | null
): DoubleStemmedBeamEntry {
  return { staffIndex, entryIndex, beamGroup, nodeName: MUSIC_REST_NODE };
}

describe('resolveDoubleStemmedBeamGroups', () => {
  it('resolves a group spanning two adjacent staves, ordered by entryIndex', () => {
    const { groups, warnings } = resolveDoubleStemmedBeamGroups([
      note(0, 1, 'g1'),
      note(1, 0, 'g1'),
      note(0, 0, 'g1'),
      note(1, 1, 'g1'),
    ]);

    expect(warnings).toHaveLength(0);
    expect(groups).toEqual([
      {
        id: 'g1',
        topStaffIndex: 0,
        bottomStaffIndex: 1,
        members: [
          { staffIndex: 0, entryIndex: 0, isRest: false },
          { staffIndex: 1, entryIndex: 0, isRest: false },
          { staffIndex: 0, entryIndex: 1, isRest: false },
          { staffIndex: 1, entryIndex: 1, isRest: false },
        ],
      },
    ]);
  });

  it('ignores entries with no beam-group', () => {
    const { groups, warnings } = resolveDoubleStemmedBeamGroups([
      note(0, 0, null),
      note(1, 0, null),
    ]);

    expect(groups).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it('resolves multiple independent groups in one measure', () => {
    const { groups, warnings } = resolveDoubleStemmedBeamGroups([
      note(0, 0, 'g1'),
      note(1, 0, 'g1'),
      note(0, 1, 'g2'),
      note(1, 1, 'g2'),
    ]);

    expect(warnings).toHaveLength(0);
    expect(groups.map((g) => g.id)).toEqual(['g1', 'g2']);
  });

  it('marks a rest member isRest without counting it toward the min-member check', () => {
    const { groups, warnings } = resolveDoubleStemmedBeamGroups([
      note(0, 0, 'g1'),
      rest(0, 1, 'g1'),
      note(1, 0, 'g1'),
    ]);

    expect(warnings).toHaveLength(0);
    expect(groups[0].members).toEqual([
      { staffIndex: 0, entryIndex: 0, isRest: false },
      { staffIndex: 1, entryIndex: 0, isRest: false },
      { staffIndex: 0, entryIndex: 1, isRest: true },
    ]);
  });

  it('warns and drops a group spanning only one staff', () => {
    const { groups, warnings } = resolveDoubleStemmedBeamGroups([
      note(0, 0, 'g1'),
      note(0, 1, 'g1'),
    ]);

    expect(groups).toHaveLength(0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('g1');
  });

  it('warns and drops a group spanning three staves', () => {
    const { groups, warnings } = resolveDoubleStemmedBeamGroups([
      note(0, 0, 'g1'),
      note(1, 0, 'g1'),
      note(2, 0, 'g1'),
    ]);

    expect(groups).toHaveLength(0);
    expect(warnings).toHaveLength(1);
  });

  it('warns and drops a group spanning non-adjacent staves', () => {
    const { groups, warnings } = resolveDoubleStemmedBeamGroups([
      note(0, 0, 'g1'),
      note(2, 0, 'g1'),
    ]);

    expect(groups).toHaveLength(0);
    expect(warnings).toHaveLength(1);
  });

  it('warns and drops a group with fewer than 2 non-rest members', () => {
    const { groups, warnings } = resolveDoubleStemmedBeamGroups([
      note(0, 0, 'g1'),
      rest(1, 0, 'g1'),
    ]);

    expect(groups).toHaveLength(0);
    expect(warnings).toHaveLength(1);
  });

  it('does not cascade one bad group into a separate valid one', () => {
    const { groups, warnings } = resolveDoubleStemmedBeamGroups([
      note(0, 0, 'bad'),
      note(0, 1, 'good'),
      note(1, 1, 'good'),
    ]);

    expect(warnings).toHaveLength(1);
    expect(groups.map((g) => g.id)).toEqual(['good']);
  });
});

function pt(
  x: number,
  naturalY: number,
  isTopStaff = false
): DoubleStemmedBeamPoint {
  return { x, naturalY, isTopStaff };
}

describe('resolveDoubleStemmedBeamLine', () => {
  it('is horizontal at the mean naturalY when the first and last points match', () => {
    const line = resolveDoubleStemmedBeamLine(
      [pt(0, 100), pt(50, 80), pt(100, 100)],
      0,
      200
    );
    expect(line).toEqual({
      yAtFirstX: 93.33333333333333,
      yAtLastX: 93.33333333333333,
    });
  });

  it('slopes toward a consistent trend, clamped to the max angle when the raw slope is steeper', () => {
    // netDelta=-20 over run=100 → rawAngle=-0.2, clamped to -0.15.
    const line = resolveDoubleStemmedBeamLine(
      [pt(0, 100), pt(100, 80)],
      0,
      200
    );
    expect(line).toEqual({ yAtFirstX: 100, yAtLastX: 85 });
  });

  it('slopes at the raw angle when it is within the clamp', () => {
    // netDelta=-12 over run=200 → rawAngle=-0.06, within [-0.15, 0.15].
    const line = resolveDoubleStemmedBeamLine(
      [pt(0, 100), pt(200, 88)],
      0,
      300
    );
    expect(line).toEqual({ yAtFirstX: 100, yAtLastX: 88 });
  });

  it('falls back to horizontal when the raw angle is inside the dead zone', () => {
    // netDelta=-3 over run=100 → rawAngle=-0.03, below the 0.05 dead zone.
    const line = resolveDoubleStemmedBeamLine(
      [pt(0, 100), pt(100, 97)],
      0,
      200
    );
    expect(line).toEqual({ yAtFirstX: 98.5, yAtLastX: 98.5 });
  });

  it('falls back to horizontal when an interior step contradicts the net trend', () => {
    // Net trend descends (100 → 95, sign -1); the middle step rises
    // (90 → 95, sign +1) against it.
    const line = resolveDoubleStemmedBeamLine(
      [pt(0, 100), pt(50, 90), pt(100, 95)],
      0,
      200
    );
    expect(line).toEqual({ yAtFirstX: 95, yAtLastX: 95 });
  });

  it('clamps the horizontal fallback into the gap bounds, even past a natural mean outside them', () => {
    const line = resolveDoubleStemmedBeamLine(
      [pt(0, 300), pt(100, 300)],
      50,
      150
    );
    expect(line).toEqual({ yAtFirstX: 150, yAtLastX: 150 });
  });

  it('does not clamp the sloped case into the gap bounds, even when it lands outside them', () => {
    // netDelta=190 over run=100 → rawAngle=1.9, clamped to 0.15 — but the
    // resulting line still starts at first.naturalY=10, above (smaller than)
    // topStaffGapEdgeY=50, on purpose: only the horizontal fallback clamps.
    const line = resolveDoubleStemmedBeamLine(
      [pt(0, 10), pt(100, 200)],
      50,
      150
    );
    expect(line).toEqual({ yAtFirstX: 10, yAtLastX: 25 });
  });
});

function member(staffIndex: number): DoubleStemmedBeamMember {
  return { staffIndex, entryIndex: 0, isRest: false };
}

function seg(
  fromNoteIndex: number,
  toNoteIndex: number,
  beamLevel = 1
): BeamLineDescriptor {
  return { fromNoteIndex, toNoteIndex, beamLevel };
}

describe('doubleStemmedBeamYAtX', () => {
  it('interpolates and extrapolates along the line', () => {
    const line = { yAtFirstX: 100, yAtLastX: 80 };
    expect(doubleStemmedBeamYAtX(line, 0, 100, 50)).toBe(90);
    expect(doubleStemmedBeamYAtX(line, 0, 100, 110)).toBe(78);
  });

  it('is flat when the line has no run', () => {
    expect(
      doubleStemmedBeamYAtX({ yAtFirstX: 40, yAtLastX: 40 }, 10, 10, 99)
    ).toBe(40);
  });
});

describe('resolveDoubleStemmedBeamClearance', () => {
  // Primary beam 8px thick, from x=0 to x=100, rising from Y=100 to Y=90.
  const line = { yAtFirstX: 100, yAtLastX: 90 };
  const primary: DoubleStemmedBeamAttachedShape = {
    left: 0,
    right: 100,
    topOffset: 0,
    bottomOffset: 8,
  };
  const base = {
    line,
    firstX: 0,
    lastX: 100,
    beamShapes: [primary],
    hangingShapes: [],
    keepOuts: [],
    noteheads: [],
    clearance: 5,
    minStemLength: 20,
  };
  const keepOut = (
    overrides: Partial<DoubleStemmedBeamKeepOut>
  ): DoubleStemmedBeamKeepOut => ({
    left: 0,
    right: 100,
    top: 120,
    bottom: 130,
    staff: 'bottom',
    ...overrides,
  });
  const head = (
    overrides: Partial<DoubleStemmedBeamNotehead>
  ): DoubleStemmedBeamNotehead => ({
    left: 0,
    right: 0,
    top: 140,
    bottom: 150,
    stemUp: true,
    ...overrides,
  });

  it('leaves the beam alone with no keep-outs', () => {
    expect(
      resolveDoubleStemmedBeamClearance({ ...base, keepOuts: [] })
    ).toEqual({ shift: 0, deficit: 0, reserveOn: null });
  });

  it('ignores a keep-out outside the beam span', () => {
    expect(
      resolveDoubleStemmedBeamClearance({
        ...base,
        keepOuts: [keepOut({ left: 150, right: 200, top: 95 })],
      }).reserveOn
    ).toBeNull();
  });

  it('leaves a beam that already clears a bottom-staff sign in place', () => {
    const result = resolveDoubleStemmedBeamClearance({
      ...base,
      keepOuts: [keepOut({ top: 120 })],
    });
    expect(result.shift).toBe(0);
    expect(result.reserveOn).toBe('bottom');
    expect(result.deficit).toBe(-Infinity);
  });

  it('lifts the beam above a bottom-staff sign, bound by its lowest point', () => {
    // Beam bottom at x=0 is 108; the sign's top at 110 needs 105 → lift 3.
    const result = resolveDoubleStemmedBeamClearance({
      ...base,
      keepOuts: [keepOut({ top: 110 })],
    });
    expect(result.shift).toBe(-3);
  });

  it('only checks where the sign overlaps the beam', () => {
    // Over x ∈ [50, 100] the beam's lowest point is 103, exactly the 5px
    // clearance above the sign's top of 108.
    const result = resolveDoubleStemmedBeamClearance({
      ...base,
      keepOuts: [keepOut({ left: 50, right: 300, top: 108 })],
    });
    expect(result.shift).toBe(0);
  });

  it('drops the beam below a top-staff sign', () => {
    // Beam top at x=100 is 90; the sign's bottom at 93 plus clearance needs
    // 98 → drop 8.
    const result = resolveDoubleStemmedBeamClearance({
      ...base,
      keepOuts: [keepOut({ top: 80, bottom: 93, staff: 'top' })],
    });
    expect(result.shift).toBe(8);
    expect(result.reserveOn).toBe('top');
  });

  it('counts the secondary stack and a hanging numeral as part of the beam', () => {
    const result = resolveDoubleStemmedBeamClearance({
      ...base,
      hangingShapes: [{ left: 0, right: 40, topOffset: 12, bottomOffset: 20 }],
      keepOuts: [keepOut({ top: 130 })],
    });
    // The secondary's bottom at x=0 is 120, still 5px clear of 125.
    expect(result.shift).toBe(0);
    const tighter = resolveDoubleStemmedBeamClearance({
      ...base,
      hangingShapes: [{ left: 0, right: 40, topOffset: 12, bottomOffset: 20 }],
      keepOuts: [keepOut({ top: 118 })],
    });
    // 118 - 5 - 120 → lift 7, more than the primary alone (118 - 5 - 108 = 5).
    expect(tighter.shift).toBe(-7);
  });

  it('stops at the minimum stem and reports the missing gap', () => {
    // Clearing the sign (top 100) needs a lift of 13, which would leave a
    // stem-down member's notehead at 75 only 12px from the beam at x=0; the
    // minimum of 20 allows a lift of 5, so 8px of gap is missing.
    const result = resolveDoubleStemmedBeamClearance({
      ...base,
      keepOuts: [keepOut({ top: 100 })],
      noteheads: [head({ top: 65, bottom: 75, stemUp: false })],
    });
    expect(result.deficit).toBe(8);
    expect(result.reserveOn).toBe('bottom');
    expect(result.shift).toBe(-9);
  });

  it('pushes the beam away from a notehead already inside the minimum', () => {
    // Beam top at x=0 is 100; a stem-down notehead ending at 90 needs it at 110.
    const result = resolveDoubleStemmedBeamClearance({
      ...base,
      noteheads: [head({ top: 80, bottom: 90, stemUp: false })],
    });
    expect(result.shift).toBe(10);
    expect(result.reserveOn).toBe('bottom');
  });

  it('lifts a rising beam off a stem-up notehead, measured across the whole head', () => {
    // Beam bottom is 104 at the head's left edge (x=40) and 102.8 at its
    // stem side (x=52); the lower left edge binds: 115 - 20 - 104.
    const result = resolveDoubleStemmedBeamClearance({
      ...base,
      noteheads: [head({ left: 40, right: 52, top: 115, bottom: 125 })],
    });
    expect(result.shift).toBeCloseTo(-9);
  });

  it('ignores a notehead outside the beam span', () => {
    expect(
      resolveDoubleStemmedBeamClearance({
        ...base,
        noteheads: [head({ left: 150, right: 160, top: 100 })],
      })
    ).toEqual({ shift: 0, deficit: 0, reserveOn: null });
  });

  it('leaves the beam in place when every notehead has room', () => {
    const result = resolveDoubleStemmedBeamClearance({
      ...base,
      noteheads: [
        head({ top: 40, bottom: 50, stemUp: false }),
        head({ top: 200, bottom: 210 }),
      ],
    });
    expect(result.shift).toBe(0);
    expect(result.deficit).toBeLessThan(0);
  });

  it('measures a stem-up notehead to a secondary stacked toward it', () => {
    const secondaryBelow = {
      left: 0,
      right: 100,
      topOffset: 12,
      bottomOffset: 20,
    };
    const noteheads = [head({ top: 135, bottom: 145 })];
    // The primary's bottom at 108 leaves 27px; the secondary's at 120 only 15.
    expect(
      resolveDoubleStemmedBeamClearance({ ...base, noteheads }).shift
    ).toBe(0);
    expect(
      resolveDoubleStemmedBeamClearance({
        ...base,
        beamShapes: [primary, secondaryBelow],
        noteheads,
      }).shift
    ).toBe(-5);
  });

  it('measures a stem to the beam level nearest its notehead', () => {
    const input = {
      ...base,
      keepOuts: [keepOut({ top: 100 })],
      noteheads: [head({ top: 50, bottom: 60, stemUp: false })],
    };
    // Against the primary alone the stem-down member could give up 20px; a
    // secondary stacked toward it (top at 88 instead of 100) leaves only 8,
    // short of the 13px lift.
    expect(resolveDoubleStemmedBeamClearance(input).deficit).toBe(-7);
    expect(
      resolveDoubleStemmedBeamClearance({
        ...input,
        beamShapes: [
          primary,
          { left: 0, right: 100, topOffset: -12, bottomOffset: -4 },
        ],
      }).deficit
    ).toBe(5);
  });

  it('reports the missing gap when noteheads on both staves squeeze the beam', () => {
    // The stem-down head needs a drop of 15, the stem-up head a lift of 8.
    const result = resolveDoubleStemmedBeamClearance({
      ...base,
      noteheads: [
        head({ top: 85, bottom: 95, stemUp: false }),
        head({ top: 120, bottom: 130 }),
      ],
    });
    expect(result.deficit).toBe(23);
    expect(result.reserveOn).toBe('bottom');
    expect(result.shift).toBe(3.5);
  });

  it('reports the overlap when signs on both staves squeeze the beam', () => {
    const result = resolveDoubleStemmedBeamClearance({
      ...base,
      keepOuts: [
        keepOut({ top: 105 }),
        keepOut({ top: 80, bottom: 95, staff: 'top' }),
      ],
    });
    // Needs a lift of at least 8 for the bottom sign and a drop of at least
    // 10 for the top one.
    expect(result.deficit).toBe(18);
    expect(result.reserveOn).toBe('bottom');
  });
});

describe('resolveSecondaryBeamVerticalSide', () => {
  const TOP = 0;

  it("resolves a segment whose every member is on the same staff to that staff's side", () => {
    const members = [member(0), member(0)];
    expect(
      resolveSecondaryBeamVerticalSide(seg(0, 1), members, TOP, 'middle')
    ).toBe('top');
  });

  it('resolves a mixed-interior segment to its own outer (first/last) side when they agree', () => {
    const members = [member(0), member(1), member(0)];
    expect(
      resolveSecondaryBeamVerticalSide(seg(0, 2), members, TOP, 'middle')
    ).toBe('top');
  });

  it("resolves a genuine outer-direction conflict to the opposite of the first member's side, at the start of the main beam", () => {
    const members = [member(0), member(1)];
    expect(
      resolveSecondaryBeamVerticalSide(seg(0, 1), members, TOP, 'start')
    ).toBe('bottom');
  });

  it("resolves a genuine outer-direction conflict to match the first member's side, at the end of the main beam", () => {
    const members = [member(0), member(1)];
    expect(
      resolveSecondaryBeamVerticalSide(seg(0, 1), members, TOP, 'end')
    ).toBe('top');
  });

  it("resolves a genuine outer-direction conflict to match the first member's side, for an interior segment (no specified rule; extends the end-of-beam default)", () => {
    const members = [member(0), member(1)];
    expect(
      resolveSecondaryBeamVerticalSide(seg(0, 1), members, TOP, 'middle')
    ).toBe('top');
  });
});

describe('resolveGroupSecondaryBeamSide', () => {
  it('picks the clear majority side', () => {
    expect(
      resolveGroupSecondaryBeamSide(['top', 'top', 'bottom'], 'bottom')
    ).toBe('top');
    expect(
      resolveGroupSecondaryBeamSide(['top', 'bottom', 'bottom'], 'top')
    ).toBe('bottom');
  });

  it('breaks an exact tie toward the supplied tie-break side', () => {
    expect(resolveGroupSecondaryBeamSide(['top', 'bottom'], 'bottom')).toBe(
      'bottom'
    );
    expect(resolveGroupSecondaryBeamSide(['top', 'bottom'], 'top')).toBe('top');
  });

  it('falls back to the tie-break side when there are no segments at all', () => {
    expect(resolveGroupSecondaryBeamSide([], 'top')).toBe('top');
  });
});

const TOP = 0;
const BOTTOM = 1;

describe('classifyAutoRestStaffSide', () => {
  it("classifies a rest interior to a same-staff run to that staff's side", () => {
    const members = [member(TOP), member(TOP), member(TOP)];
    expect(classifyAutoRestStaffSide(members, 1, TOP)).toBe('above');
  });

  it('classifies a rest interior to a same-staff run on the bottom staff to "below"', () => {
    const members = [member(BOTTOM), member(BOTTOM), member(BOTTOM)];
    expect(classifyAutoRestStaffSide(members, 1, TOP)).toBe('below');
  });

  it('prefers the following member\'s side when neighbors disagree ("the note it precedes")', () => {
    // prev=TOP, next=BOTTOM — disagree, so the rest at index 1 follows the
    // *next* member's side (BOTTOM → 'below'), not the preceding one.
    const members = [member(TOP), member(BOTTOM), member(BOTTOM)];
    expect(classifyAutoRestStaffSide(members, 1, TOP)).toBe('below');
  });

  it("falls back to the preceding member's side when there is no following member", () => {
    const members = [member(BOTTOM), member(TOP)];
    expect(classifyAutoRestStaffSide(members, 1, TOP)).toBe('below');
  });

  it("falls back to the following member's side when there is no preceding member", () => {
    const members = [member(TOP), member(BOTTOM)];
    expect(classifyAutoRestStaffSide(members, 0, TOP)).toBe('below');
  });
});

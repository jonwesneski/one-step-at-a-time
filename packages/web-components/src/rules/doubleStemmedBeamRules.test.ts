import { MUSIC_NOTE_NODE, MUSIC_REST_NODE } from '../utils/consts';
import type { BeamLineDescriptor } from './beamStructureRules';
import {
  DoubleStemmedBeamEntry,
  DoubleStemmedBeamMember,
  DoubleStemmedBeamPoint,
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

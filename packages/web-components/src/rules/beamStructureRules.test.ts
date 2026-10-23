import { computeBeamLevelStructure } from './beamStructureRules';

describe('computeBeamLevelStructure', () => {
  it('produces one full-span primary beam for two eighth notes', () => {
    const { primaryBeam, secondaryBeams, fractionalBeams } =
      computeBeamLevelStructure([1, 1]);

    expect(primaryBeam).toEqual({
      fromNoteIndex: 0,
      toNoteIndex: 1,
      beamLevel: 0,
    });
    expect(secondaryBeams).toEqual([]);
    expect(fractionalBeams).toEqual([]);
  });

  it('adds a full-span secondary beam for four consecutive sixteenth notes', () => {
    const { primaryBeam, secondaryBeams, fractionalBeams } =
      computeBeamLevelStructure([2, 2, 2, 2]);

    expect(primaryBeam).toEqual({
      fromNoteIndex: 0,
      toNoteIndex: 3,
      beamLevel: 0,
    });
    expect(secondaryBeams).toEqual([
      { fromNoteIndex: 0, toNoteIndex: 3, beamLevel: 1 },
    ]);
    expect(fractionalBeams).toEqual([]);
  });

  it('adds a right-side fractional beam when the isolated faster note leads the group', () => {
    // sixteenth, eighth — the sixteenth has no predecessor in the group.
    const { fractionalBeams } = computeBeamLevelStructure([2, 1]);

    expect(fractionalBeams).toEqual([
      {
        fromNoteIndex: 0,
        toNoteIndex: 0,
        beamLevel: 1,
        fractionalBeamSide: 'right',
      },
    ]);
  });

  it('adds a left-side fractional beam when the isolated faster note trails the group', () => {
    // eighth, sixteenth — the sixteenth has a predecessor in the group.
    const { fractionalBeams } = computeBeamLevelStructure([1, 2]);

    expect(fractionalBeams).toEqual([
      {
        fromNoteIndex: 1,
        toNoteIndex: 1,
        beamLevel: 1,
        fractionalBeamSide: 'left',
      },
    ]);
  });

  it('adds two fractionals for a sixteenth-eighth-sixteenth pattern', () => {
    const { primaryBeam, secondaryBeams, fractionalBeams } =
      computeBeamLevelStructure([2, 1, 2]);

    expect(primaryBeam).toEqual({
      fromNoteIndex: 0,
      toNoteIndex: 2,
      beamLevel: 0,
    });
    expect(secondaryBeams).toEqual([]);
    expect(fractionalBeams).toEqual([
      {
        fromNoteIndex: 0,
        toNoteIndex: 0,
        beamLevel: 1,
        fractionalBeamSide: 'right',
      },
      {
        fromNoteIndex: 2,
        toNoteIndex: 2,
        beamLevel: 1,
        fractionalBeamSide: 'left',
      },
    ]);
  });

  it('mixes a full-span secondary beam with a fractional at a deeper level (thirtysecond run)', () => {
    // eighth, thirtysecond, thirtysecond — the two thirtyseconds share level 1
    // (both > eighth) as a secondary beam, but only the second one reaches
    // level 2, so it gets a fractional there.
    const { primaryBeam, secondaryBeams, fractionalBeams } =
      computeBeamLevelStructure([1, 3, 3]);

    expect(primaryBeam).toEqual({
      fromNoteIndex: 0,
      toNoteIndex: 2,
      beamLevel: 0,
    });
    expect(secondaryBeams).toEqual([
      { fromNoteIndex: 1, toNoteIndex: 2, beamLevel: 1 },
      { fromNoteIndex: 1, toNoteIndex: 2, beamLevel: 2 },
    ]);
    expect(fractionalBeams).toEqual([]);
  });
});

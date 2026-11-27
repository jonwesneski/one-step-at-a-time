import {
  beamReachOverRest,
  computeBeamLevelStructure,
  computeBeamLinesOverRests,
} from './beamStructureRules';
import { durationToFlagCountMap } from './theoryConsts';

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

  it('stubs a sixteenth after a dotted eighth to the left', () => {
    const { fractionalBeams } = computeBeamLevelStructure([
      durationToFlagCountMap.get('dotted-eighth') ?? 0,
      durationToFlagCountMap.get('sixteenth') ?? 0,
    ]);
    expect(fractionalBeams).toEqual([
      expect.objectContaining({ fromNoteIndex: 1, fractionalBeamSide: 'left' }),
    ]);
  });

  it('stubs a sixteenth before a dotted eighth to the right', () => {
    const { fractionalBeams } = computeBeamLevelStructure([
      durationToFlagCountMap.get('sixteenth') ?? 0,
      durationToFlagCountMap.get('dotted-eighth') ?? 0,
    ]);
    expect(fractionalBeams).toEqual([
      expect.objectContaining({
        fromNoteIndex: 0,
        fractionalBeamSide: 'right',
      }),
    ]);
  });
});

describe('beamReachOverRest', () => {
  it('reaches 0.4 of the way to the rest, at most 2 spaces', () => {
    expect(beamReachOverRest(100, 70)).toBeCloseTo(12);
    expect(beamReachOverRest(100, 130)).toBeCloseTo(12);
    expect(beamReachOverRest(100, 10)).toBe(20);
  });
});

describe('computeBeamLinesOverRests', () => {
  const note = (beamCount: number) => ({ beamCount, rest: false });
  const rest = (beamCount: number) => ({ beamCount, rest: true });

  it('matches the plain structure with no rests', () => {
    const { primaryBeam, secondaryBeams, fractionalBeams } =
      computeBeamLevelStructure([2, 1, 2]);
    expect(computeBeamLinesOverRests([note(2), note(1), note(2)])).toEqual([
      primaryBeam,
      ...secondaryBeams,
      ...fractionalBeams,
    ]);
  });

  it('gives a lone note a reaching stub per beam on each side with a rest', () => {
    expect(computeBeamLinesOverRests([rest(1), note(2)])).toEqual([
      { fromNoteIndex: 1, toNoteIndex: 1, beamLevel: 0, reachesLeft: true },
      { fromNoteIndex: 1, toNoteIndex: 1, beamLevel: 1, reachesLeft: true },
    ]);
    expect(computeBeamLinesOverRests([rest(2), note(1), rest(2)])).toEqual([
      {
        fromNoteIndex: 1,
        toNoteIndex: 1,
        beamLevel: 0,
        reachesLeft: true,
        reachesRight: true,
      },
    ]);
  });

  it('reaches every level of an outer note toward the rest beside it', () => {
    expect(
      computeBeamLinesOverRests([rest(2), note(2), note(2), note(2)])
    ).toEqual([
      { fromNoteIndex: 1, toNoteIndex: 3, beamLevel: 0, reachesLeft: true },
      { fromNoteIndex: 1, toNoteIndex: 3, beamLevel: 1, reachesLeft: true },
    ]);
  });

  it('turns a partial beam at the outer note into the reach', () => {
    // A trailing sixteenth after an eighth would stub left; beside a rest it
    // reaches right instead.
    expect(computeBeamLinesOverRests([note(1), note(2), rest(2)])).toEqual([
      { fromNoteIndex: 0, toNoteIndex: 1, beamLevel: 0, reachesRight: true },
      { fromNoteIndex: 1, toNoteIndex: 1, beamLevel: 1, reachesRight: true },
    ]);
  });

  it('runs the primary through an inner rest and breaks secondaries for its value', () => {
    expect(
      computeBeamLinesOverRests([note(2), rest(2), note(2), note(2)])
    ).toEqual([
      { fromNoteIndex: 0, toNoteIndex: 3, beamLevel: 0 },
      { fromNoteIndex: 0, toNoteIndex: 3, beamLevel: 1 },
    ]);
    expect(computeBeamLinesOverRests([note(2), rest(1), note(2)])).toEqual([
      { fromNoteIndex: 0, toNoteIndex: 2, beamLevel: 0 },
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

  it('starts a secondary that begins on an inner rest at the note, reaching toward the rest', () => {
    expect(computeBeamLinesOverRests([note(1), rest(2), note(2)])).toEqual([
      { fromNoteIndex: 0, toNoteIndex: 2, beamLevel: 0 },
      { fromNoteIndex: 2, toNoteIndex: 2, beamLevel: 1, reachesLeft: true },
    ]);
  });
});

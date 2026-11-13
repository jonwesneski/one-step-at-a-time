import {
  activeClefChangeIndex,
  clefChangeBeat,
  clefChangesReached,
  mergeClefChangeBeats,
  sameClefChangeBeats,
} from './clefChangeRules';

describe('clefChangeBeat', () => {
  const voice1BeatEnds = [1 / 4, 1 / 2, 7 / 12];

  it('is -1 for a change before the first entry', () => {
    expect(clefChangeBeat(-1, voice1BeatEnds)).toBe(-1);
  });

  it('is the end of the voice-1 entry it follows', () => {
    expect(clefChangeBeat(0, voice1BeatEnds)).toBe(1 / 4);
    expect(clefChangeBeat(1, voice1BeatEnds)).toBe(1 / 2);
  });

  it('follows a tuplet-scaled entry to its scaled end', () => {
    expect(clefChangeBeat(2, voice1BeatEnds)).toBeCloseTo(7 / 12);
  });
});

describe('activeClefChangeIndex', () => {
  it('applies a change from its own beat on, not just before it', () => {
    expect(activeClefChangeIndex([1 / 2], 1 / 2)).toBe(0);
    expect(activeClefChangeIndex([1 / 2], 3 / 8)).toBe(-1);
  });

  it('applies a leading change to everything', () => {
    expect(activeClefChangeIndex([-1], 0)).toBe(0);
    expect(activeClefChangeIndex([-1], -0.5)).toBe(0);
  });

  it('picks the latest change reached', () => {
    expect(activeClefChangeIndex([1 / 4, 1 / 2], 3 / 4)).toBe(1);
    expect(activeClefChangeIndex([1 / 4, 1 / 2], 3 / 8)).toBe(0);
  });

  it('tolerates float sums from tuplets', () => {
    const tripletEnd = 1 / 12 + 1 / 12 + 1 / 12;
    expect(activeClefChangeIndex([tripletEnd], 1 / 4)).toBe(0);
  });
});

describe('clefChangesReached', () => {
  it('counts the changes at or before the beat', () => {
    expect(clefChangesReached([-1, 1 / 4, 1 / 2], 0)).toBe(1);
    expect(clefChangesReached([-1, 1 / 4, 1 / 2], 1 / 4)).toBe(2);
    expect(clefChangesReached([-1, 1 / 4, 1 / 2], 3 / 4)).toBe(3);
  });
});

describe('mergeClefChangeBeats', () => {
  it("sorts every staff's changes into one list", () => {
    expect(mergeClefChangeBeats([1 / 2], [1 / 4, 3 / 4])).toEqual([
      1 / 4,
      1 / 2,
      3 / 4,
    ]);
  });

  it('merges changes on the same beat, including tuplet float sums', () => {
    const tripletEnd = 1 / 12 + 1 / 12 + 1 / 12;
    expect(mergeClefChangeBeats([1 / 4], [tripletEnd])).toHaveLength(1);
  });

  it('keeps a leading change', () => {
    expect(mergeClefChangeBeats([-1], [1 / 2])).toEqual([-1, 1 / 2]);
  });
});

describe('sameClefChangeBeats', () => {
  it('compares within tolerance', () => {
    expect(sameClefChangeBeats([1 / 4], [1 / 12 + 1 / 12 + 1 / 12])).toBe(true);
    expect(sameClefChangeBeats([1 / 4], [1 / 2])).toBe(false);
    expect(sameClefChangeBeats([], [1 / 2])).toBe(false);
  });
});

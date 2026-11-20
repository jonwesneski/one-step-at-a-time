import {
  activeClefChangeIndex,
  barlineTypeConflicts,
  type MarkerBeat,
  markerBeat,
  markerWidthReached,
  mergeMarkerBeats,
  sameMarkerBeats,
  totalMarkerWidth,
} from './streamMarkerRules';

const clef = (beat: number, width = 40): MarkerBeat => ({
  beat,
  kind: 'clef',
  width,
  barlineType: null,
});

const barline = (
  beat: number,
  barlineType: MarkerBeat['barlineType'] = 'double',
  width = 20
): MarkerBeat => ({ beat, kind: 'barline', width, barlineType });

describe('markerBeat', () => {
  const voice1BeatEnds = [1 / 4, 1 / 2, 7 / 12];

  it('is -1 for a marker before the first entry', () => {
    expect(markerBeat(-1, voice1BeatEnds)).toBe(-1);
  });

  it('is the end of the voice-1 entry it follows', () => {
    expect(markerBeat(0, voice1BeatEnds)).toBe(1 / 4);
    expect(markerBeat(1, voice1BeatEnds)).toBe(1 / 2);
  });

  it('follows a tuplet-scaled entry to its scaled end', () => {
    expect(markerBeat(2, voice1BeatEnds)).toBeCloseTo(7 / 12);
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

describe('markerWidthReached', () => {
  it('sums the room of the markers at or before the beat', () => {
    const markers = [clef(-1), barline(1 / 4), clef(1 / 2)];
    expect(markerWidthReached(markers, 0)).toBe(40);
    expect(markerWidthReached(markers, 1 / 4)).toBe(60);
    expect(markerWidthReached(markers, 3 / 4)).toBe(100);
    expect(totalMarkerWidth(markers)).toBe(100);
  });
});

describe('mergeMarkerBeats', () => {
  it("sorts every staff's markers into one list", () => {
    expect(
      mergeMarkerBeats([clef(1 / 2)], [clef(1 / 4), barline(3 / 4)]).map(
        (marker) => marker.beat
      )
    ).toEqual([1 / 4, 1 / 2, 3 / 4]);
  });

  it('merges same-kind markers on the same beat, including tuplet float sums', () => {
    const tripletEnd = 1 / 12 + 1 / 12 + 1 / 12;
    expect(mergeMarkerBeats([clef(1 / 4)], [clef(tripletEnd)])).toHaveLength(1);
  });

  it('keeps a clef and a barline on one beat, in stream order', () => {
    expect(
      mergeMarkerBeats([clef(1 / 2), barline(1 / 2)], [barline(1 / 2)]).map(
        (marker) => marker.kind
      )
    ).toEqual(['clef', 'barline']);
    expect(
      mergeMarkerBeats([barline(1 / 2), clef(1 / 2)]).map(
        (marker) => marker.kind
      )
    ).toEqual(['barline', 'clef']);
  });

  it("keeps the first list's barline design", () => {
    const [merged] = mergeMarkerBeats(
      [barline(1 / 2, 'repeat-end')],
      [barline(1 / 2, 'double')]
    );
    expect(merged.barlineType).toBe('repeat-end');
  });

  it('keeps a leading marker', () => {
    expect(
      mergeMarkerBeats([clef(-1)], [clef(1 / 2)]).map((marker) => marker.beat)
    ).toEqual([-1, 1 / 2]);
  });
});

describe('barlineTypeConflicts', () => {
  it('reports two designs on one beat', () => {
    expect(
      barlineTypeConflicts(
        [barline(1 / 2, 'repeat-end')],
        [barline(1 / 2, 'double')]
      )
    ).toHaveLength(1);
  });

  it('accepts the same design written in several staves', () => {
    expect(
      barlineTypeConflicts([barline(1 / 2)], [barline(1 / 2)], [clef(1 / 2)])
    ).toEqual([]);
  });
});

describe('sameMarkerBeats', () => {
  it('compares beats within tolerance', () => {
    expect(
      sameMarkerBeats([clef(1 / 4)], [clef(1 / 12 + 1 / 12 + 1 / 12)])
    ).toBe(true);
    expect(sameMarkerBeats([clef(1 / 4)], [clef(1 / 2)])).toBe(false);
    expect(sameMarkerBeats([], [clef(1 / 2)])).toBe(false);
  });

  it('tells kinds and barline designs apart', () => {
    expect(sameMarkerBeats([clef(1 / 4)], [barline(1 / 4)])).toBe(false);
    expect(
      sameMarkerBeats([barline(1 / 4, 'double')], [barline(1 / 4, 'final')])
    ).toBe(false);
  });
});

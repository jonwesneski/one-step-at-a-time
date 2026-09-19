import { describe, expect, it } from 'vitest';
import {
  COVERAGE_THRESHOLD,
  computeBoxSelection,
  coverageRatio,
  intersects,
  type ElementRefMaps,
} from './selectionHelpers';
import {
  buildMultiVoiceStaff,
  buildSingleVoiceStaff,
} from './test-fixtures/voiceFixtures';
import type { CompositionStructure } from './types';

function rect(
  left: number,
  top: number,
  width: number,
  height: number
): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON() {
      return this;
    },
  } as DOMRect;
}

function fakeElement(r: DOMRect): HTMLElement {
  return { getBoundingClientRect: () => r } as unknown as HTMLElement;
}

function buildStructure(
  measureOrder: string[],
  measuresById: CompositionStructure['measuresById'],
  stavesById: CompositionStructure['stavesById']
): Pick<CompositionStructure, 'measureOrder' | 'measuresById' | 'stavesById'> {
  return { measureOrder, measuresById, stavesById };
}

function emptyRefs(): ElementRefMaps {
  return {
    measures: new Map(),
    staves: new Map(),
    entries: new Map(),
  };
}

describe('intersects', () => {
  it('returns true for overlapping rects', () => {
    expect(intersects(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toBe(true);
  });

  it('returns false for rects only touching at an edge', () => {
    expect(intersects(rect(0, 0, 10, 10), rect(10, 0, 10, 10))).toBe(false);
  });

  it('returns false for disjoint rects', () => {
    expect(intersects(rect(0, 0, 10, 10), rect(100, 100, 10, 10))).toBe(false);
  });
});

describe('coverageRatio', () => {
  it('is 1 when the drag rect fully contains the element', () => {
    expect(coverageRatio(rect(0, 0, 100, 100), rect(10, 10, 20, 20))).toBe(1);
  });

  it('is 0 for a zero-area element', () => {
    expect(coverageRatio(rect(0, 0, 100, 100), rect(10, 10, 0, 0))).toBe(0);
  });

  it('computes a partial ratio at the exact threshold boundary', () => {
    // Element is 10x10 (area 100); drag rect covers the left half (area 50).
    const ratio = coverageRatio(rect(0, 0, 5, 10), rect(0, 0, 10, 10));
    expect(ratio).toBeCloseTo(0.5);
    expect(ratio).toBeGreaterThanOrEqual(COVERAGE_THRESHOLD);
  });
});

describe('computeBoxSelection', () => {
  it('selects the single note directly when the composition has only one measure, staff, and note (no ambiguous promotion to measure)', () => {
    const structure = buildStructure(
      ['m1'],
      { m1: { id: 'm1', staffIds: ['s1'] } },
      {
        s1: buildSingleVoiceStaff('s1', ['e1']),
      }
    );
    const refs = emptyRefs();
    refs.measures.set('m1', fakeElement(rect(0, 0, 40, 60)));
    refs.staves.set('s1', fakeElement(rect(0, 0, 40, 60)));
    refs.entries.set('e1', fakeElement(rect(0, 0, 40, 60)));

    const result = computeBoxSelection(rect(0, 0, 40, 60), structure, refs);

    expect(result).toEqual({ measureIds: [], staffIds: [], entryIds: ['e1'] });
  });

  it('selects multiple measures at once when a drag box fully covers them', () => {
    const structure = buildStructure(
      ['m1', 'm2', 'm3'],
      {
        m1: { id: 'm1', staffIds: [] },
        m2: { id: 'm2', staffIds: [] },
        m3: { id: 'm3', staffIds: [] },
      },
      {}
    );
    const refs = emptyRefs();
    refs.measures.set('m1', fakeElement(rect(0, 0, 100, 50)));
    refs.measures.set('m2', fakeElement(rect(100, 0, 100, 50)));
    refs.measures.set('m3', fakeElement(rect(200, 0, 100, 50)));

    const result = computeBoxSelection(rect(0, 0, 300, 50), structure, refs);

    expect(result).toEqual({
      measureIds: ['m1', 'm2', 'm3'],
      staffIds: [],
      entryIds: [],
    });
  });

  it('selects a single staff of a multi-staff measure without selecting the measure', () => {
    const structure = buildStructure(
      ['m1'],
      { m1: { id: 'm1', staffIds: ['s1', 's2'] } },
      {
        s1: buildSingleVoiceStaff('s1', []),
        s2: buildSingleVoiceStaff('s2', [], { type: 'bass' }),
      }
    );
    const refs = emptyRefs();
    refs.measures.set('m1', fakeElement(rect(0, 0, 100, 100)));
    refs.staves.set('s1', fakeElement(rect(0, 0, 100, 40)));
    refs.staves.set('s2', fakeElement(rect(0, 40, 100, 60)));

    const result = computeBoxSelection(rect(0, 0, 100, 40), structure, refs);

    expect(result).toEqual({
      measureIds: [],
      staffIds: ['s1'],
      entryIds: [],
    });
  });

  it('selects a few notes within a staff without selecting the staff or measure', () => {
    const structure = buildStructure(
      ['m1'],
      { m1: { id: 'm1', staffIds: ['s1'] } },
      {
        s1: buildSingleVoiceStaff('s1', ['e1', 'e2', 'e3', 'e4', 'e5']),
      }
    );
    const refs = emptyRefs();
    refs.measures.set('m1', fakeElement(rect(0, 0, 95, 20)));
    refs.staves.set('s1', fakeElement(rect(0, 0, 95, 20)));
    refs.entries.set('e1', fakeElement(rect(0, 0, 15, 20)));
    refs.entries.set('e2', fakeElement(rect(20, 0, 15, 20)));
    refs.entries.set('e3', fakeElement(rect(40, 0, 15, 20)));
    refs.entries.set('e4', fakeElement(rect(60, 0, 15, 20)));
    refs.entries.set('e5', fakeElement(rect(80, 0, 15, 20)));

    const result = computeBoxSelection(rect(20, 0, 35, 20), structure, refs);

    expect(result).toEqual({
      measureIds: [],
      staffIds: [],
      entryIds: ['e2', 'e3'],
    });
  });

  it('marquee-selects notes from every voice in a staff, not just the first', () => {
    const structure = buildStructure(
      ['m1'],
      { m1: { id: 'm1', staffIds: ['s1'] } },
      {
        s1: buildMultiVoiceStaff('s1', [['e1'], ['e2']]),
      }
    );
    const refs = emptyRefs();
    refs.measures.set('m1', fakeElement(rect(0, 0, 40, 60)));
    refs.staves.set('s1', fakeElement(rect(0, 0, 40, 60)));
    refs.entries.set('e1', fakeElement(rect(0, 0, 15, 20)));
    refs.entries.set('e2', fakeElement(rect(0, 30, 15, 20)));

    const result = computeBoxSelection(rect(0, 0, 15, 50), structure, refs);

    expect(result.entryIds.sort()).toEqual(['e1', 'e2']);
  });

  it('returns an empty selection when the drag box intersects nothing', () => {
    const structure = buildStructure(
      ['m1'],
      { m1: { id: 'm1', staffIds: [] } },
      {}
    );
    const refs = emptyRefs();
    refs.measures.set('m1', fakeElement(rect(0, 0, 100, 100)));

    const result = computeBoxSelection(rect(500, 500, 10, 10), structure, refs);

    expect(result).toEqual({ measureIds: [], staffIds: [], entryIds: [] });
  });
});

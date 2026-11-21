import { describe, expect, it } from 'vitest';
import { entryFactor } from './measureCapacityHelpers';
import { rebar, REBAR_REPEATS_REASON } from './rebarHelpers';
import {
  hasRepeatData,
  rebarWouldDropRepeats,
  repeatWarnings,
  setMeasureRepeat,
} from './repeatsHelpers';
import { buildSingleVoiceStaff } from './test-fixtures/voiceFixtures';
import type { CompositionStructure, MusicEntry } from './types';

// `count` 4/4 bars on one staff, each holding a whole note.
function bars(count: number): CompositionStructure {
  const ids = Array.from({ length: count }, (_, i) => i);
  return {
    timeSig: '4/4',
    measureOrder: ids.map((i) => `m${i}`),
    measuresById: Object.fromEntries(
      ids.map((i) => [`m${i}`, { id: `m${i}`, staffIds: [`s${i}`] }])
    ),
    stavesById: Object.fromEntries(
      ids.map((i) => [`s${i}`, buildSingleVoiceStaff(`s${i}`, [`e${i}`])])
    ),
    entriesById: Object.fromEntries(
      ids.map((i) => [
        `e${i}`,
        { id: `e${i}`, type: 'note', value: 'C', duration: 'whole' },
      ])
    ),
    connectorsById: {},
    connectorOrder: [],
    tupletsById: {},
    octaveSpansById: {},
    tremolosById: {},
    arpeggiosById: {},
  };
}

function withRepeats(
  structure: CompositionStructure,
  patches: Record<string, Parameters<typeof setMeasureRepeat>[2]>
): CompositionStructure {
  return Object.entries(patches).reduce(
    (next, [id, patch]) => setMeasureRepeat(next, id, patch),
    structure
  );
}

describe('setMeasureRepeat', () => {
  it('sorts and de-duplicates ending passes', () => {
    const next = setMeasureRepeat(bars(1), 'm0', { ending: [2, 1, 2] });
    expect(next.measuresById.m0.ending).toEqual([1, 2]);
  });

  it('drops the ending label when the ending goes', () => {
    const labelled = setMeasureRepeat(bars(1), 'm0', {
      ending: [1],
      endingLabel: ' 1.–3. ',
    });
    expect(labelled.measuresById.m0.endingLabel).toBe('1.–3.');
    const cleared = setMeasureRepeat(labelled, 'm0', { ending: [] });
    expect(cleared.measuresById.m0.ending).toBeNull();
    expect(cleared.measuresById.m0.endingLabel).toBeNull();
  });

  it('returns the same structure when nothing changes', () => {
    const s = setMeasureRepeat(bars(1), 'm0', { repeatStart: true });
    expect(setMeasureRepeat(s, 'm0', { repeatStart: true })).toBe(s);
  });
});

describe('hasRepeatData', () => {
  it('is true for any repeat mark', () => {
    const s = setMeasureRepeat(bars(1), 'm0', { barline: 'final' });
    expect(hasRepeatData(s.measuresById.m0)).toBe(true);
    expect(hasRepeatData(bars(1).measuresById.m0)).toBe(false);
  });
});

describe('repeatWarnings', () => {
  it('is quiet for a well-formed 1st/2nd ending passage', () => {
    const s = withRepeats(bars(4), {
      m0: { repeatStart: true },
      m1: { ending: [1], barline: 'repeat-end' },
      m2: { ending: [2] },
    });
    expect(repeatWarnings(s, 'consecutive')).toEqual([]);
  });

  it("warns when a first ending doesn't end with an end repeat", () => {
    const s = withRepeats(bars(3), {
      m1: { ending: [1] },
      m2: { ending: [2] },
    });
    expect(repeatWarnings(s, 'consecutive').join('\n')).toMatch(
      /nowhere to return from/
    );
  });

  it('counts a mid-bar repeat barline as a repeat event', () => {
    // An end repeat after half a bar, then the next bar's end repeat with no
    // start between them.
    const s = bars(2);
    s.entriesById.e0 = { id: 'e0', type: 'note', value: 'C', duration: 'half' };
    s.entriesById.b0 = { id: 'b0', type: 'barline', barlineType: 'repeat-end' };
    s.entriesById.e9 = { id: 'e9', type: 'note', value: 'C', duration: 'half' };
    s.stavesById.s0 = buildSingleVoiceStaff('s0', ['e0', 'b0', 'e9']);
    const warned = withRepeats(s, { m1: { barline: 'repeat-end' } });
    expect(repeatWarnings(warned, 'consecutive').join('\n')).toMatch(
      /no start repeat/
    );
  });
});

describe('mid-bar barline entries', () => {
  it('take no beat time', () => {
    const barline: MusicEntry = {
      id: 'b',
      type: 'barline',
      barlineType: 'double',
    };
    expect(entryFactor(barline, { tupletsById: {}, entriesById: {} })).toBe(0);
  });
});

describe('rebar with repeats', () => {
  it('keeps the region’s outer repeat marks', () => {
    const s = withRepeats(bars(2), {
      m0: { repeatStart: true },
      m1: { barline: 'repeat-end' },
    });
    const { structure: out, rebarred } = rebar({ ...s, timeSig: '2/4' }, 0);
    expect(rebarred).toBe(true);
    const measures = out.measureOrder.map((id) => out.measuresById[id]);
    expect(measures[0].repeatStart).toBe(true);
    expect(measures[measures.length - 1].barline).toBe('repeat-end');
    expect(measures.slice(1).some((m) => m.repeatStart)).toBe(false);
  });

  it('refuses to rewrite repeats or endings inside the region', () => {
    const s = withRepeats(bars(3), { m1: { ending: [1] } });
    expect(rebarWouldDropRepeats(s, 0, 3)).toBe(true);
    const result = rebar({ ...s, timeSig: '2/4' }, 0);
    expect(result.rebarred).toBe(false);
    expect(result.reason).toBe(REBAR_REPEATS_REASON);
  });
});

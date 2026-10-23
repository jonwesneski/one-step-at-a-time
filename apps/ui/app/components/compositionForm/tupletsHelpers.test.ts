import { describe, expect, it } from 'vitest';
import {
  buildMultiVoiceStaff,
  buildSingleVoiceStaff,
} from './test-fixtures/voiceFixtures';
import {
  crossStaffTupletCandidate,
  crossStaffTupletOf,
  pruneInvalidCrossStaffTuplets,
  resolveTupletRuns,
  setCrossStaffTuplet,
  setTuplet,
  setTupletPlacement,
  tupletCandidate,
} from './tupletsHelpers';
import type { CompositionStructure, MusicEntry, Selection } from './types';
import { isPitchedEntry } from './types';

const tupletIdOf = (
  entriesById: Record<string, MusicEntry>,
  id: string
): string | null | undefined => {
  const entry = entriesById[id];
  return isPitchedEntry(entry) ? entry.tupletId : null;
};

const note = (id: string, tupletId?: string | null): MusicEntry => ({
  id,
  type: 'note',
  value: 'C',
  duration: 'eighth',
  ...(tupletId !== undefined ? { tupletId } : {}),
});

function buildStructure(): CompositionStructure {
  return {
    timeSig: '4/4',
    measureOrder: ['m1'],
    measuresById: { m1: { id: 'm1', staffIds: ['s1', 's2'] } },
    stavesById: {
      s1: buildSingleVoiceStaff('s1', ['e1', 'e2', 'e3', 'e4']),
      s2: buildSingleVoiceStaff('s2', ['e5', 'e6'], { type: 'bass' }),
    },
    entriesById: {
      e1: note('e1'),
      e2: note('e2'),
      e3: note('e3'),
      e4: note('e4'),
      e5: note('e5'),
      e6: note('e6'),
    },
    connectorsById: {},
    connectorOrder: [],
    octaveSpansById: {},
    tupletsById: {},
  };
}

const sel = (
  entryIds: string[],
  patch: Partial<Selection> = {}
): Selection => ({
  measureIds: [],
  staffIds: [],
  entryIds,
  ...patch,
});

describe('resolveTupletRuns', () => {
  it('splits a staff into loose and tuplet runs', () => {
    const entriesById: Record<string, MusicEntry> = {
      e1: note('e1'),
      e2: note('e2', 't1'),
      e3: note('e3', 't1'),
      e4: note('e4'),
    };
    const runs = resolveTupletRuns(['e1', 'e2', 'e3', 'e4'], entriesById);
    expect(runs.map((r) => r.tupletId)).toEqual([null, 't1', null]);
    expect(runs[1].entries.map((e) => e.id)).toEqual(['e2', 'e3']);
  });

  it('breaks a tuplet run at a clef entry', () => {
    const entriesById: Record<string, MusicEntry> = {
      e1: note('e1', 't1'),
      c1: { id: 'c1', type: 'clef', clef: 'bass' },
      e2: note('e2', 't1'),
    };
    const runs = resolveTupletRuns(['e1', 'c1', 'e2'], entriesById);
    expect(runs.map((r) => r.tupletId)).toEqual(['t1', null, 't1']);
  });
});

describe('tupletCandidate', () => {
  it('accepts 2+ contiguous entries in one staff', () => {
    expect(tupletCandidate(sel(['e2', 'e3']), buildStructure())).toEqual({
      staffId: 's1',
      voiceId: 's1-v1',
      entryIds: ['e2', 'e3'],
    });
  });

  it('rejects a non-contiguous selection', () => {
    expect(tupletCandidate(sel(['e1', 'e3']), buildStructure())).toBeNull();
  });

  it('rejects a cross-staff selection', () => {
    expect(tupletCandidate(sel(['e4', 'e5']), buildStructure())).toBeNull();
  });

  it('rejects a single entry and rejects when a measure is also selected', () => {
    expect(tupletCandidate(sel(['e1']), buildStructure())).toBeNull();
    expect(
      tupletCandidate(
        sel(['e1', 'e2'], { measureIds: ['m1'] }),
        buildStructure()
      )
    ).toBeNull();
  });

  it('rejects a contiguous run split across two voices of the same staff', () => {
    const structure: CompositionStructure = {
      timeSig: '4/4',
      measureOrder: ['m1'],
      measuresById: { m1: { id: 'm1', staffIds: ['s1'] } },
      stavesById: {
        s1: buildMultiVoiceStaff('s1', [
          ['e1', 'e2'],
          ['e3', 'e4'],
        ]),
      },
      entriesById: {
        e1: note('e1'),
        e2: note('e2'),
        e3: note('e3'),
        e4: note('e4'),
      },
      connectorsById: {},
      connectorOrder: [],
      octaveSpansById: {},
      tupletsById: {},
    };
    expect(tupletCandidate(sel(['e2', 'e3']), structure)).toBeNull();
    // The genuinely contiguous run within one voice still works.
    expect(tupletCandidate(sel(['e1', 'e2']), structure)).toEqual({
      staffId: 's1',
      voiceId: 's1-v1',
      entryIds: ['e1', 'e2'],
    });
  });
});

describe('setTuplet', () => {
  it('creates a tuplet and stamps every member', () => {
    const next = setTuplet(buildStructure(), ['e1', 'e2', 'e3'], '3');
    const ids = ['e1', 'e2', 'e3'].map((id) =>
      tupletIdOf(next.entriesById, id)
    );
    expect(new Set(ids).size).toBe(1);
    expect(ids[0]).toBeTruthy();
    expect(Object.values(next.tupletsById)[0].ratio).toBe('3');
  });

  it('re-ratios in place, replacing the old tuplet', () => {
    let next = setTuplet(buildStructure(), ['e1', 'e2'], '3');
    next = setTuplet(next, ['e1', 'e2'], '5');
    expect(Object.keys(next.tupletsById)).toHaveLength(1);
    expect(Object.values(next.tupletsById)[0].ratio).toBe('5');
  });

  it('removes the tuplet and clears every member, even ones not re-selected', () => {
    let next = setTuplet(buildStructure(), ['e1', 'e2', 'e3'], '3');
    next = setTuplet(next, ['e1', 'e2'], null);
    expect(next.tupletsById).toEqual({});
    expect(tupletIdOf(next.entriesById, 'e3')).toBeNull();
  });
});

describe('setTupletPlacement', () => {
  it('sets and clears the bracket side', () => {
    const withTuplet = setTuplet(buildStructure(), ['e1', 'e2', 'e3'], '3');
    const tupletId = tupletIdOf(withTuplet.entriesById, 'e1') as string;

    const above = setTupletPlacement(withTuplet, tupletId, 'above');
    expect(above.tupletsById[tupletId].placement).toBe('above');

    const cleared = setTupletPlacement(above, tupletId, null);
    expect(cleared.tupletsById[tupletId].placement).toBeNull();
  });

  it('returns the structure unchanged for an unknown tuplet or no-op', () => {
    const structure = buildStructure();
    expect(setTupletPlacement(structure, 'missing', 'above')).toBe(structure);
  });

  it('keeps the bracket side when the tuplet is re-ratioed', () => {
    const withTuplet = setTuplet(buildStructure(), ['e1', 'e2', 'e3'], '3');
    const tupletId = tupletIdOf(withTuplet.entriesById, 'e1') as string;
    const below = setTupletPlacement(withTuplet, tupletId, 'below');

    const reRatioed = setTuplet(below, ['e1', 'e2', 'e3'], '5');
    const newId = tupletIdOf(reRatioed.entriesById, 'e1') as string;
    expect(reRatioed.tupletsById[newId]).toMatchObject({
      ratio: '5',
      placement: 'below',
    });
  });
});

describe('cross-staff tuplets', () => {
  // 2/4, like the library's CrossStaffTupletWithoutBeam story:
  //   treble s1: A G (quarters) + rest  |  bass s2: half rest + F (quarter)
  function buildCrossStaff(): CompositionStructure {
    return {
      timeSig: '2/4',
      measureOrder: ['m1'],
      measuresById: { m1: { id: 'm1', staffIds: ['s1', 's2'] } },
      stavesById: {
        s1: buildSingleVoiceStaff('s1', ['a', 'g', 'r1']),
        s2: buildSingleVoiceStaff('s2', ['r2', 'f'], { type: 'bass' }),
      },
      entriesById: {
        a: { id: 'a', type: 'note', value: 'A', duration: 'quarter' },
        g: { id: 'g', type: 'note', value: 'G', duration: 'quarter' },
        r1: { id: 'r1', type: 'rest', duration: 'quarter' },
        r2: { id: 'r2', type: 'rest', duration: 'half' },
        f: { id: 'f', type: 'note', value: 'F', duration: 'quarter' },
      },
      connectorsById: {},
      connectorOrder: [],
      tupletsById: {},
      octaveSpansById: {},
    };
  }
  const both: Selection = {
    measureIds: [],
    staffIds: [],
    entryIds: ['f', 'a', 'g', 'r1', 'r2'],
  };

  it('pairs one run per adjacent staff, top first', () => {
    const candidate = crossStaffTupletCandidate(both, buildCrossStaff());
    expect(candidate).toEqual({
      measureId: 'm1',
      runs: [
        { staffId: 's1', voiceId: 's1-v1', entryIds: ['a', 'g', 'r1'] },
        { staffId: 's2', voiceId: 's2-v1', entryIds: ['r2', 'f'] },
      ],
    });
  });

  it('rejects unequal totals and a staff with only rests', () => {
    const structure = buildCrossStaff();
    expect(
      crossStaffTupletCandidate(
        { ...both, entryIds: ['a', 'g', 'r2', 'f'] },
        structure
      )
    ).toBeNull();
    structure.entriesById.f = { id: 'f', type: 'rest', duration: 'quarter' };
    expect(crossStaffTupletCandidate(both, structure)).toBeNull();
  });

  it('links two tuplets and hides the rests; removing undoes both', () => {
    const structure = buildCrossStaff();
    const candidate = crossStaffTupletCandidate(both, structure)!;
    const linked = setCrossStaffTuplet(structure, candidate, '3');
    const pair = crossStaffTupletOf(linked, candidate);
    expect(pair).not.toBeNull();
    expect(pair![0].crossStaffGroupId).toBe(pair![1].crossStaffGroupId);
    expect(linked.entriesById.r1).toMatchObject({ hidden: true });
    expect(linked.entriesById.r2).toMatchObject({ hidden: true });

    const removed = setCrossStaffTuplet(linked, candidate, null);
    expect(removed.tupletsById).toEqual({});
    expect(removed.entriesById.r1).toMatchObject({ hidden: false });
  });

  it('keeps rests visible when asked', () => {
    const structure = buildCrossStaff();
    const candidate = crossStaffTupletCandidate(both, structure)!;
    const linked = setCrossStaffTuplet(structure, candidate, '3', {
      hideRests: false,
    });
    expect(linked.entriesById.r1).not.toMatchObject({ hidden: true });
  });

  it('unlinks when one side no longer matches', () => {
    const structure = buildCrossStaff();
    const candidate = crossStaffTupletCandidate(both, structure)!;
    const linked = setCrossStaffTuplet(structure, candidate, '3');
    expect(pruneInvalidCrossStaffTuplets(linked)).toBe(linked);

    const reRatioed = pruneInvalidCrossStaffTuplets(
      setTuplet(linked, ['a', 'g', 'r1'], '5')
    );
    expect(crossStaffTupletOf(reRatioed, candidate)).toBeNull();
    expect(
      Object.values(reRatioed.tupletsById).every((t) => !t.crossStaffGroupId)
    ).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import {
  adjacentStaffPair,
  canShareDynamic,
  entryOnset,
  isSharedStem,
  pruneInvalidSharedStems,
  setSharedStem,
  sharedStemCandidate,
  sharedStemProblem,
} from './crossStaffHelpers';
import { applyEntryUpdate } from './entryEditsHelpers';
import { moveEntryInVoice } from './reorderHelpers';
import {
  buildMultiVoiceStaff,
  buildSingleVoiceStaff,
} from './test-fixtures/voiceFixtures';
import type { CompositionStructure, NoteEntry } from './types';

function buildStructure(): CompositionStructure {
  return {
    timeSig: '4/4',
    measureOrder: ['m1', 'm2'],
    measuresById: {
      m1: { id: 'm1', staffIds: ['s1', 's2', 's3'] },
      m2: { id: 'm2', staffIds: ['s4'] },
    },
    stavesById: {
      s1: buildSingleVoiceStaff('s1', ['e1', 'e2', 'e3']),
      s2: buildSingleVoiceStaff('s2', ['e4', 'e5'], { type: 'bass' }),
      s3: buildSingleVoiceStaff('s3', ['e6'], { type: 'bass' }),
      s4: buildSingleVoiceStaff('s4', ['e7']),
    },
    entriesById: {
      e1: { id: 'e1', type: 'note', value: 'C', duration: 'quarter' },
      e2: {
        id: 'e2',
        type: 'note',
        value: 'D',
        duration: 'eighth',
        tupletId: 't1',
      },
      e3: {
        id: 'e3',
        type: 'note',
        value: 'E',
        duration: 'eighth',
        tupletId: 't1',
      },
      e4: { id: 'e4', type: 'rest', duration: 'half' },
      e5: {
        id: 'e5',
        type: 'note',
        value: 'G',
        duration: 'quarter',
        dynamic: 'p',
      },
      e6: { id: 'e6', type: 'note', value: 'A', duration: 'quarter' },
      e7: {
        id: 'e7',
        type: 'note',
        value: 'B',
        duration: 'quarter',
        dynamic: 'f',
      },
    },
    connectorsById: {
      c1: { id: 'c1', kind: 'crescendo', startEntryId: 'e6', endEntryId: 'e7' },
    },
    connectorOrder: ['c1'],
    octaveSpansById: {},
    tupletsById: { t1: { id: 't1', ratio: '3' } },
  };
}

describe('entryOnset', () => {
  it('sums tuplet-scaled durations before the entry in its own voice', () => {
    const structure = buildStructure();
    expect(entryOnset(structure, 'e1')).toBe(0);
    expect(entryOnset(structure, 'e2')).toBe(0.25);
    expect(entryOnset(structure, 'e3')).toBeCloseTo(0.25 + 0.125 * (2 / 3));
    expect(entryOnset(structure, 'e5')).toBe(0.5);
  });

  it('returns null for an unknown entry', () => {
    expect(entryOnset(buildStructure(), 'missing')).toBeNull();
  });
});

describe('adjacentStaffPair', () => {
  it('orders adjacent staves top to bottom', () => {
    expect(adjacentStaffPair(buildStructure(), 'm1', 's2', 's1')).toEqual({
      topStaffId: 's1',
      bottomStaffId: 's2',
    });
  });

  it('rejects non-adjacent staves and staves outside the measure', () => {
    const structure = buildStructure();
    expect(adjacentStaffPair(structure, 'm1', 's1', 's3')).toBeNull();
    expect(adjacentStaffPair(structure, 'm1', 's1', 's4')).toBeNull();
  });
});

describe('canShareDynamic', () => {
  it('allows an entry with a dynamic or a hairpin start on a multi-staff measure', () => {
    const structure = buildStructure();
    expect(canShareDynamic(structure, 'e5')).toBe(true);
    expect(canShareDynamic(structure, 'e6')).toBe(true);
  });

  it('rejects entries with nothing to share, rests, and single-staff measures', () => {
    const structure = buildStructure();
    expect(canShareDynamic(structure, 'e1')).toBe(false);
    expect(canShareDynamic(structure, 'e4')).toBe(false);
    expect(canShareDynamic(structure, 'e7')).toBe(false);
  });
});

describe('shared stems', () => {
  // m1: treble s1 [u1(q) u2(q) u3(8th)], bass s2 [l1(q) l2(h)]
  function buildPair(): CompositionStructure {
    return {
      timeSig: '4/4',
      measureOrder: ['m1'],
      measuresById: { m1: { id: 'm1', staffIds: ['s1', 's2'] } },
      stavesById: {
        s1: buildSingleVoiceStaff('s1', ['u1', 'u2', 'u3']),
        s2: buildSingleVoiceStaff('s2', ['l1', 'l2'], { type: 'bass' }),
      },
      entriesById: {
        u1: { id: 'u1', type: 'note', value: 'E', duration: 'quarter' },
        u2: { id: 'u2', type: 'note', value: 'F', duration: 'quarter' },
        u3: { id: 'u3', type: 'note', value: 'G', duration: 'eighth' },
        l1: { id: 'l1', type: 'note', value: 'E', duration: 'quarter' },
        l2: { id: 'l2', type: 'note', value: 'C', duration: 'half' },
      },
      connectorsById: {},
      connectorOrder: [],
      tupletsById: {},
      octaveSpansById: {},
    };
  }
  const select = (entryIds: string[]) => ({
    measureIds: [],
    staffIds: [],
    entryIds,
  });
  const pair = { upperEntryId: 'u1', lowerEntryId: 'l1' };

  it('orders a two-staff selection top to bottom', () => {
    expect(sharedStemCandidate(select(['l1', 'u1']), buildPair())).toEqual({
      measureId: 'm1',
      ...pair,
    });
    expect(sharedStemCandidate(select(['u1', 'u2']), buildPair())).toBeNull();
  });

  it('explains why a pair cannot share a stem', () => {
    const structure = buildPair();
    expect(sharedStemProblem(structure, pair)).toBeNull();
    expect(
      sharedStemProblem(structure, { upperEntryId: 'u2', lowerEntryId: 'l1' })
    ).toMatch(/same beat/);
    expect(
      sharedStemProblem(structure, { upperEntryId: 'u2', lowerEntryId: 'l2' })
    ).toMatch(/same duration/);
  });

  it('links the lower entry to the upper one, and separates again', () => {
    const joined = setSharedStem(buildPair(), pair, true);
    expect(joined.entriesById.l1).toMatchObject({
      sharedStemWithEntryId: 'u1',
    });
    expect(isSharedStem(joined, pair)).toBe(true);
    const separated = setSharedStem(joined, pair, false);
    expect(isSharedStem(separated, pair)).toBe(false);
  });

  it('refuses a second pairing for the same note', () => {
    const structure = buildPair();
    structure.stavesById.s2 = buildMultiVoiceStaff(
      's2',
      [['l1', 'l2'], ['l3']],
      { type: 'bass' }
    );
    structure.entriesById.l3 = {
      id: 'l3',
      type: 'note',
      value: 'G',
      duration: 'quarter',
    };
    const joined = setSharedStem(structure, pair, true);
    const other = { upperEntryId: 'u1', lowerEntryId: 'l3' };
    expect(sharedStemProblem(structure, other)).toBeNull();
    expect(sharedStemProblem(joined, other)).toMatch(/already shares/);
  });

  it('is dropped once the notes no longer coincide', () => {
    const joined = setSharedStem(buildPair(), pair, true);
    const moved = moveEntryInVoice(joined, 's1', 's1-v1', 'u1', 2);
    expect(isSharedStem(moved, pair)).toBe(false);
    const lengthened = applyEntryUpdate(joined, {
      ...(joined.entriesById.u1 as NoteEntry),
      duration: 'eighth',
    });
    expect(isSharedStem(lengthened, pair)).toBe(false);
    expect(pruneInvalidSharedStems(joined)).toBe(joined);
  });
});

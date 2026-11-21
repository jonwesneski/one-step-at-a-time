import { describe, expect, it } from 'vitest';
import {
  arpeggioCandidate,
  arpeggioOf,
  pruneInvalidArpeggios,
  setArpeggio,
  updateArpeggio,
} from './arpeggiosHelpers';
import { usedDuration } from './measureCapacityHelpers';
import { buildSingleVoiceStaff } from './test-fixtures/voiceFixtures';
import type { CompositionStructure, MusicEntry } from './types';

// C E G (32nds) running into a C-major chord (quarter), then a quarter rest.
function buildStructure(): CompositionStructure {
  const entries: MusicEntry[] = [
    { id: 'c', type: 'note', value: 'C', duration: 'thirtysecond' },
    { id: 'e', type: 'note', value: 'E', duration: 'thirtysecond' },
    { id: 'g', type: 'note', value: 'G', duration: 'thirtysecond' },
    {
      id: 'chord',
      type: 'chord',
      notes: [{ value: 'C' }, { value: 'E' }, { value: 'G' }],
      duration: 'quarter',
    },
    { id: 'r', type: 'rest', duration: 'quarter' },
  ];
  return {
    timeSig: '4/4',
    measureOrder: ['m1'],
    measuresById: { m1: { id: 'm1', staffIds: ['s1'] } },
    stavesById: {
      s1: buildSingleVoiceStaff('s1', ['c', 'e', 'g', 'chord', 'r']),
    },
    entriesById: Object.fromEntries(entries.map((e) => [e.id, e])),
    connectorsById: {},
    connectorOrder: [],
    tupletsById: {},
    octaveSpansById: {},
    tremolosById: {},
    arpeggiosById: {},
  };
}

const select = (entryIds: string[]) => ({
  measureIds: [],
  staffIds: [],
  entryIds,
});

describe('arpeggioCandidate', () => {
  it('reads the run notes and the chord they lead to', () => {
    expect(
      arpeggioCandidate(select(['c', 'e', 'g', 'chord']), buildStructure())
    ).toMatchObject({
      runEntryIds: ['c', 'e', 'g'],
      targetEntryId: 'chord',
      problem: null,
    });
  });

  it('needs a note or chord as the target', () => {
    expect(
      arpeggioCandidate(select(['chord', 'r']), buildStructure())?.problem
    ).toMatch(/last selected entry/);
  });
});

describe('setArpeggio', () => {
  it('takes the run out of the beat count', () => {
    const s = buildStructure();
    const candidate = arpeggioCandidate(select(['c', 'e', 'g', 'chord']), s)!;
    const next = setArpeggio(s, candidate, {});
    const voice = ['c', 'e', 'g', 'chord', 'r'].map(
      (id) => next.entriesById[id]
    );
    expect(usedDuration(voice, next)).toBeCloseTo(0.5);
    expect(arpeggioOf(next, candidate)?.targetEntryId).toBe('chord');
  });

  it('removes the arpeggio', () => {
    const s = buildStructure();
    const candidate = arpeggioCandidate(select(['c', 'e', 'g', 'chord']), s)!;
    const removed = setArpeggio(setArpeggio(s, candidate, {}), candidate, null);
    expect(arpeggioOf(removed, candidate)).toBeNull();
    expect(removed.entriesById.c).toMatchObject({ arpeggioId: null });
  });

  it('updates its options', () => {
    const s = buildStructure();
    const candidate = arpeggioCandidate(select(['c', 'e', 'g', 'chord']), s)!;
    const created = setArpeggio(s, candidate, {});
    const id = arpeggioOf(created, candidate)!.id;
    expect(
      updateArpeggio(created, id, { unmatched: 'skip' }).arpeggiosById[id]
        .unmatched
    ).toBe('skip');
  });
});

describe('pruneInvalidArpeggios', () => {
  it('dissolves an arpeggio whose run is no longer right before its target', () => {
    const s = buildStructure();
    const candidate = arpeggioCandidate(select(['c', 'e', 'g', 'chord']), s)!;
    const created = setArpeggio(s, candidate, {});
    const moved: CompositionStructure = {
      ...created,
      stavesById: {
        s1: buildSingleVoiceStaff('s1', ['c', 'e', 'r', 'g', 'chord']),
      },
    };
    const pruned = pruneInvalidArpeggios(moved);
    expect(Object.keys(pruned.arpeggiosById)).toEqual([]);
    expect(pruned.entriesById.c).toMatchObject({ arpeggioId: null });
  });

  it('dissolves an arpeggio whose target is gone', () => {
    const s = buildStructure();
    const candidate = arpeggioCandidate(select(['c', 'e', 'g', 'chord']), s)!;
    const created = setArpeggio(s, candidate, {});
    const withoutTarget: CompositionStructure = {
      ...created,
      stavesById: { s1: buildSingleVoiceStaff('s1', ['c', 'e', 'g', 'r']) },
    };
    expect(
      Object.keys(pruneInvalidArpeggios(withoutTarget).arpeggiosById)
    ).toEqual([]);
  });
});

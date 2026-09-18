import type { Note } from '@one-step-at-a-time/web-components';
import { describe, expect, it } from 'vitest';
import { moveEntryInVoice } from './reorderHelpers';
import {
  buildMultiVoiceStaff,
  buildSingleVoiceStaff,
} from './test-fixtures/voiceFixtures';
import type { CompositionStructure, MusicEntry, NoteEntry } from './types';

const voiceId = 's1-v1';

function structure(
  entryIds: string[],
  entriesById: Record<string, MusicEntry>,
  extra: Partial<CompositionStructure> = {}
): CompositionStructure {
  return {
    timeSig: '4/4',
    measureOrder: ['m1'],
    measuresById: { m1: { id: 'm1', staffIds: ['s1'] } },
    stavesById: {
      s1: buildSingleVoiceStaff('s1', entryIds),
    },
    entriesById,
    connectorsById: {},
    connectorOrder: [],
    tupletsById: {},
    ...extra,
  };
}

const note = (id: string, value: Note = 'C'): NoteEntry => ({
  id,
  type: 'note',
  value,
  duration: 'quarter',
});

describe('moveEntryInVoice', () => {
  it('splices the entry to its new position', () => {
    const next = moveEntryInVoice(
      structure(['a', 'b', 'c'], {
        a: note('a'),
        b: note('b'),
        c: note('c'),
      }),
      's1',
      voiceId,
      'a',
      2
    );
    expect(next.stavesById.s1.voicesById[voiceId].entryIds).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('moves an entry to the end', () => {
    const next = moveEntryInVoice(
      structure(['a', 'b', 'c'], {
        a: note('a'),
        b: note('b'),
        c: note('c'),
      }),
      's1',
      voiceId,
      'a',
      3
    );
    expect(next.stavesById.s1.voicesById[voiceId].entryIds).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('returns the same structure reference for a no-op move', () => {
    const s = structure(['a', 'b', 'c'], {
      a: note('a'),
      b: note('b'),
      c: note('c'),
    });
    expect(moveEntryInVoice(s, 's1', voiceId, 'a', 1)).toBe(s);
    expect(moveEntryInVoice(s, 's1', voiceId, 'missing', 2)).toBe(s);
  });

  it('keeps a tuplet whose run stays contiguous', () => {
    const next = moveEntryInVoice(
      structure(
        ['a', 'b', 'c', 'd'],
        {
          a: note('a'),
          b: { ...note('b'), tupletId: 't' },
          c: { ...note('c'), tupletId: 't' },
          d: note('d'),
        },
        { tupletsById: { t: { id: 't', ratio: '3:2' } } }
      ),
      's1',
      voiceId,
      'a',
      4
    );
    expect(next.stavesById.s1.voicesById[voiceId].entryIds).toEqual([
      'b',
      'c',
      'd',
      'a',
    ]);
    expect(next.tupletsById.t).toBeDefined();
    expect(next.entriesById.b).toMatchObject({ tupletId: 't' });
  });

  it('dissolves a tuplet when the move breaks its run', () => {
    const next = moveEntryInVoice(
      structure(
        ['a', 'b', 'c', 'd'],
        {
          a: note('a'),
          b: { ...note('b'), tupletId: 't' },
          c: { ...note('c'), tupletId: 't' },
          d: note('d'),
        },
        { tupletsById: { t: { id: 't', ratio: '3:2' } } }
      ),
      's1',
      voiceId,
      'd',
      2
    );
    expect(next.stavesById.s1.voicesById[voiceId].entryIds).toEqual([
      'a',
      'b',
      'd',
      'c',
    ]);
    expect(next.tupletsById.t).toBeUndefined();
    expect(next.entriesById.b).toMatchObject({ tupletId: null });
    expect(next.entriesById.c).toMatchObject({ tupletId: null });
  });

  it('swaps a connector’s endpoints when the move inverts their order', () => {
    const next = moveEntryInVoice(
      structure(
        ['a', 'b'],
        { a: note('a'), b: note('b') },
        {
          connectorsById: {
            t1: { id: 't1', kind: 'tie', startEntryId: 'a', endEntryId: 'b' },
          },
          connectorOrder: ['t1'],
        }
      ),
      's1',
      voiceId,
      'a',
      2
    );
    expect(next.stavesById.s1.voicesById[voiceId].entryIds).toEqual(['b', 'a']);
    expect(next.connectorsById.t1).toMatchObject({
      startEntryId: 'b',
      endEntryId: 'a',
    });
  });

  it('prunes a tie whose endpoints are no longer adjacent', () => {
    const next = moveEntryInVoice(
      structure(
        ['a', 'b', 'c'],
        { a: note('a'), b: note('b'), c: note('c') },
        {
          connectorsById: {
            t1: { id: 't1', kind: 'tie', startEntryId: 'a', endEntryId: 'b' },
          },
          connectorOrder: ['t1'],
        }
      ),
      's1',
      voiceId,
      'c',
      1
    );
    expect(next.stavesById.s1.voicesById[voiceId].entryIds).toEqual([
      'a',
      'c',
      'b',
    ]);
    expect(next.connectorOrder).toEqual([]);
  });

  it('reordering one voice never touches another voice in the same staff', () => {
    const s: CompositionStructure = {
      timeSig: '4/4',
      measureOrder: ['m1'],
      measuresById: { m1: { id: 'm1', staffIds: ['s1'] } },
      stavesById: {
        s1: buildMultiVoiceStaff('s1', [
          ['a', 'b', 'c'],
          ['x', 'y'],
        ]),
      },
      entriesById: {
        a: note('a'),
        b: note('b'),
        c: note('c'),
        x: note('x'),
        y: note('y'),
      },
      connectorsById: {},
      connectorOrder: [],
      tupletsById: {},
    };
    const next = moveEntryInVoice(s, 's1', 's1-v1', 'a', 2);
    expect(next.stavesById.s1.voicesById['s1-v1'].entryIds).toEqual([
      'b',
      'a',
      'c',
    ]);
    expect(next.stavesById.s1.voicesById['s1-v2'].entryIds).toEqual(['x', 'y']);
  });
});

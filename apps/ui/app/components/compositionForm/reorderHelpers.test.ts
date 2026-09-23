import type { Note } from '@one-step-at-a-time/web-components';
import { describe, expect, it } from 'vitest';
import { moveEntryInVoice, moveEntryToVoice } from './reorderHelpers';
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

describe('moveEntryToVoice', () => {
  function twoVoiceStructure(
    voiceEntryIds: string[][],
    entriesById: Record<string, MusicEntry>,
    extra: Partial<CompositionStructure> = {}
  ): CompositionStructure {
    return {
      timeSig: '4/4',
      measureOrder: ['m1'],
      measuresById: { m1: { id: 'm1', staffIds: ['s1'] } },
      stavesById: { s1: buildMultiVoiceStaff('s1', voiceEntryIds) },
      entriesById,
      connectorsById: {},
      connectorOrder: [],
      tupletsById: {},
      ...extra,
    };
  }

  it('moves an entry from one voice to the end of another', () => {
    const s = twoVoiceStructure([['a', 'b'], ['x']], {
      a: note('a'),
      b: note('b'),
      x: note('x'),
    });
    const next = moveEntryToVoice(s, 's1', 'a', 's1-v1', 's1-v2');
    expect(next.stavesById.s1.voicesById['s1-v1'].entryIds).toEqual(['b']);
    expect(next.stavesById.s1.voicesById['s1-v2'].entryIds).toEqual(['x', 'a']);
  });

  it('clears the moved entry’s tupletId', () => {
    const s = twoVoiceStructure(
      [['a', 'b'], ['x']],
      {
        a: { ...note('a'), tupletId: 't' },
        b: { ...note('b'), tupletId: 't' },
        x: note('x'),
      },
      { tupletsById: { t: { id: 't', ratio: '3' } } }
    );
    const next = moveEntryToVoice(s, 's1', 'a', 's1-v1', 's1-v2');
    expect(next.entriesById.a).toMatchObject({ tupletId: null });
  });

  it('dissolves a tuplet run broken in the source voice by the move', () => {
    const s = twoVoiceStructure(
      [['a', 'b', 'c'], ['x']],
      {
        a: note('a'),
        b: { ...note('b'), tupletId: 't' },
        c: { ...note('c'), tupletId: 't' },
        x: note('x'),
      },
      { tupletsById: { t: { id: 't', ratio: '3' } } }
    );
    const next = moveEntryToVoice(s, 's1', 'b', 's1-v1', 's1-v2');
    expect(next.tupletsById.t).toBeUndefined();
    expect(next.entriesById.c).toMatchObject({ tupletId: null });
  });

  it('drops the source voice when the move leaves it empty (and it is not voice 1)', () => {
    const s = twoVoiceStructure([['a'], ['x']], {
      a: note('a'),
      x: note('x'),
    });
    const next = moveEntryToVoice(s, 's1', 'x', 's1-v2', 's1-v1');
    expect(next.stavesById.s1.voiceOrder).toEqual(['s1-v1']);
    expect(next.stavesById.s1.voicesById).not.toHaveProperty('s1-v2');
    expect(next.stavesById.s1.voicesById['s1-v1'].entryIds).toEqual(['a', 'x']);
  });

  it('never drops voice 1 even when emptied by the move', () => {
    const s = twoVoiceStructure([['a'], ['x']], {
      a: note('a'),
      x: note('x'),
    });
    const next = moveEntryToVoice(s, 's1', 'a', 's1-v1', 's1-v2');
    expect(next.stavesById.s1.voiceOrder).toEqual(['s1-v1', 's1-v2']);
    expect(next.stavesById.s1.voicesById['s1-v1'].entryIds).toEqual([]);
  });

  it('prunes a tie that is no longer same-voice-adjacent after the move', () => {
    const s = twoVoiceStructure(
      [['a', 'b'], ['x']],
      { a: note('a'), b: note('b'), x: note('x') },
      {
        connectorsById: {
          t1: { id: 't1', kind: 'tie', startEntryId: 'a', endEntryId: 'b' },
        },
        connectorOrder: ['t1'],
      }
    );
    const next = moveEntryToVoice(s, 's1', 'b', 's1-v1', 's1-v2');
    expect(next.connectorOrder).toEqual([]);
    expect(next.connectorsById).toEqual({});
  });

  it('drops a slur or hairpin whose endpoint moved to a different voice, not just ties', () => {
    const s = twoVoiceStructure(
      [['a', 'b'], ['x']],
      { a: note('a'), b: note('b'), x: note('x') },
      {
        connectorsById: {
          slur1: {
            id: 'slur1',
            kind: 'slur',
            startEntryId: 'a',
            endEntryId: 'b',
          },
          hp1: {
            id: 'hp1',
            kind: 'crescendo',
            startEntryId: 'a',
            endEntryId: 'b',
          },
        },
        connectorOrder: ['slur1', 'hp1'],
      }
    );
    const next = moveEntryToVoice(s, 's1', 'b', 's1-v1', 's1-v2');
    expect(next.connectorOrder).toEqual([]);
    expect(next.connectorsById).toEqual({});
  });

  it('is a no-op when the entry is not in the source voice, the voices are the same, or either is unknown', () => {
    const s = twoVoiceStructure([['a', 'b'], ['x']], {
      a: note('a'),
      b: note('b'),
      x: note('x'),
    });
    expect(moveEntryToVoice(s, 's1', 'a', 's1-v1', 's1-v1')).toBe(s);
    expect(moveEntryToVoice(s, 's1', 'missing', 's1-v1', 's1-v2')).toBe(s);
    expect(moveEntryToVoice(s, 's1', 'a', 's1-v2', 's1-v1')).toBe(s);
    expect(moveEntryToVoice(s, 's1', 'a', 's1-v1', 'missing')).toBe(s);
  });
});

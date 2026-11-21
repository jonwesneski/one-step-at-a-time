import { describe, expect, it } from 'vitest';
import { resolveAtomicRuns, resolveWrapperRuns } from './entryWrappersHelpers';
import type { MusicEntry } from './types';

const note = (id: string, extra: Partial<MusicEntry> = {}): MusicEntry =>
  ({
    id,
    type: 'note',
    value: 'C',
    duration: 'quarter',
    ...extra,
  } as MusicEntry);

describe('resolveWrapperRuns', () => {
  it('groups tremolo members and an arpeggio run with its target', () => {
    const entries = [
      note('a'),
      note('t1', { tremoloId: 'tr' }),
      note('t2', { tremoloId: 'tr' }),
      note('r1', { arpeggioId: 'arp' }),
      note('target'),
      note('z'),
    ];
    const runs = resolveWrapperRuns(entries, {
      arp: { id: 'arp', targetEntryId: 'target' },
    });
    expect(runs.map((run) => [run.kind, run.entries.map((e) => e.id)])).toEqual(
      [
        [null, ['a']],
        ['tremolo', ['t1', 't2']],
        ['arpeggio', ['r1', 'target']],
        [null, ['z']],
      ]
    );
  });
});

describe('resolveAtomicRuns', () => {
  it('keeps tuplets and wrappers whole, everything else one by one', () => {
    const entriesById = Object.fromEntries(
      [
        note('a'),
        note('t1', { tupletId: 'tp' }),
        note('t2', { tupletId: 'tp' }),
        note('m1', { tremoloId: 'tr' }),
        note('m2', { tremoloId: 'tr' }),
        note('b'),
      ].map((e) => [e.id, e])
    );
    const runs = resolveAtomicRuns(['a', 't1', 't2', 'm1', 'm2', 'b'], {
      entriesById,
      arpeggiosById: {},
    });
    expect(
      runs.map((run) => [run.atomic, run.entries.map((e) => e.id)])
    ).toEqual([
      [false, ['a']],
      [true, ['t1', 't2']],
      [true, ['m1', 'm2']],
      [false, ['b']],
    ]);
  });
});

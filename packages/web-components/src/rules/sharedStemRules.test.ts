import {
  resolveSharedStemPairs,
  type SharedStemEntry,
} from './sharedStemRules';

describe('resolveSharedStemPairs', () => {
  it('pairs an element with the one its shared-stem-for id references, across two staves', () => {
    const entries: SharedStemEntry[] = [
      { staffIndex: 0, entryIndex: 0, id: 'treble-c', sharedStemFor: null },
      { staffIndex: 1, entryIndex: 0, id: null, sharedStemFor: 'treble-c' },
    ];
    const { pairs, warnings } = resolveSharedStemPairs(entries);
    expect(warnings).toEqual([]);
    expect(pairs).toEqual([
      {
        a: { staffIndex: 1, entryIndex: 0 },
        b: { staffIndex: 0, entryIndex: 0 },
      },
    ]);
  });

  it('warns and drops when shared-stem-for matches no element', () => {
    const entries: SharedStemEntry[] = [
      { staffIndex: 0, entryIndex: 0, id: null, sharedStemFor: 'missing' },
    ];
    const { pairs, warnings } = resolveSharedStemPairs(entries);
    expect(pairs).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('missing');
  });

  it('warns and drops when shared-stem-for references itself', () => {
    const entries: SharedStemEntry[] = [
      { staffIndex: 0, entryIndex: 0, id: 'self', sharedStemFor: 'self' },
    ];
    const { pairs, warnings } = resolveSharedStemPairs(entries);
    expect(pairs).toEqual([]);
    expect(warnings).toHaveLength(1);
  });

  it('warns and drops when both ends are on the same staff', () => {
    const entries: SharedStemEntry[] = [
      { staffIndex: 0, entryIndex: 0, id: 'a', sharedStemFor: null },
      { staffIndex: 0, entryIndex: 1, id: null, sharedStemFor: 'a' },
    ];
    const { pairs, warnings } = resolveSharedStemPairs(entries);
    expect(pairs).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('same staff');
  });

  it('warns and drops a shared-stem-for that reuses an already-paired element', () => {
    const entries: SharedStemEntry[] = [
      { staffIndex: 0, entryIndex: 0, id: 'a', sharedStemFor: null },
      { staffIndex: 1, entryIndex: 0, id: null, sharedStemFor: 'a' },
      { staffIndex: 1, entryIndex: 1, id: null, sharedStemFor: 'a' },
    ];
    const { pairs, warnings } = resolveSharedStemPairs(entries);
    expect(pairs).toHaveLength(1);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('already paired');
  });

  it('resolves multiple independent pairs in one pass', () => {
    const entries: SharedStemEntry[] = [
      { staffIndex: 0, entryIndex: 0, id: 'a', sharedStemFor: null },
      { staffIndex: 1, entryIndex: 0, id: null, sharedStemFor: 'a' },
      { staffIndex: 0, entryIndex: 1, id: 'b', sharedStemFor: null },
      { staffIndex: 1, entryIndex: 1, id: null, sharedStemFor: 'b' },
    ];
    const { pairs, warnings } = resolveSharedStemPairs(entries);
    expect(warnings).toEqual([]);
    expect(pairs).toHaveLength(2);
  });

  it('ignores entries with no shared-stem-for', () => {
    const entries: SharedStemEntry[] = [
      { staffIndex: 0, entryIndex: 0, id: 'a', sharedStemFor: null },
      { staffIndex: 1, entryIndex: 0, id: 'b', sharedStemFor: null },
    ];
    const { pairs, warnings } = resolveSharedStemPairs(entries);
    expect(pairs).toEqual([]);
    expect(warnings).toEqual([]);
  });
});

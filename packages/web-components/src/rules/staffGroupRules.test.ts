import { resolveStaffGroupPairs } from './staffGroupRules';

describe('resolveStaffGroupPairs', () => {
  it('pairs a grouped staff with its immediate next sibling', () => {
    const { pairs, warnings } = resolveStaffGroupPairs(['grand', null]);
    expect(pairs).toEqual([{ index: 0, group: 'grand' }]);
    expect(warnings).toHaveLength(0);
  });

  it('resolves multiple independent pairs in one measure', () => {
    const { pairs, warnings } = resolveStaffGroupPairs([
      'grand',
      null,
      'grand',
      null,
    ]);
    expect(pairs).toEqual([
      { index: 0, group: 'grand' },
      { index: 2, group: 'grand' },
    ]);
    expect(warnings).toHaveLength(0);
  });

  it('supports bracket groups the same way as grand', () => {
    const { pairs, warnings } = resolveStaffGroupPairs(['bracket', null]);
    expect(pairs).toEqual([{ index: 0, group: 'bracket' }]);
    expect(warnings).toHaveLength(0);
  });

  it('ignores ungrouped staves entirely', () => {
    const { pairs, warnings } = resolveStaffGroupPairs([null, null, null]);
    expect(pairs).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it('warns and skips when a grouped staff has no next sibling', () => {
    const { pairs, warnings } = resolveStaffGroupPairs([null, 'grand']);
    expect(pairs).toHaveLength(0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('no next sibling');
  });

  it('warns and skips when the next sibling also declares a group, without cascading', () => {
    const { pairs, warnings } = resolveStaffGroupPairs([
      'grand',
      'bracket',
      null,
    ]);
    // The first pairing (index 0 -> 1) is ambiguous and skipped, but the
    // second staff's own attempt (index 1 -> 2) is still evaluated normally.
    expect(pairs).toEqual([{ index: 1, group: 'bracket' }]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('ambiguous pairing');
  });

  it('handles three consecutive grouped staves as two ambiguous attempts plus one valid pair', () => {
    // i=0 vs i=1: both grouped -> ambiguous, skipped.
    // i=1 vs i=2: both grouped -> ambiguous, skipped.
    // i=2 vs i=3: valid pair (i=3 is ungrouped).
    const { pairs, warnings } = resolveStaffGroupPairs([
      'grand',
      'grand',
      'grand',
      null,
    ]);
    expect(pairs).toEqual([{ index: 2, group: 'grand' }]);
    expect(warnings).toHaveLength(2);
  });
});

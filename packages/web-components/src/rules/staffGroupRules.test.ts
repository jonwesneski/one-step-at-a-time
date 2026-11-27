import { connectedBarlineGaps, resolveStaffGroups } from './staffGroupRules';

describe('resolveStaffGroups', () => {
  it('pairs a grouped staff with its immediate next sibling', () => {
    const { groups, warnings } = resolveStaffGroups([
      { group: 'grand', groupId: null },
      { group: null, groupId: null },
    ]);
    expect(groups).toEqual([{ index: 0, count: 2, group: 'grand' }]);
    expect(warnings).toHaveLength(0);
  });

  it('resolves multiple independent pairs in one measure', () => {
    const { groups, warnings } = resolveStaffGroups([
      { group: 'grand', groupId: null },
      { group: null, groupId: null },
      { group: 'grand', groupId: null },
      { group: null, groupId: null },
    ]);
    expect(groups).toEqual([
      { index: 0, count: 2, group: 'grand' },
      { index: 2, count: 2, group: 'grand' },
    ]);
    expect(warnings).toHaveLength(0);
  });

  it('supports bracket groups the same way as grand when no group-id is set', () => {
    const { groups, warnings } = resolveStaffGroups([
      { group: 'bracket', groupId: null },
      { group: null, groupId: null },
    ]);
    expect(groups).toEqual([{ index: 0, count: 2, group: 'bracket' }]);
    expect(warnings).toHaveLength(0);
  });

  it('ignores ungrouped staves entirely', () => {
    const { groups, warnings } = resolveStaffGroups([
      { group: null, groupId: null },
      { group: null, groupId: null },
      { group: null, groupId: null },
    ]);
    expect(groups).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it('warns and skips when a grouped staff has no next sibling', () => {
    const { groups, warnings } = resolveStaffGroups([
      { group: null, groupId: null },
      { group: 'grand', groupId: null },
    ]);
    expect(groups).toHaveLength(0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('no next sibling');
  });

  it('warns and skips when the next sibling also declares a group, without cascading', () => {
    const { groups, warnings } = resolveStaffGroups([
      { group: 'grand', groupId: null },
      { group: 'bracket', groupId: null },
      { group: null, groupId: null },
    ]);
    // The first pairing (index 0 -> 1) is ambiguous and skipped, but the
    // second staff's own attempt (index 1 -> 2) is still evaluated normally.
    expect(groups).toEqual([{ index: 1, count: 2, group: 'bracket' }]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('ambiguous pairing');
  });

  it('handles three consecutive grouped staves as two ambiguous attempts plus one valid pair', () => {
    // i=0 vs i=1: both grouped -> ambiguous, skipped.
    // i=1 vs i=2: both grouped -> ambiguous, skipped.
    // i=2 vs i=3: valid pair (i=3 is ungrouped).
    const { groups, warnings } = resolveStaffGroups([
      { group: 'grand', groupId: null },
      { group: 'grand', groupId: null },
      { group: 'grand', groupId: null },
      { group: null, groupId: null },
    ]);
    expect(groups).toEqual([{ index: 2, count: 2, group: 'grand' }]);
    expect(warnings).toHaveLength(2);
  });

  it('resolves a 4-staff bracket group sharing one group-id (e.g. SATB choir)', () => {
    const { groups, warnings } = resolveStaffGroups([
      { group: 'bracket', groupId: 'choir' },
      { group: 'bracket', groupId: 'choir' },
      { group: 'bracket', groupId: 'choir' },
      { group: 'bracket', groupId: 'choir' },
    ]);
    expect(groups).toEqual([{ index: 0, count: 4, group: 'bracket' }]);
    expect(warnings).toHaveLength(0);
  });

  it('resolves independent group-id runs back to back', () => {
    const { groups, warnings } = resolveStaffGroups([
      { group: 'bracket', groupId: 'strings' },
      { group: 'bracket', groupId: 'strings' },
      { group: 'bracket', groupId: 'strings' },
      { group: 'bracket', groupId: 'winds' },
      { group: 'bracket', groupId: 'winds' },
    ]);
    expect(groups).toEqual([
      { index: 0, count: 3, group: 'bracket' },
      { index: 3, count: 2, group: 'bracket' },
    ]);
    expect(warnings).toHaveLength(0);
  });

  it('brackets one staff alone when its group-id matches only it', () => {
    const { groups, warnings } = resolveStaffGroups([
      { group: 'bracket', groupId: 'cor' },
      { group: null, groupId: null },
    ]);
    expect(groups).toEqual([{ index: 0, count: 1, group: 'bracket' }]);
    expect(warnings).toHaveLength(0);
  });

  it('brackets one staff alone with no next sibling, or before a grouped one', () => {
    const { groups, warnings } = resolveStaffGroups([
      { group: 'bracket', groupId: null },
      { group: null, groupId: null },
      { group: 'bracket', groupId: null },
      { group: 'bracket', groupId: 'clarinets' },
      { group: 'bracket', groupId: 'clarinets' },
      { group: 'bracket', groupId: null },
    ]);
    expect(groups).toEqual([
      { index: 0, count: 2, group: 'bracket' },
      { index: 2, count: 1, group: 'bracket' },
      { index: 3, count: 2, group: 'bracket' },
      { index: 5, count: 1, group: 'bracket' },
    ]);
    expect(warnings).toHaveLength(0);
  });

  it('still warns about a brace alone', () => {
    const { groups, warnings } = resolveStaffGroups([
      { group: 'grand', groupId: null },
      { group: 'bracket', groupId: 'winds' },
    ]);
    expect(groups).toEqual([{ index: 1, count: 1, group: 'bracket' }]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('ambiguous pairing');
  });

  it('warns and skips when a group-id reappears in a separate, non-contiguous run', () => {
    const { groups, warnings } = resolveStaffGroups([
      { group: 'bracket', groupId: 'choir' },
      { group: 'bracket', groupId: 'choir' },
      { group: null, groupId: null },
      { group: 'bracket', groupId: 'choir' },
      { group: 'bracket', groupId: 'choir' },
    ]);
    expect(groups).toEqual([{ index: 0, count: 2, group: 'bracket' }]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('non-contiguous');
  });

  it('ignores group-id on grand staves, keeping positional pairing', () => {
    const { groups, warnings } = resolveStaffGroups([
      { group: 'grand', groupId: 'irrelevant' },
      { group: null, groupId: null },
    ]);
    expect(groups).toEqual([{ index: 0, count: 2, group: 'grand' }]);
    expect(warnings).toHaveLength(0);
  });
});

describe('connectedBarlineGaps', () => {
  it('joins every staff of a group to the next', () => {
    expect(
      connectedBarlineGaps(
        [
          { index: 0, count: 3, group: 'bracket' },
          { index: 4, count: 2, group: 'grand' },
        ],
        [false, false, false, false, false, false]
      )
    ).toEqual([
      [0, 1],
      [1, 2],
      [4, 5],
    ]);
  });

  it('leaves out the gap between two vocal staves only', () => {
    expect(
      connectedBarlineGaps(
        [{ index: 0, count: 3, group: 'bracket' }],
        [true, true, false]
      )
    ).toEqual([[1, 2]]);
  });

  it('adds no gap for a bracket around one staff', () => {
    expect(
      connectedBarlineGaps(
        [{ index: 1, count: 1, group: 'bracket' }],
        [false, false]
      )
    ).toEqual([]);
  });
});

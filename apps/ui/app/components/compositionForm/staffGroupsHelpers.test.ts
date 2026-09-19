import { describe, expect, it } from 'vitest';
import { findGroupMembers } from './staffGroupsHelpers';
import { buildSingleVoiceStaff } from './test-fixtures/voiceFixtures';
import type { NormalizedStaff } from './types';

function staff(
  id: string,
  group: NormalizedStaff['group'] = null,
  groupId: NormalizedStaff['groupId'] = null
): NormalizedStaff {
  return buildSingleVoiceStaff(id, [], { group, groupId });
}

describe('findGroupMembers', () => {
  it('returns only itself when ungrouped', () => {
    const stavesById = { s1: staff('s1') };
    expect(findGroupMembers(['s1'], stavesById, 's1')).toEqual(['s1']);
  });

  it('returns both members of a grand pair from the first staff', () => {
    const stavesById = {
      s1: staff('s1', 'grand'),
      s2: staff('s2'),
    };
    expect(findGroupMembers(['s1', 's2'], stavesById, 's1')).toEqual([
      's1',
      's2',
    ]);
  });

  it('returns both members of a grand pair from the second staff', () => {
    const stavesById = {
      s1: staff('s1', 'grand'),
      s2: staff('s2'),
    };
    expect(findGroupMembers(['s1', 's2'], stavesById, 's2')).toEqual([
      's1',
      's2',
    ]);
  });

  it('returns all staves sharing a bracket groupId', () => {
    const stavesById = {
      s1: staff('s1', 'bracket', 'g1'),
      s2: staff('s2', 'bracket', 'g1'),
      s3: staff('s3', 'bracket', 'g1'),
    };
    expect(findGroupMembers(['s1', 's2', 's3'], stavesById, 's2')).toEqual([
      's1',
      's2',
      's3',
    ]);
  });

  it('returns only itself when a grand staff has no next sibling', () => {
    const stavesById = { s1: staff('s1', 'grand') };
    expect(findGroupMembers(['s1'], stavesById, 's1')).toEqual(['s1']);
  });

  it('returns only itself when the next sibling is already grouped (ambiguous)', () => {
    const stavesById = {
      s1: staff('s1', 'grand'),
      s2: staff('s2', 'grand'),
      s3: staff('s3'),
    };
    expect(findGroupMembers(['s1', 's2', 's3'], stavesById, 's1')).toEqual([
      's1',
    ]);
  });
});

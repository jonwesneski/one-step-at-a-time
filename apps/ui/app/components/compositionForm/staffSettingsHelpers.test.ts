import { describe, expect, it } from 'vitest';
import {
  setStaffTrackLabel,
  staffSettingsOf,
  staffTrackIds,
} from './staffSettingsHelpers';
import { buildSingleVoiceStaff } from './test-fixtures/voiceFixtures';
import type { CompositionStructure } from './types';

// Two measures, each with a treble staff (index 0) and a bass staff (index 1).
function twoByTwo(): CompositionStructure {
  return {
    timeSig: '4/4',
    measureOrder: ['m1', 'm2'],
    measuresById: {
      m1: { id: 'm1', staffIds: ['a1', 'b1'] },
      m2: { id: 'm2', staffIds: ['a2', 'b2'] },
    },
    stavesById: {
      a1: buildSingleVoiceStaff('a1', []),
      b1: buildSingleVoiceStaff('b1', [], { type: 'bass' }),
      a2: buildSingleVoiceStaff('a2', []),
      b2: buildSingleVoiceStaff('b2', [], { type: 'bass' }),
    },
    entriesById: {},
    connectorsById: {},
    connectorOrder: [],
    tupletsById: {},
    octaveSpansById: {},
    tremolosById: {},
    arpeggiosById: {},
  };
}

describe('staffSettingsOf', () => {
  it('keeps settings and drops identity and music', () => {
    const staff = { ...buildSingleVoiceStaff('a1', ['e1']), label: 'Flute' };
    expect(staffSettingsOf(staff)).toEqual({
      type: 'treble',
      group: null,
      groupId: null,
      label: 'Flute',
    });
  });
});

describe('staffTrackIds', () => {
  it('finds the staff at the same index in every measure', () => {
    expect(staffTrackIds(twoByTwo(), 'b2')).toEqual(['b1', 'b2']);
  });

  it('is empty for an unknown staff', () => {
    expect(staffTrackIds(twoByTwo(), 'nope')).toEqual([]);
  });
});

describe('setStaffTrackLabel', () => {
  it('labels the whole track, not just one measure', () => {
    const next = setStaffTrackLabel(twoByTwo(), 'a2', ' r.h. ');
    expect(next.stavesById.a1.label).toBe('r.h.');
    expect(next.stavesById.a2.label).toBe('r.h.');
    expect(next.stavesById.b1.label).toBeUndefined();
  });

  it('clears the label when blank', () => {
    const labelled = setStaffTrackLabel(twoByTwo(), 'a1', 'Piano');
    const cleared = setStaffTrackLabel(labelled, 'a1', '  ');
    expect(cleared.stavesById.a1.label).toBeNull();
    expect(cleared.stavesById.a2.label).toBeNull();
  });

  it('returns the same structure when nothing changes', () => {
    const labelled = setStaffTrackLabel(twoByTwo(), 'a1', 'Piano');
    expect(setStaffTrackLabel(labelled, 'a2', 'Piano')).toBe(labelled);
  });
});

import { describe, expect, it } from 'vitest';
import {
  beamGroupCandidate,
  clearBeamGroup,
  pruneInvalidBeamGroups,
  setBeamGroup,
  sharedBeamGroupId,
} from './beamGroupHelpers';
import { removeSelectionFromStructure } from './deleteSelectionHelpers';
import { applyEntryUpdate } from './entryEditsHelpers';
import { buildSingleVoiceStaff } from './test-fixtures/voiceFixtures';
import type {
  CompositionStructure,
  MusicEntry,
  NoteEntry,
  Selection,
} from './types';

const eighth = (id: string): NoteEntry => ({
  id,
  type: 'note',
  value: 'C',
  duration: 'eighth',
});

// m1: treble s1 [t1 t2 tr], bass s2 [b1 b2], bass s3 [x1]; m2: treble s4 [y1]
function buildStructure(): CompositionStructure {
  return {
    timeSig: '4/4',
    measureOrder: ['m1', 'm2'],
    measuresById: {
      m1: { id: 'm1', staffIds: ['s1', 's2', 's3'] },
      m2: { id: 'm2', staffIds: ['s4'] },
    },
    stavesById: {
      s1: buildSingleVoiceStaff('s1', ['t1', 't2', 'tr']),
      s2: buildSingleVoiceStaff('s2', ['b1', 'b2'], { type: 'bass' }),
      s3: buildSingleVoiceStaff('s3', ['x1'], { type: 'bass' }),
      s4: buildSingleVoiceStaff('s4', ['y1']),
    },
    entriesById: {
      t1: eighth('t1'),
      t2: { ...eighth('t2'), stemDirection: 'up' },
      tr: { id: 'tr', type: 'rest', duration: 'eighth' },
      b1: eighth('b1'),
      b2: eighth('b2'),
      x1: eighth('x1'),
      y1: eighth('y1'),
    },
    connectorsById: {},
    connectorOrder: [],
    tupletsById: {},
    octaveSpansById: {},
  };
}

const selection = (patch: Partial<Selection>): Selection => ({
  measureIds: [],
  staffIds: [],
  entryIds: [],
  ...patch,
});

const groupOf = (structure: CompositionStructure, id: string) => {
  const entry = structure.entriesById[id];
  return entry.type === 'clef' ? undefined : entry.beamGroupId;
};

describe('beamGroupCandidate', () => {
  it('accepts entries on two adjacent staves of one measure', () => {
    expect(
      beamGroupCandidate(
        selection({ entryIds: ['t1', 'tr', 'b1'] }),
        buildStructure()
      )
    ).toEqual({ measureId: 'm1', entryIds: ['t1', 'tr', 'b1'] });
  });

  it('expands a two-staff selection to every entry on both staves', () => {
    expect(
      beamGroupCandidate(
        selection({ staffIds: ['s1', 's2'] }),
        buildStructure()
      )?.entryIds
    ).toEqual(['t1', 't2', 'tr', 'b1', 'b2']);
  });

  it('rejects one staff, non-adjacent staves, and across measures', () => {
    const structure = buildStructure();
    expect(
      beamGroupCandidate(selection({ entryIds: ['t1', 't2'] }), structure)
    ).toBeNull();
    expect(
      beamGroupCandidate(selection({ entryIds: ['t1', 'x1'] }), structure)
    ).toBeNull();
    expect(
      beamGroupCandidate(selection({ entryIds: ['t1', 'y1'] }), structure)
    ).toBeNull();
  });

  it('rejects fewer than two notes, and unbeamable durations', () => {
    const structure = buildStructure();
    expect(
      beamGroupCandidate(selection({ entryIds: ['tr', 'b1'] }), structure)
    ).toBeNull();
    structure.entriesById.b1 = { ...eighth('b1'), duration: 'quarter' };
    expect(
      beamGroupCandidate(selection({ entryIds: ['t1', 'b1'] }), structure)
    ).toBeNull();
  });

  it('rejects members of a cross-staff tuplet', () => {
    const structure = buildStructure();
    structure.tupletsById.t = { id: 't', ratio: '3', crossStaffGroupId: 'g' };
    structure.entriesById.t1 = { ...eighth('t1'), tupletId: 't' };
    expect(
      beamGroupCandidate(selection({ entryIds: ['t1', 'b1'] }), structure)
    ).toBeNull();
  });
});

describe('setBeamGroup / clearBeamGroup', () => {
  it('stamps one shared id and clears authored stem directions', () => {
    const next = setBeamGroup(buildStructure(), ['t1', 't2', 'b1']);
    const id = groupOf(next, 't1');
    expect(id).toBeTruthy();
    expect(sharedBeamGroupId(next, ['t1', 't2', 'b1'])).toBe(id);
    expect(next.entriesById.t2).toMatchObject({ stemDirection: null });
  });

  it('ignores an invalid member set', () => {
    const structure = buildStructure();
    expect(setBeamGroup(structure, ['t1', 't2'])).toBe(structure);
  });

  it('clears every member and any rest position', () => {
    const grouped = setBeamGroup(buildStructure(), ['t1', 'tr', 'b1']);
    const id = groupOf(grouped, 't1')!;
    const withSide: CompositionStructure = {
      ...grouped,
      entriesById: {
        ...grouped.entriesById,
        tr: {
          ...(grouped.entriesById.tr as MusicEntry & { type: 'rest' }),
          restStaffSide: 'centered',
        },
      },
    };
    const cleared = clearBeamGroup(withSide, id);
    expect(groupOf(cleared, 't1')).toBeNull();
    expect(cleared.entriesById.tr).toMatchObject({
      beamGroupId: null,
      restStaffSide: null,
    });
  });

  it('dissolves the old group when regrouping leaves it one note', () => {
    const first = setBeamGroup(buildStructure(), ['t1', 'b1']);
    const regrouped = setBeamGroup(first, ['t2', 'b1']);
    expect(groupOf(regrouped, 't1')).toBeNull();
    expect(sharedBeamGroupId(regrouped, ['t2', 'b1'])).toBeTruthy();
  });

  it('keeps the old group when what remains is still valid', () => {
    const first = setBeamGroup(buildStructure(), ['t1', 'b1', 'b2']);
    const regrouped = setBeamGroup(first, ['t2', 'b1']);
    expect(sharedBeamGroupId(regrouped, ['t1', 'b2'])).toBe(
      groupOf(first, 't1')
    );
  });
});

describe('pruneInvalidBeamGroups via mutations', () => {
  const grouped = () => setBeamGroup(buildStructure(), ['t1', 'b1']);

  it('dissolves the group when a member becomes a quarter', () => {
    const structure = grouped();
    const updated = applyEntryUpdate(structure, {
      ...(structure.entriesById.b1 as NoteEntry),
      duration: 'quarter',
    });
    expect(groupOf(updated, 't1')).toBeNull();
  });

  it('dissolves the group when deleting leaves one note', () => {
    const deleted = removeSelectionFromStructure(
      grouped(),
      selection({ entryIds: ['b1'] })
    );
    expect(groupOf(deleted, 't1')).toBeNull();
  });

  it('keeps a valid group untouched', () => {
    const structure = grouped();
    expect(pruneInvalidBeamGroups(structure)).toBe(structure);
  });
});

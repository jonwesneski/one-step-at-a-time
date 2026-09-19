import { describe, expect, it } from 'vitest';
import { removeSelectionFromStructure } from './deleteSelectionHelpers';
import {
  buildMultiVoiceStaff,
  buildSingleVoiceStaff,
} from './test-fixtures/voiceFixtures';
import type { CompositionStructure, NoteEntry } from './types';

const tupleted = (id: string, tupletId: string): NoteEntry => ({
  id,
  type: 'note',
  value: 'C',
  duration: 'eighth',
  tupletId,
});

function buildStructure(): CompositionStructure {
  return {
    timeSig: '4/4',
    measureOrder: ['m1', 'm2'],
    measuresById: {
      m1: { id: 'm1', staffIds: ['s1', 's2'] },
      m2: { id: 'm2', staffIds: ['s3'] },
    },
    stavesById: {
      s1: buildSingleVoiceStaff('s1', ['e1', 'e2']),
      s2: buildSingleVoiceStaff('s2', ['e3'], { type: 'bass' }),
      s3: buildSingleVoiceStaff('s3', ['e4', 'e5', 'e6']),
    },
    entriesById: {
      e1: { id: 'e1', type: 'note', value: 'C', duration: 'quarter' },
      e2: { id: 'e2', type: 'note', value: 'D', duration: 'quarter' },
      e3: { id: 'e3', type: 'rest', duration: 'quarter' },
      e4: { id: 'e4', type: 'note', value: 'E', duration: 'quarter' },
      e5: { id: 'e5', type: 'note', value: 'F', duration: 'quarter' },
      e6: { id: 'e6', type: 'note', value: 'G', duration: 'quarter' },
    },
    connectorsById: {
      c1: { id: 'c1', kind: 'slur', startEntryId: 'e1', endEntryId: 'e2' },
      c2: { id: 'c2', kind: 'slur', startEntryId: 'e4', endEntryId: 'e6' },
    },
    connectorOrder: ['c1', 'c2'],
    tupletsById: {},
  };
}

describe('removeSelectionFromStructure', () => {
  it('cascades a deleted measure to its staves and entries', () => {
    const result = removeSelectionFromStructure(buildStructure(), {
      measureIds: ['m1'],
      staffIds: [],
      entryIds: [],
    });

    expect(result.measureOrder).toEqual(['m2']);
    expect(result.measuresById).not.toHaveProperty('m1');
    expect(result.stavesById).not.toHaveProperty('s1');
    expect(result.stavesById).not.toHaveProperty('s2');
    expect(result.stavesById).toHaveProperty('s3');
    expect(result.entriesById).not.toHaveProperty('e1');
    expect(result.entriesById).not.toHaveProperty('e2');
    expect(result.entriesById).not.toHaveProperty('e3');
    expect(result.entriesById).toHaveProperty('e4');
  });

  it('cascades a deleted staff to its entries and updates the parent measure', () => {
    const result = removeSelectionFromStructure(buildStructure(), {
      measureIds: [],
      staffIds: ['s1'],
      entryIds: [],
    });

    expect(result.measureOrder).toEqual(['m1', 'm2']);
    expect(result.measuresById.m1.staffIds).toEqual(['s2']);
    expect(result.stavesById).not.toHaveProperty('s1');
    expect(result.stavesById).toHaveProperty('s2');
    expect(result.entriesById).not.toHaveProperty('e1');
    expect(result.entriesById).not.toHaveProperty('e2');
    expect(result.entriesById).toHaveProperty('e3');
  });

  it('deletes individual entries and updates the parent staff', () => {
    const result = removeSelectionFromStructure(buildStructure(), {
      measureIds: [],
      staffIds: [],
      entryIds: ['e5'],
    });

    expect(result.stavesById.s3.voicesById['s3-v1'].entryIds).toEqual([
      'e4',
      'e6',
    ]);
    expect(result.entriesById).not.toHaveProperty('e5');
    expect(result.entriesById).toHaveProperty('e4');
    expect(result.entriesById).toHaveProperty('e6');
  });

  it('does not double-process or error when a measure and one of its own staves are both selected', () => {
    const result = removeSelectionFromStructure(buildStructure(), {
      measureIds: ['m1'],
      staffIds: ['s1'],
      entryIds: [],
    });

    expect(result.measureOrder).toEqual(['m2']);
    expect(result.measuresById).not.toHaveProperty('m1');
    expect(result.stavesById).not.toHaveProperty('s1');
    expect(result.stavesById).not.toHaveProperty('s2');
    expect(result.entriesById).not.toHaveProperty('e1');
    expect(result.entriesById).not.toHaveProperty('e2');
    expect(result.entriesById).not.toHaveProperty('e3');
    expect(result.stavesById).toHaveProperty('s3');
  });

  it('drops a connector when one of its endpoint entries is deleted', () => {
    const result = removeSelectionFromStructure(buildStructure(), {
      measureIds: [],
      staffIds: [],
      entryIds: ['e1'],
    });

    expect(result.connectorsById).not.toHaveProperty('c1');
    expect(result.connectorOrder).toEqual(['c2']);
    expect(result.connectorsById).toHaveProperty('c2');
  });

  it('drops a connector when its entries are removed via a cascading measure delete', () => {
    const result = removeSelectionFromStructure(buildStructure(), {
      measureIds: ['m1'],
      staffIds: [],
      entryIds: [],
    });

    expect(result.connectorsById).not.toHaveProperty('c1');
    expect(result.connectorsById).toHaveProperty('c2');
    expect(result.connectorOrder).toEqual(['c2']);
  });

  it('keeps a connector whose endpoints both survive', () => {
    const result = removeSelectionFromStructure(buildStructure(), {
      measureIds: [],
      staffIds: [],
      entryIds: ['e5'],
    });

    expect(result.connectorsById).toHaveProperty('c2');
    expect(result.connectorOrder).toEqual(['c1', 'c2']);
  });

  it('drops a tuplet that falls below two members and clears the survivor', () => {
    const base = buildStructure();
    const structure: CompositionStructure = {
      ...base,
      entriesById: {
        ...base.entriesById,
        e4: tupleted('e4', 't1'),
        e5: tupleted('e5', 't1'),
        e6: tupleted('e6', 't1'),
      },
      tupletsById: { t1: { id: 't1', ratio: '3' } },
    };

    const result = removeSelectionFromStructure(structure, {
      measureIds: [],
      staffIds: [],
      entryIds: ['e4', 'e5'],
    });

    expect(result.tupletsById).toEqual({});
    const e6 = result.entriesById.e6;
    expect(e6.type === 'note' && e6.tupletId).toBeNull();
  });

  it('keeps a tuplet whose members mostly survive', () => {
    const base = buildStructure();
    const structure: CompositionStructure = {
      ...base,
      entriesById: {
        ...base.entriesById,
        e4: tupleted('e4', 't1'),
        e5: tupleted('e5', 't1'),
        e6: tupleted('e6', 't1'),
      },
      tupletsById: { t1: { id: 't1', ratio: '3' } },
    };

    const result = removeSelectionFromStructure(structure, {
      measureIds: [],
      staffIds: [],
      entryIds: ['e4'],
    });

    expect(result.tupletsById).toHaveProperty('t1');
    const e5 = result.entriesById.e5;
    expect(e5.type === 'note' && e5.tupletId).toBe('t1');
  });

  it('deletes a mid-stream clef entry and leaves the staff valid', () => {
    const base = buildStructure();
    const structure: CompositionStructure = {
      ...base,
      stavesById: {
        ...base.stavesById,
        s3: buildSingleVoiceStaff('s3', ['e4', 'cl1', 'e5', 'e6']),
      },
      entriesById: {
        ...base.entriesById,
        cl1: { id: 'cl1', type: 'clef', clef: 'bass' },
      },
    };

    const result = removeSelectionFromStructure(structure, {
      measureIds: [],
      staffIds: [],
      entryIds: ['cl1'],
    });

    expect(result.entriesById).not.toHaveProperty('cl1');
    expect(result.stavesById.s3.voicesById['s3-v1'].entryIds).toEqual([
      'e4',
      'e5',
      'e6',
    ]);
    expect(result.connectorsById).toHaveProperty('c2');
  });

  it('deleting all of voice 2 drops voice 2 but keeps voice 1 intact', () => {
    const structure: CompositionStructure = {
      timeSig: '4/4',
      measureOrder: ['m1'],
      measuresById: { m1: { id: 'm1', staffIds: ['s1'] } },
      stavesById: {
        s1: buildMultiVoiceStaff('s1', [['e1', 'e2'], ['e3']]),
      },
      entriesById: {
        e1: { id: 'e1', type: 'note', value: 'C', duration: 'quarter' },
        e2: { id: 'e2', type: 'note', value: 'D', duration: 'quarter' },
        e3: { id: 'e3', type: 'note', value: 'E', duration: 'quarter' },
      },
      connectorsById: {},
      connectorOrder: [],
      tupletsById: {},
    };

    const result = removeSelectionFromStructure(structure, {
      measureIds: [],
      staffIds: [],
      entryIds: ['e3'],
    });

    expect(result.stavesById.s1.voiceOrder).toEqual(['s1-v1']);
    expect(result.stavesById.s1.voicesById).not.toHaveProperty('s1-v2');
    expect(result.stavesById.s1.voicesById['s1-v1'].entryIds).toEqual([
      'e1',
      'e2',
    ]);
    expect(result.entriesById).not.toHaveProperty('e3');
  });

  it('leaves one fresh empty measure behind when every measure is deleted', () => {
    const result = removeSelectionFromStructure(buildStructure(), {
      measureIds: ['m1', 'm2'],
      staffIds: [],
      entryIds: [],
    });

    expect(result.measureOrder).toHaveLength(1);
    const [remainingId] = result.measureOrder;
    expect(result.measuresById).toEqual({
      [remainingId]: { id: remainingId, staffIds: [] },
    });
    expect(result.stavesById).toEqual({});
    expect(result.entriesById).toEqual({});
    expect(result.connectorsById).toEqual({});
    expect(result.connectorOrder).toEqual([]);
  });
});

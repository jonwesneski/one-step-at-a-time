import type { TimeSignature } from '@one-step-at-a-time/web-components';
import { describe, expect, it } from 'vitest';
import { applyEntryUpdate } from './entryEditsHelpers';
import { buildSingleVoiceStaff } from './test-fixtures/voiceFixtures';
import type { CompositionStructure } from './types';

function buildStructure(timeSig: TimeSignature = '4/4'): CompositionStructure {
  return {
    timeSig,
    measureOrder: ['m1'],
    measuresById: { m1: { id: 'm1', staffIds: ['s1'] } },
    stavesById: {
      s1: buildSingleVoiceStaff('s1', ['e1', 'e2']),
    },
    entriesById: {
      e1: { id: 'e1', type: 'note', value: 'C', duration: 'quarter' },
      e2: {
        id: 'e2',
        type: 'chord',
        notes: [{ value: 'C' }, { value: 'E' }],
        duration: 'half',
      },
    },
    connectorsById: {},
    connectorOrder: [],
    tupletsById: {},
  };
}

describe('applyEntryUpdate', () => {
  it('replaces the target entry and leaves the rest untouched', () => {
    const structure = buildStructure();
    const next = applyEntryUpdate(structure, {
      id: 'e1',
      type: 'note',
      value: 'G',
      duration: 'eighth',
    });

    expect(next.entriesById.e1).toEqual({
      id: 'e1',
      type: 'note',
      value: 'G',
      duration: 'eighth',
    });
    expect(next.entriesById.e2).toBe(structure.entriesById.e2);
    expect(next.stavesById).toBe(structure.stavesById);
  });

  it('drops a tie whose endpoint pitch was edited', () => {
    const structure: CompositionStructure = {
      ...buildStructure(),
      entriesById: {
        e1: { id: 'e1', type: 'note', value: 'C', duration: 'quarter' },
        e2: { id: 'e2', type: 'note', value: 'C', duration: 'quarter' },
      },
      connectorsById: {
        t1: { id: 't1', kind: 'tie', startEntryId: 'e1', endEntryId: 'e2' },
      },
      connectorOrder: ['t1'],
    };
    const next = applyEntryUpdate(structure, {
      id: 'e1',
      type: 'note',
      value: 'G',
      duration: 'quarter',
    });
    expect(next.connectorOrder).toEqual([]);
  });

  it('keeps a tie when the edit only changes duration', () => {
    const structure: CompositionStructure = {
      ...buildStructure(),
      entriesById: {
        e1: { id: 'e1', type: 'note', value: 'C', duration: 'quarter' },
        e2: { id: 'e2', type: 'note', value: 'C', duration: 'quarter' },
      },
      connectorsById: {
        t1: { id: 't1', kind: 'tie', startEntryId: 'e1', endEntryId: 'e2' },
      },
      connectorOrder: ['t1'],
    };
    const next = applyEntryUpdate(structure, {
      id: 'e1',
      type: 'note',
      value: 'C',
      duration: 'eighth',
    });
    expect(next.connectorOrder).toEqual(['t1']);
  });

  it('returns the same structure reference when the entry is unknown', () => {
    const structure = buildStructure();
    const next = applyEntryUpdate(structure, {
      id: 'missing',
      type: 'rest',
      duration: 'quarter',
    });
    expect(next).toBe(structure);
  });
});

describe('applyEntryUpdate — capacity clamp', () => {
  // buildStructure: s1 = [e1 quarter note, e2 half chord] → used 0.75 in 4/4
  it('applies a duration that still fits its measure verbatim', () => {
    const next = applyEntryUpdate(buildStructure(), {
      id: 'e1',
      type: 'note',
      value: 'C',
      duration: 'half',
    });
    expect(next.entriesById.e1).toMatchObject({ duration: 'half' });
  });

  it('clamps a duration that would overfill down to the largest that fits', () => {
    // freeing e1's quarter leaves 0.5 available → whole clamps to half
    const next = applyEntryUpdate(buildStructure(), {
      id: 'e1',
      type: 'note',
      value: 'C',
      duration: 'whole',
    });
    expect(next.entriesById.e1).toMatchObject({ duration: 'half' });
  });

  it('clamps against the measure’s own time signature', () => {
    // 3/4 measure, freeing e1's quarter leaves 0.25 available → clamps to quarter
    const next = applyEntryUpdate(buildStructure('3/4'), {
      id: 'e1',
      type: 'note',
      value: 'C',
      duration: 'half',
    });
    expect(next.entriesById.e1).toMatchObject({ duration: 'quarter' });
  });

  it('leaves non-duration edits alone even when the measure is full', () => {
    const next = applyEntryUpdate(buildStructure(), {
      id: 'e1',
      type: 'note',
      value: 'G',
      duration: 'quarter',
    });
    expect(next.entriesById.e1).toEqual({
      id: 'e1',
      type: 'note',
      value: 'G',
      duration: 'quarter',
    });
  });

  it('keeps the existing duration when the measure is already overfull', () => {
    const structure: CompositionStructure = {
      ...buildStructure('3/4'),
      entriesById: {
        e1: { id: 'e1', type: 'note', value: 'C', duration: 'whole' },
        e2: { id: 'e2', type: 'note', value: 'C', duration: 'whole' },
      },
    };
    const next = applyEntryUpdate(structure, {
      id: 'e1',
      type: 'note',
      value: 'C',
      duration: 'double-whole',
    });
    expect(next.entriesById.e1).toMatchObject({ duration: 'whole' });
  });
});

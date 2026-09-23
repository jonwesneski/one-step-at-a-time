import { describe, expect, it, vi } from 'vitest';
import {
  buildMultiVoiceStaff,
  buildSingleVoiceStaff,
} from './test-fixtures/voiceFixtures';
import type { CompositionStructure, NoteEntry } from './types';
import {
  addVoiceToStaff,
  createDefaultVoice,
  removeVoiceFromStaff,
  staffEntryIds,
} from './voiceHelpers';

const note = (id: string, tupletId?: string | null): NoteEntry => ({
  id,
  type: 'note',
  value: 'C',
  duration: 'eighth',
  ...(tupletId !== undefined ? { tupletId } : {}),
});

describe('createDefaultVoice', () => {
  it('creates an empty voice with a fresh id', () => {
    const a = createDefaultVoice();
    const b = createDefaultVoice();
    expect(a.entryIds).toEqual([]);
    expect(a.id).not.toBe(b.id);
  });
});

describe('staffEntryIds', () => {
  it('flattens a single voice', () => {
    expect(staffEntryIds(buildSingleVoiceStaff('s1', ['e1', 'e2']))).toEqual([
      'e1',
      'e2',
    ]);
  });

  it('flattens every voice in voice order', () => {
    const staff = buildMultiVoiceStaff('s1', [['e1', 'e2'], ['e3'], ['e4']]);
    expect(staffEntryIds(staff)).toEqual(['e1', 'e2', 'e3', 'e4']);
  });
});

describe('addVoiceToStaff', () => {
  function structureWithStaff(voiceCount: 1 | 2 | 3): CompositionStructure {
    const staff =
      voiceCount === 1
        ? buildSingleVoiceStaff('s1', [])
        : buildMultiVoiceStaff(
            's1',
            Array.from({ length: voiceCount }, () => [] as string[])
          );
    return {
      timeSig: '4/4',
      measureOrder: ['m1'],
      measuresById: { m1: { id: 'm1', staffIds: ['s1'] } },
      stavesById: { s1: staff },
      entriesById: {},
      connectorsById: {},
      connectorOrder: [],
      tupletsById: {},
    };
  }

  it('appends a new empty voice', () => {
    const next = addVoiceToStaff(structureWithStaff(1), 's1');
    expect(next.stavesById.s1.voiceOrder).toHaveLength(2);
    const newVoiceId = next.stavesById.s1.voiceOrder[1];
    expect(next.stavesById.s1.voicesById[newVoiceId].entryIds).toEqual([]);
  });

  it('no-ops past 3 voices', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = structureWithStaff(3);
    const next = addVoiceToStaff(s, 's1');
    expect(next).toBe(s);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('at most 3 voices')
    );
    warn.mockRestore();
  });

  it('is a no-op for an unknown staff', () => {
    const s = structureWithStaff(1);
    expect(addVoiceToStaff(s, 'missing')).toBe(s);
  });
});

describe('removeVoiceFromStaff', () => {
  function structure(): CompositionStructure {
    return {
      timeSig: '4/4',
      measureOrder: ['m1'],
      measuresById: { m1: { id: 'm1', staffIds: ['s1'] } },
      stavesById: {
        s1: buildMultiVoiceStaff('s1', [
          ['e1', 'e2'],
          ['e3', 'e4'],
        ]),
      },
      entriesById: {
        e1: note('e1'),
        e2: note('e2'),
        e3: note('e3'),
        e4: note('e4'),
      },
      connectorsById: {},
      connectorOrder: [],
      tupletsById: {},
    };
  }

  it('drops the voice and its own entries, leaving the other voice intact', () => {
    const next = removeVoiceFromStaff(structure(), 's1', 's1-v2');
    expect(next.stavesById.s1.voiceOrder).toEqual(['s1-v1']);
    expect(next.stavesById.s1.voicesById).not.toHaveProperty('s1-v2');
    expect(next.stavesById.s1.voicesById['s1-v1'].entryIds).toEqual([
      'e1',
      'e2',
    ]);
    expect(next.entriesById).not.toHaveProperty('e3');
    expect(next.entriesById).not.toHaveProperty('e4');
    expect(next.entriesById).toHaveProperty('e1');
  });

  it('drops a tuplet that falls below 2 members and clears the survivor', () => {
    const s = structure();
    s.entriesById.e3 = note('e3', 't1');
    s.entriesById.e4 = note('e4', 't1');
    s.tupletsById.t1 = { id: 't1', ratio: '3' };

    const next = removeVoiceFromStaff(s, 's1', 's1-v2');

    expect(next.tupletsById).toEqual({});
  });

  it('prunes a tie that no longer joins a surviving pitch', () => {
    const s = structure();
    s.connectorsById.t1 = {
      id: 't1',
      kind: 'tie',
      startEntryId: 'e2',
      endEntryId: 'e3',
    };
    s.connectorOrder = ['t1'];

    const next = removeVoiceFromStaff(s, 's1', 's1-v2');

    expect(next.connectorOrder).toEqual([]);
    expect(next.connectorsById).toEqual({});
  });

  it('drops a slur or hairpin referencing a removed voice’s entry, not just ties', () => {
    const s = structure();
    s.connectorsById.slur1 = {
      id: 'slur1',
      kind: 'slur',
      startEntryId: 'e3',
      endEntryId: 'e4',
    };
    s.connectorsById.hp1 = {
      id: 'hp1',
      kind: 'decrescendo',
      startEntryId: 'e3',
      endEntryId: 'e4',
    };
    s.connectorOrder = ['slur1', 'hp1'];

    const next = removeVoiceFromStaff(s, 's1', 's1-v2');

    expect(next.connectorOrder).toEqual([]);
    expect(next.connectorsById).toEqual({});
  });

  it('refuses to remove the only voice', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s: CompositionStructure = {
      timeSig: '4/4',
      measureOrder: ['m1'],
      measuresById: { m1: { id: 'm1', staffIds: ['s1'] } },
      stavesById: { s1: buildSingleVoiceStaff('s1', ['e1']) },
      entriesById: { e1: note('e1') },
      connectorsById: {},
      connectorOrder: [],
      tupletsById: {},
    };
    const next = removeVoiceFromStaff(s, 's1', 's1-v1');
    expect(next).toBe(s);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('at least one voice')
    );
    warn.mockRestore();
  });

  it('is a no-op for an unknown voice or staff', () => {
    const s = structure();
    expect(removeVoiceFromStaff(s, 's1', 'missing')).toBe(s);
    expect(removeVoiceFromStaff(s, 'missing', 's1-v1')).toBe(s);
  });
});

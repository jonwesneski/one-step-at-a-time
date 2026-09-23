import { describe, expect, it } from 'vitest';
import { signatureOnlyOverflowCount } from './TimeSignatureChangeDialog';
import { buildMultiVoiceStaff } from './test-fixtures/voiceFixtures';
import type { CompositionStructure, NoteEntry } from './types';

const note = (
  id: string,
  duration: NoteEntry['duration'] = 'quarter'
): NoteEntry => ({
  id,
  type: 'note',
  value: 'C',
  duration,
});

function structure(
  staffVoices: Record<string, string[][]>
): CompositionStructure {
  const stavesById: CompositionStructure['stavesById'] = {};
  const entriesById: CompositionStructure['entriesById'] = {};
  for (const [staffId, voices] of Object.entries(staffVoices)) {
    stavesById[staffId] = buildMultiVoiceStaff(staffId, voices);
    for (const voiceEntryIds of voices) {
      for (const entryId of voiceEntryIds) {
        entriesById[entryId] = note(entryId, 'whole');
      }
    }
  }
  return {
    timeSig: '4/4',
    measureOrder: ['m1'],
    measuresById: { m1: { id: 'm1', staffIds: Object.keys(staffVoices) } },
    stavesById,
    entriesById,
    connectorsById: {},
    connectorOrder: [],
    tupletsById: {},
  };
}

describe('signatureOnlyOverflowCount', () => {
  it('does not flag a staff whose voices each individually fit, even though their durations sum past capacity', () => {
    // Two independently-valid whole-note voices in 4/4 (1.0 + 1.0) must not
    // be treated as a combined duration of 2.0 against a 1.0 measure budget.
    const s = structure({ s1: [['e1'], ['e2']] });
    const count = signatureOnlyOverflowCount(s, {
      scope: 'composition',
      timeSig: '4/4',
    });
    expect(count).toBe(0);
  });

  it('flags a measure where one voice alone exceeds the new signature', () => {
    const s = structure({ s1: [['e1']] });
    s.entriesById.e1 = note('e1', 'whole');
    const count = signatureOnlyOverflowCount(s, {
      scope: 'composition',
      timeSig: '2/4',
    });
    expect(count).toBe(1);
  });
});

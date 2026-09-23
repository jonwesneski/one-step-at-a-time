import { describe, expect, it } from 'vitest';
import { effectiveClefOfEntry, resolveEntryOctaves } from './clefsHelpers';
import {
  buildMultiVoiceStaff,
  buildSingleVoiceStaff,
} from './test-fixtures/voiceFixtures';
import type { CompositionStructure, NoteEntry } from './types';

function structureWith(entryIds: string[]): CompositionStructure {
  return {
    timeSig: '4/4',
    measureOrder: ['m1'],
    measuresById: { m1: { id: 'm1', staffIds: ['s1'] } },
    stavesById: {
      s1: buildSingleVoiceStaff('s1', entryIds),
    },
    entriesById: {
      n1: { id: 'n1', type: 'note', value: 'C', duration: 'quarter' },
      c1: { id: 'c1', type: 'clef', clef: 'bass' },
      n2: { id: 'n2', type: 'note', value: 'C', duration: 'quarter' },
    },
    connectorsById: {},
    connectorOrder: [],
    tupletsById: {},
  };
}

describe('effectiveClefOfEntry', () => {
  it("defaults to the staff's own type", () => {
    expect(effectiveClefOfEntry(structureWith(['n1', 'n2']), 'n1')).toBe(
      'treble'
    );
  });

  it('applies a clef entry that precedes the target', () => {
    expect(effectiveClefOfEntry(structureWith(['n1', 'c1', 'n2']), 'n2')).toBe(
      'bass'
    );
  });

  it('ignores a clef entry that follows the target', () => {
    expect(effectiveClefOfEntry(structureWith(['n1', 'c1', 'n2']), 'n1')).toBe(
      'treble'
    );
  });

  it('applies a leading clef entry to the first note', () => {
    expect(effectiveClefOfEntry(structureWith(['c1', 'n1', 'n2']), 'n1')).toBe(
      'bass'
    );
  });

  it('resolves a voice-2 entry by its own beat offset, not by walking every voice-1 clef marker unconditionally', () => {
    const note = (id: string): NoteEntry => ({
      id,
      type: 'note',
      value: 'C',
      duration: 'quarter',
    });
    // Voice 1: n1 (beat 0) → c1 clef change to bass (beat 0.25) → n2 (beat 0.25).
    // Voice 2: n3 sits at beat 0 — before the clef change — so it must still
    // resolve to treble, not "the last clef anywhere in voice 1".
    const structure: CompositionStructure = {
      timeSig: '4/4',
      measureOrder: ['m1'],
      measuresById: { m1: { id: 'm1', staffIds: ['s1'] } },
      stavesById: {
        s1: buildMultiVoiceStaff('s1', [['n1', 'c1', 'n2'], ['n3']]),
      },
      entriesById: {
        n1: note('n1'),
        c1: { id: 'c1', type: 'clef', clef: 'bass' },
        n2: note('n2'),
        n3: note('n3'),
      },
      connectorsById: {},
      connectorOrder: [],
      tupletsById: {},
    };
    expect(effectiveClefOfEntry(structure, 'n3')).toBe('treble');
  });

  it('resolves a voice-2 entry to a clef change that happens at or before its own beat offset', () => {
    const note = (id: string): NoteEntry => ({
      id,
      type: 'note',
      value: 'C',
      duration: 'quarter',
    });
    // Voice 1: n1 (beat 0) → c1 clef change to bass (beat 0.25) → n2 (beat 0.25).
    // Voice 2: n3 (beat 0) → n4 (beat 0.25) — n4 lands at the same beat as
    // the clef change, so it should pick up the new clef.
    const structure: CompositionStructure = {
      timeSig: '4/4',
      measureOrder: ['m1'],
      measuresById: { m1: { id: 'm1', staffIds: ['s1'] } },
      stavesById: {
        s1: buildMultiVoiceStaff('s1', [
          ['n1', 'c1', 'n2'],
          ['n3', 'n4'],
        ]),
      },
      entriesById: {
        n1: note('n1'),
        c1: { id: 'c1', type: 'clef', clef: 'bass' },
        n2: note('n2'),
        n3: note('n3'),
        n4: note('n4'),
      },
      connectorsById: {},
      connectorOrder: [],
      tupletsById: {},
    };
    expect(effectiveClefOfEntry(structure, 'n4')).toBe('bass');
  });
});

describe('resolveEntryOctaves', () => {
  it('puts every bare letter at octave 4 under treble', () => {
    expect(resolveEntryOctaves('treble', [{ value: 'C' }])[0]).toBe(4);
    expect(resolveEntryOctaves('treble', [{ value: 'G' }])[0]).toBe(4);
  });

  it('puts bare C and D at octave 3 under bass, the rest at 2', () => {
    expect(resolveEntryOctaves('bass', [{ value: 'C' }])[0]).toBe(3);
    expect(resolveEntryOctaves('bass', [{ value: 'D' }])[0]).toBe(3);
    expect(resolveEntryOctaves('bass', [{ value: 'E' }])[0]).toBe(2);
    expect(resolveEntryOctaves('bass', [{ value: 'B' }])[0]).toBe(2);
  });

  it('passes an explicit octave through unchanged', () => {
    expect(resolveEntryOctaves('bass', [{ value: 'C', octave: 5 }])[0]).toBe(5);
  });

  it('stacks bare chord notes into an ascending voicing', () => {
    expect(
      resolveEntryOctaves('treble', [{ value: 'E' }, { value: 'C' }])
    ).toEqual([4, 5]);
    expect(
      resolveEntryOctaves('treble', [{ value: 'C' }, { value: 'E' }])
    ).toEqual([4, 4]);
  });
});

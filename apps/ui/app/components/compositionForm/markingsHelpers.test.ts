import { describe, expect, it } from 'vitest';
import {
  allowedTremoloValues,
  sanitizeEntryMarkings,
  sanitizeMarkings,
  serializeChordTone,
  serializeMarkings,
} from './markingsHelpers';
import { buildSingleVoiceStaff } from './test-fixtures/voiceFixtures';
import type { ChordEntry, CompositionStructure, NoteEntry } from './types';

function note(overrides: Partial<NoteEntry> = {}): NoteEntry {
  return {
    id: 'n1',
    type: 'note',
    value: 'C',
    duration: 'quarter',
    ...overrides,
  };
}

function chord(overrides: Partial<ChordEntry> = {}): ChordEntry {
  return {
    id: 'c1',
    type: 'chord',
    notes: [{ value: 'C' }, { value: 'E' }],
    duration: 'quarter',
    ...overrides,
  };
}

describe('allowedTremoloValues', () => {
  it('allows every value on a quarter', () => {
    expect(allowedTremoloValues('quarter')).toEqual([1, 2, 3, 4, 'unmeasured']);
  });

  it('caps strokes so tails plus strokes stay within a 128th', () => {
    // A 32nd has three tails, so two more strokes reach five beams.
    expect(allowedTremoloValues('thirtysecond')).toEqual([1, 2, 'unmeasured']);
  });
});

describe('sanitizeMarkings', () => {
  it('returns the same entry when everything is valid', () => {
    const entry = note({ dynamic: 'f', dynamicReminder: true, tremolo: 3 });
    expect(sanitizeMarkings(entry)).toBe(entry);
  });

  it('drops a dynamic reminder without a dynamic', () => {
    expect(
      sanitizeMarkings(note({ dynamicReminder: true })).dynamicReminder
    ).toBe(false);
  });

  it('drops strokes a shorter value can no longer carry', () => {
    expect(
      sanitizeMarkings(note({ duration: 'sixtyfourth', tremolo: 3 })).tremolo
    ).toBeNull();
  });

  it('drops a tremolo numeral and articulation repeat without measured strokes', () => {
    const sanitized = sanitizeMarkings(
      note({
        tremolo: 'unmeasured',
        tremoloTuplet: 3,
        articulation: 'staccato',
        articulationRepeat: true,
      })
    );
    expect(sanitized.tremoloTuplet).toBeNull();
    expect(sanitized.articulationRepeat).toBe(false);
  });

  it('keeps an articulation repeat on a measured tremolo with a length mark', () => {
    const entry = note({
      tremolo: 2,
      articulation: 'accent-staccato',
      articulationRepeat: true,
    });
    expect(sanitizeMarkings(entry)).toBe(entry);
  });

  it('drops the arpeggio hairpin without a rolled sign', () => {
    const sanitized = sanitizeMarkings(
      note({
        arpeggio: 'non-arpeggiate',
        arpeggioHairpin: 'crescendo',
        arpeggioHairpinFrom: 'p',
      })
    );
    expect(sanitized.arpeggioHairpin).toBeNull();
    expect(sanitized.arpeggioHairpinFrom).toBeNull();
  });

  it('keeps triangles off chords, chord tones and grace notes', () => {
    const sanitized = sanitizeMarkings(
      chord({
        notehead: 'triangle-up',
        notes: [{ value: 'C', notehead: 'triangle-down' }, { value: 'E' }],
        grace: { notes: ['D'], noteheads: ['triangle-up'] },
      })
    );
    expect(sanitized.notehead).toBeNull();
    expect(sanitized.notes[0].notehead).toBeNull();
    expect(sanitized.grace?.noteheads).toEqual([null]);
  });

  it('keeps a triangle off a cross-staff beam member', () => {
    expect(
      sanitizeMarkings(note({ notehead: 'triangle-up', beamGroupId: 'b1' }))
        .notehead
    ).toBeNull();
    const alone = note({ notehead: 'triangle-up' });
    expect(sanitizeMarkings(alone)).toBe(alone);
  });

  it('keeps only one way of naming the trilling pitch', () => {
    expect(
      sanitizeMarkings(note({ trill: { note: 'D#', accidental: 'flat' } }))
        .trill?.accidental
    ).toBeNull();
  });
});

describe('serializeMarkings', () => {
  it('writes nothing for an unmarked note', () => {
    const attrs = serializeMarkings(note());
    expect(Object.values(attrs).every((value) => value === undefined)).toBe(
      true
    );
  });

  it('writes a trill with its closing notes aligned by index', () => {
    const attrs = serializeMarkings(
      note({
        trill: {
          stop: true,
          finish: { notes: ['B', 'C'], octaves: [3, null], slur: 'both' },
        },
      })
    );
    expect(attrs.trill).toBe(true);
    expect(attrs['trill-stop']).toBe(true);
    expect(attrs['trill-finish']).toBe('B,C');
    expect(attrs['trill-finish-octave']).toBe('3');
    expect(attrs['trill-finish-slur']).toBe('both');
  });

  it('writes the tremolo, arpeggio and link attributes', () => {
    const attrs = serializeMarkings(
      note({
        tremolo: 2,
        tremoloTuplet: 3,
        tremoloLabel: 'trem',
        arpeggio: 'up',
        arpeggioWithEntryId: 'upper',
        arpeggiate: 'start',
      })
    );
    expect(attrs.tremolo).toBe(2);
    expect(attrs['tremolo-tuplet']).toBe(3);
    expect(attrs['tremolo-label']).toBe('trem');
    expect(attrs.arpeggio).toBe('up');
    expect(attrs['arpeggio-for']).toBe('upper');
    expect(attrs.arpeggiate).toBe('start');
  });
});

describe('serializeChordTone', () => {
  it('writes a tone notehead and reminder', () => {
    expect(
      serializeChordTone({
        value: 'C',
        notehead: 'x',
        accidentalReminder: true,
      })
    ).toEqual({ notehead: 'x', 'accidental-reminder': true });
  });
});

describe('sanitizeEntryMarkings', () => {
  it('returns the same structure when no entry changes', () => {
    const structure: CompositionStructure = {
      timeSig: '4/4',
      measureOrder: ['m1'],
      measuresById: { m1: { id: 'm1', staffIds: ['s1'] } },
      stavesById: { s1: buildSingleVoiceStaff('s1', ['n1']) },
      entriesById: { n1: note({ tremolo: 1 }) },
      connectorsById: {},
      connectorOrder: [],
      tupletsById: {},
      octaveSpansById: {},
      tremolosById: {},
      arpeggiosById: {},
    };
    expect(sanitizeEntryMarkings(structure)).toBe(structure);
    const shortened = {
      ...structure,
      entriesById: {
        n1: note({ duration: 'hundredtwentyeighth', tremolo: 1 }),
      },
    };
    expect(sanitizeEntryMarkings(shortened).entriesById.n1).toMatchObject({
      tremolo: null,
    });
  });
});

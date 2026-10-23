import { describe, expect, it } from 'vitest';
import { removeSelectionFromStructure } from './deleteSelectionHelpers';
import {
  DEFAULT_OCTAVE_SPAN_SETTINGS,
  octaveAmountFits,
  octaveSpanCandidate,
  octaveSpanContaining,
  octaveSpanMemberIds,
  octaveSpansWithoutEntries,
  pruneInvalidOctaveSpans,
  removeOctaveSpan,
  resolveOctaveAttributes,
  upsertOctaveSpan,
} from './octaveHelpers';
import { rebar } from './rebarHelpers';
import { moveEntryInVoice } from './reorderHelpers';
import {
  buildMultiVoiceStaff,
  buildSingleVoiceStaff,
} from './test-fixtures/voiceFixtures';
import type {
  CompositionStructure,
  MusicEntry,
  NoteEntry,
  Selection,
} from './types';

const note = (
  id: string,
  octave: NoteEntry['octave'],
  duration: NoteEntry['duration'] = 'quarter'
): NoteEntry => ({ id, type: 'note', value: 'C', octave, duration });

// m1: treble s1 [a b c d], bass s2 [w]; m2: treble s3 [e f], bass s4 [x]
function buildStructure(): CompositionStructure {
  return {
    timeSig: '4/4',
    measureOrder: ['m1', 'm2'],
    measuresById: {
      m1: { id: 'm1', staffIds: ['s1', 's2'] },
      m2: { id: 'm2', staffIds: ['s3', 's4'] },
    },
    stavesById: {
      s1: buildSingleVoiceStaff('s1', ['a', 'b', 'c', 'd']),
      s2: buildSingleVoiceStaff('s2', ['w'], { type: 'bass' }),
      s3: buildSingleVoiceStaff('s3', ['e', 'f']),
      s4: buildSingleVoiceStaff('s4', ['x'], { type: 'bass' }),
    },
    entriesById: {
      a: note('a', 6),
      b: note('b', 6),
      c: { id: 'c', type: 'rest', duration: 'quarter' },
      d: {
        id: 'd',
        type: 'chord',
        notes: [{ value: 'E', octave: 5 }, { value: 'G' }],
        duration: 'quarter',
      },
      e: note('e', 6, 'half'),
      f: note('f', null),
      w: note('w', 3, 'whole'),
      x: note('x', 3, 'whole'),
    },
    connectorsById: {},
    connectorOrder: [],
    tupletsById: {},
    octaveSpansById: {},
  };
}

const selection = (entryIds: string[]): Selection => ({
  measureIds: [],
  staffIds: [],
  entryIds,
});

const settings = (amount: '8va' | '8vb' | '15ma') => ({
  amount,
  ...DEFAULT_OCTAVE_SPAN_SETTINGS,
});

const octaveOf = (structure: CompositionStructure, id: string) =>
  (structure.entriesById[id] as NoteEntry).octave;

const onlySpan = (structure: CompositionStructure) =>
  Object.values(structure.octaveSpansById)[0];

describe('octaveSpanMemberIds', () => {
  it('walks one staff track across barlines', () => {
    expect(
      octaveSpanMemberIds(buildStructure(), {
        startEntryId: 'b',
        endEntryId: 'e',
      })
    ).toEqual(['b', 'c', 'd', 'e']);
  });

  it('rejects endpoints on different tracks or out of order', () => {
    const structure = buildStructure();
    expect(
      octaveSpanMemberIds(structure, { startEntryId: 'a', endEntryId: 'w' })
    ).toBeNull();
    expect(
      octaveSpanMemberIds(structure, { startEntryId: 'b', endEntryId: 'a' })
    ).toBeNull();
  });

  it('keeps to one voice', () => {
    const structure: CompositionStructure = {
      ...buildStructure(),
      measureOrder: ['m1'],
      measuresById: { m1: { id: 'm1', staffIds: ['s1'] } },
      stavesById: { s1: buildMultiVoiceStaff('s1', [['a', 'b'], ['w']]) },
    };
    expect(
      octaveSpanMemberIds(structure, { startEntryId: 'a', endEntryId: 'w' })
    ).toBeNull();
  });
});

describe('octaveSpanCandidate', () => {
  it('takes the outer note/chord entries of a one-track selection', () => {
    expect(
      octaveSpanCandidate(selection(['c', 'b', 'd']), buildStructure())
    ).toEqual({ startEntryId: 'b', endEntryId: 'd' });
  });

  it('accepts a single note', () => {
    expect(octaveSpanCandidate(selection(['a']), buildStructure())).toEqual({
      startEntryId: 'a',
      endEntryId: 'a',
    });
  });

  it('rejects rests alone, cross-staff selections, and staff selections', () => {
    const structure = buildStructure();
    expect(octaveSpanCandidate(selection(['c']), structure)).toBeNull();
    expect(octaveSpanCandidate(selection(['a', 'w']), structure)).toBeNull();
    expect(
      octaveSpanCandidate({ ...selection(['a']), staffIds: ['s1'] }, structure)
    ).toBeNull();
  });
});

describe('upsertOctaveSpan / removeOctaveSpan', () => {
  it('moves written octaves down for 8va so the notes keep sounding', () => {
    const next = upsertOctaveSpan(
      buildStructure(),
      { startEntryId: 'a', endEntryId: 'd' },
      settings('8va')
    );
    expect(next).not.toBeNull();
    expect(octaveOf(next!, 'a')).toBe(5);
    expect(octaveOf(next!, 'b')).toBe(5);
    expect(next!.entriesById.c).toEqual(buildStructure().entriesById.c);
    // The chord's clef-default octave is materialized before moving.
    expect(next!.entriesById.d).toMatchObject({
      notes: [
        { value: 'E', octave: 4 },
        { value: 'G', octave: 4 },
      ],
    });
    expect(onlySpan(next!)).toMatchObject({
      amount: '8va',
      startEntryId: 'a',
      endEntryId: 'd',
    });
  });

  it('round-trips: removing the span restores the original pitches', () => {
    const original = buildStructure();
    const applied = upsertOctaveSpan(
      original,
      { startEntryId: 'a', endEntryId: 'b' },
      settings('8va')
    )!;
    const removed = removeOctaveSpan(applied, onlySpan(applied).id)!;
    expect(removed.entriesById).toEqual(original.entriesById);
    expect(removed.octaveSpansById).toEqual({});
  });

  it('changing the amount shifts by the difference', () => {
    const applied = upsertOctaveSpan(
      buildStructure(),
      { startEntryId: 'a', endEntryId: 'b' },
      settings('8va')
    )!;
    const span = onlySpan(applied);
    const widened = upsertOctaveSpan(applied, span, settings('15ma'), span.id)!;
    expect(octaveOf(widened, 'a')).toBe(4);
    expect(onlySpan(widened)).toMatchObject({ id: span.id, amount: '15ma' });
  });

  it('transposes grace notes with their main note', () => {
    const structure = buildStructure();
    structure.entriesById.a = { ...note('a', 6), grace: { notes: ['D'] } };
    const next = upsertOctaveSpan(
      structure,
      { startEntryId: 'a', endEntryId: 'a' },
      settings('8va')
    )!;
    expect(next.entriesById.a).toMatchObject({
      octave: 5,
      grace: { notes: ['D'], octaves: [3] },
    });
  });

  it('rejects an amount that would leave the supported octave range', () => {
    const structure = buildStructure();
    const range = { startEntryId: 'w', endEntryId: 'w' };
    expect(upsertOctaveSpan(structure, range, settings('15ma'))).toBeNull();
    expect(octaveAmountFits(structure, range, '15ma', null)).toBe(false);
    expect(octaveAmountFits(structure, range, '8vb', null)).toBe(true);
  });

  it('replaces an overlapping span, reverting its transposition first', () => {
    const first = upsertOctaveSpan(
      buildStructure(),
      { startEntryId: 'a', endEntryId: 'b' },
      settings('8va')
    )!;
    const second = upsertOctaveSpan(
      first,
      { startEntryId: 'b', endEntryId: 'd' },
      settings('8va')
    )!;
    expect(Object.values(second.octaveSpansById)).toHaveLength(1);
    expect(octaveOf(second, 'a')).toBe(6);
    expect(octaveOf(second, 'b')).toBe(5);
  });
});

describe('octaveSpanContaining', () => {
  it('finds the span covering a selection inside it', () => {
    const applied = upsertOctaveSpan(
      buildStructure(),
      { startEntryId: 'a', endEntryId: 'e' },
      settings('8va')
    )!;
    expect(
      octaveSpanContaining(applied, { startEntryId: 'd', endEntryId: 'd' })?.id
    ).toBe(onlySpan(applied).id);
    expect(
      octaveSpanContaining(applied, { startEntryId: 'f', endEntryId: 'f' })
    ).toBeNull();
  });
});

describe('resolveOctaveAttributes', () => {
  it('puts the shift on the start and stop/loco on the end', () => {
    const applied = upsertOctaveSpan(
      buildStructure(),
      { startEntryId: 'a', endEntryId: 'd' },
      { ...settings('8va'), end: 'loco', mode: 'col' }
    )!;
    const attributes = resolveOctaveAttributes(applied);
    expect(attributes.get('a')).toEqual({
      'octave-shift': '8va',
      'octave-mode': 'col',
      'octave-continuation': 'bracketed',
    });
    expect(attributes.get('d')).toEqual({ loco: true });
  });

  it('puts both on a one-note span, and emits standalone loco', () => {
    const structure = buildStructure();
    structure.entriesById.f = { ...note('f', 5), loco: true };
    const applied = upsertOctaveSpan(
      structure,
      { startEntryId: 'a', endEntryId: 'a' },
      settings('8va')
    )!;
    const attributes = resolveOctaveAttributes(applied);
    expect(attributes.get('a')).toMatchObject({
      'octave-shift': '8va',
      'octave-stop': true,
    });
    expect(attributes.get('f')).toEqual({ loco: true });
  });
});

describe('cleanup', () => {
  const withSpan = (start: string, end: string) =>
    upsertOctaveSpan(
      buildStructure(),
      { startEntryId: start, endEntryId: end },
      settings('8va')
    )!;

  it('shrinks a span when its endpoint is deleted', () => {
    const applied = withSpan('a', 'd');
    const removedIds = new Set(['d']);
    expect(
      Object.values(octaveSpansWithoutEntries(applied, removedIds))[0]
    ).toMatchObject({ startEntryId: 'a', endEntryId: 'b' });

    const deleted = removeSelectionFromStructure(applied, selection(['a']));
    expect(onlySpan(deleted)).toMatchObject({
      startEntryId: 'b',
      endEntryId: 'd',
    });
  });

  it('drops a span with no notes left', () => {
    const applied = withSpan('a', 'b');
    const deleted = removeSelectionFromStructure(
      applied,
      selection(['a', 'b'])
    );
    expect(deleted.octaveSpansById).toEqual({});
  });

  it('swaps endpoints a reorder inverted', () => {
    const applied = withSpan('a', 'b');
    const reordered = moveEntryInVoice(applied, 's1', 's1-v1', 'a', 2);
    expect(onlySpan(reordered)).toMatchObject({
      startEntryId: 'b',
      endEntryId: 'a',
    });
  });

  it('drops a span whose endpoints no longer share a track', () => {
    const applied = withSpan('a', 'e');
    const broken: CompositionStructure = {
      ...applied,
      measuresById: {
        ...applied.measuresById,
        m2: { id: 'm2', staffIds: ['s4', 's3'] },
      },
    };
    expect(pruneInvalidOctaveSpans(broken).octaveSpansById).toEqual({});
  });

  it('re-anchors the end to the last piece when rebar splits it', () => {
    const structure = buildStructure();
    const entriesById: Record<string, MusicEntry> = {
      ...structure.entriesById,
      a: note('a', 6, 'half'),
      b: note('b', 6, 'half'),
    };
    const applied = upsertOctaveSpan(
      {
        ...structure,
        entriesById,
        measureOrder: ['m1'],
        measuresById: { m1: { id: 'm1', staffIds: ['s1'] } },
        stavesById: { s1: buildSingleVoiceStaff('s1', ['a', 'b']) },
      },
      { startEntryId: 'a', endEntryId: 'b' },
      settings('8va')
    )!;
    const { structure: rebarred } = rebar({ ...applied, timeSig: '3/4' }, 0);
    const span = onlySpan(rebarred);
    expect(span.startEntryId).toBe('a');
    expect(span.endEntryId).not.toBe('b');
    expect(
      rebarred.connectorOrder
        .map((id) => rebarred.connectorsById[id])
        .some(
          (tie) =>
            tie.startEntryId === 'b' && tie.endEntryId === span.endEntryId
        )
    ).toBe(true);
  });
});

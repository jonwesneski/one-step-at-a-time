import { describe, expect, it } from 'vitest';
import { removeSelectionFromStructure } from './deleteSelectionHelpers';
import {
  clearPhraseSlur,
  phraseSlurCandidate,
  phraseSlurMemberIds,
  pruneInvalidPhraseSlurs,
  selectedPhraseSlurId,
  setPhraseSlur,
} from './phraseSlurHelpers';
import { buildSingleVoiceStaff } from './test-fixtures/voiceFixtures';
import type { CompositionStructure, NoteEntry, Selection } from './types';

const eighth = (id: string): NoteEntry => ({
  id,
  type: 'note',
  value: 'C',
  duration: 'eighth',
});
const rest = (id: string) => ({
  id,
  type: 'rest' as const,
  duration: 'eighth' as const,
});

// A line passed between the hands (3/4, eighths), like the library's
// HandCrossingPassage story:
//   m1 treble: r r r t1 t2 t3     m2 treble: u1 u2 u3 r r r
//   m1 bass:   b1 b2 b3 r r r     m2 bass:   r r r v1 v2 v3
function buildStructure(): CompositionStructure {
  const entries = [
    eighth('t1'),
    eighth('t2'),
    eighth('t3'),
    eighth('b1'),
    eighth('b2'),
    eighth('b3'),
    eighth('u1'),
    eighth('u2'),
    eighth('u3'),
    eighth('v1'),
    eighth('v2'),
    eighth('v3'),
    ...[
      'r1',
      'r2',
      'r3',
      'r4',
      'r5',
      'r6',
      'r7',
      'r8',
      'r9',
      'r10',
      'r11',
      'r12',
    ].map(rest),
  ];
  return {
    timeSig: '3/4',
    measureOrder: ['m1', 'm2'],
    measuresById: {
      m1: { id: 'm1', staffIds: ['s1', 's2'] },
      m2: { id: 'm2', staffIds: ['s3', 's4'] },
    },
    stavesById: {
      s1: buildSingleVoiceStaff('s1', ['r1', 'r2', 'r3', 't1', 't2', 't3']),
      s2: buildSingleVoiceStaff('s2', ['b1', 'b2', 'b3', 'r4', 'r5', 'r6'], {
        type: 'bass',
      }),
      s3: buildSingleVoiceStaff('s3', ['u1', 'u2', 'u3', 'r7', 'r8', 'r9']),
      s4: buildSingleVoiceStaff('s4', ['r10', 'r11', 'r12', 'v1', 'v2', 'v3'], {
        type: 'bass',
      }),
    },
    entriesById: Object.fromEntries(entries.map((e) => [e.id, e])),
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

const slurGroupOf = (structure: CompositionStructure, id: string) =>
  (structure.entriesById[id] as NoteEntry).slurGroupId;

describe('phraseSlurCandidate', () => {
  it('derives each leg’s first and last note, a leg continuing across a barline', () => {
    const candidate = phraseSlurCandidate(
      selection([
        't1',
        't2',
        't3',
        'b1',
        'b2',
        'b3',
        'u1',
        'u2',
        'u3',
        'v1',
        'v2',
        'v3',
        'r4',
      ]),
      buildStructure()
    );
    expect(candidate).toEqual({
      startEntryId: 'b1',
      breakpointEntryIds: ['b1', 'b3', 't1', 'u3', 'v1', 'v3'],
      legCount: 3,
    });
  });

  it('keeps a one-note leg as a single breakpoint', () => {
    expect(
      phraseSlurCandidate(selection(['b3', 't1', 't2']), buildStructure())
        ?.breakpointEntryIds
    ).toEqual(['b3', 't1', 't2']);
  });

  it('rejects one staff, and two staves sounding together', () => {
    const structure = buildStructure();
    expect(phraseSlurCandidate(selection(['t1', 't2']), structure)).toBeNull();
    const threeStaves = buildStructure();
    threeStaves.measuresById.m1 = { id: 'm1', staffIds: ['s1', 's2', 's5'] };
    threeStaves.stavesById.s5 = buildSingleVoiceStaff('s5', ['w1']);
    threeStaves.entriesById.w1 = eighth('w1');
    expect(
      phraseSlurCandidate(selection(['t1', 'w1']), threeStaves)
    ).toBeNull();
    const simultaneous = buildStructure();
    simultaneous.stavesById.s1 = buildSingleVoiceStaff('s1', ['t1', 't2']);
    expect(
      phraseSlurCandidate(selection(['t1', 'b1']), simultaneous)
    ).toBeNull();
  });
});

describe('setPhraseSlur / clearPhraseSlur', () => {
  const breakpoints = ['b1', 'b3', 't1', 't3'];

  it('marks every breakpoint with one shared id', () => {
    const next = setPhraseSlur(buildStructure(), breakpoints);
    const id = slurGroupOf(next, 'b1');
    expect(id).toBeTruthy();
    expect(phraseSlurMemberIds(next, id!).sort()).toEqual(
      [...breakpoints].sort()
    );
    expect(slurGroupOf(next, 'b2')).toBeUndefined();
    expect(selectedPhraseSlurId(selection(['t3', 'b2']), next)).toBe(id);
  });

  it('clears the whole phrase', () => {
    const next = setPhraseSlur(buildStructure(), breakpoints);
    const cleared = clearPhraseSlur(next, slurGroupOf(next, 'b1')!);
    expect(breakpoints.map((id) => slurGroupOf(cleared, id))).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  it('drops a phrase left with one breakpoint after a delete', () => {
    const next = setPhraseSlur(buildStructure(), ['b3', 't1']);
    const deleted = removeSelectionFromStructure(next, selection(['t1']));
    expect(slurGroupOf(deleted, 'b3')).toBeNull();
    const intact = setPhraseSlur(buildStructure(), breakpoints);
    expect(pruneInvalidPhraseSlurs(intact)).toBe(intact);
  });
});

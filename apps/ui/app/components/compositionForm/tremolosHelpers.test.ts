import { describe, expect, it } from 'vitest';
import { upsertConnector } from './connectorsHelpers';
import { entryFactor } from './measureCapacityHelpers';
import { pruneInvalidNotationLinks } from './notationLinksHelpers';
import { buildSingleVoiceStaff } from './test-fixtures/voiceFixtures';
import {
  canAttachBeams,
  crossStaffTremoloCandidate,
  crossStaffTremoloOf,
  pruneInvalidTremolos,
  setCrossStaffTremolo,
  setTremolo,
  tremoloCandidate,
  tremoloOfEntries,
  updateTremolo,
} from './tremolosHelpers';
import type { CompositionStructure, MusicEntry, NoteEntry } from './types';

const half = (id: string, value: NoteEntry['value'] = 'C'): NoteEntry => ({
  id,
  type: 'note',
  value,
  duration: 'half',
});

// Grand staff: top a b (halves), bottom rest + c (halves).
function buildStructure(): CompositionStructure {
  const entries: MusicEntry[] = [
    half('a', 'C'),
    half('b', 'E'),
    { id: 'r', type: 'rest', duration: 'half' },
    half('c', 'G'),
  ];
  return {
    timeSig: '4/4',
    measureOrder: ['m1'],
    measuresById: { m1: { id: 'm1', staffIds: ['top', 'bottom'] } },
    stavesById: {
      top: buildSingleVoiceStaff('top', ['a', 'b']),
      bottom: buildSingleVoiceStaff('bottom', ['r', 'c'], { type: 'bass' }),
    },
    entriesById: Object.fromEntries(entries.map((e) => [e.id, e])),
    connectorsById: {},
    connectorOrder: [],
    tupletsById: {},
    octaveSpansById: {},
    tremolosById: {},
    arpeggiosById: {},
  };
}

const select = (entryIds: string[]) => ({
  measureIds: [],
  staffIds: [],
  entryIds,
});

describe('tremoloCandidate', () => {
  it('accepts two notes of one duration in one voice', () => {
    expect(
      tremoloCandidate(select(['a', 'b']), buildStructure())?.problem
    ).toBeNull();
  });

  it('rejects members of different durations', () => {
    const s = buildStructure();
    s.entriesById.b = { ...half('b'), duration: 'quarter' };
    expect(tremoloCandidate(select(['a', 'b']), s)?.problem).toMatch(
      /same duration/
    );
  });

  it('rejects a tied member', () => {
    const s = upsertConnector(buildStructure(), 'a', 'b', 'tie');
    expect(tremoloCandidate(select(['a', 'b']), s)?.problem).toMatch(/tied/);
  });
});

describe('setTremolo', () => {
  it('groups the members and clears their own single-note tremolo', () => {
    const s = buildStructure();
    s.entriesById.a = { ...half('a'), tremolo: 2 };
    const next = setTremolo(s, ['a', 'b'], { strokes: 3 });
    const tremolo = tremoloOfEntries(next, ['a', 'b']);
    expect(tremolo?.strokes).toBe(3);
    expect(next.entriesById.a).toMatchObject({ tremolo: null });
  });

  it('makes the members fill one written value together', () => {
    const next = setTremolo(buildStructure(), ['a', 'b'], { strokes: 3 });
    expect(
      entryFactor(next.entriesById.a, next) +
        entryFactor(next.entriesById.b, next)
    ).toBeCloseTo(0.5);
  });

  it('removes the whole group', () => {
    const grouped = setTremolo(buildStructure(), ['a', 'b'], { strokes: 3 });
    const removed = setTremolo(grouped, ['a'], null);
    expect(tremoloOfEntries(removed, ['a', 'b'])).toBeNull();
    expect(removed.entriesById.b).toMatchObject({ tremoloId: null });
    expect(Object.keys(removed.tremolosById)).toEqual([]);
  });
});

describe('beam attachment', () => {
  it('is offered only on a minim tremolo and cleared otherwise', () => {
    let s = setTremolo(buildStructure(), ['a', 'b'], { strokes: 3 });
    const id = tremoloOfEntries(s, ['a', 'b'])!.id;
    expect(canAttachBeams(s, id)).toBe(true);
    s = updateTremolo(s, id, { beamAttach: 'all' });
    s.entriesById.a = {
      ...(s.entriesById.a as NoteEntry),
      duration: 'quarter',
    };
    s.entriesById.b = {
      ...(s.entriesById.b as NoteEntry),
      duration: 'quarter',
    };
    expect(pruneInvalidTremolos(s).tremolosById[id]?.beamAttach).toBeNull();
  });
});

describe('pruneInvalidTremolos', () => {
  it('dissolves a group once a member is tied', () => {
    const grouped = setTremolo(buildStructure(), ['a', 'b'], { strokes: 3 });
    const tied = upsertConnector(grouped, 'a', 'b', 'tie');
    expect(
      tremoloOfEntries(pruneInvalidNotationLinks(tied), ['a', 'b'])
    ).toBeNull();
  });

  it('dissolves a group left with one member', () => {
    const grouped = setTremolo(buildStructure(), ['a', 'b'], { strokes: 3 });
    const shrunk: CompositionStructure = {
      ...grouped,
      stavesById: {
        ...grouped.stavesById,
        top: buildSingleVoiceStaff('top', ['a']),
      },
    };
    expect(Object.keys(pruneInvalidTremolos(shrunk).tremolosById)).toEqual([]);
  });
});

describe('cross-staff tremolo', () => {
  // Top: a (note) + b; bottom: r (spacer) + c. Select a on top and r, c below.
  const candidateFor = (s: CompositionStructure) =>
    crossStaffTremoloCandidate(select(['a', 'b', 'r', 'c']), s);

  it('joins the hands, hiding the spacer rests', () => {
    const s = buildStructure();
    const candidate = candidateFor(s)!;
    expect(candidate.problem).toBeNull();
    const joined = setCrossStaffTremolo(s, candidate, 3);
    expect(crossStaffTremoloOf(joined, candidate)).not.toBeNull();
    expect(joined.entriesById.r).toMatchObject({ hidden: true });
  });

  it('separates the hands and shows the rests again', () => {
    const s = buildStructure();
    const candidate = candidateFor(s)!;
    const joined = setCrossStaffTremolo(s, candidate, 3);
    const separated = setCrossStaffTremolo(joined, candidate, null);
    expect(crossStaffTremoloOf(separated, candidate)).toBeNull();
    expect(separated.entriesById.r).toMatchObject({ hidden: false });
  });

  it('keeps one stroke count on both sides', () => {
    const s = buildStructure();
    const candidate = candidateFor(s)!;
    const joined = setCrossStaffTremolo(s, candidate, 3);
    const [top] = crossStaffTremoloOf(joined, candidate)!;
    const updated = updateTremolo(joined, top.id, { strokes: 2 });
    expect(
      crossStaffTremoloOf(updated, candidate)!.map((t) => t.strokes)
    ).toEqual([2, 2]);
  });
});

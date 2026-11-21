import { describe, expect, it } from 'vitest';
import {
  crossStaffArpeggioCandidate,
  crossStaffArpeggioProblem,
  isCrossStaffArpeggio,
  pruneInvalidCrossStaffArpeggios,
  setCrossStaffArpeggio,
} from './crossStaffArpeggioHelpers';
import { applyEntryUpdate } from './entryEditsHelpers';
import { buildSingleVoiceStaff } from './test-fixtures/voiceFixtures';
import type { ChordEntry, CompositionStructure } from './types';

function chord(id: string, overrides: Partial<ChordEntry> = {}): ChordEntry {
  return {
    id,
    type: 'chord',
    notes: [{ value: 'C' }, { value: 'E' }],
    duration: 'quarter',
    ...overrides,
  };
}

// A grand staff: u1 u2 over l1 l2, plus a rest on the top staff.
function buildStructure(): CompositionStructure {
  return {
    timeSig: '4/4',
    measureOrder: ['m1'],
    measuresById: { m1: { id: 'm1', staffIds: ['top', 'bottom'] } },
    stavesById: {
      top: buildSingleVoiceStaff('top', ['u1', 'u2', 'r1']),
      bottom: buildSingleVoiceStaff('bottom', ['l1', 'l2'], { type: 'bass' }),
    },
    entriesById: {
      u1: chord('u1'),
      u2: chord('u2'),
      r1: { id: 'r1', type: 'rest', duration: 'half' },
      l1: chord('l1'),
      l2: chord('l2'),
    },
    connectorsById: {},
    connectorOrder: [],
    tupletsById: {},
    octaveSpansById: {},
    tremolosById: {},
    arpeggiosById: {},
  };
}

const selection = (entryIds: string[]) => ({
  measureIds: [],
  staffIds: [],
  entryIds,
});

const pair = { upperEntryId: 'u1', lowerEntryId: 'l1' };

describe('crossStaffArpeggioCandidate', () => {
  it('orders two chords on different staves top to bottom', () => {
    expect(
      crossStaffArpeggioCandidate(selection(['l1', 'u1']), buildStructure())
    ).toEqual({ measureId: 'm1', upperEntryId: 'u1', lowerEntryId: 'l1' });
  });

  it('ignores two entries on one staff, or a rest', () => {
    const structure = buildStructure();
    expect(
      crossStaffArpeggioCandidate(selection(['u1', 'u2']), structure)
    ).toBeNull();
    expect(
      crossStaffArpeggioCandidate(selection(['r1', 'l1']), structure)
    ).toBeNull();
  });
});

describe('crossStaffArpeggioProblem', () => {
  it('needs the two chords to start together', () => {
    expect(
      crossStaffArpeggioProblem(buildStructure(), {
        upperEntryId: 'u2',
        lowerEntryId: 'l1',
      })
    ).toMatch(/same beat/);
  });

  it('accepts chords on the same beat', () => {
    expect(crossStaffArpeggioProblem(buildStructure(), pair)).toBeNull();
  });
});

describe('setCrossStaffArpeggio', () => {
  it('links the lower chord to the upper and gives it a rolled sign', () => {
    const next = setCrossStaffArpeggio(buildStructure(), pair, true);
    expect(isCrossStaffArpeggio(next, pair)).toBe(true);
    expect(next.entriesById.l1).toMatchObject({
      arpeggioWithEntryId: 'u1',
      arpeggio: 'up',
    });
  });

  it('keeps an existing rolled sign on either end', () => {
    const structure = buildStructure();
    structure.entriesById.u1 = chord('u1', { arpeggio: 'down' });
    const next = setCrossStaffArpeggio(structure, pair, true);
    expect(next.entriesById.l1).not.toHaveProperty('arpeggio');
  });

  it('separates a joined pair', () => {
    const joined = setCrossStaffArpeggio(buildStructure(), pair, true);
    const separated = setCrossStaffArpeggio(joined, pair, false);
    expect(isCrossStaffArpeggio(separated, pair)).toBe(false);
  });

  it('refuses a second pair through the same chord', () => {
    const joined = setCrossStaffArpeggio(buildStructure(), pair, true);
    expect(
      crossStaffArpeggioProblem(joined, {
        upperEntryId: 'u1',
        lowerEntryId: 'l2',
      })
    ).not.toBeNull();
  });
});

describe('pruneInvalidCrossStaffArpeggios', () => {
  it('drops the link once neither end is rolled', () => {
    const joined = setCrossStaffArpeggio(buildStructure(), pair, true);
    const unrolled = applyEntryUpdate(joined, {
      ...(joined.entriesById.l1 as ChordEntry),
      arpeggio: null,
    });
    expect(isCrossStaffArpeggio(unrolled, pair)).toBe(false);
  });

  it('drops the link once the chords no longer start together', () => {
    const joined = setCrossStaffArpeggio(buildStructure(), pair, true);
    const moved: CompositionStructure = {
      ...joined,
      stavesById: {
        ...joined.stavesById,
        top: buildSingleVoiceStaff('top', ['u2', 'u1', 'r1']),
      },
    };
    expect(
      isCrossStaffArpeggio(pruneInvalidCrossStaffArpeggios(moved), pair)
    ).toBe(false);
  });
});

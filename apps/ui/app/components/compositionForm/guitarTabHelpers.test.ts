import { describe, expect, it } from 'vitest';
import {
  canTie,
  connectorBetween,
  resolveConnectorAttributes,
  upsertConnector,
} from './connectorsHelpers';
import { usedDuration } from './measureCapacityHelpers';
import { rebar } from './rebarHelpers';
import {
  pruneInvalidTabLinks,
  setStaffTrackPart,
  setStaffTrackTabFor,
  tabLinkProblem,
} from './staffSettingsHelpers';
import { buildSingleVoiceStaff } from './test-fixtures/voiceFixtures';
import type {
  CompositionStructure,
  GuitarNoteEntry,
  GuitarTabStaff,
} from './types';

const tabNote = (
  id: string,
  fret: GuitarNoteEntry['fret'],
  duration: GuitarNoteEntry['duration'] = 'quarter'
): GuitarNoteEntry => ({ id, type: 'guitar-note', fret, string: 3, duration });

function tabStaff(id: string, entryIds: string[]): GuitarTabStaff {
  return {
    ...buildSingleVoiceStaff(id, entryIds),
    type: 'guitar-tab',
  };
}

// Two bars, each with a treble staff over a tab staff.
function buildStructure(): CompositionStructure {
  const entries = [
    tabNote('g1', 0),
    tabNote('g2', 2),
    tabNote('g3', 2),
    tabNote('g4', 5, 'half'),
  ];
  return {
    timeSig: '4/4',
    measureOrder: ['m1', 'm2'],
    measuresById: {
      m1: { id: 'm1', staffIds: ['n1', 't1'] },
      m2: { id: 'm2', staffIds: ['n2', 't2'] },
    },
    stavesById: {
      n1: buildSingleVoiceStaff('n1', []),
      t1: tabStaff('t1', ['g1', 'g2', 'g3']),
      n2: buildSingleVoiceStaff('n2', []),
      t2: tabStaff('t2', ['g4']),
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

describe('tab notes', () => {
  it('count toward the bar by duration', () => {
    const s = buildStructure();
    expect(
      usedDuration(
        ['g1', 'g2', 'g3'].map((id) => s.entriesById[id]),
        s
      )
    ).toBeCloseTo(0.75);
  });

  it('tie only on the same fret and string', () => {
    const s = buildStructure();
    expect(canTie(s, { startEntryId: 'g2', endEntryId: 'g3' })).toBe(true);
    expect(canTie(s, { startEntryId: 'g1', endEntryId: 'g2' })).toBe(false);
  });

  it('take a technique alongside a slur', () => {
    let s = upsertConnector(buildStructure(), 'g1', 'g2', 'slur');
    s = upsertConnector(s, 'g1', 'g2', 'hammer-on');
    expect(connectorBetween(s, 'g1', 'g2', ['slur'])).not.toBeNull();
    expect(resolveConnectorAttributes(s).get('g1')).toMatchObject({
      slur: 'start',
      'hammer-on': 'start',
    });
  });

  it('split across a new barline into a tie chain on the same fret', () => {
    const s = buildStructure();
    s.entriesById = {
      a: tabNote('a', 0, 'half'),
      b: tabNote('b', 7, 'half'),
    };
    s.measureOrder = ['m1'];
    s.measuresById = { m1: { id: 'm1', staffIds: ['t1'] } };
    s.stavesById = { t1: tabStaff('t1', ['a', 'b']) };
    const { structure: out, rebarred } = rebar({ ...s, timeSig: '3/4' }, 0);
    expect(rebarred).toBe(true);
    const ties = Object.values(out.connectorsById);
    expect(ties).toHaveLength(1);
    expect(ties[0].startEntryId).toBe('b');
    expect(out.entriesById[ties[0].endEntryId]).toMatchObject({
      type: 'guitar-note',
      fret: 7,
      string: 3,
      duration: 'quarter',
    });
  });
});

describe('tab links', () => {
  const linked = () => {
    let s = setStaffTrackPart(buildStructure(), 'n1', 'guitar');
    s = setStaffTrackTabFor(s, 't1', 'guitar');
    return s;
  };

  it('name the part on the whole track and link the tab', () => {
    const s = linked();
    expect(s.stavesById.n2.part).toBe('guitar');
    expect(s.stavesById.t2).toMatchObject({ tabFor: 'guitar' });
    expect(tabLinkProblem(s, 't1')).toBeNull();
  });

  it('follow a renamed part', () => {
    const s = setStaffTrackPart(linked(), 'n2', 'gtr');
    expect(s.stavesById.t1).toMatchObject({ tabFor: 'gtr' });
  });

  it('are cleared once no staff carries the part', () => {
    const s = setStaffTrackPart(linked(), 'n1', '');
    expect(s.stavesById.t1).toMatchObject({ tabFor: null });
  });

  it('report a bar where the part is missing', () => {
    const s = linked();
    s.stavesById.n2 = { ...s.stavesById.n2, part: null };
    expect(tabLinkProblem(s, 't2')).toMatch(/No staff/);
    expect(pruneInvalidTabLinks(s)).toBe(s);
  });
});

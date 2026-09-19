import { describe, expect, it } from 'vitest';
import {
  canTie,
  connectorBetween,
  flattenEntryOrder,
  isConnectableSelection,
  pruneBrokenTies,
  removeConnector,
  resolveConnectorAttributes,
  upsertConnector,
} from './connectorsHelpers';
import {
  buildMultiVoiceStaff,
  buildSingleVoiceStaff,
} from './test-fixtures/voiceFixtures';
import type { CompositionStructure, Selection } from './types';

function buildStructure(): CompositionStructure {
  return {
    timeSig: '4/4',
    measureOrder: ['m1', 'm2'],
    measuresById: {
      m1: { id: 'm1', staffIds: ['s1'] },
      m2: { id: 'm2', staffIds: ['s2'] },
    },
    stavesById: {
      s1: buildSingleVoiceStaff('s1', ['e1', 'e2', 'e3', 'e4']),
      s2: buildSingleVoiceStaff('s2', ['e5', 'e6', 'e7', 'e8']),
    },
    entriesById: {
      e1: { id: 'e1', type: 'note', value: 'C', duration: 'quarter' },
      e2: { id: 'e2', type: 'note', value: 'C', duration: 'quarter' },
      e3: { id: 'e3', type: 'note', value: 'C', duration: 'quarter' },
      e4: { id: 'e4', type: 'note', value: 'G', duration: 'quarter' },
      e5: { id: 'e5', type: 'note', value: 'G', duration: 'quarter' },
      e6: { id: 'e6', type: 'rest', duration: 'quarter' },
      e7: { id: 'e7', type: 'note', value: 'B', duration: 'quarter' },
      e8: { id: 'e8', type: 'note', value: 'C', duration: 'quarter' },
    },
    connectorsById: {},
    connectorOrder: [],
    tupletsById: {},
  };
}

function selection(
  entryIds: string[],
  patch: Partial<Selection> = {}
): Selection {
  return { measureIds: [], staffIds: [], entryIds, ...patch };
}

describe('flattenEntryOrder', () => {
  it('walks measure -> staff -> entry', () => {
    expect(flattenEntryOrder(buildStructure())).toEqual([
      'e1',
      'e2',
      'e3',
      'e4',
      'e5',
      'e6',
      'e7',
      'e8',
    ]);
  });
});

describe('isConnectableSelection', () => {
  it('returns the document-ordered outer endpoints regardless of click order', () => {
    const structure = buildStructure();
    expect(isConnectableSelection(selection(['e3', 'e1']), structure)).toEqual({
      startEntryId: 'e1',
      endEntryId: 'e3',
    });
  });

  it('accepts a cross-measure same-voice pair', () => {
    expect(
      isConnectableSelection(selection(['e4', 'e5']), buildStructure())
    ).toEqual({ startEntryId: 'e4', endEntryId: 'e5' });
  });

  it('rejects a single entry', () => {
    expect(
      isConnectableSelection(selection(['e1']), buildStructure())
    ).toBeNull();
  });

  it('rejects a selection containing a rest', () => {
    expect(
      isConnectableSelection(selection(['e5', 'e6']), buildStructure())
    ).toBeNull();
  });

  it('rejects when a measure is also selected', () => {
    expect(
      isConnectableSelection(
        selection(['e1', 'e3'], { measureIds: ['m1'] }),
        buildStructure()
      )
    ).toBeNull();
  });

  it('rejects two entries in different voices of the same staff', () => {
    const structure: CompositionStructure = {
      timeSig: '4/4',
      measureOrder: ['m1'],
      measuresById: { m1: { id: 'm1', staffIds: ['s1'] } },
      stavesById: {
        s1: buildMultiVoiceStaff('s1', [['e1'], ['e2']]),
      },
      entriesById: {
        e1: { id: 'e1', type: 'note', value: 'C', duration: 'quarter' },
        e2: { id: 'e2', type: 'note', value: 'C', duration: 'quarter' },
      },
      connectorsById: {},
      connectorOrder: [],
      tupletsById: {},
    };
    expect(
      isConnectableSelection(selection(['e1', 'e2']), structure)
    ).toBeNull();
  });
});

describe('canTie', () => {
  it('allows adjacent same-pitch notes in one staff', () => {
    expect(
      canTie(buildStructure(), { startEntryId: 'e1', endEntryId: 'e2' })
    ).toBe(true);
  });

  it('rejects a different pitch', () => {
    expect(
      canTie(buildStructure(), { startEntryId: 'e3', endEntryId: 'e4' })
    ).toBe(false);
  });

  it('rejects same-pitch notes that are not adjacent', () => {
    expect(
      canTie(buildStructure(), { startEntryId: 'e1', endEntryId: 'e3' })
    ).toBe(false);
  });

  it('allows the last note of a staff tied to the first of the next measure', () => {
    expect(
      canTie(buildStructure(), { startEntryId: 'e4', endEntryId: 'e5' })
    ).toBe(true);
  });

  it('rejects the same pitch letter at a different octave', () => {
    const structure = buildStructure();
    structure.entriesById.e1 = {
      id: 'e1',
      type: 'note',
      value: 'C',
      octave: 4,
      duration: 'quarter',
    };
    structure.entriesById.e2 = {
      id: 'e2',
      type: 'note',
      value: 'C',
      octave: 5,
      duration: 'quarter',
    };
    expect(canTie(structure, { startEntryId: 'e1', endEntryId: 'e2' })).toBe(
      false
    );
  });

  it('allows a bare octave tied to the equivalent explicit octave', () => {
    const structure = buildStructure();
    structure.entriesById.e2 = {
      id: 'e2',
      type: 'note',
      value: 'C',
      octave: 4,
      duration: 'quarter',
    };
    expect(canTie(structure, { startEntryId: 'e1', endEntryId: 'e2' })).toBe(
      true
    );
  });

  it('rejects a cross-measure tie when the next staff renders the letter an octave off', () => {
    const structure = buildStructure();
    structure.stavesById.s2.type = 'bass';
    expect(canTie(structure, { startEntryId: 'e4', endEntryId: 'e5' })).toBe(
      false
    );
  });

  it('rejects a cross-measure tie when a mid-stream clef change shifts the start octave', () => {
    const structure = buildStructure();
    structure.stavesById.s1.voicesById['s1-v1'].entryIds = [
      'e1',
      'e2',
      'e3',
      'ec',
      'e4',
    ];
    structure.entriesById.ec = { id: 'ec', type: 'clef', clef: 'bass' };
    expect(canTie(structure, { startEntryId: 'e4', endEntryId: 'e5' })).toBe(
      false
    );
  });

  it('rejects a tie between different voices, even at the same staff index across measures', () => {
    const structure: CompositionStructure = {
      timeSig: '4/4',
      measureOrder: ['m1', 'm2'],
      measuresById: {
        m1: { id: 'm1', staffIds: ['s1'] },
        m2: { id: 'm2', staffIds: ['s2'] },
      },
      stavesById: {
        s1: buildMultiVoiceStaff('s1', [['e1'], ['e2']]),
        s2: buildMultiVoiceStaff('s2', [['e3'], ['e4']]),
      },
      entriesById: {
        e1: { id: 'e1', type: 'note', value: 'C', duration: 'quarter' },
        e2: { id: 'e2', type: 'note', value: 'C', duration: 'quarter' },
        e3: { id: 'e3', type: 'note', value: 'C', duration: 'quarter' },
        e4: { id: 'e4', type: 'note', value: 'C', duration: 'quarter' },
      },
      connectorsById: {},
      connectorOrder: [],
      tupletsById: {},
    };
    // e1 is voice 1's last note; e4 is voice 2's first note in the next
    // measure — same staff index, same pitch, but a different voice, so this
    // must not be treated as a valid tie continuation.
    expect(canTie(structure, { startEntryId: 'e1', endEntryId: 'e4' })).toBe(
      false
    );
    // The genuinely matching pair (voice 1 to voice 1) still works.
    expect(canTie(structure, { startEntryId: 'e1', endEntryId: 'e3' })).toBe(
      true
    );
  });

  it('matches chords by pitch and octave regardless of note order', () => {
    const structure = buildStructure();
    structure.entriesById.e1 = {
      id: 'e1',
      type: 'chord',
      notes: [
        { value: 'C', octave: 4 },
        { value: 'E', octave: 4 },
      ],
      duration: 'quarter',
    };
    structure.entriesById.e2 = {
      id: 'e2',
      type: 'chord',
      notes: [
        { value: 'E', octave: 4 },
        { value: 'C', octave: 4 },
      ],
      duration: 'quarter',
    };
    expect(canTie(structure, { startEntryId: 'e1', endEntryId: 'e2' })).toBe(
      true
    );
  });
});

describe('upsertConnector / removeConnector / connectorBetween', () => {
  it('adds a connector', () => {
    const next = upsertConnector(buildStructure(), 'e1', 'e3', 'slur');
    expect(next.connectorOrder).toHaveLength(1);
    const connector = connectorBetween(next, 'e1', 'e3');
    expect(connector?.kind).toBe('slur');
  });

  it('replaces the connector between the same endpoints (change of kind)', () => {
    let next = upsertConnector(buildStructure(), 'e1', 'e3', 'slur');
    next = upsertConnector(next, 'e1', 'e3', 'tie');
    expect(next.connectorOrder).toHaveLength(1);
    expect(connectorBetween(next, 'e1', 'e3')?.kind).toBe('tie');
  });

  it('drops a same-kind connector that shares a start endpoint', () => {
    let next = upsertConnector(buildStructure(), 'e1', 'e3', 'slur');
    next = upsertConnector(next, 'e1', 'e4', 'slur');
    expect(next.connectorOrder).toHaveLength(1);
    expect(connectorBetween(next, 'e1', 'e3')).toBeNull();
    expect(connectorBetween(next, 'e1', 'e4')?.kind).toBe('slur');
  });

  it('keeps a tie and a slur that share an endpoint', () => {
    let next = upsertConnector(buildStructure(), 'e1', 'e2', 'tie');
    next = upsertConnector(next, 'e1', 'e3', 'slur');
    expect(next.connectorOrder).toHaveLength(2);
  });

  it('keeps a slur and a crescendo over the same pair (different families)', () => {
    let next = upsertConnector(buildStructure(), 'e1', 'e3', 'slur');
    next = upsertConnector(next, 'e1', 'e3', 'crescendo');
    expect(next.connectorOrder).toHaveLength(2);
    expect(connectorBetween(next, 'e1', 'e3', ['tie', 'slur'])?.kind).toBe(
      'slur'
    );
    expect(
      connectorBetween(next, 'e1', 'e3', ['crescendo', 'decrescendo'])?.kind
    ).toBe('crescendo');
  });

  it('replaces a crescendo with a decrescendo over the same pair', () => {
    let next = upsertConnector(buildStructure(), 'e1', 'e3', 'crescendo');
    next = upsertConnector(next, 'e1', 'e3', 'decrescendo');
    expect(next.connectorOrder).toHaveLength(1);
    expect(
      connectorBetween(next, 'e1', 'e3', ['crescendo', 'decrescendo'])?.kind
    ).toBe('decrescendo');
  });

  it('drops an interleaving same-kind hairpin', () => {
    let next = upsertConnector(buildStructure(), 'e1', 'e3', 'crescendo');
    next = upsertConnector(next, 'e2', 'e4', 'crescendo');
    expect(next.connectorOrder).toHaveLength(1);
    expect(connectorBetween(next, 'e1', 'e3')).toBeNull();
    expect(connectorBetween(next, 'e2', 'e4')?.kind).toBe('crescendo');
  });

  it('drops a nested same-kind hairpin', () => {
    let next = upsertConnector(buildStructure(), 'e1', 'e4', 'crescendo');
    next = upsertConnector(next, 'e2', 'e3', 'crescendo');
    expect(next.connectorOrder).toHaveLength(1);
    expect(connectorBetween(next, 'e2', 'e3')?.kind).toBe('crescendo');
  });

  it('keeps two disjoint same-kind hairpins', () => {
    let next = upsertConnector(buildStructure(), 'e1', 'e2', 'crescendo');
    next = upsertConnector(next, 'e3', 'e4', 'crescendo');
    expect(next.connectorOrder).toHaveLength(2);
  });

  it('keeps an overlapping crescendo and decrescendo (different kinds)', () => {
    let next = upsertConnector(buildStructure(), 'e1', 'e3', 'crescendo');
    next = upsertConnector(next, 'e2', 'e4', 'decrescendo');
    expect(next.connectorOrder).toHaveLength(2);
  });

  it('removes a connector by id', () => {
    const added = upsertConnector(buildStructure(), 'e1', 'e3', 'slur');
    const [id] = added.connectorOrder;
    const next = removeConnector(added, id);
    expect(next.connectorOrder).toEqual([]);
    expect(next.connectorsById).toEqual({});
  });
});

describe('resolveConnectorAttributes', () => {
  it('assigns start/end roles with no explicit pairing for a lone span', () => {
    const structure = upsertConnector(buildStructure(), 'e1', 'e3', 'slur');
    const attrs = resolveConnectorAttributes(structure);
    expect(attrs.get('e1')).toEqual({ slur: 'start' });
    expect(attrs.get('e3')).toEqual({ slur: 'end' });
  });

  it('does not add id/for for nested same-kind spans', () => {
    let structure = upsertConnector(buildStructure(), 'e1', 'e4', 'slur');
    structure = upsertConnector(structure, 'e2', 'e3', 'slur');
    const attrs = resolveConnectorAttributes(structure);
    expect(attrs.get('e1')).toEqual({ slur: 'start' });
    expect(attrs.get('e4')).toEqual({ slur: 'end' });
    expect(attrs.get('e2')).toEqual({ slur: 'start' });
    expect(attrs.get('e3')).toEqual({ slur: 'end' });
  });

  it('adds id/for for interleaving same-kind spans', () => {
    let structure = upsertConnector(buildStructure(), 'e1', 'e3', 'slur');
    structure = upsertConnector(structure, 'e2', 'e4', 'slur');
    const attrs = resolveConnectorAttributes(structure);
    expect(attrs.get('e1')).toEqual({ slur: 'start', id: 'e1' });
    expect(attrs.get('e3')).toEqual({ slur: 'end', for: 'e1' });
    expect(attrs.get('e2')).toEqual({ slur: 'start', id: 'e2' });
    expect(attrs.get('e4')).toEqual({ slur: 'end', for: 'e2' });
  });

  it('lets one entry start both a tie and a slur', () => {
    let structure = upsertConnector(buildStructure(), 'e1', 'e2', 'tie');
    structure = upsertConnector(structure, 'e1', 'e3', 'slur');
    expect(resolveConnectorAttributes(structure).get('e1')).toEqual({
      tie: 'start',
      slur: 'start',
    });
  });

  it('emits hairpin roles without id/for even when hairpins interleave', () => {
    let structure = upsertConnector(buildStructure(), 'e1', 'e3', 'crescendo');
    structure = upsertConnector(structure, 'e2', 'e4', 'decrescendo');
    const attrs = resolveConnectorAttributes(structure);
    expect(attrs.get('e1')).toEqual({ crescendo: 'start' });
    expect(attrs.get('e3')).toEqual({ crescendo: 'end' });
    expect(attrs.get('e2')).toEqual({ decrescendo: 'start' });
    expect(attrs.get('e4')).toEqual({ decrescendo: 'end' });
  });
});

describe('pruneBrokenTies', () => {
  it('returns the same reference when every tie still joins one pitch', () => {
    const structure = upsertConnector(buildStructure(), 'e1', 'e2', 'tie');
    expect(pruneBrokenTies(structure)).toBe(structure);
  });

  it('keeps a tie when only an endpoint duration changed', () => {
    const structure = upsertConnector(buildStructure(), 'e1', 'e2', 'tie');
    structure.entriesById.e2 = {
      id: 'e2',
      type: 'note',
      value: 'C',
      duration: 'eighth',
    };
    expect(pruneBrokenTies(structure).connectorOrder).toHaveLength(1);
  });

  it('drops a tie once an endpoint pitch changes', () => {
    const structure = upsertConnector(buildStructure(), 'e1', 'e2', 'tie');
    structure.entriesById.e2 = {
      id: 'e2',
      type: 'note',
      value: 'G',
      duration: 'quarter',
    };
    const next = pruneBrokenTies(structure);
    expect(next.connectorOrder).toEqual([]);
    expect(next.connectorsById).toEqual({});
  });

  it('drops a tie once an endpoint octave changes', () => {
    const structure = upsertConnector(buildStructure(), 'e1', 'e2', 'tie');
    structure.entriesById.e2 = {
      id: 'e2',
      type: 'note',
      value: 'C',
      octave: 5,
      duration: 'quarter',
    };
    expect(pruneBrokenTies(structure).connectorOrder).toEqual([]);
  });

  it('drops a tie once a tied chord loses a note', () => {
    const structure = buildStructure();
    structure.entriesById.e1 = {
      id: 'e1',
      type: 'chord',
      notes: [{ value: 'C' }, { value: 'E' }],
      duration: 'quarter',
    };
    structure.entriesById.e2 = {
      id: 'e2',
      type: 'chord',
      notes: [{ value: 'C' }, { value: 'E' }],
      duration: 'quarter',
    };
    const tied = upsertConnector(structure, 'e1', 'e2', 'tie');
    tied.entriesById.e2 = {
      id: 'e2',
      type: 'chord',
      notes: [{ value: 'C' }, { value: 'G' }],
      duration: 'quarter',
    };
    expect(pruneBrokenTies(tied).connectorOrder).toEqual([]);
  });

  it('leaves a slur and a crescendo over a now-mismatched pair intact', () => {
    let structure = upsertConnector(buildStructure(), 'e1', 'e2', 'slur');
    structure = upsertConnector(structure, 'e1', 'e2', 'crescendo');
    structure.entriesById.e2 = {
      id: 'e2',
      type: 'note',
      value: 'G',
      duration: 'quarter',
    };
    expect(pruneBrokenTies(structure).connectorOrder).toHaveLength(2);
  });
});

import type {
  DurationType,
  TimeSignature,
} from '@one-step-at-a-time/web-components';
import { describe, expect, it, vi } from 'vitest';
import { rebar } from './rebarHelpers';
import { buildMultiVoiceStaff } from './test-fixtures/voiceFixtures';
import type {
  CompositionStructure,
  MusicEntry,
  NormalizedMeasure,
  NormalizedStaff,
} from './types';

let seq = 0;
const note = (duration: DurationType, id = `e${seq++}`): MusicEntry => ({
  id,
  type: 'note',
  value: 'C',
  duration,
});

// One staff spec is one or more voices, each its own entry stream — a plain
// MusicEntry[][] means a single-voice staff (the common case every existing
// test here uses); a MusicEntry[][][] element with 2+ voices is genuinely
// multi-voice.
type StaffSpec = MusicEntry[] | MusicEntry[][];
type MeasureSpec = { time?: TimeSignature | null; staves: StaffSpec[] };

function voicesOf(spec: StaffSpec): MusicEntry[][] {
  return Array.isArray(spec[0])
    ? (spec as MusicEntry[][])
    : [spec as MusicEntry[]];
}

function build(
  timeSig: TimeSignature,
  measures: MeasureSpec[]
): CompositionStructure {
  const measuresById: Record<string, NormalizedMeasure> = {};
  const stavesById: Record<string, NormalizedStaff> = {};
  const entriesById: Record<string, MusicEntry> = {};
  const measureOrder = measures.map((spec, mi) => {
    const staffIds = spec.staves.map((staffSpec, si) => {
      const staffId = `m${mi}s${si}`;
      const voices = voicesOf(staffSpec);
      stavesById[staffId] = buildMultiVoiceStaff(
        staffId,
        voices.map((entries) => entries.map((e) => e.id))
      );
      for (const entry of voices.flat()) {
        entriesById[entry.id] = entry;
      }
      return staffId;
    });
    measuresById[`m${mi}`] = {
      id: `m${mi}`,
      staffIds,
      time: spec.time ?? null,
    };
    return `m${mi}`;
  });
  return {
    timeSig,
    measureOrder,
    measuresById,
    stavesById,
    entriesById,
    connectorsById: {},
    connectorOrder: [],
    octaveSpansById: {},
    tremolosById: {},
    arpeggiosById: {},
    tupletsById: {},
  };
}

function durationsPerMeasure(
  structure: CompositionStructure,
  staffIndex = 0,
  voiceIndex = 0
): DurationType[][] {
  return structure.measureOrder.map((mid) => {
    const staffId = structure.measuresById[mid].staffIds[staffIndex];
    const staff = structure.stavesById[staffId];
    const voice = staff.voicesById[staff.voiceOrder[voiceIndex]];
    return voice.entryIds.map((eid) => {
      const entry = structure.entriesById[eid];
      return entry.type === 'clef' || entry.type === 'barline'
        ? (entry.type as DurationType)
        : entry.duration;
    });
  });
}

const tieCount = (structure: CompositionStructure) =>
  Object.values(structure.connectorsById).filter((c) => c.kind === 'tie')
    .length;

describe('rebar', () => {
  it('re-slices four quarters from 4/4 into 3/4', () => {
    const s = build('4/4', [
      {
        staves: [
          [note('quarter'), note('quarter'), note('quarter'), note('quarter')],
        ],
      },
    ]);
    const { structure: out } = rebar({ ...s, timeSig: '3/4' }, 0);
    expect(durationsPerMeasure(out)).toEqual([
      ['quarter', 'quarter', 'quarter'],
      ['quarter'],
    ]);
    expect(tieCount(out)).toBe(0);
  });

  it('splits a note that crosses the new barline into a tie chain', () => {
    const s = build('4/4', [{ staves: [[note('half'), note('half')]] }]);
    const { structure: out } = rebar({ ...s, timeSig: '3/4' }, 0);
    expect(durationsPerMeasure(out)).toEqual([
      ['half', 'quarter'],
      ['quarter'],
    ]);
    expect(tieCount(out)).toBe(1);
  });

  it('drops a laissez-vibrer tie from a note it splits', () => {
    // Every piece of the chain is a tie endpoint, and the library has one
    // `tie` attribute per element, so no piece can also ring.
    const ringing = {
      ...(note('half', 'ring') as MusicEntry & { type: 'note' }),
      laissezVibrer: { label: true },
    };
    const s = build('4/4', [{ staves: [[note('half'), ringing]] }]);
    const { structure: out } = rebar({ ...s, timeSig: '3/4' }, 0);
    expect(tieCount(out)).toBe(1);
    expect(
      Object.values(out.entriesById).some(
        (entry) => entry.type === 'note' && entry.laissezVibrer
      )
    ).toBe(false);
  });

  it('moves a tremolo whole instead of splitting it across a barline', () => {
    const a = { ...note('half', 'ta'), tremoloId: 'tr' } as MusicEntry;
    const b = { ...note('half', 'tb'), tremoloId: 'tr' } as MusicEntry;
    const s = build('4/4', [{ staves: [[note('half'), a, b]] }]);
    s.tremolosById = { tr: { id: 'tr', strokes: 3 } };
    const { structure: out } = rebar({ ...s, timeSig: '3/4' }, 0);
    const firstBar = out.measuresById[out.measureOrder[0]];
    const secondBar = out.measuresById[out.measureOrder[1]];
    const idsIn = (measure: typeof firstBar) =>
      out.stavesById[measure.staffIds[0]].voicesById[
        out.stavesById[measure.staffIds[0]].voiceOrder[0]
      ].entryIds;
    // A half plus a half-note tremolo overfills 3/4, so the tremolo moves on.
    expect(idsIn(firstBar)).not.toContain('ta');
    expect(idsIn(secondBar)).toEqual(['ta', 'tb']);
    expect(out.tremolosById.tr).toBeDefined();
  });

  it('gathers a rewritten passage’s lyrics onto its first bar', () => {
    const s = build('4/4', [
      { staves: [[note('half'), note('half')]] },
      { staves: [[note('whole')]] },
    ]);
    for (const [staffId, text] of [
      ['m0s0', 'Hap-py'],
      ['m1s0', 'day'],
    ] as const) {
      s.stavesById[staffId] = {
        ...s.stavesById[staffId],
        type: 'vocal',
        voiceType: 'soprano',
        lyrics: [{ verse: 1, text }],
      } as NormalizedStaff;
    }
    const { structure: out } = rebar({ ...s, timeSig: '2/4' }, 0);
    const staves = out.measureOrder.map(
      (id) => out.stavesById[out.measuresById[id].staffIds[0]]
    );
    expect(staves[0]).toMatchObject({
      lyrics: [{ verse: 1, text: 'Hap-py day' }],
    });
    expect(staves.slice(1).every((staff) => !('lyrics' in staff))).toBe(true);
  });

  it('carries staff settings such as the label onto new measures', () => {
    const s = build('4/4', [{ staves: [[note('whole')]] }]);
    s.stavesById.m0s0 = { ...s.stavesById.m0s0, label: 'Flute' };
    const { structure: out } = rebar({ ...s, timeSig: '2/4' }, 0);
    expect(
      out.measureOrder.map(
        (id) => out.stavesById[out.measuresById[id].staffIds[0]].label
      )
    ).toEqual(['Flute', 'Flute']);
  });

  it('grows the measure count when capacity shrinks, tying each split', () => {
    const s = build('4/4', [
      { staves: [[note('whole')]] },
      { staves: [[note('whole')]] },
    ]);
    const { structure: out } = rebar({ ...s, timeSig: '2/4' }, 0);
    expect(durationsPerMeasure(out)).toEqual([
      ['half'],
      ['half'],
      ['half'],
      ['half'],
    ]);
    expect(tieCount(out)).toBe(2);
  });

  it('reflows parallel staves matched by index', () => {
    const s = build('4/4', [
      {
        staves: [
          [note('quarter'), note('quarter'), note('quarter'), note('quarter')],
          [note('half'), note('half')],
        ],
      },
    ]);
    const { structure: out } = rebar({ ...s, timeSig: '3/4' }, 0);
    expect(durationsPerMeasure(out, 0)).toEqual([
      ['quarter', 'quarter', 'quarter'],
      ['quarter'],
    ]);
    expect(durationsPerMeasure(out, 1)).toEqual([
      ['half', 'quarter'],
      ['quarter'],
    ]);
  });

  it('moves a tuplet run whole instead of splitting it at a barline', () => {
    const triplet = ['t0', 't1', 't2'].map(
      (id): MusicEntry => ({
        id,
        type: 'note',
        value: 'C',
        duration: 'eighth',
        tupletId: 'tup',
      })
    );
    const s = build('4/4', [
      {
        staves: [
          [note('quarter'), note('quarter'), ...triplet, note('quarter')],
        ],
      },
    ]);
    s.tupletsById.tup = { id: 'tup', ratio: '3:2' };

    const { structure: out } = rebar({ ...s, timeSig: '5/8' }, 0);
    expect(durationsPerMeasure(out)).toEqual([
      ['quarter', 'quarter'],
      ['eighth', 'eighth', 'eighth', 'quarter'],
    ]);
    const secondMeasureStaff =
      out.stavesById[out.measuresById[out.measureOrder[1]].staffIds[0]];
    const secondMeasureVoice1 =
      secondMeasureStaff.voicesById[secondMeasureStaff.voiceOrder[0]];
    const stillTupleted = secondMeasureVoice1.entryIds.filter((id) => {
      const entry = out.entriesById[id];
      return entry.type === 'note' && entry.tupletId === 'tup';
    });
    expect(stillTupleted).toHaveLength(3);
  });

  it('leaves measures past a later explicit override untouched', () => {
    const kept = note('quarter', 'kept');
    const s = build('4/4', [
      {
        staves: [
          [note('quarter'), note('quarter'), note('quarter'), note('quarter')],
        ],
      },
      { time: '2/4', staves: [[kept, note('quarter')]] },
    ]);
    const { structure: out } = rebar({ ...s, timeSig: '3/4' }, 0);

    expect(out.measureOrder).toHaveLength(3);
    const lastMeasure = out.measuresById[out.measureOrder[2]];
    expect(lastMeasure.time).toBe('2/4');
    const lastStaff = out.stavesById[lastMeasure.staffIds[0]];
    expect(lastStaff.voicesById[lastStaff.voiceOrder[0]].entryIds).toContain(
      'kept'
    );
  });

  it('carries a region-start override onto the reflowed first measure', () => {
    const s = build('4/4', [
      { staves: [[note('whole')]] },
      {
        time: '3/4',
        staves: [[note('half'), note('half')]],
      },
    ]);
    const { structure: out } = rebar(s, 1);
    // region is just measure 1 (3/4): [half half] → [half quarter~][~quarter]
    expect(out.measuresById[out.measureOrder[1]].time).toBe('3/4');
    expect(out.measuresById[out.measureOrder[2]].time).toBeNull();
    expect(durationsPerMeasure(out)).toEqual([
      ['whole'],
      ['half', 'quarter'],
      ['quarter'],
    ]);
  });

  it('reflows a 2-voice staff’s voices independently, preserving voice count', () => {
    const s = build('4/4', [
      {
        staves: [
          [
            [
              note('quarter'),
              note('quarter'),
              note('quarter'),
              note('quarter'),
            ],
            [note('half'), note('half')],
          ],
        ],
      },
    ]);
    const { structure: out } = rebar({ ...s, timeSig: '3/4' }, 0);

    expect(durationsPerMeasure(out, 0, 0)).toEqual([
      ['quarter', 'quarter', 'quarter'],
      ['quarter'],
    ]);
    expect(durationsPerMeasure(out, 0, 1)).toEqual([
      ['half', 'quarter'],
      ['quarter'],
    ]);
    for (const measureId of out.measureOrder) {
      const staff = out.stavesById[out.measuresById[measureId].staffIds[0]];
      expect(staff.voiceOrder).toHaveLength(2);
    }
  });

  it('warns, reports rebarred: false, and no-ops when voice count is inconsistent across the region', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s: CompositionStructure = {
      ...build('4/4', [
        { staves: [[[note('quarter'), note('quarter')], [note('half')]]] },
        { staves: [[[note('quarter'), note('quarter')]]] }, // only 1 voice here
      ]),
      timeSig: '3/4',
    };
    const { structure: out, rebarred } = rebar(s, 0);
    expect(rebarred).toBe(false);
    expect(out).toBe(s);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('voice count is inconsistent')
    );
    warn.mockRestore();
  });

  it('reports rebarred: true on a successful reflow', () => {
    const s = build('4/4', [
      {
        staves: [
          [note('quarter'), note('quarter'), note('quarter'), note('quarter')],
        ],
      },
    ]);
    const { rebarred } = rebar({ ...s, timeSig: '3/4' }, 0);
    expect(rebarred).toBe(true);
  });
});

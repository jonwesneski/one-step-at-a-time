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
      return entry.type === 'clef' ? ('clef' as DurationType) : entry.duration;
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
    const out = rebar({ ...s, timeSig: '3/4' }, 0);
    expect(durationsPerMeasure(out)).toEqual([
      ['quarter', 'quarter', 'quarter'],
      ['quarter'],
    ]);
    expect(tieCount(out)).toBe(0);
  });

  it('splits a note that crosses the new barline into a tie chain', () => {
    const s = build('4/4', [{ staves: [[note('half'), note('half')]] }]);
    const out = rebar({ ...s, timeSig: '3/4' }, 0);
    expect(durationsPerMeasure(out)).toEqual([
      ['half', 'quarter'],
      ['quarter'],
    ]);
    expect(tieCount(out)).toBe(1);
  });

  it('grows the measure count when capacity shrinks, tying each split', () => {
    const s = build('4/4', [
      { staves: [[note('whole')]] },
      { staves: [[note('whole')]] },
    ]);
    const out = rebar({ ...s, timeSig: '2/4' }, 0);
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
    const out = rebar({ ...s, timeSig: '3/4' }, 0);
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

    const out = rebar({ ...s, timeSig: '5/8' }, 0);
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
    const out = rebar({ ...s, timeSig: '3/4' }, 0);

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
    const out = rebar(s, 1);
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
    const out = rebar({ ...s, timeSig: '3/4' }, 0);

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

  it('warns and no-ops when voice count is inconsistent across the region', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s: CompositionStructure = {
      ...build('4/4', [
        { staves: [[[note('quarter'), note('quarter')], [note('half')]]] },
        { staves: [[[note('quarter'), note('quarter')]]] }, // only 1 voice here
      ]),
      timeSig: '3/4',
    };
    const out = rebar(s, 0);
    expect(out).toBe(s);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('voice count is inconsistent')
    );
    warn.mockRestore();
  });
});

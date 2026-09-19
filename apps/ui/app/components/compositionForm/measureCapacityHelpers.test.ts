import type { DurationType } from '@one-step-at-a-time/web-components';
import { describe, expect, it } from 'vitest';
import {
  availableForDuration,
  fittingDurations,
  largestFittingDuration,
  measureDuration,
  remainingDuration,
  staffOfEntryId,
  tupletRatioFits,
  usedDuration,
} from './measureCapacityHelpers';
import {
  buildMultiVoiceStaff,
  buildSingleVoiceStaff,
} from './test-fixtures/voiceFixtures';
import type {
  CompositionStructure,
  MusicEntry,
  NormalizedTuplet,
  NoteEntry,
} from './types';

const note = (
  id: string,
  duration: DurationType,
  tupletId?: string
): NoteEntry => ({
  id,
  type: 'note',
  value: 'C',
  duration,
  ...(tupletId ? { tupletId } : {}),
});

const noTuplets: Record<string, NormalizedTuplet> = {};

function buildStructure(
  entriesById: Record<string, MusicEntry>,
  tupletsById: Record<string, NormalizedTuplet> = {}
): CompositionStructure {
  return {
    timeSig: '4/4',
    measureOrder: ['m1'],
    measuresById: { m1: { id: 'm1', staffIds: ['s1'] } },
    stavesById: {
      s1: buildSingleVoiceStaff('s1', Object.keys(entriesById)),
    },
    entriesById,
    connectorsById: {},
    connectorOrder: [],
    tupletsById,
  };
}

describe('measureDuration', () => {
  it('is beats over beat-type', () => {
    expect(measureDuration('4/4')).toBe(1);
    expect(measureDuration('3/4')).toBe(0.75);
    expect(measureDuration('6/8')).toBe(0.75);
    expect(measureDuration('2/2')).toBe(1);
    expect(measureDuration('7/8')).toBeCloseTo(0.875);
  });
});

describe('usedDuration', () => {
  it('sums the entries by duration factor', () => {
    expect(
      usedDuration([note('a', 'quarter'), note('b', 'eighth')], noTuplets)
    ).toBe(0.375);
  });

  it('scales tuplet members by the ratio (3:2 triplet fills one beat)', () => {
    const entries = [
      note('a', 'eighth', 't1'),
      note('b', 'eighth', 't1'),
      note('c', 'eighth', 't1'),
    ];
    const tuplets = { t1: { id: 't1', ratio: '3:2' as const } };
    expect(usedDuration(entries, tuplets)).toBeCloseTo(0.25);
  });

  it('scales bare-numeral tuplet ratios via the library default normal count', () => {
    const entries = [
      note('a', 'eighth', 't1'),
      note('b', 'eighth', 't1'),
      note('c', 'eighth', 't1'),
    ];
    const tuplets = { t1: { id: 't1', ratio: '3' as const } };
    expect(usedDuration(entries, tuplets)).toBeCloseTo(0.25);
  });

  it('scales a partial tuplet run by the ratio', () => {
    const entries = [note('a', 'eighth', 't1'), note('b', 'eighth', 't1')];
    const tuplets = { t1: { id: 't1', ratio: '3' as const } };
    expect(usedDuration(entries, tuplets)).toBeCloseTo(1 / 6);
  });
});

describe('remainingDuration', () => {
  it('reflects the time signature, not a fixed whole note', () => {
    const threeQuarters = [note('a', 'quarter'), note('b', 'quarter')];
    expect(remainingDuration(threeQuarters, '3/4', noTuplets)).toBeCloseTo(
      0.25
    );
    expect(remainingDuration(threeQuarters, '2/4', noTuplets)).toBeCloseTo(0);
  });

  it('goes negative when a measure is overfull', () => {
    expect(
      remainingDuration([note('a', 'whole')], '3/4', noTuplets)
    ).toBeCloseTo(-0.25);
  });
});

describe('staffOfEntryId', () => {
  it('returns the staff holding the entry, or null', () => {
    const structure = buildStructure({
      e1: note('e1', 'quarter'),
      e2: note('e2', 'quarter'),
    });
    expect(staffOfEntryId(structure, 'e2')?.staff.id).toBe('s1');
    expect(staffOfEntryId(structure, 'nope')).toBeNull();
  });
});

describe('availableForDuration', () => {
  it('is the whole-measure budget with the entry’s own slot freed', () => {
    const structure = buildStructure({
      e1: note('e1', 'quarter'),
      e2: { id: 'e2', type: 'note', value: 'C', duration: 'half' },
    });
    // used = 0.75; freeing e1 (0.25) leaves 1 - 0.5 = 0.5 available to e1
    expect(availableForDuration(structure, '4/4', 'e1')).toBeCloseTo(0.5);
    // freeing e2 (0.5) leaves 1 - 0.25 = 0.75 available to e2
    expect(availableForDuration(structure, '4/4', 'e2')).toBeCloseTo(0.75);
  });

  it('falls back to the whole-measure budget for an unknown entry', () => {
    const structure = buildStructure({ e1: note('e1', 'quarter') });
    expect(availableForDuration(structure, '3/4', 'missing')).toBeCloseTo(0.75);
  });

  it('budgets each voice independently — a full voice 1 does not shrink voice 2’s own budget', () => {
    const structure: CompositionStructure = {
      timeSig: '4/4',
      measureOrder: ['m1'],
      measuresById: { m1: { id: 'm1', staffIds: ['s1'] } },
      stavesById: {
        s1: buildMultiVoiceStaff('s1', [['e1'], ['e2']]),
      },
      entriesById: {
        e1: note('e1', 'whole'), // voice 1 is already full
        e2: note('e2', 'quarter'), // voice 2 has plenty of room
      },
      connectorsById: {},
      connectorOrder: [],
      tupletsById: {},
    };
    // Freeing e2 (0.25) in its own voice leaves 1 - 0 = 1 available to it —
    // voice 1's own full measure must not leak into voice 2's budget.
    expect(availableForDuration(structure, '4/4', 'e2')).toBeCloseTo(1);
  });

  it('frees a tuplet member’s scaled duration, not its nominal one', () => {
    const structure = buildStructure(
      {
        e1: note('e1', 'eighth', 't1'),
        e2: note('e2', 'eighth', 't1'),
        e3: note('e3', 'eighth', 't1'),
        e4: note('e4', 'quarter'),
      },
      { t1: { id: 't1', ratio: '3' } }
    );
    // used = 3 * (1/8 * 2/3) + 1/4 = 1/2; freeing e2 (1/12) → 1 - (1/2 - 1/12)
    expect(availableForDuration(structure, '4/4', 'e2')).toBeCloseTo(
      1 - 5 / 12
    );
  });
});

describe('fittingDurations', () => {
  it('keeps everything that fits plus the current value and shorter', () => {
    expect(fittingDurations(0.25, 'quarter')).toEqual([
      'quarter',
      'eighth',
      'sixteenth',
      'thirtysecond',
      'sixtyfourth',
      'hundredtwentyeighth',
    ]);
  });

  it('adds longer values once they fit', () => {
    expect(fittingDurations(0.5, 'quarter')).toEqual([
      'half',
      'quarter',
      'eighth',
      'sixteenth',
      'thirtysecond',
      'sixtyfourth',
      'hundredtwentyeighth',
    ]);
  });

  it('still shows the current value when the measure is already overfull', () => {
    expect(fittingDurations(-0.25, 'whole')).toEqual([
      'whole',
      'half',
      'quarter',
      'eighth',
      'sixteenth',
      'thirtysecond',
      'sixtyfourth',
      'hundredtwentyeighth',
    ]);
  });
});

describe('largestFittingDuration', () => {
  it('is the longest value within budget', () => {
    expect(largestFittingDuration(0.3)).toBe('quarter');
    expect(largestFittingDuration(1)).toBe('whole');
    expect(largestFittingDuration(2)).toBe('double-whole');
  });

  it('is null when nothing fits', () => {
    expect(largestFittingDuration(0)).toBeNull();
  });

  it('handles a tuplet-scaled remainder', () => {
    expect(largestFittingDuration(1 / 6)).toBe('eighth');
  });
});

describe('tupletRatioFits', () => {
  const threeEighths = {
    e1: note('e1', 'eighth'),
    e2: note('e2', 'eighth'),
    e3: note('e3', 'eighth'),
  };

  it('accepts a triplet over a run that already fits', () => {
    const structure = buildStructure(threeEighths);
    expect(tupletRatioFits(structure, ['e1', 'e2', 'e3'], '3')).toBe(true);
  });

  it('rejects a duplet that would overfill the measure', () => {
    // q1 + q2 (the candidate) + a half note = exactly 4/4
    const structure = buildStructure({
      q1: note('q1', 'quarter'),
      q2: note('q2', 'quarter'),
      h1: note('h1', 'half'),
    });
    // duplet: 2 * 1/4 * 3/2 = 3/4; measure would need 1/2 + 3/4 = 5/4
    expect(tupletRatioFits(structure, ['q1', 'q2'], '2')).toBe(false);
    // triplet shrinks the pair instead → still fits
    expect(tupletRatioFits(structure, ['q1', 'q2'], '3')).toBe(true);
  });

  it('measures against the run’s own time signature', () => {
    const structure = buildStructure({
      e1: note('e1', 'quarter'),
      e2: note('e2', 'quarter'),
    });
    structure.measuresById.m1.time = '2/4';
    expect(tupletRatioFits(structure, ['e1', 'e2'], '2')).toBe(false);
    expect(tupletRatioFits(structure, ['e1', 'e2'], '3')).toBe(true);
  });
});

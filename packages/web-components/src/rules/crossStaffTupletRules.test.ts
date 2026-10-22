import type { DurationType, TupletPlacement } from '../types/theory';
import {
  TUPLET_HOOK_LENGTH_PX,
  TUPLET_NUMERAL_FONT_SIZE,
  TUPLET_STAFF_CLEARANCE_PX,
} from '../utils/notationDimensions';
import {
  classifyCrossStaffTupletLayout,
  CrossStaffTupletEntry,
  CrossStaffTupletMember,
  resolveCrossStaffTupletGapBaseY,
  resolveCrossStaffTupletGroups,
} from './crossStaffTupletRules';
import { durationToFactor } from './theoryConsts';

type Member = CrossStaffTupletMember<string>;
type Entry = CrossStaffTupletEntry<string, string>;

function note(element: string, duration: DurationType): Member {
  return {
    element,
    isRest: false,
    beatLength: durationToFactor[duration],
    inBeamGroup: false,
  };
}

function rest(element: string, duration: DurationType): Member {
  return { ...note(element, duration), isRest: true };
}

function entry(
  staffIndex: number,
  members: Member[],
  overrides: Partial<Entry> = {}
): Entry {
  return {
    staffIndex,
    tuplet: `tuplet-${staffIndex}`,
    tupletGroup: 't1',
    ratio: { actual: 3, normal: 2 },
    placement: null,
    isNested: false,
    members,
    ...overrides,
  };
}

// 7.43.09, first example, bar 1: A4, G5 (treble) → F3 (bass), triplet quarters.
const trebleToBass = {
  top: [note('A4', 'quarter'), note('G5', 'quarter'), rest('r1', 'quarter')],
  bottom: [rest('r2', 'half'), note('F3', 'quarter')],
};

describe('resolveCrossStaffTupletGroups', () => {
  it('joins one wrapper per adjacent staff into one group', () => {
    const { groups, warnings } = resolveCrossStaffTupletGroups([
      entry(1, trebleToBass.bottom),
      entry(0, trebleToBass.top),
    ]);

    expect(warnings).toHaveLength(0);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      id: 't1',
      topStaffIndex: 0,
      bottomStaffIndex: 1,
      topTuplet: 'tuplet-0',
      bottomTuplet: 'tuplet-1',
      layout: 'gap',
    });
  });

  it.each<[string, Entry[], RegExp]>([
    ['one staff', [entry(0, trebleToBass.top)], /spans 1 staff/],
    [
      'three staves',
      [
        entry(0, trebleToBass.top),
        entry(1, trebleToBass.bottom),
        entry(2, trebleToBass.bottom),
      ],
      /spans 3 staff/,
    ],
    [
      'two wrappers on one staff',
      [
        entry(0, trebleToBass.top),
        entry(0, trebleToBass.top),
        entry(1, trebleToBass.bottom),
      ],
      /more than one <music-tuplet> on one staff/,
    ],
    [
      'non-adjacent staves',
      [entry(0, trebleToBass.top), entry(2, trebleToBass.bottom)],
      /non-adjacent/,
    ],
    [
      'mismatched ratios',
      [
        entry(0, trebleToBass.top),
        entry(1, trebleToBass.bottom, { ratio: { actual: 5, normal: 4 } }),
      ],
      /different ratios/,
    ],
    [
      'mismatched total durations',
      [entry(0, trebleToBass.top), entry(1, [note('F3', 'quarter')])],
      /different total duration/,
    ],
    [
      'rests only on one staff',
      [
        entry(0, trebleToBass.top),
        entry(1, [rest('r', 'half'), rest('s', 'quarter')]),
      ],
      /notes on only one staff/,
    ],
    [
      'nesting',
      [
        entry(0, trebleToBass.top, { isNested: true }),
        entry(1, trebleToBass.bottom),
      ],
      /nested/,
    ],
    [
      'beam-group members',
      [
        entry(0, [
          { ...note('A4', 'quarter'), inBeamGroup: true },
          note('G5', 'quarter'),
          rest('r1', 'quarter'),
        ]),
        entry(1, trebleToBass.bottom),
      ],
      /beam-group members/,
    ],
  ])('warns and drops a group with %s', (_label, entries, message) => {
    const { groups, warnings } = resolveCrossStaffTupletGroups(entries);

    expect(groups).toHaveLength(0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(message);
  });

  it('drops only the bad group, keeping the others', () => {
    const { groups, warnings } = resolveCrossStaffTupletGroups([
      entry(0, trebleToBass.top),
      entry(1, trebleToBass.bottom),
      entry(0, trebleToBass.top, { tupletGroup: 'bad' }),
    ]);

    expect(groups.map((g) => g.id)).toEqual(['t1']);
    expect(warnings).toHaveLength(1);
  });

  it("honours one wrapper's placement, and on a conflict warns and uses the top staff's", () => {
    const single = resolveCrossStaffTupletGroups([
      entry(0, trebleToBass.top),
      entry(1, trebleToBass.bottom, { placement: 'below' }),
    ]);
    expect(single.groups[0].layout).toBe('below');
    expect(single.warnings).toHaveLength(0);

    const conflict = resolveCrossStaffTupletGroups([
      entry(0, trebleToBass.top, { placement: 'above' }),
      entry(1, trebleToBass.bottom, { placement: 'below' }),
    ]);
    expect(conflict.groups[0].layout).toBe('above');
    expect(conflict.warnings[0]).toMatch(/conflicting placement/);
  });
});

describe('classifyCrossStaffTupletLayout', () => {
  it('puts the bracket in the gap, hooks toward each outer note, when the outer notes are on different staves (7.43.09 bar 1)', () => {
    expect(
      classifyCrossStaffTupletLayout(
        trebleToBass.top,
        trebleToBass.bottom,
        null
      )
    ).toEqual({
      layout: 'gap',
      startSide: 'top',
      endSide: 'bottom',
      startElement: 'A4',
      endElement: 'F3',
    });
  });

  it('mirrors for a bass → treble line (7.43.09 bar 2, a 5:4 quintuplet)', () => {
    const result = classifyCrossStaffTupletLayout(
      [rest('r', 'half'), note('E5', 'sixteenth'), note('B5', 'sixteenth')],
      [note('C3', 'half'), rest('s', 'eighth')],
      null
    );

    expect(result).toMatchObject({
      layout: 'gap',
      startSide: 'bottom',
      endSide: 'top',
      startElement: 'C3',
      endElement: 'B5',
    });
  });

  it.each<[string, Member[], Member[], TupletPlacement]>([
    [
      'bottom staff → below the system (7.43.09 panel c)',
      [rest('r', 'quarter'), note('chord', 'quarter'), rest('s', 'quarter')],
      [note('F3', 'quarter'), rest('t', 'quarter'), note('C3', 'quarter')],
      'below',
    ],
    [
      'top staff → above the system',
      [note('C5', 'quarter'), rest('t', 'quarter'), note('E5', 'quarter')],
      [rest('r', 'quarter'), note('G3', 'quarter'), rest('s', 'quarter')],
      'above',
    ],
  ])(
    'places the bracket outside the system when both outer notes share the %s',
    (_label, top, bottom, expected) => {
      expect(classifyCrossStaffTupletLayout(top, bottom, null).layout).toBe(
        expected
      );
    }
  );

  it.each<[string, Member[], Member[], TupletPlacement]>([
    [
      'the top staff holds more notes',
      [note('C5', 'quarter'), note('D5', 'quarter')],
      [note('C3', 'quarter'), rest('r', 'quarter')],
      'above',
    ],
    [
      'the bottom staff holds more notes',
      [note('C5', 'quarter'), rest('r', 'quarter')],
      [note('C3', 'quarter'), note('D3', 'quarter')],
      'below',
    ],
    [
      'both staves hold the same number',
      [note('C5', 'quarter'), rest('r', 'quarter')],
      [note('C3', 'quarter'), rest('s', 'quarter')],
      'above',
    ],
  ])(
    'when both hands sound together at an end, goes outside on the majority side — %s',
    (_label, top, bottom, expected) => {
      const result = classifyCrossStaffTupletLayout(top, bottom, null);
      expect(result.layout).toBe(expected);
      expect(result.startSide).toBeNull();
    }
  );

  it('lets a placement override win over the gap layout', () => {
    expect(
      classifyCrossStaffTupletLayout(
        trebleToBass.top,
        trebleToBass.bottom,
        'above'
      ).layout
    ).toBe('above');
  });
});

describe('resolveCrossStaffTupletGapBaseY', () => {
  const clearance =
    TUPLET_STAFF_CLEARANCE_PX +
    Math.max(TUPLET_HOOK_LENGTH_PX, TUPLET_NUMERAL_FONT_SIZE / 2);

  it('centres the line in the band clear of both staves and every stem tip', () => {
    const baseY = resolveCrossStaffTupletGapBaseY({
      topGapEdgeY: 100,
      bottomGapEdgeY: 200,
      topExtremeY: 130,
      bottomExtremeY: 190,
    });

    expect(baseY).toBeCloseTo((130 + clearance + (190 - clearance)) / 2);
  });

  it('uses the gap edges when no member reaches into the gap', () => {
    const baseY = resolveCrossStaffTupletGapBaseY({
      topGapEdgeY: 100,
      bottomGapEdgeY: 200,
      topExtremeY: null,
      bottomExtremeY: null,
    });

    expect(baseY).toBeCloseTo(150);
  });

  it('falls back to the gap centre when stems leave no clear band', () => {
    const baseY = resolveCrossStaffTupletGapBaseY({
      topGapEdgeY: 100,
      bottomGapEdgeY: 200,
      topExtremeY: 170,
      bottomExtremeY: 130,
    });

    expect(baseY).toBe(150);
  });
});

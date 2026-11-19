import type { DurationType } from '../types/theory';
import {
  BEAM_STEP_PX,
  BEAM_THICKNESS_PX,
  STEM_OVERLAP_PX,
  TREMOLO_BEAM_STEM_GAP_PX,
} from '../utils/notationDimensions';
import {
  centredCrossStaffTremoloLine,
  type CrossStaffTremoloEntry,
  resolveCrossStaffTremoloBeams,
  resolveCrossStaffTremoloGroups,
} from './crossStaffTremoloRules';

type Entry = CrossStaffTremoloEntry<string, string>;

const member = (
  element: string,
  isRest = false,
  duration: DurationType = 'whole'
) => ({ element, isRest, duration, beatLength: 0.5 });

const entry = (overrides: Partial<Entry> = {}): Entry => ({
  staffIndex: 0,
  tremolo: 'top',
  tremoloGroup: 't',
  strokes: 3,
  valid: true,
  isNested: false,
  startBeat: 0,
  members: [member('C6'), member('rest', true)],
  ...overrides,
});

const bottom = (overrides: Partial<Entry> = {}): Entry =>
  entry({
    staffIndex: 1,
    tremolo: 'bottom',
    members: [member('rest', true), member('C4')],
    ...overrides,
  });

describe('resolveCrossStaffTremoloGroups', () => {
  it('joins one wrapper on each adjacent staff, ordering notes by onset', () => {
    const { groups, warnings } = resolveCrossStaffTremoloGroups([
      entry(),
      bottom(),
    ]);
    expect(warnings).toEqual([]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      id: 't',
      topStaffIndex: 0,
      bottomStaffIndex: 1,
      topTremolo: 'top',
      bottomTremolo: 'bottom',
      strokes: 3,
      duration: 'whole',
    });
    expect(groups[0].notes.map((note) => note.element)).toEqual(['C6', 'C4']);
    expect(groups[0].notes.map((note) => note.onset)).toEqual([0, 0.5]);
  });

  it.each<[string, Entry[]]>([
    ['one staff', [entry()]],
    ['two wrappers on one staff', [entry(), entry(), bottom()]],
    ['non-adjacent staves', [entry(), bottom({ staffIndex: 2 })]],
    [
      'a wrapper that can’t make a tremolo',
      [entry({ valid: false }), bottom()],
    ],
    ['a nested wrapper', [entry(), bottom({ isNested: true })]],
    ['different strokes', [entry(), bottom({ strokes: 2 })]],
    [
      'different durations',
      [
        entry(),
        bottom({
          members: [member('rest', true, 'half'), member('C4', false, 'half')],
        }),
      ],
    ],
    [
      'a different share on each staff',
      [
        entry(),
        bottom({
          members: [member('rest', true), member('C4'), member('rest2', true)],
        }),
      ],
    ],
    ['different start beats', [entry(), bottom({ startBeat: 0.25 })]],
    [
      'no note on a staff',
      [entry(), bottom({ members: [member('a', true), member('b', true)] })],
    ],
  ])('drops a group with %s, with a warning', (_, entries) => {
    const { groups, warnings } = resolveCrossStaffTremoloGroups(entries);
    expect(groups).toHaveLength(0);
    expect(warnings).toHaveLength(1);
  });

  it('keeps a good group when another drops', () => {
    const { groups } = resolveCrossStaffTremoloGroups([
      entry(),
      bottom(),
      entry({ tremoloGroup: 'lonely' }),
    ]);
    expect(groups.map((group) => group.id)).toEqual(['t']);
  });
});

describe('centredCrossStaffTremoloLine', () => {
  it('centres the stack between the staves, keeping the slope', () => {
    const line = centredCrossStaffTremoloLine({
      firstX: 0,
      lastX: 40,
      slope: 0.1,
      topGapEdgeY: 100,
      bottomGapEdgeY: 200,
      total: 3,
    });
    const stackHeight = BEAM_THICKNESS_PX + 2 * BEAM_STEP_PX;
    expect((line.yAtFirstX + line.yAtLastX) / 2 + stackHeight / 2).toBeCloseTo(
      150
    );
    expect(line.yAtLastX - line.yAtFirstX).toBeCloseTo(4);
  });
});

describe('resolveCrossStaffTremoloBeams', () => {
  const line = { firstX: 0, lastX: 60, yAtFirstX: 100, yAtLastX: 100 };
  const stems = [
    { x: 0, stemUp: false },
    { x: 60, stemUp: true },
  ];

  it('hangs detached beams below an attached one, both stems ending in it', () => {
    const { beams, stemTipYs } = resolveCrossStaffTremoloBeams({
      stems,
      line,
      attached: 1,
      total: 3,
    });
    expect(beams[0]).toMatchObject({ x1: 0, x2: 60, top1: 100 });
    expect(beams[1].top1).toBeCloseTo(100 + BEAM_STEP_PX);
    expect(beams[1].x1).toBeCloseTo(TREMOLO_BEAM_STEM_GAP_PX);
    expect(stemTipYs).toEqual([100 + STEM_OVERLAP_PX, 100 + STEM_OVERLAP_PX]);
  });

  it('has each stem reach past a detached stack', () => {
    const { beams, stemTipYs } = resolveCrossStaffTremoloBeams({
      stems,
      line,
      attached: 0,
      total: 3,
    });
    expect(beams.every((beam) => beam.x1 > 0 && beam.x2 < 60)).toBe(true);
    expect(stemTipYs).toEqual([
      100 + BEAM_THICKNESS_PX + 2 * BEAM_STEP_PX,
      100,
    ]);
  });
});

/**
 * @jest-environment jsdom
 */
import '../note/index';
import '../tuplet/index';
import {
  NoteChordOrRestElementType,
  TupletElementType,
} from '../types/elements';
import { MUSIC_NOTE, MUSIC_TUPLET } from '../utils/consts';
import { computeAboveStaffBudget } from './staffHeightRules';
import { buildTupletGroups } from './tupletRules';

afterEach(() => {
  document.body.innerHTML = '';
});

function makeNote(): NoteChordOrRestElementType {
  const el = document.createElement(MUSIC_NOTE);
  el.setAttribute('note', 'C');
  el.setAttribute('duration', 'eighth');
  document.body.appendChild(el);
  return el as NoteChordOrRestElementType;
}

function makeTuplet(ratio: string): TupletElementType {
  const el = document.createElement(MUSIC_TUPLET) as TupletElementType;
  el.setAttribute('ratio', ratio);
  document.body.appendChild(el);
  return el;
}

// ─── computeAboveStaffBudget ──────────────────────────────────────────────────

describe('computeAboveStaffBudget', () => {
  it('returns 0 for empty groups', () => {
    expect(computeAboveStaffBudget([], [], 0)).toBe(0);
  });

  it('returns 0 when all groups are stem-down', () => {
    const tupletEl = makeTuplet('3');
    const elements: NoteChordOrRestElementType[] = [
      makeNote(),
      makeNote(),
      makeNote(),
    ];
    const tupletsByIndex = new Map<number, TupletElementType[]>([
      [0, [tupletEl]],
      [1, [tupletEl]],
      [2, [tupletEl]],
    ]);
    const groups = buildTupletGroups(elements, tupletsByIndex);
    const stemDirections = [false, false, false];

    expect(computeAboveStaffBudget(groups, stemDirections, 0)).toBe(0);
  });

  it('returns a positive budget for a stem-up group at nesting level 0', () => {
    const tupletEl = makeTuplet('3');
    const elements: NoteChordOrRestElementType[] = [
      makeNote(),
      makeNote(),
      makeNote(),
    ];
    const tupletsByIndex = new Map<number, TupletElementType[]>([
      [0, [tupletEl]],
      [1, [tupletEl]],
      [2, [tupletEl]],
    ]);
    const groups = buildTupletGroups(elements, tupletsByIndex);
    const stemDirections = [true, true, true];

    expect(computeAboveStaffBudget(groups, stemDirections, 0)).toBeGreaterThan(
      0
    );
  });

  it('returns a larger budget for the outer bracket (nestingLevel 0) than the inner bracket (nestingLevel 1)', () => {
    const outerTuplet = document.createElement(
      MUSIC_TUPLET
    ) as TupletElementType;
    outerTuplet.setAttribute('ratio', '5:4');
    document.body.appendChild(outerTuplet);

    const innerTuplet = document.createElement(
      MUSIC_TUPLET
    ) as TupletElementType;
    innerTuplet.setAttribute('ratio', '3');
    outerTuplet.appendChild(innerTuplet);

    // All notes belong to both tuplets (outer and inner ancestor chain).
    // maxNestingLevel = 1 because there are two levels (0 and 1).
    const elements: NoteChordOrRestElementType[] = [
      makeNote(),
      makeNote(),
      makeNote(),
    ];
    const tupletsByIndex = new Map<number, TupletElementType[]>(
      elements.map((_, i) => [i, [outerTuplet, innerTuplet]])
    );
    const groups = buildTupletGroups(elements, tupletsByIndex);
    const outerGroup = groups.filter((g) => g.nestingLevel === 0);
    const innerGroup = groups.filter((g) => g.nestingLevel === 1);
    const stemDirections = [true, true, true];

    const outerBudget = computeAboveStaffBudget(outerGroup, stemDirections, 1);
    const innerBudget = computeAboveStaffBudget(innerGroup, stemDirections, 1);

    // Outer bracket (level 0, depthFromOutside = 1) sits furthest → needs more budget.
    expect(outerBudget).toBeGreaterThan(innerBudget);
  });

  it('ignores stem-down groups when computing the budget', () => {
    const stemUpTuplet = makeTuplet('3');
    const stemDownTuplet = makeTuplet('3');
    const allElements: NoteChordOrRestElementType[] = [
      makeNote(),
      makeNote(),
      makeNote(),
      makeNote(),
      makeNote(),
      makeNote(),
    ];
    const tupletsByIndex = new Map<number, TupletElementType[]>([
      [0, [stemUpTuplet]],
      [1, [stemUpTuplet]],
      [2, [stemUpTuplet]],
      [3, [stemDownTuplet]],
      [4, [stemDownTuplet]],
      [5, [stemDownTuplet]],
    ]);
    const groups = buildTupletGroups(allElements, tupletsByIndex);
    const stemDirections = [true, true, true, false, false, false];

    const mixedBudget = computeAboveStaffBudget(groups, stemDirections, 0);
    const stemDownOnly = computeAboveStaffBudget(
      groups.filter((g) => g.indices[0] >= 3),
      stemDirections,
      0
    );

    expect(mixedBudget).toBeGreaterThan(0);
    expect(stemDownOnly).toBe(0);
  });
});

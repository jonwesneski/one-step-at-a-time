/**
 * @jest-environment jsdom
 */
import '../note/index';
import '../tuplet/index';
import type {
  NoteChordOrRestElementType,
  NoteElementType,
  TupletElementType,
} from '../types/elements';
import { DurationType, Note } from '../types/theory';
import { MUSIC_NOTE, MUSIC_TUPLET } from '../utils/consts';
import { computeAboveStaffBudget } from './staffHeightRules';
import {
  buildTupletGroups,
  computeTupletBracketGeometry,
  TupletBracketGeometry,
} from './tupletRules';

afterEach(() => {
  document.body.innerHTML = '';
});

function makeNote(): NoteChordOrRestElementType {
  const element = document.createElement(MUSIC_NOTE);
  element.setAttribute('note', 'C' satisfies Note);
  element.setAttribute('duration', 'eighth' satisfies DurationType);
  document.body.appendChild(element);
  return element as NoteChordOrRestElementType;
}

function makeTuplet(ratio: string): TupletElementType {
  const element = document.createElement(MUSIC_TUPLET) as TupletElementType;
  element.setAttribute('ratio', ratio);
  document.body.appendChild(element);
  return element;
}

function makeGeometry(
  stemUp: boolean,
  outerBaseY: number | null = null
): TupletBracketGeometry {
  const tupletElement = makeTuplet('3');
  const elements: NoteChordOrRestElementType[] = [
    makeNote(),
    makeNote(),
    makeNote(),
  ];
  const noteStaffYCoords = new Map<NoteElementType, number>(
    elements.map((el, i) => [el as NoteElementType, 20 + i * 5])
  );
  const tupletsByIndex = new Map<number, TupletElementType[]>(
    elements.map((_, i) => [i, [tupletElement]])
  );
  const [group] = buildTupletGroups(elements, tupletsByIndex);
  const noteXPositions = new Map<number, number>(
    elements.map((_, i) => [i, i * 30 + 10])
  );
  const stemDirections = elements.map(() => stemUp);
  return computeTupletBracketGeometry(
    group,
    elements,
    noteXPositions,
    stemDirections,
    new Set<number>(), // not beamed — bracket shown
    noteStaffYCoords,
    new Map(),
    outerBaseY,
    false
  )!;
}

// ─── computeAboveStaffBudget ──────────────────────────────────────────────────

describe('computeAboveStaffBudget', () => {
  it('returns 0 for empty geometries', () => {
    expect(computeAboveStaffBudget([])).toBe(0);
  });

  it('returns 0 when all geometries are stem-down', () => {
    const geometry = makeGeometry(false);
    expect(computeAboveStaffBudget([geometry])).toBe(0);
  });

  it('returns a positive budget for a stem-up bracket group', () => {
    const geometry = makeGeometry(true);
    expect(computeAboveStaffBudget([geometry])).toBeGreaterThan(0);
  });

  it('outer bracket (higher baseY absolute value) produces larger budget than inner', () => {
    // Inner geometry: staff-referenced baseY (no outerBaseY)
    const innerGeometry = makeGeometry(true, null);
    // Outer geometry: positioned even further above via a smaller explicit baseY
    const outerGeometry = makeGeometry(true, innerGeometry.baseY - 20);
    const outerBudget = computeAboveStaffBudget([outerGeometry]);
    const innerBudget = computeAboveStaffBudget([innerGeometry]);
    expect(outerBudget).toBeGreaterThan(innerBudget);
  });

  it('ignores stem-down geometries when computing the budget', () => {
    const stemUpGeometry = makeGeometry(true);
    const stemDownGeometry = makeGeometry(false);
    const mixedBudget = computeAboveStaffBudget([
      stemUpGeometry,
      stemDownGeometry,
    ]);
    const stemDownOnly = computeAboveStaffBudget([stemDownGeometry]);

    expect(mixedBudget).toBeGreaterThan(0);
    expect(stemDownOnly).toBe(0);
  });
});

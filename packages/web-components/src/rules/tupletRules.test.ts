/**
 * @jest-environment jsdom
 */
import '../note/index';
import '../tuplet/index';
import {
  ChordElementType,
  NoteChordOrRestElementType,
  NoteElementType,
  TupletElementType,
} from '../types/elements';
import { DurationType } from '../types/theory';
import { MUSIC_NOTE, MUSIC_TUPLET } from '../utils/consts';
import {
  BEAM_THICKNESS_PX,
  STAFF_BOTTOM_LINE_Y,
  STAFF_TOP_LINE_Y,
  STAFF_Y_PADDING,
  TUPLET_HOOK_LENGTH_PX,
  TUPLET_NUMERAL_BEAM_GAP_PX,
  TUPLET_NUMERAL_FONT_SIZE,
  TUPLET_STAFF_CLEARANCE_PX,
} from '../utils/notationDimensions';
import {
  NOTE_HEAD_CX_STEM_DOWN_PX,
  NOTE_HEAD_CX_STEM_UP_PX,
  NOTE_STEM_TIP_Y_OFFSET,
  NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN,
  NOTE_Y_HEAD_OFFSET_STEM_DOWN,
  NOTE_Y_HEAD_OFFSET_STEM_UP,
} from '../utils/svgCreator/note';
import {
  buildTupletGroups,
  computeOuterBracketBaseY,
  computeTupletBracketGeometry,
  defaultNormalCount,
  parseTupletRatio,
} from './tupletRules';

afterEach(() => {
  document.body.innerHTML = '';
});

// ─── parseTupletRatio ────────────────────────────────────────────────────────

describe('parseTupletRatio', () => {
  it('parses simple number "3"', () => {
    const result = parseTupletRatio('3');
    expect(result).toEqual({ actual: 3, normal: 2, displayString: '3' });
  });

  it('parses full ratio "3:2"', () => {
    const result = parseTupletRatio('3:2');
    expect(result).toEqual({ actual: 3, normal: 2, displayString: '3:2' });
  });

  it('parses "5:4"', () => {
    const result = parseTupletRatio('5:4');
    expect(result).toEqual({ actual: 5, normal: 4, displayString: '5:4' });
  });

  it('parses "7" using defaultNormalCount', () => {
    const result = parseTupletRatio('7');
    expect(result).toEqual({ actual: 7, normal: 4, displayString: '7' });
  });
});

// ─── defaultNormalCount ───────────────────────────────────────────────────────

describe('defaultNormalCount', () => {
  it.each([
    [2, 3],
    [3, 2],
    [4, 3],
    [5, 4],
    [6, 4],
    [7, 4],
    [8, 6],
    [9, 8],
  ])('actual=%i → normal=%i', (actual, expected) => {
    expect(defaultNormalCount(actual)).toBe(expected);
  });
});

// ─── buildTupletGroups ───────────────────────────────────────────────────────

function makeNote(noteLetter = 'C', duration = 'eighth'): NoteElementType {
  const el = document.createElement(MUSIC_NOTE) as NoteElementType;
  el.setAttribute('note', noteLetter);
  el.setAttribute('duration', duration);
  document.body.appendChild(el);
  return el;
}

function makeTuplet(ratio: string): TupletElementType {
  const el = document.createElement(MUSIC_TUPLET) as TupletElementType;
  el.setAttribute('ratio', ratio);
  document.body.appendChild(el);
  return el;
}

describe('buildTupletGroups', () => {
  it('returns empty array when no tuplets in map', () => {
    const elements: NoteChordOrRestElementType[] = [
      makeNote(),
      makeNote(),
      makeNote(),
    ];
    const result = buildTupletGroups(elements, new Map());
    expect(result).toHaveLength(0);
  });

  it('returns one group for a simple triplet (3 notes, same tuplet element)', () => {
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

    const result = buildTupletGroups(elements, tupletsByIndex);

    expect(result).toHaveLength(1);
    expect(result[0].indices).toEqual([0, 1, 2]);
    expect(result[0].parsedRatio.actual).toBe(3);
    expect(result[0].parsedRatio.normal).toBe(2);
    expect(result[0].nestingLevel).toBe(0);
  });

  it('returns nestingLevel 1 for inner nested tuplet', () => {
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

    const elements: NoteChordOrRestElementType[] = [
      makeNote(),
      makeNote(),
      makeNote(),
      makeNote(),
      makeNote(),
    ];
    // Each note maps to all its tuplet ancestors (outermost first).
    // Notes 0,1,4 are direct children of the outer tuplet.
    // Notes 2,3 are inside the inner tuplet, so they have both ancestors.
    const tupletsByIndex = new Map<number, TupletElementType[]>([
      [0, [outerTuplet]],
      [1, [outerTuplet]],
      [2, [outerTuplet, innerTuplet]],
      [3, [outerTuplet, innerTuplet]],
      [4, [outerTuplet]],
    ]);

    const result = buildTupletGroups(elements, tupletsByIndex);

    expect(result).toHaveLength(2);
    const outer = result.find((g) => g.parsedRatio.displayString === '5:4');
    const inner = result.find((g) => g.parsedRatio.displayString === '3');
    expect(outer?.nestingLevel).toBe(0);
    expect(inner?.nestingLevel).toBe(1);
  });

  it('returns a group for an outer tuplet whose children are all inner tuplets', () => {
    const outerTuplet = document.createElement(
      MUSIC_TUPLET
    ) as TupletElementType;
    outerTuplet.setAttribute('ratio', '9:8');
    document.body.appendChild(outerTuplet);

    const innerTuplet1 = document.createElement(
      MUSIC_TUPLET
    ) as TupletElementType;
    innerTuplet1.setAttribute('ratio', '3');
    outerTuplet.appendChild(innerTuplet1);

    const innerTuplet2 = document.createElement(
      MUSIC_TUPLET
    ) as TupletElementType;
    innerTuplet2.setAttribute('ratio', '3');
    outerTuplet.appendChild(innerTuplet2);

    const innerTuplet3 = document.createElement(
      MUSIC_TUPLET
    ) as TupletElementType;
    innerTuplet3.setAttribute('ratio', '3');
    outerTuplet.appendChild(innerTuplet3);

    const elements: NoteChordOrRestElementType[] = Array.from(
      { length: 9 },
      () => makeNote()
    );
    const tupletsByIndex = new Map<number, TupletElementType[]>([
      [0, [outerTuplet, innerTuplet1]],
      [1, [outerTuplet, innerTuplet1]],
      [2, [outerTuplet, innerTuplet1]],
      [3, [outerTuplet, innerTuplet2]],
      [4, [outerTuplet, innerTuplet2]],
      [5, [outerTuplet, innerTuplet2]],
      [6, [outerTuplet, innerTuplet3]],
      [7, [outerTuplet, innerTuplet3]],
      [8, [outerTuplet, innerTuplet3]],
    ]);

    const result = buildTupletGroups(elements, tupletsByIndex);

    expect(result).toHaveLength(4);
    const outerGroup = result.find(
      (g) => g.parsedRatio.displayString === '9:8'
    );
    expect(outerGroup).toBeDefined();
    expect(outerGroup?.nestingLevel).toBe(0);
    expect(outerGroup?.indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    const innerGroups = result.filter(
      (g) => g.parsedRatio.displayString === '3'
    );
    expect(innerGroups).toHaveLength(3);
    innerGroups.forEach((g) => expect(g.nestingLevel).toBe(1));
  });
});

// ─── computeTupletBracketGeometry ────────────────────────────────────────────

function makeGeometryInputs(
  noteCount: number,
  stemUp: boolean,
  duration: DurationType = 'eighth'
) {
  const elements: NoteChordOrRestElementType[] = [];
  const noteStaffYCoords = new Map<NoteElementType, number>();
  for (let i = 0; i < noteCount; i++) {
    const el = makeNote('C', duration);
    elements.push(el);
    // Choose note positions where the clamp doesn't trigger for the given stem direction.
    // Stem-up: notes far below staff (staffY ≥ 72) — long stems up, beam clears bracket.
    // Stem-down: notes high in staff (staffY ≤ 20) — short stems down, beam stays near staff.
    const baseStaffY = stemUp ? 72 : 10;
    noteStaffYCoords.set(el, baseStaffY + i * 5);
  }

  const stemDirections = elements.map(() => stemUp);
  const beamedIndices = new Set<number>(elements.map((_, i) => i));
  const noteXPositions = new Map<number, number>(
    elements.map((_, i) => [i, i * 30 + 10])
  );

  // Nest the tuplet inside an outer tuplet so nestingLevel=1, which allows
  // omitBracket=true when all notes are beamed (the beam-based numeralY path).
  const outerTupletEl = document.createElement(
    MUSIC_TUPLET
  ) as TupletElementType;
  outerTupletEl.setAttribute('ratio', '3:2');
  document.body.appendChild(outerTupletEl);

  const tupletEl = makeTuplet('3');
  outerTupletEl.appendChild(tupletEl);

  const tupletsByIndex = new Map<number, TupletElementType[]>(
    elements.map((_, i) => [i, [outerTupletEl, tupletEl]])
  );

  const groups = buildTupletGroups(elements, tupletsByIndex);
  const group = groups.find((g) => g.nestingLevel === 1)!;

  return {
    group,
    elements,
    noteXPositions,
    stemDirections,
    beamedIndices,
    noteStaffYCoords,
    chordStaffYCoords: new Map(),
  };
}

describe('computeTupletBracketGeometry', () => {
  it('returns null for a group with fewer than 2 indices', () => {
    const el = makeNote();
    const tupletEl = makeTuplet('3');
    const elements = [el];
    const tupletsByIndex = new Map([[0, [tupletEl]]]);
    const [group] = buildTupletGroups(elements, tupletsByIndex);

    const result = computeTupletBracketGeometry(
      group,
      elements,
      new Map([[0, 10]]),
      [true],
      new Set([0]),
      new Map(),
      new Map(),
      null,
      false
    );

    expect(result).toBeNull();
  });

  it('returns null when x positions are missing', () => {
    const inputs = makeGeometryInputs(3, true);
    const result = computeTupletBracketGeometry(
      inputs.group,
      inputs.elements,
      new Map(), // empty — missing positions
      inputs.stemDirections,
      inputs.beamedIndices,
      inputs.noteStaffYCoords,
      inputs.chordStaffYCoords,
      null,
      false
    );

    expect(result).toBeNull();
  });

  it('sets omitBracket=true for outermost tuplet (nestingLevel 0) when all notes are beamed and no inner groups', () => {
    const tupletEl = makeTuplet('3');
    const elements: NoteChordOrRestElementType[] = Array.from(
      { length: 3 },
      () => makeNote()
    );
    const noteStaffYCoords = new Map<NoteElementType, number>(
      elements.map((element, i) => [element as NoteElementType, 50 + i * 5])
    );
    const tupletsByIndex = new Map<number, TupletElementType[]>(
      elements.map((_, i) => [i, [tupletEl]])
    );
    const [group] = buildTupletGroups(elements, tupletsByIndex);

    const result = computeTupletBracketGeometry(
      group,
      elements,
      new Map(elements.map((_, i) => [i, i * 30 + 10])),
      elements.map(() => true),
      new Set(elements.map((_, i) => i)),
      noteStaffYCoords,
      new Map(),
      null,
      false
    );

    expect(result).not.toBeNull();
    expect(result!.omitBracket).toBe(true);
  });

  it('sets omitBracket=false for outermost tuplet (nestingLevel 0) when it has inner groups', () => {
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

    const elements: NoteChordOrRestElementType[] = Array.from(
      { length: 3 },
      () => makeNote()
    );
    const noteStaffYCoords = new Map<NoteElementType, number>(
      elements.map((element, i) => [element as NoteElementType, 50 + i * 5])
    );
    const tupletsByIndex = new Map<number, TupletElementType[]>(
      elements.map((_, i) => [i, [outerTuplet, innerTuplet]])
    );
    const groups = buildTupletGroups(elements, tupletsByIndex);
    const outerGroup = groups.find((g) => g.nestingLevel === 0)!;

    const result = computeTupletBracketGeometry(
      outerGroup,
      elements,
      new Map(elements.map((_, i) => [i, i * 30 + 10])),
      elements.map(() => true),
      new Set(elements.map((_, i) => i)),
      noteStaffYCoords,
      new Map(),
      null,
      true // hasInnerGroups
    );

    expect(result).not.toBeNull();
    expect(result!.omitBracket).toBe(false);
  });

  it('sets omitBracket=true for inner tuplet (nestingLevel 1) when all notes are beamed', () => {
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

    const elements: NoteChordOrRestElementType[] = Array.from(
      { length: 3 },
      () => makeNote()
    );
    const noteStaffYCoords = new Map<NoteElementType, number>(
      elements.map((element, i) => [element as NoteElementType, 50 + i * 5])
    );
    const tupletsByIndex = new Map<number, TupletElementType[]>(
      elements.map((_, i) => [i, [outerTuplet, innerTuplet]])
    );
    const groups = buildTupletGroups(elements, tupletsByIndex);
    const innerGroup = groups.find((g) => g.nestingLevel === 1)!;

    const result = computeTupletBracketGeometry(
      innerGroup,
      elements,
      new Map(elements.map((_, i) => [i, i * 30 + 10])),
      elements.map(() => true),
      new Set(elements.map((_, i) => i)),
      noteStaffYCoords,
      new Map(),
      null,
      false
    );

    expect(result).not.toBeNull();
    expect(result!.omitBracket).toBe(true);
  });

  it('sets omitBracket=false when a note is not beamed', () => {
    const inputs = makeGeometryInputs(3, true);
    const partialBeamed = new Set([0, 1]); // index 2 not beamed

    const result = computeTupletBracketGeometry(
      inputs.group,
      inputs.elements,
      inputs.noteXPositions,
      inputs.stemDirections,
      partialBeamed,
      inputs.noteStaffYCoords,
      inputs.chordStaffYCoords,
      null,
      false
    );

    expect(result!.omitBracket).toBe(false);
  });

  it('sets omitBracket=false when group contains a rest', () => {
    const elements: NoteChordOrRestElementType[] = [
      makeNote(),
      makeNote(),
      makeNote(),
    ];
    // Simulate a rest by overriding nodeName — easiest via a custom element stub
    Object.defineProperty(elements[1], 'nodeName', {
      get: () => 'MUSIC-REST',
      configurable: true,
    });

    const tupletEl = makeTuplet('3');
    const tupletsByIndex = new Map<number, TupletElementType[]>(
      elements.map((_, i) => [i, [tupletEl]])
    );
    const [group] = buildTupletGroups(elements, tupletsByIndex);

    const noteStaffYCoords = new Map<NoteElementType, number>(
      elements.map((el, i) => [el as NoteElementType, 50 + i * 5])
    );
    const result = computeTupletBracketGeometry(
      group,
      elements,
      new Map(elements.map((_, i) => [i, i * 30 + 10])),
      elements.map(() => true),
      new Set(elements.map((_, i) => i)),
      noteStaffYCoords,
      new Map(),
      null,
      false
    );

    expect(result!.omitBracket).toBe(false);
  });

  it('produces stemUp=true when majority of notes are stem-up', () => {
    const inputs = makeGeometryInputs(3, true);
    const result = computeTupletBracketGeometry(
      inputs.group,
      inputs.elements,
      inputs.noteXPositions,
      [true, true, false],
      inputs.beamedIndices,
      inputs.noteStaffYCoords,
      inputs.chordStaffYCoords,
      null,
      false
    );

    expect(result!.stemUp).toBe(true);
  });

  it('produces baseY above staff top line when stemUp=true', () => {
    const inputs = makeGeometryInputs(3, true);
    const result = computeTupletBracketGeometry(
      inputs.group,
      inputs.elements,
      inputs.noteXPositions,
      inputs.stemDirections,
      inputs.beamedIndices,
      inputs.noteStaffYCoords,
      inputs.chordStaffYCoords,
      null,
      false
    )!;

    const staffTopInContainer = STAFF_TOP_LINE_Y - STAFF_Y_PADDING;
    expect(result.baseY).toBeLessThan(staffTopInContainer);
  });

  it('produces baseY below staff bottom line when stemUp=false', () => {
    const inputs = makeGeometryInputs(3, false);
    const result = computeTupletBracketGeometry(
      inputs.group,
      inputs.elements,
      inputs.noteXPositions,
      inputs.stemDirections,
      inputs.beamedIndices,
      inputs.noteStaffYCoords,
      inputs.chordStaffYCoords,
      null,
      false
    )!;

    const staffBottomInContainer = STAFF_BOTTOM_LINE_Y + STAFF_Y_PADDING;
    expect(result.baseY).toBeGreaterThan(staffBottomInContainer);
  });

  // ─── baseY stem-tip clamping ──────────────────────────────────────────────────

  it('clamps baseY above stem tips when stem-up beamed notes have long stems', () => {
    const tupletEl = makeTuplet('3');
    const elements: NoteChordOrRestElementType[] = Array.from(
      { length: 3 },
      () => makeNote('C', 'eighth')
    );
    // staffY = -20: above staff → stem tips protrude well above the default bracket zone
    const staffY = -20;
    const noteStaffYCoords = new Map<NoteElementType, number>(
      elements.map((el) => [el as NoteElementType, staffY])
    );
    const tupletsByIndex = new Map<number, TupletElementType[]>(
      elements.map((_, i) => [i, [tupletEl]])
    );
    const [group] = buildTupletGroups(elements, tupletsByIndex);

    const result = computeTupletBracketGeometry(
      group,
      elements,
      new Map(elements.map((_, i) => [i, i * 30 + 10])),
      elements.map(() => true),
      new Set(elements.map((_, i) => i)),
      noteStaffYCoords,
      new Map(),
      null,
      true // hasInnerGroups → omitBracket=false so baseY drives the bracket
    )!;

    const stemTipY =
      STAFF_Y_PADDING +
      staffY -
      NOTE_Y_HEAD_OFFSET_STEM_UP +
      NOTE_STEM_TIP_Y_OFFSET;
    const expectedBaseY =
      stemTipY - (TUPLET_STAFF_CLEARANCE_PX + TUPLET_HOOK_LENGTH_PX);
    const staffBaseY =
      STAFF_TOP_LINE_Y -
      STAFF_Y_PADDING -
      TUPLET_STAFF_CLEARANCE_PX -
      TUPLET_HOOK_LENGTH_PX;

    expect(result.baseY).toBeLessThan(staffBaseY);
    expect(result.baseY).toBeCloseTo(expectedBaseY);
  });

  it('clamps baseY below stem tips when stem-down beamed notes have long stems', () => {
    const tupletEl = makeTuplet('3');
    const elements: NoteChordOrRestElementType[] = Array.from(
      { length: 3 },
      () => makeNote('C', 'eighth')
    );
    // staffY = 50: below staff center → stem tips protrude well below the default bracket zone
    const staffY = 50;
    const noteStaffYCoords = new Map<NoteElementType, number>(
      elements.map((el) => [el as NoteElementType, staffY])
    );
    const tupletsByIndex = new Map<number, TupletElementType[]>(
      elements.map((_, i) => [i, [tupletEl]])
    );
    const [group] = buildTupletGroups(elements, tupletsByIndex);

    const result = computeTupletBracketGeometry(
      group,
      elements,
      new Map(elements.map((_, i) => [i, i * 30 + 10])),
      elements.map(() => false),
      new Set(elements.map((_, i) => i)),
      noteStaffYCoords,
      new Map(),
      null,
      true // hasInnerGroups → omitBracket=false
    )!;

    const stemTipY =
      STAFF_Y_PADDING +
      staffY -
      NOTE_Y_HEAD_OFFSET_STEM_DOWN +
      NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN;
    const expectedBaseY =
      stemTipY + (TUPLET_STAFF_CLEARANCE_PX + TUPLET_HOOK_LENGTH_PX);
    const staffBaseY =
      STAFF_BOTTOM_LINE_Y +
      STAFF_Y_PADDING +
      TUPLET_STAFF_CLEARANCE_PX +
      TUPLET_HOOK_LENGTH_PX;

    expect(result.baseY).toBeGreaterThan(staffBaseY);
    expect(result.baseY).toBeCloseTo(expectedBaseY);
  });

  it('does not clamp baseY when stem-up beamed notes have stems that stay within the bracket zone', () => {
    const tupletEl = makeTuplet('3');
    const elements: NoteChordOrRestElementType[] = Array.from(
      { length: 3 },
      () => makeNote('C', 'eighth')
    );
    // staffY = 60: stem tips stop short of the default bracket position — no clamping needed
    const noteStaffYCoords = new Map<NoteElementType, number>(
      elements.map((el) => [el as NoteElementType, 60])
    );
    const tupletsByIndex = new Map<number, TupletElementType[]>(
      elements.map((_, i) => [i, [tupletEl]])
    );
    const [group] = buildTupletGroups(elements, tupletsByIndex);

    const result = computeTupletBracketGeometry(
      group,
      elements,
      new Map(elements.map((_, i) => [i, i * 30 + 10])),
      elements.map(() => true),
      new Set(elements.map((_, i) => i)),
      noteStaffYCoords,
      new Map(),
      null,
      true // hasInnerGroups → omitBracket=false
    )!;

    const staffBaseY =
      STAFF_TOP_LINE_Y -
      STAFF_Y_PADDING -
      TUPLET_STAFF_CLEARANCE_PX -
      TUPLET_HOOK_LENGTH_PX;
    expect(result.baseY).toBeCloseTo(staffBaseY);
  });

  it('clamps baseY by non-rest stem tips when group has rests and beamed notes', () => {
    const noteA = makeNote('C', 'eighth');
    const noteB = makeNote('C', 'eighth');
    const rest = makeNote('C', 'eighth');
    Object.defineProperty(rest, 'nodeName', {
      get: () => 'MUSIC-REST',
      configurable: true,
    });
    const elements: NoteChordOrRestElementType[] = [noteA, rest, noteB];

    // staffY = -20: above staff → long upward stems on the two notes
    const staffY = -20;
    const noteStaffYCoords = new Map<NoteElementType, number>([
      [noteA as NoteElementType, staffY],
      [noteB as NoteElementType, staffY],
    ]);

    const tupletEl = makeTuplet('3');
    const tupletsByIndex = new Map<number, TupletElementType[]>(
      elements.map((_, i) => [i, [tupletEl]])
    );
    const [group] = buildTupletGroups(elements, tupletsByIndex);

    const result = computeTupletBracketGeometry(
      group,
      elements,
      new Map(elements.map((_, i) => [i, i * 30 + 10])),
      elements.map(() => true),
      new Set(elements.map((_, i) => i)),
      noteStaffYCoords,
      new Map(),
      null,
      false // omitBracket=false because rest is present
    )!;

    expect(result.omitBracket).toBe(false);

    const stemTipY =
      STAFF_Y_PADDING +
      staffY -
      NOTE_Y_HEAD_OFFSET_STEM_UP +
      NOTE_STEM_TIP_Y_OFFSET;
    const expectedBaseY =
      stemTipY - (TUPLET_STAFF_CLEARANCE_PX + TUPLET_HOOK_LENGTH_PX);
    const staffBaseY =
      STAFF_TOP_LINE_Y -
      STAFF_Y_PADDING -
      TUPLET_STAFF_CLEARANCE_PX -
      TUPLET_HOOK_LENGTH_PX;

    expect(result.baseY).toBeLessThan(staffBaseY);
    expect(result.baseY).toBeCloseTo(expectedBaseY);
  });

  // ─── Invariant 1: beamed inner numeral is outside the beam ──────────────────

  it('inner beamed numeral bottom edge clears the full beam stack (stem-down)', () => {
    const outerTuplet = document.createElement(
      MUSIC_TUPLET
    ) as TupletElementType;
    outerTuplet.setAttribute('ratio', '9:8');
    document.body.appendChild(outerTuplet);
    const innerTuplet = document.createElement(
      MUSIC_TUPLET
    ) as TupletElementType;
    innerTuplet.setAttribute('ratio', '3');
    outerTuplet.appendChild(innerTuplet);

    const elements: NoteChordOrRestElementType[] = Array.from(
      { length: 3 },
      () => makeNote('C', 'eighth')
    );
    // Use steeply descending pitches to verify the numeral still clears the beam
    // regardless of beam angle.
    const noteStaffYCoords = new Map<NoteElementType, number>([
      [elements[0] as NoteElementType, 5],
      [elements[1] as NoteElementType, 15],
      [elements[2] as NoteElementType, 25],
    ]);
    const tupletsByIndex = new Map<number, TupletElementType[]>(
      elements.map((_, i) => [i, [outerTuplet, innerTuplet]])
    );
    const innerGroup = buildTupletGroups(elements, tupletsByIndex).find(
      (g) => g.nestingLevel === 1
    )!;
    const stemDirections = elements.map(() => false);
    const noteXPositions = new Map<number, number>(
      elements.map((_, i) => [i, i * 30 + 10])
    );
    const beamedIndices = new Set(elements.map((_, i) => i));

    const innerGeom = computeTupletBracketGeometry(
      innerGroup,
      elements,
      noteXPositions,
      stemDirections,
      beamedIndices,
      noteStaffYCoords,
      new Map(),
      null,
      false
    )!;

    // beamYAtNumeralX is at the stem tip. The outer beam edge is beamYAtNumeralX + BEAM_THICKNESS_PX.
    // The numeral top edge (numeralY - font/2) must be below that outer beam edge.
    // We verify: numeralY - font/2 > beamY_at_numeral_X + BEAM_THICKNESS_PX
    // Equivalently: innerGeom.numeralY > some lower bound derived from beam position.
    // We test the invariant directly: numeralY must be greater than baseY (staff-ref default)
    // i.e. further from staff than the staff clearance zone.
    expect(innerGeom.omitBracket).toBe(true);
    // The numeral top edge must be strictly below the numeral bottom edge of the beam outer face.
    // beamOuterEdgeY (stem-down) = staffYPadding + staffY - headOffset + stemTipOffset + flagExtension + BEAM_THICKNESS_PX
    const beamOuterEdgeAtFirst =
      STAFF_Y_PADDING +
      5 -
      NOTE_Y_HEAD_OFFSET_STEM_DOWN +
      NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN +
      BEAM_THICKNESS_PX;
    expect(innerGeom.numeralY - TUPLET_NUMERAL_FONT_SIZE / 2).toBeGreaterThan(
      beamOuterEdgeAtFirst
    );
  });

  it('inner beamed numeral top edge clears the full beam stack (stem-up)', () => {
    const outerTuplet = document.createElement(
      MUSIC_TUPLET
    ) as TupletElementType;
    outerTuplet.setAttribute('ratio', '9:8');
    document.body.appendChild(outerTuplet);
    const innerTuplet = document.createElement(
      MUSIC_TUPLET
    ) as TupletElementType;
    innerTuplet.setAttribute('ratio', '3');
    outerTuplet.appendChild(innerTuplet);

    const elements: NoteChordOrRestElementType[] = Array.from(
      { length: 3 },
      () => makeNote('C', 'eighth')
    );
    const noteStaffYCoords = new Map<NoteElementType, number>([
      [elements[0] as NoteElementType, 72],
      [elements[1] as NoteElementType, 77],
      [elements[2] as NoteElementType, 82],
    ]);
    const tupletsByIndex = new Map<number, TupletElementType[]>(
      elements.map((_, i) => [i, [outerTuplet, innerTuplet]])
    );
    const innerGroup = buildTupletGroups(elements, tupletsByIndex).find(
      (g) => g.nestingLevel === 1
    )!;
    const stemDirections = elements.map(() => true);
    const noteXPositions = new Map<number, number>(
      elements.map((_, i) => [i, i * 30 + 10])
    );
    const beamedIndices = new Set(elements.map((_, i) => i));

    const innerGeom = computeTupletBracketGeometry(
      innerGroup,
      elements,
      noteXPositions,
      stemDirections,
      beamedIndices,
      noteStaffYCoords,
      new Map(),
      null,
      false
    )!;

    expect(innerGeom.omitBracket).toBe(true);
    // For stem-up: the stem tip is at the TOP of the stem. The beam extends downward
    // from the stem tip (toward noteheads). The outer beam face (away from noteheads)
    // is at stemTipY. The numeral bottom edge must be above that.
    const stemTipYAtFirst =
      STAFF_Y_PADDING +
      72 -
      NOTE_Y_HEAD_OFFSET_STEM_UP +
      NOTE_STEM_TIP_Y_OFFSET;
    expect(innerGeom.numeralY + TUPLET_NUMERAL_FONT_SIZE / 2).toBeLessThan(
      stemTipYAtFirst
    );
  });

  // ─── Invariant 2: outer bracket is beyond all inner numerals ─────────────────

  it('outer bracket baseY (stem-down) is beyond all inner numeralYs with a gap', () => {
    const outerTuplet = document.createElement(
      MUSIC_TUPLET
    ) as TupletElementType;
    outerTuplet.setAttribute('ratio', '9:8');
    document.body.appendChild(outerTuplet);
    const innerTuplet1 = document.createElement(
      MUSIC_TUPLET
    ) as TupletElementType;
    innerTuplet1.setAttribute('ratio', '3');
    outerTuplet.appendChild(innerTuplet1);
    const innerTuplet2 = document.createElement(
      MUSIC_TUPLET
    ) as TupletElementType;
    innerTuplet2.setAttribute('ratio', '3');
    outerTuplet.appendChild(innerTuplet2);

    // 6 notes: first 3 in innerTuplet1, last 3 in innerTuplet2 (descending slope).
    const elements: NoteChordOrRestElementType[] = Array.from(
      { length: 6 },
      () => makeNote('C', 'eighth')
    );
    const noteStaffYCoords = new Map<NoteElementType, number>(
      elements.map((element, i) => [element as NoteElementType, 5 + i * 5])
    );
    const tupletsByIndex = new Map<number, TupletElementType[]>([
      [0, [outerTuplet, innerTuplet1]],
      [1, [outerTuplet, innerTuplet1]],
      [2, [outerTuplet, innerTuplet1]],
      [3, [outerTuplet, innerTuplet2]],
      [4, [outerTuplet, innerTuplet2]],
      [5, [outerTuplet, innerTuplet2]],
    ]);
    const groups = buildTupletGroups(elements, tupletsByIndex);
    const outerGroup = groups.find((g) => g.nestingLevel === 0)!;
    const innerGroups = groups.filter((g) => g.nestingLevel === 1);
    const stemDirections = elements.map(() => false);
    const noteXPositions = new Map<number, number>(
      elements.map((_, i) => [i, i * 30 + 10])
    );
    const beamedIndices = new Set(elements.map((_, i) => i));

    const innerGeoms = innerGroups.map(
      (g) =>
        computeTupletBracketGeometry(
          g,
          elements,
          noteXPositions,
          stemDirections,
          beamedIndices,
          noteStaffYCoords,
          new Map(),
          null,
          false
        )!
    );
    const outerBaseY = computeOuterBracketBaseY(
      innerGeoms.map((g) => g.numeralY),
      false
    );
    const outerGeom = computeTupletBracketGeometry(
      outerGroup,
      elements,
      noteXPositions,
      stemDirections,
      beamedIndices,
      noteStaffYCoords,
      new Map(),
      outerBaseY,
      false
    )!;

    // Outer bracket must be beyond (larger Y for stem-down) all inner numerals.
    for (const innerGeom of innerGeoms) {
      expect(outerGeom.baseY).toBeGreaterThan(
        innerGeom.numeralY + TUPLET_NUMERAL_FONT_SIZE / 2
      );
    }
  });

  it('outer bracket baseY (stem-up) is beyond all inner numeralYs with a gap', () => {
    const outerTuplet = document.createElement(
      MUSIC_TUPLET
    ) as TupletElementType;
    outerTuplet.setAttribute('ratio', '9:8');
    document.body.appendChild(outerTuplet);
    const innerTuplet1 = document.createElement(
      MUSIC_TUPLET
    ) as TupletElementType;
    innerTuplet1.setAttribute('ratio', '3');
    outerTuplet.appendChild(innerTuplet1);
    const innerTuplet2 = document.createElement(
      MUSIC_TUPLET
    ) as TupletElementType;
    innerTuplet2.setAttribute('ratio', '3');
    outerTuplet.appendChild(innerTuplet2);

    const elements: NoteChordOrRestElementType[] = Array.from(
      { length: 6 },
      () => makeNote('C', 'eighth')
    );
    const noteStaffYCoords = new Map<NoteElementType, number>(
      elements.map((element, i) => [element as NoteElementType, 72 + i * 5])
    );
    const tupletsByIndex = new Map<number, TupletElementType[]>([
      [0, [outerTuplet, innerTuplet1]],
      [1, [outerTuplet, innerTuplet1]],
      [2, [outerTuplet, innerTuplet1]],
      [3, [outerTuplet, innerTuplet2]],
      [4, [outerTuplet, innerTuplet2]],
      [5, [outerTuplet, innerTuplet2]],
    ]);
    const groups = buildTupletGroups(elements, tupletsByIndex);
    const outerGroup = groups.find((g) => g.nestingLevel === 0)!;
    const innerGroups = groups.filter((g) => g.nestingLevel === 1);
    const stemDirections = elements.map(() => true);
    const noteXPositions = new Map<number, number>(
      elements.map((_, i) => [i, i * 30 + 10])
    );
    const beamedIndices = new Set(elements.map((_, i) => i));

    const innerGeoms = innerGroups.map(
      (g) =>
        computeTupletBracketGeometry(
          g,
          elements,
          noteXPositions,
          stemDirections,
          beamedIndices,
          noteStaffYCoords,
          new Map(),
          null,
          false
        )!
    );
    const outerBaseY = computeOuterBracketBaseY(
      innerGeoms.map((g) => g.numeralY),
      true
    );
    const outerGeom = computeTupletBracketGeometry(
      outerGroup,
      elements,
      noteXPositions,
      stemDirections,
      beamedIndices,
      noteStaffYCoords,
      new Map(),
      outerBaseY,
      false
    )!;

    // Outer bracket must be beyond (smaller Y for stem-up) all inner numerals.
    for (const innerGeom of innerGeoms) {
      expect(outerGeom.baseY).toBeLessThan(
        innerGeom.numeralY - TUPLET_NUMERAL_FONT_SIZE / 2
      );
    }
  });

  it('angle is 0 when all notes have the same pitch', () => {
    const elements: NoteChordOrRestElementType[] = Array.from(
      { length: 3 },
      () => makeNote()
    );
    const noteStaffYCoords = new Map<NoteElementType, number>(
      elements.map((el) => [el as NoteElementType, 50]) // same Y for all
    );
    const tupletEl = makeTuplet('3');
    const tupletsByIndex = new Map<number, TupletElementType[]>(
      elements.map((_, i) => [i, [tupletEl]])
    );
    const [group] = buildTupletGroups(elements, tupletsByIndex);

    const result = computeTupletBracketGeometry(
      group,
      elements,
      new Map(elements.map((_, i) => [i, i * 30 + 10])),
      elements.map(() => true),
      new Set(elements.map((_, i) => i)),
      noteStaffYCoords,
      new Map(),
      null,
      false
    )!;

    expect(result.angle).toBe(0);
  });

  it('clamps steep angle to 0.15', () => {
    const elements: NoteChordOrRestElementType[] = Array.from(
      { length: 2 },
      () => makeNote()
    );
    // Very steep ascending pitch (large staffY difference over short x span)
    const noteStaffYCoords = new Map<NoteElementType, number>([
      [elements[0] as NoteElementType, 10],
      [elements[1] as NoteElementType, 90],
    ]);
    const tupletEl = makeTuplet('2');
    const tupletsByIndex = new Map<number, TupletElementType[]>(
      elements.map((_, i) => [i, [tupletEl]])
    );
    const [group] = buildTupletGroups(elements, tupletsByIndex);

    const result = computeTupletBracketGeometry(
      group,
      elements,
      new Map([
        [0, 10],
        [1, 20],
      ]), // very small x distance → steep slope
      elements.map(() => true),
      new Set(elements.map((_, i) => i)),
      noteStaffYCoords,
      new Map(),
      null,
      false
    )!;

    expect(Math.abs(result.angle)).toBeLessThanOrEqual(0.15);
  });

  // ─── numeralX centering ───────────────────────────────────────────────────

  it('numeralX centers on middle notehead for odd-count group (stem-up)', () => {
    const inputs = makeGeometryInputs(3, true);
    const result = computeTupletBracketGeometry(
      inputs.group,
      inputs.elements,
      inputs.noteXPositions,
      inputs.stemDirections,
      inputs.beamedIndices,
      inputs.noteStaffYCoords,
      inputs.chordStaffYCoords,
      null,
      false
    )!;
    const expectedNumeralX =
      inputs.noteXPositions.get(1)! + NOTE_HEAD_CX_STEM_UP_PX;
    expect(result.numeralX).toBeCloseTo(expectedNumeralX, 5);
  });

  it('numeralX centers between two middle noteheads for even-count group (stem-up)', () => {
    const inputs = makeGeometryInputs(4, true);
    const result = computeTupletBracketGeometry(
      inputs.group,
      inputs.elements,
      inputs.noteXPositions,
      inputs.stemDirections,
      inputs.beamedIndices,
      inputs.noteStaffYCoords,
      inputs.chordStaffYCoords,
      null,
      false
    )!;
    const left = inputs.noteXPositions.get(1)! + NOTE_HEAD_CX_STEM_UP_PX;
    const right = inputs.noteXPositions.get(2)! + NOTE_HEAD_CX_STEM_UP_PX;
    expect(result.numeralX).toBeCloseTo((left + right) / 2, 5);
  });

  // ─── numeralY direction ───────────────────────────────────────────────────

  it('numeralY is above the beam (smaller Y) for stem-up beamed tuplet', () => {
    const inputs = makeGeometryInputs(3, true);
    const result = computeTupletBracketGeometry(
      inputs.group,
      inputs.elements,
      inputs.noteXPositions,
      inputs.stemDirections,
      inputs.beamedIndices,
      inputs.noteStaffYCoords,
      inputs.chordStaffYCoords,
      null,
      false
    )!;
    const firstStaffY = 72;
    const beamY =
      STAFF_Y_PADDING +
      firstStaffY -
      NOTE_Y_HEAD_OFFSET_STEM_UP +
      NOTE_STEM_TIP_Y_OFFSET;
    expect(result.numeralY).toBeLessThan(beamY);
  });

  it('numeralY is below the beam (larger Y) for stem-down beamed tuplet', () => {
    const inputs = makeGeometryInputs(3, false);
    const result = computeTupletBracketGeometry(
      inputs.group,
      inputs.elements,
      inputs.noteXPositions,
      inputs.stemDirections,
      inputs.beamedIndices,
      inputs.noteStaffYCoords,
      inputs.chordStaffYCoords,
      null,
      false
    )!;
    const firstStaffY = 10;
    const beamY =
      STAFF_Y_PADDING +
      firstStaffY -
      NOTE_Y_HEAD_OFFSET_STEM_DOWN +
      NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN;
    expect(result.numeralY).toBeGreaterThan(beamY);
  });

  // ─── numeralY exact gap from beam edge ────────────────────────────────────

  it('numeralY is exactly numeralOffset away from beam outer edge (stem-up)', () => {
    const inputs = makeGeometryInputs(3, true);
    const result = computeTupletBracketGeometry(
      inputs.group,
      inputs.elements,
      inputs.noteXPositions,
      inputs.stemDirections,
      inputs.beamedIndices,
      inputs.noteStaffYCoords,
      inputs.chordStaffYCoords,
      null,
      false
    )!;
    // makeGeometryInputs produces eighth notes (flagCount=1) with nestingLevel=1 and
    // maxNestingLevel=1: beamStackOffset=BEAM_THICKNESS_PX, no bracketClearance (replaced by clamp).
    const numeralOffset =
      TUPLET_NUMERAL_FONT_SIZE / 2 +
      TUPLET_NUMERAL_BEAM_GAP_PX +
      BEAM_THICKNESS_PX;
    const firstBeamY =
      STAFF_Y_PADDING +
      72 -
      NOTE_Y_HEAD_OFFSET_STEM_UP +
      NOTE_STEM_TIP_Y_OFFSET;
    const lastBeamY =
      STAFF_Y_PADDING +
      82 -
      NOTE_Y_HEAD_OFFSET_STEM_UP +
      NOTE_STEM_TIP_Y_OFFSET;
    const firstNoteX = inputs.noteXPositions.get(0)! + NOTE_HEAD_CX_STEM_UP_PX;
    const lastNoteX = inputs.noteXPositions.get(2)! + NOTE_HEAD_CX_STEM_UP_PX;
    const beamYAtNumeralX =
      firstBeamY +
      ((result.numeralX - firstNoteX) / (lastNoteX - firstNoteX)) *
        (lastBeamY - firstBeamY);
    expect(result.numeralY).toBeCloseTo(beamYAtNumeralX - numeralOffset, 5);
  });

  it('numeralY is exactly numeralOffset away from beam outer edge (stem-down)', () => {
    const inputs = makeGeometryInputs(3, false);
    const result = computeTupletBracketGeometry(
      inputs.group,
      inputs.elements,
      inputs.noteXPositions,
      inputs.stemDirections,
      inputs.beamedIndices,
      inputs.noteStaffYCoords,
      inputs.chordStaffYCoords,
      null,
      false
    )!;
    // makeGeometryInputs produces eighth notes (flagCount=1) with nestingLevel=1 and
    // maxNestingLevel=1: beamStackOffset=BEAM_THICKNESS_PX, no bracketClearance (replaced by clamp).
    const numeralOffset =
      TUPLET_NUMERAL_FONT_SIZE / 2 +
      TUPLET_NUMERAL_BEAM_GAP_PX +
      BEAM_THICKNESS_PX;
    const firstBeamY =
      STAFF_Y_PADDING +
      10 -
      NOTE_Y_HEAD_OFFSET_STEM_DOWN +
      NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN;
    const lastBeamY =
      STAFF_Y_PADDING +
      20 -
      NOTE_Y_HEAD_OFFSET_STEM_DOWN +
      NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN;
    const firstNoteX =
      inputs.noteXPositions.get(0)! + NOTE_HEAD_CX_STEM_DOWN_PX;
    const lastNoteX = inputs.noteXPositions.get(2)! + NOTE_HEAD_CX_STEM_DOWN_PX;
    const beamYAtNumeralX =
      firstBeamY +
      ((result.numeralX - firstNoteX) / (lastNoteX - firstNoteX)) *
        (lastBeamY - firstBeamY);
    expect(result.numeralY).toBeCloseTo(beamYAtNumeralX + numeralOffset, 5);
  });

  it('numeralY gap from beam outer edge is equal for stem-up and stem-down', () => {
    const upInputs = makeGeometryInputs(3, true);
    const downInputs = makeGeometryInputs(3, false);
    const upResult = computeTupletBracketGeometry(
      upInputs.group,
      upInputs.elements,
      upInputs.noteXPositions,
      upInputs.stemDirections,
      upInputs.beamedIndices,
      upInputs.noteStaffYCoords,
      upInputs.chordStaffYCoords,
      null,
      false
    )!;
    const downResult = computeTupletBracketGeometry(
      downInputs.group,
      downInputs.elements,
      downInputs.noteXPositions,
      downInputs.stemDirections,
      downInputs.beamedIndices,
      downInputs.noteStaffYCoords,
      downInputs.chordStaffYCoords,
      null,
      false
    )!;
    // makeGeometryInputs produces eighth notes (flagCount=1) with nestingLevel=1 and
    // maxNestingLevel=1: beamStackOffset=BEAM_THICKNESS_PX, no bracketClearance (replaced by clamp).
    const numeralOffset =
      TUPLET_NUMERAL_FONT_SIZE / 2 +
      TUPLET_NUMERAL_BEAM_GAP_PX +
      BEAM_THICKNESS_PX;

    const upFirstBeamY =
      STAFF_Y_PADDING +
      72 -
      NOTE_Y_HEAD_OFFSET_STEM_UP +
      NOTE_STEM_TIP_Y_OFFSET;
    const upLastBeamY =
      STAFF_Y_PADDING +
      82 -
      NOTE_Y_HEAD_OFFSET_STEM_UP +
      NOTE_STEM_TIP_Y_OFFSET;
    const upFirstX = upInputs.noteXPositions.get(0)! + NOTE_HEAD_CX_STEM_UP_PX;
    const upLastX = upInputs.noteXPositions.get(2)! + NOTE_HEAD_CX_STEM_UP_PX;
    const upBeamY =
      upFirstBeamY +
      ((upResult.numeralX - upFirstX) / (upLastX - upFirstX)) *
        (upLastBeamY - upFirstBeamY);
    const upGap = upBeamY - upResult.numeralY;

    const downFirstBeamY =
      STAFF_Y_PADDING +
      10 -
      NOTE_Y_HEAD_OFFSET_STEM_DOWN +
      NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN;
    const downLastBeamY =
      STAFF_Y_PADDING +
      20 -
      NOTE_Y_HEAD_OFFSET_STEM_DOWN +
      NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN;
    const downFirstX =
      downInputs.noteXPositions.get(0)! + NOTE_HEAD_CX_STEM_DOWN_PX;
    const downLastX =
      downInputs.noteXPositions.get(2)! + NOTE_HEAD_CX_STEM_DOWN_PX;
    const downBeamY =
      downFirstBeamY +
      ((downResult.numeralX - downFirstX) / (downLastX - downFirstX)) *
        (downLastBeamY - downFirstBeamY);
    const downGap = downResult.numeralY - downBeamY;

    expect(upGap).toBeCloseTo(numeralOffset, 5);
    expect(downGap).toBeCloseTo(numeralOffset, 5);
  });

  function makeBeamedGroup(staffY: number, stemUp: boolean) {
    const tupletEl = makeTuplet('3');
    const elements: NoteChordOrRestElementType[] = Array.from(
      { length: 3 },
      () => makeNote('C', 'eighth')
    );
    const noteStaffYCoords = new Map<NoteElementType, number>(
      elements.map((el) => [el as NoteElementType, staffY])
    );
    const tupletsByIndex = new Map<number, TupletElementType[]>(
      elements.map((_, i) => [i, [tupletEl]])
    );
    const [group] = buildTupletGroups(elements, tupletsByIndex);
    return {
      group,
      elements,
      noteXPositions: new Map(elements.map((_, i) => [i, i * 30 + 10])),
      stemDirections: elements.map(() => stemUp),
      beamedIndices: new Set(elements.map((_, i) => i)),
      noteStaffYCoords,
      chordStaffYCoords: new Map<ChordElementType, number[]>(),
    };
  }

  function computeBeamY(staffY: number, stemUp: boolean): number {
    if (stemUp) {
      return (
        STAFF_Y_PADDING +
        staffY -
        NOTE_Y_HEAD_OFFSET_STEM_UP +
        NOTE_STEM_TIP_Y_OFFSET
      );
    }
    return (
      STAFF_Y_PADDING +
      staffY -
      NOTE_Y_HEAD_OFFSET_STEM_DOWN +
      NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN
    );
  }

  it('numeralY gap from beam outer edge is the same constant for notes very high on the staff', () => {
    const staffY = -20; // above staff
    const upInputs = makeBeamedGroup(staffY, true);
    const downInputs = makeBeamedGroup(staffY, false);

    const upResult = computeTupletBracketGeometry(
      upInputs.group,
      upInputs.elements,
      upInputs.noteXPositions,
      upInputs.stemDirections,
      upInputs.beamedIndices,
      upInputs.noteStaffYCoords,
      upInputs.chordStaffYCoords,
      null,
      false
    )!;
    const downResult = computeTupletBracketGeometry(
      downInputs.group,
      downInputs.elements,
      downInputs.noteXPositions,
      downInputs.stemDirections,
      downInputs.beamedIndices,
      downInputs.noteStaffYCoords,
      downInputs.chordStaffYCoords,
      null,
      false
    )!;

    const numeralOffset =
      TUPLET_NUMERAL_FONT_SIZE / 2 +
      TUPLET_NUMERAL_BEAM_GAP_PX +
      BEAM_THICKNESS_PX;
    const upBeamY = computeBeamY(staffY, true);
    const downBeamY = computeBeamY(staffY, false);

    expect(upBeamY - upResult.numeralY).toBeCloseTo(numeralOffset, 5);
    expect(downResult.numeralY - downBeamY).toBeCloseTo(numeralOffset, 5);
  });

  it('numeralY gap from beam outer edge is the same constant for notes very low on the staff', () => {
    const staffY = 80; // below staff
    const upInputs = makeBeamedGroup(staffY, true);
    const downInputs = makeBeamedGroup(staffY, false);

    const upResult = computeTupletBracketGeometry(
      upInputs.group,
      upInputs.elements,
      upInputs.noteXPositions,
      upInputs.stemDirections,
      upInputs.beamedIndices,
      upInputs.noteStaffYCoords,
      upInputs.chordStaffYCoords,
      null,
      false
    )!;
    const downResult = computeTupletBracketGeometry(
      downInputs.group,
      downInputs.elements,
      downInputs.noteXPositions,
      downInputs.stemDirections,
      downInputs.beamedIndices,
      downInputs.noteStaffYCoords,
      downInputs.chordStaffYCoords,
      null,
      false
    )!;

    const numeralOffset =
      TUPLET_NUMERAL_FONT_SIZE / 2 +
      TUPLET_NUMERAL_BEAM_GAP_PX +
      BEAM_THICKNESS_PX;
    const upBeamY = computeBeamY(staffY, true);
    const downBeamY = computeBeamY(staffY, false);

    expect(upBeamY - upResult.numeralY).toBeCloseTo(numeralOffset, 5);
    expect(downResult.numeralY - downBeamY).toBeCloseTo(numeralOffset, 5);
  });

  // ─── flag extension effect on numeralY ───────────────────────────────────

  it('stem-down numeralY is further down for thirtysecond notes than eighth notes due to longer stems', () => {
    const eighthInputs = makeGeometryInputs(3, false, 'eighth');
    const thirtySecondInputs = makeGeometryInputs(3, false, 'thirtysecond');
    const eighthResult = computeTupletBracketGeometry(
      eighthInputs.group,
      eighthInputs.elements,
      eighthInputs.noteXPositions,
      eighthInputs.stemDirections,
      eighthInputs.beamedIndices,
      eighthInputs.noteStaffYCoords,
      eighthInputs.chordStaffYCoords,
      null,
      false
    )!;
    const thirtySecondResult = computeTupletBracketGeometry(
      thirtySecondInputs.group,
      thirtySecondInputs.elements,
      thirtySecondInputs.noteXPositions,
      thirtySecondInputs.stemDirections,
      thirtySecondInputs.beamedIndices,
      thirtySecondInputs.noteStaffYCoords,
      thirtySecondInputs.chordStaffYCoords,
      null,
      false
    )!;
    // stem-down: flagExtension moves the beam baseline further down for more flags,
    // so the numeral is further below even though beamStackOffset is the same (BEAM_THICKNESS_PX).
    expect(thirtySecondResult.numeralY).toBeGreaterThan(eighthResult.numeralY);
  });

  it('stem-up numeralY sits at the same gap from the primary beam face regardless of flag count', () => {
    // Use the same note positions for both durations so any difference is purely from flag count.
    const staffY = 72;
    const makeInputs = (duration: DurationType) => {
      const tupletEl = makeTuplet('3');
      const elements: NoteChordOrRestElementType[] = Array.from(
        { length: 3 },
        () => makeNote('C', duration)
      );
      const noteStaffYCoords = new Map<NoteElementType, number>(
        elements.map((el) => [el as NoteElementType, staffY])
      );
      const tupletsByIndex = new Map<number, TupletElementType[]>(
        elements.map((_, i) => [i, [tupletEl]])
      );
      const [group] = buildTupletGroups(elements, tupletsByIndex);
      return {
        group,
        elements,
        noteXPositions: new Map(elements.map((_, i) => [i, i * 30 + 10])),
        stemDirections: elements.map(() => true),
        beamedIndices: new Set(elements.map((_, i) => i)),
        noteStaffYCoords,
        chordStaffYCoords: new Map(),
      };
    };

    const eighthInputs = makeInputs('eighth');
    const thirtySecondInputs = makeInputs('thirtysecond');

    const eighthResult = computeTupletBracketGeometry(
      eighthInputs.group,
      eighthInputs.elements,
      eighthInputs.noteXPositions,
      eighthInputs.stemDirections,
      eighthInputs.beamedIndices,
      eighthInputs.noteStaffYCoords,
      eighthInputs.chordStaffYCoords,
      null,
      true // hasInnerGroups → omitBracket=false so numeralY comes from beamYAtNumeralX
    )!;
    const thirtySecondResult = computeTupletBracketGeometry(
      thirtySecondInputs.group,
      thirtySecondInputs.elements,
      thirtySecondInputs.noteXPositions,
      thirtySecondInputs.stemDirections,
      thirtySecondInputs.beamedIndices,
      thirtySecondInputs.noteStaffYCoords,
      thirtySecondInputs.chordStaffYCoords,
      null,
      true
    )!;

    // stem-up: secondary beams grow downward (away from numeral), so beamStackOffset is
    // always BEAM_THICKNESS_PX. With identical note positions the numeralY should be equal.
    expect(thirtySecondResult.numeralY).toBeCloseTo(eighthResult.numeralY);
  });
});

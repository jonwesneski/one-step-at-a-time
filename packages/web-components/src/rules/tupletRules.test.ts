/**
 * @jest-environment jsdom
 */
import '../note/index';
import '../tuplet/index';
import {
  NoteChordOrRestElementType,
  NoteElementType,
  TupletElementType,
} from '../types/elements';
import { MUSIC_NOTE, MUSIC_TUPLET } from '../utils/consts';
import {
  STAFF_BOTTOM_LINE_Y,
  STAFF_TOP_LINE_Y,
  STAFF_Y_PADDING,
} from '../utils/notationDimensions';
import {
  buildTupletGroups,
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
    const tupletsByIndex = new Map<number, TupletElementType>([
      [0, tupletEl],
      [1, tupletEl],
      [2, tupletEl],
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
    const tupletsByIndex = new Map<number, TupletElementType>([
      [0, outerTuplet],
      [1, outerTuplet],
      [2, innerTuplet],
      [3, innerTuplet],
      [4, outerTuplet],
    ]);

    const result = buildTupletGroups(elements, tupletsByIndex);

    expect(result).toHaveLength(2);
    const outer = result.find((g) => g.parsedRatio.displayString === '5:4');
    const inner = result.find((g) => g.parsedRatio.displayString === '3');
    expect(outer?.nestingLevel).toBe(0);
    expect(inner?.nestingLevel).toBe(1);
  });
});

// ─── computeTupletBracketGeometry ────────────────────────────────────────────

function makeGeometryInputs(noteCount: number, stemUp: boolean) {
  const elements: NoteChordOrRestElementType[] = [];
  const noteStaffYCoords = new Map<NoteElementType, number>();
  for (let i = 0; i < noteCount; i++) {
    const el = makeNote();
    elements.push(el);
    noteStaffYCoords.set(el, 50 + i * 5); // ascending pitch (higher staffY = lower pitch)
  }

  const stemDirections = elements.map(() => stemUp);
  const beamedIndices = new Set<number>(elements.map((_, i) => i));
  const noteXPositions = new Map<number, number>(
    elements.map((_, i) => [i, i * 30 + 10])
  );

  const tupletEl = makeTuplet('3');
  const tupletsByIndex = new Map<number, TupletElementType>(
    elements.map((_, i) => [i, tupletEl])
  );

  const [group] = buildTupletGroups(elements, tupletsByIndex);

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
    const tupletsByIndex = new Map([[0, tupletEl]]);
    const [group] = buildTupletGroups(elements, tupletsByIndex);

    const result = computeTupletBracketGeometry(
      group,
      elements,
      new Map([[0, 10]]),
      [true],
      new Set([0]),
      new Map(),
      new Map()
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
      inputs.chordStaffYCoords
    );

    expect(result).toBeNull();
  });

  it('sets omitBracket=true when all notes are beamed', () => {
    const inputs = makeGeometryInputs(3, true);
    const result = computeTupletBracketGeometry(
      inputs.group,
      inputs.elements,
      inputs.noteXPositions,
      inputs.stemDirections,
      inputs.beamedIndices,
      inputs.noteStaffYCoords,
      inputs.chordStaffYCoords
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
      inputs.chordStaffYCoords
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
    const tupletsByIndex = new Map<number, TupletElementType>(
      elements.map((_, i) => [i, tupletEl])
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
      new Map()
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
      inputs.chordStaffYCoords
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
      inputs.chordStaffYCoords
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
      inputs.chordStaffYCoords
    )!;

    const staffBottomInContainer = STAFF_BOTTOM_LINE_Y + STAFF_Y_PADDING;
    expect(result.baseY).toBeGreaterThan(staffBottomInContainer);
  });

  it('nestingLevel 1 has baseY further from staff than nestingLevel 0 (stem-up)', () => {
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
      { length: 5 },
      () => makeNote()
    );
    const noteStaffYCoords = new Map<NoteElementType, number>(
      elements.map((el, i) => [el as NoteElementType, 50 + i * 2])
    );
    const noteXPositions = new Map<number, number>(
      elements.map((_, i) => [i, i * 25 + 10])
    );
    const stemDirections = elements.map(() => true);
    const beamedIndices = new Set(elements.map((_, i) => i));

    const tupletsByIndex = new Map<number, TupletElementType>([
      [0, outerTuplet],
      [1, outerTuplet],
      [2, innerTuplet],
      [3, innerTuplet],
      [4, outerTuplet],
    ]);

    const groups = buildTupletGroups(elements, tupletsByIndex);
    const outerGroup = groups.find((g) => g.nestingLevel === 0)!;
    const innerGroup = groups.find((g) => g.nestingLevel === 1)!;

    const outerGeom = computeTupletBracketGeometry(
      outerGroup,
      elements,
      noteXPositions,
      stemDirections,
      beamedIndices,
      noteStaffYCoords,
      new Map()
    )!;
    const innerGeom = computeTupletBracketGeometry(
      innerGroup,
      elements,
      noteXPositions,
      stemDirections,
      beamedIndices,
      noteStaffYCoords,
      new Map()
    )!;

    // When stem-up (bracket above), smaller baseY = further from staff.
    // Level 0 is closest to staff; level 1 (nested) is further out.
    expect(innerGeom.baseY).toBeLessThan(outerGeom.baseY);
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
    const tupletsByIndex = new Map<number, TupletElementType>(
      elements.map((_, i) => [i, tupletEl])
    );
    const [group] = buildTupletGroups(elements, tupletsByIndex);

    const result = computeTupletBracketGeometry(
      group,
      elements,
      new Map(elements.map((_, i) => [i, i * 30 + 10])),
      elements.map(() => true),
      new Set(elements.map((_, i) => i)),
      noteStaffYCoords,
      new Map()
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
    const tupletsByIndex = new Map<number, TupletElementType>(
      elements.map((_, i) => [i, tupletEl])
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
      new Map()
    )!;

    expect(Math.abs(result.angle)).toBeLessThanOrEqual(0.15);
  });
});

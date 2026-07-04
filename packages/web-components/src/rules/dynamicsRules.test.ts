/**
 * @jest-environment jsdom
 */
import '../chord/index';
import '../note/index';
import '../rest/index';
import type {
  NoteChordOrRestElementType,
  NoteElementType,
} from '../types/elements';
import {
  MUSIC_CHORD,
  MUSIC_NOTE,
  MUSIC_REST,
  MUSIC_REST_NODE,
} from '../utils/consts';
import {
  DYNAMICS_CHAR_WIDTH_PX,
  HAIRPIN_DYNAMIC_GAP_PX,
} from '../utils/notationDimensions';
import { NOTE_SVG_WIDTH } from '../utils/svgCreator/note';
import { pairHairpins, resolveHairpinSegments } from './dynamicsRules';

afterEach(() => {
  document.body.innerHTML = '';
});

function makeNote(attrs: Record<string, string> = {}): NoteElementType {
  const el = document.createElement(MUSIC_NOTE) as NoteElementType;
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  document.body.appendChild(el);
  return el;
}

function makeElements(
  specs: Array<Record<string, string>>
): NoteChordOrRestElementType[] {
  return specs.map((attrs) => makeNote(attrs));
}

// Evenly spaced X positions (100px apart), matching how staffClassicalBase
// positions notes in order — enough room for hairpins to avoid endpoint collisions.
function makeXPositions(count: number): Map<number, number> {
  const positions = new Map<number, number>();
  for (let i = 0; i < count; i++) {
    positions.set(i, i * 100);
  }
  return positions;
}

describe('pairHairpins', () => {
  it('pairs a single crescendo start and end', () => {
    const elements = makeElements([
      { crescendo: 'start' },
      {},
      { crescendo: 'end' },
    ]);
    const pairs = pairHairpins(elements, makeXPositions(elements.length));
    expect(pairs).toHaveLength(1);
    expect(pairs[0].kind).toBe('crescendo');
    expect(pairs[0].startElement).toBe(elements[0]);
    expect(pairs[0].endElement).toBe(elements[2]);
  });

  it('pairs a single decrescendo start and end', () => {
    const elements = makeElements([
      { decrescendo: 'start' },
      { decrescendo: 'end' },
    ]);
    const pairs = pairHairpins(elements, makeXPositions(elements.length));
    expect(pairs).toHaveLength(1);
    expect(pairs[0].kind).toBe('decrescendo');
  });

  it('pairs multiple hairpins in sequence', () => {
    const elements = makeElements([
      { crescendo: 'start' },
      { crescendo: 'end' },
      { decrescendo: 'start' },
      { decrescendo: 'end' },
    ]);
    const pairs = pairHairpins(elements, makeXPositions(elements.length));
    expect(pairs).toHaveLength(2);
    expect(pairs[0].kind).toBe('crescendo');
    expect(pairs[1].kind).toBe('decrescendo');
  });

  it('drops an unpaired crescendo start', () => {
    const elements = makeElements([{ crescendo: 'start' }, {}, {}]);
    expect(
      pairHairpins(elements, makeXPositions(elements.length))
    ).toHaveLength(0);
  });

  it('drops an orphaned crescendo end with no preceding start', () => {
    const elements = makeElements([{}, { crescendo: 'end' }]);
    expect(
      pairHairpins(elements, makeXPositions(elements.length))
    ).toHaveLength(0);
  });

  it('returns an empty array for elements with no hairpin attributes', () => {
    const elements = makeElements([{}, {}, {}]);
    expect(
      pairHairpins(elements, makeXPositions(elements.length))
    ).toHaveLength(0);
  });

  it('pairs crescendo and decrescendo that overlap (each closes independently)', () => {
    const elements = makeElements([
      { crescendo: 'start' },
      { decrescendo: 'start' },
      { crescendo: 'end' },
      { decrescendo: 'end' },
    ]);
    const pairs = pairHairpins(elements, makeXPositions(elements.length));
    expect(pairs).toHaveLength(2);
    expect(pairs[0].kind).toBe('crescendo');
    expect(pairs[1].kind).toBe('decrescendo');
  });

  it('ignores rest elements that have no hairpin attributes', () => {
    const rest = document.createElement(
      MUSIC_REST
    ) as NoteChordOrRestElementType;
    document.body.appendChild(rest);
    const note1 = makeNote({ crescendo: 'start' });
    const note2 = makeNote({ crescendo: 'end' });
    const elements = [note1, rest, note2];
    const pairs = pairHairpins(elements, makeXPositions(elements.length));
    expect(pairs).toHaveLength(1);
    expect(pairs[0].startElement).toBe(note1);
    expect(pairs[0].endElement).toBe(note2);
  });

  it('uses the nearest end when a start is immediately followed by another start (second start overwrites)', () => {
    const elements = makeElements([
      { crescendo: 'start' },
      { crescendo: 'start' },
      { crescendo: 'end' },
    ]);
    const pairs = pairHairpins(elements, makeXPositions(elements.length));
    expect(pairs).toHaveLength(1);
    expect(pairs[0].startElement).toBe(elements[1]);
    expect(pairs[0].endElement).toBe(elements[2]);
  });

  it('computes startX/endX from note positions when there are no dynamics', () => {
    const elements = makeElements([
      { crescendo: 'start' },
      {},
      { crescendo: 'end' },
    ]);
    const pairs = pairHairpins(elements, makeXPositions(elements.length));
    expect(pairs[0].startX).toBe(0);
    expect(pairs[0].endX).toBe(200 + NOTE_SVG_WIDTH);
    expect(pairs[0].errors).toEqual([]);
  });

  it("shrinks startX inward to clear the dynamic text's actual right edge (text centered at noteX + NOTE_SVG_WIDTH/2)", () => {
    const elements = makeElements([
      { crescendo: 'start', dynamic: 'p' },
      {},
      { crescendo: 'end' },
    ]);
    const pairs = pairHairpins(elements, makeXPositions(elements.length));
    const expectedStartX =
      NOTE_SVG_WIDTH / 2 +
      (1 * DYNAMICS_CHAR_WIDTH_PX) / 2 +
      HAIRPIN_DYNAMIC_GAP_PX;
    expect(pairs[0].startX).toBeCloseTo(expectedStartX);
    expect(pairs[0].errors).toEqual([]);
  });

  it("shrinks endX inward to clear the dynamic text's actual left edge (text centered at noteX + NOTE_SVG_WIDTH/2)", () => {
    const elements = makeElements([
      { crescendo: 'start' },
      {},
      { crescendo: 'end', dynamic: 'f' },
    ]);
    const pairs = pairHairpins(elements, makeXPositions(elements.length));
    const endNoteX = 200;
    const expectedEndX =
      endNoteX +
      NOTE_SVG_WIDTH / 2 -
      (1 * DYNAMICS_CHAR_WIDTH_PX) / 2 -
      HAIRPIN_DYNAMIC_GAP_PX;
    expect(pairs[0].endX).toBeCloseTo(expectedEndX);
    expect(pairs[0].errors).toEqual([]);
  });

  it('flags an overlap warning and falls back to raw bounds when the dynamics collide (adjacent notes, no space between)', () => {
    const elements = makeElements([
      { crescendo: 'start', dynamic: 'fff' },
      { crescendo: 'end', dynamic: 'ppp' },
    ]);
    // 0px apart — with wide markings on both ends the reserved gaps overlap.
    const positions = new Map([
      [0, 0],
      [1, 0],
    ]);
    const pairs = pairHairpins(elements, positions);
    expect(pairs[0].errors).toEqual([
      'Hairpin (crescendo) overlaps a dynamic marking and cannot be cleanly positioned.',
    ]);
    expect(pairs[0].startX).toBe(positions.get(0));
    expect(pairs[0].endX).toBe((positions.get(1) ?? 0) + NOTE_SVG_WIDTH);
  });

  it('does not warn when notes are spaced at least MIN_NOTE_WIDTH apart, even with endpoint dynamics', () => {
    // Mirrors the WithHairpin story: crescendo p -> f over 4 quarter notes,
    // spaced at the real layout's minimum note width (20px).
    const MIN_NOTE_WIDTH = 20;
    const elements = makeElements([
      { crescendo: 'start', dynamic: 'p' },
      {},
      {},
      { crescendo: 'end', dynamic: 'f' },
    ]);
    const positions = new Map([
      [0, 0],
      [1, MIN_NOTE_WIDTH],
      [2, MIN_NOTE_WIDTH * 2],
      [3, MIN_NOTE_WIDTH * 3],
    ]);
    const pairs = pairHairpins(elements, positions);
    expect(pairs[0].errors).toEqual([]);
    expect(pairs[0].startX).toBeLessThan(pairs[0].endX);
  });

  it('flags an overlap warning for an interim dynamic between start and end', () => {
    const elements = makeElements([
      { crescendo: 'start' },
      { dynamic: 'mf' },
      { crescendo: 'end' },
    ]);
    const pairs = pairHairpins(elements, makeXPositions(elements.length));
    expect(pairs[0].errors).toEqual([
      'Hairpin (crescendo) overlaps an interim dynamic marking between its start and end.',
    ]);
    // Endpoints have no dynamics, so bounds are still the raw note-edge positions.
    expect(pairs[0].startX).toBe(0);
    expect(pairs[0].endX).toBe(200 + NOTE_SVG_WIDTH);
  });

  it('flags an error and skips the dynamic-shift math if a rest element ever ends up as a hairpin start/end', () => {
    // A real music-rest element can never satisfy this in practice (rest.ts
    // defines no crescendo/decrescendo accessor), so this simulates the
    // invariant being broken to verify buildHairpinPair's defensive guard.
    const rogueRest = document.createElement(MUSIC_REST) as unknown as Record<
      string,
      unknown
    >;
    Object.defineProperty(rogueRest, 'nodeName', {
      value: MUSIC_REST_NODE,
      configurable: true,
    });
    rogueRest.crescendo = 'start';
    document.body.appendChild(rogueRest as unknown as Node);

    const endNote = makeNote({ crescendo: 'end', dynamic: 'f' });

    const elements = [
      rogueRest,
      endNote,
    ] as unknown as NoteChordOrRestElementType[];
    const positions = new Map([
      [0, 0],
      [1, 100],
    ]);
    const pairs = pairHairpins(elements, positions);

    expect(pairs).toHaveLength(1);
    expect(pairs[0].errors).toEqual([
      'Hairpin (crescendo) references a rest element, which cannot carry a dynamic or hairpin marking.',
    ]);
    // Falls back to raw bounds — no dynamic-shift math applied.
    expect(pairs[0].startX).toBe(0);
    expect(pairs[0].endX).toBe(100 + NOTE_SVG_WIDTH);
  });
});

describe('resolveHairpinSegments', () => {
  function makePair(kind: 'crescendo' | 'decrescendo') {
    const start = makeNote({ [kind]: 'start' });
    const end = makeNote({ [kind]: 'end' });
    return { pair: { kind, startElement: start, endElement: end } as any };
  }

  const ROW_LEFT = 50;
  const ROW_RIGHT = 400;
  const START_CENTER_Y = 90;
  const END_CENTER_Y = 90;

  it('returns a single segment when start and end are on the same row', () => {
    const { pair } = makePair('crescendo');
    const startBounds = { left: 60, right: 80, top: 100 };
    const endBounds = { left: 200, right: 220, top: 102 };
    const segments = resolveHairpinSegments(
      pair,
      startBounds,
      endBounds,
      START_CENTER_Y,
      END_CENTER_Y,
      ROW_LEFT,
      ROW_RIGHT
    );
    expect(segments).toHaveLength(1);
    expect(segments[0].startX).toBe(80);
    expect(segments[0].endX).toBe(200);
    expect(segments[0].openAtStart).toBe(false);
    expect(segments[0].openAtEnd).toBe(false);
  });

  it('returns two segments for a cross-row crescendo', () => {
    const { pair } = makePair('crescendo');
    const startBounds = { left: 60, right: 80, top: 100 };
    const endBounds = { left: 100, right: 120, top: 300 };
    const segments = resolveHairpinSegments(
      pair,
      startBounds,
      endBounds,
      START_CENTER_Y,
      END_CENTER_Y,
      ROW_LEFT,
      ROW_RIGHT
    );
    expect(segments).toHaveLength(2);
    expect(segments[0].startX).toBe(80);
    expect(segments[0].endX).toBe(ROW_RIGHT);
    expect(segments[0].openAtStart).toBe(false);
    expect(segments[0].openAtEnd).toBe(false);
    expect(segments[1].startX).toBe(ROW_LEFT);
    expect(segments[1].endX).toBe(100);
    expect(segments[1].openAtStart).toBe(true);
    expect(segments[1].openAtEnd).toBe(false);
  });

  it('returns two segments for a cross-row decrescendo with openAtEnd on segment 1', () => {
    const { pair } = makePair('decrescendo');
    const startBounds = { left: 60, right: 80, top: 100 };
    const endBounds = { left: 100, right: 120, top: 300 };
    const segments = resolveHairpinSegments(
      pair,
      startBounds,
      endBounds,
      START_CENTER_Y,
      END_CENTER_Y,
      ROW_LEFT,
      ROW_RIGHT
    );
    expect(segments).toHaveLength(2);
    expect(segments[0].openAtEnd).toBe(true);
    expect(segments[1].openAtStart).toBe(true);
    expect(segments[1].openAtEnd).toBe(false);
  });

  it('uses startCenterY for segment 1 and endCenterY for segment 2 when cross-row', () => {
    const { pair } = makePair('crescendo');
    const startBounds = { left: 60, right: 80, top: 100 };
    const endBounds = { left: 100, right: 120, top: 300 };
    const segments = resolveHairpinSegments(
      pair,
      startBounds,
      endBounds,
      90,
      95,
      ROW_LEFT,
      ROW_RIGHT
    );
    expect(segments[0].centerY).toBe(90);
    expect(segments[1].centerY).toBe(95);
  });

  it('treats elements within 5px tolerance as same row', () => {
    const { pair } = makePair('crescendo');
    const startBounds = { left: 60, right: 80, top: 100 };
    const endBounds = { left: 200, right: 220, top: 105 };
    const segments = resolveHairpinSegments(
      pair,
      startBounds,
      endBounds,
      START_CENTER_Y,
      END_CENTER_Y,
      ROW_LEFT,
      ROW_RIGHT
    );
    expect(segments).toHaveLength(1);
  });

  it('treats elements more than 5px apart as cross-row', () => {
    const { pair } = makePair('crescendo');
    const startBounds = { left: 60, right: 80, top: 100 };
    const endBounds = { left: 200, right: 220, top: 106 };
    const segments = resolveHairpinSegments(
      pair,
      startBounds,
      endBounds,
      START_CENTER_Y,
      END_CENTER_Y,
      ROW_LEFT,
      ROW_RIGHT
    );
    expect(segments).toHaveLength(2);
  });
});

describe('pairHairpins with chord elements', () => {
  it('pairs hairpins on chord elements', () => {
    const chord1 = document.createElement(
      MUSIC_CHORD
    ) as NoteChordOrRestElementType;
    chord1.setAttribute('crescendo', 'start');
    document.body.appendChild(chord1);

    const chord2 = document.createElement(
      MUSIC_CHORD
    ) as NoteChordOrRestElementType;
    chord2.setAttribute('crescendo', 'end');
    document.body.appendChild(chord2);

    const pairs = pairHairpins([chord1, chord2], makeXPositions(2));
    expect(pairs).toHaveLength(1);
    expect(pairs[0].kind).toBe('crescendo');
  });
});

/**
 * @jest-environment jsdom
 */
import '../../note/index';
import {
  buildTupletGroups,
  computeTupletBracketGeometry,
  TupletBracketGeometry,
} from '../../rules/tupletRules';
import '../../tuplet/index';
import {
  NoteChordOrRestElementType,
  NoteElementType,
  TupletElementType,
} from '../../types/elements';
import { MUSIC_NOTE, MUSIC_TUPLET } from '../consts';
import { TUPLET_NUMERAL_GAP_PX } from '../notationDimensions';
import { createTupletBracketSvg } from './tuplet';

afterEach(() => {
  document.body.innerHTML = '';
});

function makeBasicGeometry(
  overrides: Partial<TupletBracketGeometry> = {}
): TupletBracketGeometry {
  const notes: NoteChordOrRestElementType[] = Array.from({ length: 3 }, () => {
    const el = document.createElement(MUSIC_NOTE) as NoteElementType;
    el.setAttribute('note', 'C');
    el.setAttribute('duration', 'eighth');
    document.body.appendChild(el);
    return el;
  });
  const tupletEl = document.createElement(MUSIC_TUPLET) as TupletElementType;
  tupletEl.setAttribute('ratio', '3');
  document.body.appendChild(tupletEl);

  const tupletsByIndex = new Map<number, TupletElementType>(
    notes.map((_, i) => [i, tupletEl])
  );
  const [group] = buildTupletGroups(notes, tupletsByIndex);
  const noteXPositions = new Map(notes.map((_, i) => [i, i * 40 + 20]));
  const stemDirections = notes.map(() => true);
  const beamedIndices = new Set<number>();
  const noteStaffYCoords = new Map<NoteElementType, number>(
    notes.map((n) => [n as NoteElementType, 50])
  );

  const geometry = computeTupletBracketGeometry(
    group,
    notes,
    noteXPositions,
    stemDirections,
    beamedIndices,
    noteStaffYCoords,
    new Map()
  )!;

  return { ...geometry, ...overrides };
}

describe('createTupletBracketSvg', () => {
  it('returns an SVGGElement with class "tuplet-group"', () => {
    const geom = makeBasicGeometry();
    const result = createTupletBracketSvg(geom);

    expect(result.nodeName).toBe('g');
    expect(result.classList.contains('tuplet-group')).toBe(true);
  });

  it('renders 4 bracket lines and 1 text element when omitBracket=false', () => {
    const geom = makeBasicGeometry({ omitBracket: false });
    const result = createTupletBracketSvg(geom);

    const lines = result.querySelectorAll('line');
    const texts = result.querySelectorAll('text');
    expect(lines.length).toBe(4);
    expect(texts.length).toBe(1);
  });

  it('renders only 1 text element when omitBracket=true', () => {
    const geom = makeBasicGeometry({ omitBracket: true });
    const result = createTupletBracketSvg(geom);

    const lines = result.querySelectorAll('line');
    const texts = result.querySelectorAll('text');
    expect(lines.length).toBe(0);
    expect(texts.length).toBe(1);
  });

  it('text element has font-style="italic"', () => {
    const geom = makeBasicGeometry({ omitBracket: false });
    const result = createTupletBracketSvg(geom);

    const text = result.querySelector('text')!;
    expect(text.getAttribute('font-style')).toBe('italic');
  });

  it('text element contains the displayString', () => {
    const geom = makeBasicGeometry({ omitBracket: false });
    const result = createTupletBracketSvg(geom);

    const text = result.querySelector('text')!;
    expect(text.textContent).toBe('3');
  });

  it('text element contains "5:4" for a quintuplet', () => {
    const notes: NoteChordOrRestElementType[] = Array.from(
      { length: 5 },
      () => {
        const el = document.createElement(MUSIC_NOTE) as NoteElementType;
        el.setAttribute('note', 'C');
        el.setAttribute('duration', 'sixteenth');
        document.body.appendChild(el);
        return el;
      }
    );
    const tupletEl = document.createElement(MUSIC_TUPLET) as TupletElementType;
    tupletEl.setAttribute('ratio', '5:4');
    document.body.appendChild(tupletEl);

    const tupletsByIndex = new Map<number, TupletElementType>(
      notes.map((_, i) => [i, tupletEl])
    );
    const [group] = buildTupletGroups(notes, tupletsByIndex);
    const noteXPositions = new Map(notes.map((_, i) => [i, i * 30 + 10]));
    const noteStaffYCoords = new Map<NoteElementType, number>(
      notes.map((n) => [n as NoteElementType, 50])
    );
    const geom = computeTupletBracketGeometry(
      group,
      notes,
      noteXPositions,
      notes.map(() => true),
      new Set(),
      noteStaffYCoords,
      new Map()
    )!;

    const result = createTupletBracketSvg(geom);
    expect(result.querySelector('text')!.textContent).toBe('5:4');
  });

  it('hook lines are vertical (x1 === x2) when omitBracket=false', () => {
    const geom = makeBasicGeometry({
      omitBracket: false,
      angle: 0, // horizontal bracket so hook positions are clear
    });
    const result = createTupletBracketSvg(geom);

    // Hooks are the lines where x1 === x2 (startX and endX columns)
    const lines = Array.from(result.querySelectorAll('line'));
    const hookLines = lines.filter(
      (l) => l.getAttribute('x1') === l.getAttribute('x2')
    );
    expect(hookLines.length).toBe(2);
  });

  it('left arm ends before numeral gap center', () => {
    const geom = makeBasicGeometry({ omitBracket: false, angle: 0 });
    const result = createTupletBracketSvg(geom);

    const lines = Array.from(result.querySelectorAll('line'));
    // Left arm: x1 = startX, x2 < numeralX - gap/2
    const leftArm = lines.find(
      (l) =>
        parseFloat(l.getAttribute('x1')!) === geom.startX &&
        parseFloat(l.getAttribute('x2')!) < geom.numeralX
    );
    expect(leftArm).toBeDefined();
    expect(parseFloat(leftArm!.getAttribute('x2')!)).toBeLessThanOrEqual(
      geom.numeralX - TUPLET_NUMERAL_GAP_PX / 2
    );
  });

  it('right arm starts after numeral gap center', () => {
    const geom = makeBasicGeometry({ omitBracket: false, angle: 0 });
    const result = createTupletBracketSvg(geom);

    const lines = Array.from(result.querySelectorAll('line'));
    // Right arm: x2 = endX, x1 > numeralX + gap/2
    const rightArm = lines.find(
      (l) =>
        parseFloat(l.getAttribute('x2')!) === geom.endX &&
        parseFloat(l.getAttribute('x1')!) > geom.numeralX
    );
    expect(rightArm).toBeDefined();
    expect(parseFloat(rightArm!.getAttribute('x1')!)).toBeGreaterThanOrEqual(
      geom.numeralX + TUPLET_NUMERAL_GAP_PX / 2
    );
  });

  it('renders numeral only (no bracket lines) when bracket is too narrow', () => {
    // Bracket width smaller than TUPLET_NUMERAL_GAP_PX + 4 → arms are skipped
    const geom = makeBasicGeometry({
      omitBracket: false,
      startX: 0,
      endX: 5, // very narrow
      numeralX: 2.5,
    });
    const result = createTupletBracketSvg(geom);

    const lines = result.querySelectorAll('line');
    expect(lines.length).toBe(0);
  });
});

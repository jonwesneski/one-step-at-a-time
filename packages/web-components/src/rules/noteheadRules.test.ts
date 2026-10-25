import type { DurationType, NoteheadType } from '../types/theory';
import {
  forcedStemUp,
  isTriangle,
  resolveChordToneNoteheads,
  resolveGraceNoteheads,
  resolveNoteheadGlyph,
  resolveTriangleStaffYs,
  suppressesAccidental,
  suppressesLedgerLines,
  triangleDurationWarning,
  triangleStemExtensionPx,
  triangleUnsupportedWarning,
  type TrianglePlacementEntry,
} from './noteheadRules';

describe('resolveNoteheadGlyph', () => {
  const cases: [NoteheadType, DurationType, string | null][] = [
    ['normal', 'quarter', null],
    ['normal', 'whole', null],
    ['x', 'eighth', 'x'],
    ['x', 'quarter', 'x'],
    ['x', 'half', 'circle-x'],
    ['x', 'whole', 'circle-x'],
    ['x', 'double-whole', 'circle-x'],
    ['diamond', 'sixteenth', 'diamond-black'],
    ['diamond', 'quarter', 'diamond-black'],
    ['diamond', 'half', 'diamond-white'],
    ['diamond', 'whole', 'diamond-white-wide'],
    ['diamond', 'double-whole', 'diamond-white-wide'],
    ['diamond-white', 'eighth', 'diamond-white'],
    ['diamond-white', 'quarter', 'diamond-white'],
    ['diamond-white', 'half', 'diamond-white'],
    ['diamond-white', 'whole', 'diamond-white-wide'],
    ['triangle-up', 'quarter', 'triangle-up-black'],
    ['triangle-up', 'half', 'triangle-up-white'],
    ['triangle-up', 'whole', 'triangle-up-white'],
    ['triangle-down', 'eighth', 'triangle-down-black'],
    ['triangle-down', 'half', 'triangle-down-white'],
  ];
  it.each(cases)('%s %s → %s', (notehead, duration, glyph) => {
    expect(resolveNoteheadGlyph(notehead, duration)).toBe(glyph);
  });
});

describe('triangle helpers', () => {
  it('identifies triangles', () => {
    expect(isTriangle('triangle-up')).toBe(true);
    expect(isTriangle('triangle-down')).toBe(true);
    expect(isTriangle('diamond')).toBe(false);
    expect(isTriangle(null)).toBe(false);
  });

  it('forces the stem away from the point', () => {
    expect(forcedStemUp('triangle-up')).toBe(false);
    expect(forcedStemUp('triangle-down')).toBe(true);
    expect(forcedStemUp('x')).toBeNull();
    expect(forcedStemUp(null)).toBeNull();
  });

  it('suppresses ledger lines and accidentals only for triangles', () => {
    expect(suppressesLedgerLines('triangle-up')).toBe(true);
    expect(suppressesAccidental('triangle-down')).toBe(true);
    expect(suppressesLedgerLines('x')).toBe(false);
    expect(suppressesAccidental('diamond')).toBe(false);
  });

  it('warns about stemless triangles only', () => {
    expect(triangleDurationWarning('triangle-up', 'whole')).toMatch(
      /two tied half notes/
    );
    expect(triangleDurationWarning('triangle-down', 'double-whole')).not.toBe(
      null
    );
    expect(triangleDurationWarning('triangle-up', 'half')).toBeNull();
    expect(triangleDurationWarning('diamond', 'whole')).toBeNull();
  });
});

describe('chord and grace noteheads', () => {
  it('lets a tone override the chord default', () => {
    expect(
      resolveChordToneNoteheads('normal', [null, 'diamond-white', null])
    ).toEqual(['normal', 'diamond-white', 'normal']);
    expect(resolveChordToneNoteheads('x', [null, null])).toEqual(['x', 'x']);
    expect(resolveChordToneNoteheads(null, [null])).toEqual(['normal']);
  });

  it('falls back to normal for triangles on a chord', () => {
    expect(resolveChordToneNoteheads('triangle-up', [null, 'x'])).toEqual([
      'normal',
      'x',
    ]);
    expect(resolveChordToneNoteheads('x', ['triangle-down'])).toEqual([
      'normal',
    ]);
    expect(triangleUnsupportedWarning(['x', 'triangle-up'], 'a chord')).toMatch(
      /triangle-up.*a chord/
    );
    expect(triangleUnsupportedWarning(['x', null], 'a chord')).toBeNull();
  });

  it('aligns grace noteheads by index and rejects triangles', () => {
    expect(resolveGraceNoteheads(['x', null, 'triangle-up'], 4)).toEqual([
      'x',
      'normal',
      'normal',
      'normal',
    ]);
  });
});

describe('resolveTriangleStaffYs', () => {
  const staff = {
    topLineY: 30,
    bottomLineY: 70,
    outsideStaffPx: 25,
    runClearancePx: 25,
  };
  const up: TrianglePlacementEntry = {
    kind: 'triangle',
    notehead: 'triangle-up',
    tiedFromPrevious: false,
  };
  const down: TrianglePlacementEntry = {
    kind: 'triangle',
    notehead: 'triangle-down',
    tiedFromPrevious: false,
  };

  it('places an isolated triangle outside the stave', () => {
    expect(resolveTriangleStaffYs([up], staff).get(0)).toBe(5);
    expect(resolveTriangleStaffYs([down], staff).get(0)).toBe(95);
  });

  it('keeps the outside-stave distance when the run sits inside the stave', () => {
    const ys = resolveTriangleStaffYs(
      [{ kind: 'pitched', headYs: [50], stemTipY: 82 }, up],
      staff
    );
    expect(ys.get(1)).toBe(5);
  });

  it('clears the highest head or stem tip of the preceding run', () => {
    const ys = resolveTriangleStaffYs(
      [
        { kind: 'pitched', headYs: [10], stemTipY: 42 },
        { kind: 'pitched', headYs: [-20, -10], stemTipY: 12 },
        up,
      ],
      staff
    );
    expect(ys.get(2)).toBe(-45);
  });

  it('clears an upward stem tip in the run', () => {
    const ys = resolveTriangleStaffYs(
      [{ kind: 'pitched', headYs: [20], stemTipY: -12 }, up],
      staff
    );
    expect(ys.get(1)).toBe(-37);
  });

  it('clears the lowest extent of the run for a down-triangle', () => {
    const ys = resolveTriangleStaffYs(
      [{ kind: 'pitched', headYs: [90], stemTipY: 58 }, down],
      staff
    );
    expect(ys.get(1)).toBe(115);
  });

  it('starts a new run after a rest or another triangle', () => {
    const ys = resolveTriangleStaffYs(
      [
        { kind: 'pitched', headYs: [-30], stemTipY: 2 },
        { kind: 'break' },
        up,
        { kind: 'pitched', headYs: [-40], stemTipY: -8 },
        up,
        up,
      ],
      staff
    );
    expect(ys.get(2)).toBe(5);
    expect(ys.get(4)).toBe(-65);
    expect(ys.get(5)).toBe(5);
  });

  it('gives a tied triangle the Y of the triangle it is tied from', () => {
    const ys = resolveTriangleStaffYs(
      [
        { kind: 'pitched', headYs: [-30], stemTipY: 2 },
        up,
        { ...up, tiedFromPrevious: true },
      ],
      staff
    );
    expect(ys.get(1)).toBe(-55);
    expect(ys.get(2)).toBe(-55);
  });

  it('does not share Y across a tie between different triangle directions', () => {
    const ys = resolveTriangleStaffYs(
      [up, { ...down, tiedFromPrevious: true }],
      staff
    );
    expect(ys.get(1)).toBe(95);
  });
});

describe('triangleStemExtensionPx', () => {
  it('extends a stem-down triangle above the stave to the middle line', () => {
    expect(triangleStemExtensionPx(5, false, 50, 32)).toBe(13);
  });

  it('extends a stem-up triangle below the stave to the middle line', () => {
    expect(triangleStemExtensionPx(95, true, 50, 32)).toBe(13);
  });

  it('never shortens a stem that already reaches', () => {
    expect(triangleStemExtensionPx(25, false, 50, 32)).toBe(0);
  });
});

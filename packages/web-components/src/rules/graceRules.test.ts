/**
 * @jest-environment jsdom
 */
import { Note } from '../types/theory';
import {
  ACCIDENTAL_NOTE_GAP,
  ACCIDENTAL_SYMBOL_WIDTH,
  GRACE_MAIN_GAP_PX,
  GRACE_MIN_STEM_LENGTH_PX,
  GRACE_NOTE_ADVANCE_PX,
  GRACE_SCALE,
  GRACE_STEM_LENGTH_PX,
} from '../utils/notationDimensions';
import {
  buildGraceNoteDescriptors,
  computeFirstGraceHeadX,
  computeGraceBeamYs,
  computeGraceFootprintWidth,
  computeGraceLayout,
  diatonicStepsBetween,
} from './graceRules';

describe('diatonicStepsBetween', () => {
  it('returns 0 for the same pitch', () => {
    expect(diatonicStepsBetween('C', 4, 'C', 4)).toBe(0);
  });

  it('returns 1 for one step up (C4 → D4)', () => {
    expect(diatonicStepsBetween('C', 4, 'D', 4)).toBe(1);
  });

  it('returns -1 for one step down (C4 → B3)', () => {
    expect(diatonicStepsBetween('C', 4, 'B', 3)).toBe(-1);
  });

  it('returns 7 for one octave up (C4 → C5)', () => {
    expect(diatonicStepsBetween('C', 4, 'C', 5)).toBe(7);
  });

  it('crosses octave boundaries correctly (A4 → C5 = 2)', () => {
    expect(diatonicStepsBetween('A', 4, 'C', 5)).toBe(2);
  });
});

describe('buildGraceNoteDescriptors', () => {
  it('computes steps relative to the reference pitch', () => {
    const descriptors = buildGraceNoteDescriptors(['G', 'A'], [4, 4], 'C', 5);
    expect(descriptors).toEqual([
      { relativeStaffSteps: -3, accidental: null, articulation: null },
      { relativeStaffSteps: -2, accidental: null, articulation: null },
    ]);
  });

  it('is accidental-agnostic for steps but captures the accidental', () => {
    const descriptors = buildGraceNoteDescriptors(['F#', 'Bb'], [4, 4], 'C', 4);
    expect(descriptors[0]).toEqual({
      relativeStaffSteps: 3,
      accidental: 'sharp',
      articulation: null,
    });
    expect(descriptors[1]).toEqual({
      relativeStaffSteps: 6,
      accidental: 'flat',
      articulation: null,
    });
  });

  it('handles double accidentals', () => {
    const descriptors = buildGraceNoteDescriptors(
      ['F##', 'Gbb'],
      [4, 4],
      'C',
      4
    );
    expect(descriptors[0].accidental).toBe('double-sharp');
    expect(descriptors[1].accidental).toBe('double-flat');
  });

  it('defaults a missing octave slot to the reference octave', () => {
    const descriptors = buildGraceNoteDescriptors(['G', 'A'], [4], 'C', 5);
    // G defaults to octave 4 (explicit); A has no slot at all → also defaults
    // to the reference octave (5).
    expect(descriptors[0]).toEqual({
      relativeStaffSteps: -3,
      accidental: null,
      articulation: null,
    });
    expect(descriptors[1]).toEqual({
      relativeStaffSteps: 5,
      accidental: null,
      articulation: null,
    });
  });

  it('defaults a null octave slot (invalid token) to the reference octave', () => {
    const descriptors = buildGraceNoteDescriptors(['G'], [null], 'C', 5);
    expect(descriptors[0]).toEqual({
      relativeStaffSteps: 4,
      accidental: null,
      articulation: null,
    });
  });

  it('populates articulation per grace note, index-aligned with graceNotes', () => {
    const descriptors = buildGraceNoteDescriptors(['G', 'A'], [4, 4], 'C', 5, [
      'staccato',
      'accent',
    ]);
    expect(descriptors[0].articulation).toBe('staccato');
    expect(descriptors[1].articulation).toBe('accent');
  });

  it('defaults a missing or null articulation slot to null, without affecting other slots', () => {
    const shortList = buildGraceNoteDescriptors(['G', 'A'], [4, 4], 'C', 5, [
      'staccato',
    ]);
    expect(shortList[0].articulation).toBe('staccato');
    expect(shortList[1].articulation).toBeNull();

    const nullSlot = buildGraceNoteDescriptors(['G', 'A'], [4, 4], 'C', 5, [
      null,
      'accent',
    ]);
    expect(nullSlot[0].articulation).toBeNull();
    expect(nullSlot[1].articulation).toBe('accent');
  });

  it('defaults articulation to null for every grace note when the parameter is omitted', () => {
    const descriptors = buildGraceNoteDescriptors(['G', 'A'], [4, 4], 'C', 5);
    expect(descriptors[0].articulation).toBeNull();
    expect(descriptors[1].articulation).toBeNull();
  });
});

describe('computeGraceLayout', () => {
  it('advances one column per grace head', () => {
    const layout = computeGraceLayout([
      { relativeStaffSteps: 0, accidental: null, articulation: null },
      { relativeStaffSteps: 1, accidental: null, articulation: null },
      { relativeStaffSteps: 2, accidental: null, articulation: null },
    ]);
    expect(layout.totalWidth).toBe(3 * GRACE_NOTE_ADVANCE_PX);
    expect(layout.headXCenters).toEqual([
      GRACE_NOTE_ADVANCE_PX / 2,
      GRACE_NOTE_ADVANCE_PX * 1.5,
      GRACE_NOTE_ADVANCE_PX * 2.5,
    ]);
  });

  it('adds a scaled accidental column before an accidental-bearing head', () => {
    const accidentalWidth =
      GRACE_SCALE * (ACCIDENTAL_SYMBOL_WIDTH.sharp + ACCIDENTAL_NOTE_GAP);
    const layout = computeGraceLayout([
      { relativeStaffSteps: 0, accidental: 'sharp', articulation: null },
      { relativeStaffSteps: 1, accidental: null, articulation: null },
    ]);
    expect(layout.totalWidth).toBe(2 * GRACE_NOTE_ADVANCE_PX + accidentalWidth);
    expect(layout.headXCenters[0]).toBe(
      accidentalWidth + GRACE_NOTE_ADVANCE_PX / 2
    );
  });

  it('produces monotonically increasing x centers', () => {
    const layout = computeGraceLayout([
      { relativeStaffSteps: 0, accidental: 'flat', articulation: null },
      { relativeStaffSteps: 1, accidental: 'sharp', articulation: null },
      { relativeStaffSteps: 2, accidental: null, articulation: null },
    ]);
    for (let i = 1; i < layout.headXCenters.length; i++) {
      expect(layout.headXCenters[i]).toBeGreaterThan(
        layout.headXCenters[i - 1]
      );
    }
  });
});

describe('computeGraceFootprintWidth', () => {
  it('returns 0 for null', () => {
    expect(computeGraceFootprintWidth(null)).toBe(0);
  });

  it('returns 0 for an empty list', () => {
    expect(computeGraceFootprintWidth([])).toBe(0);
  });

  it('includes the gap to the main note', () => {
    expect(computeGraceFootprintWidth(['G'])).toBe(
      GRACE_MAIN_GAP_PX + GRACE_NOTE_ADVANCE_PX
    );
  });

  it('includes scaled accidental columns', () => {
    const accidentalWidth =
      GRACE_SCALE * (ACCIDENTAL_SYMBOL_WIDTH.sharp + ACCIDENTAL_NOTE_GAP);
    const graceNotes: Note[] = ['F#', 'G'];
    expect(computeGraceFootprintWidth(graceNotes)).toBe(
      GRACE_MAIN_GAP_PX + 2 * GRACE_NOTE_ADVANCE_PX + accidentalWidth
    );
  });

  it('reserves width for a resolved natural on a suffix-less grace note', () => {
    const naturalWidth =
      GRACE_SCALE * (ACCIDENTAL_SYMBOL_WIDTH.natural + ACCIDENTAL_NOTE_GAP);
    const graceNotes: Note[] = ['F'];
    expect(computeGraceFootprintWidth(graceNotes, ['natural'])).toBe(
      GRACE_MAIN_GAP_PX + GRACE_NOTE_ADVANCE_PX + naturalWidth
    );
  });

  it('suppresses width when the resolved accidental is null despite a suffix', () => {
    const graceNotes: Note[] = ['F#'];
    expect(computeGraceFootprintWidth(graceNotes, [null])).toBe(
      GRACE_MAIN_GAP_PX + GRACE_NOTE_ADVANCE_PX
    );
  });

  it('falls back to suffix-derived accidentals when resolved data is null', () => {
    const accidentalWidth =
      GRACE_SCALE * (ACCIDENTAL_SYMBOL_WIDTH.sharp + ACCIDENTAL_NOTE_GAP);
    const graceNotes: Note[] = ['F#'];
    expect(computeGraceFootprintWidth(graceNotes, null)).toBe(
      GRACE_MAIN_GAP_PX + GRACE_NOTE_ADVANCE_PX + accidentalWidth
    );
  });

  it('falls back to suffix-derived accidentals when resolved length mismatches', () => {
    const accidentalWidth =
      GRACE_SCALE * (ACCIDENTAL_SYMBOL_WIDTH.sharp + ACCIDENTAL_NOTE_GAP);
    const graceNotes: Note[] = ['F#', 'G'];
    expect(computeGraceFootprintWidth(graceNotes, ['natural'])).toBe(
      GRACE_MAIN_GAP_PX + 2 * GRACE_NOTE_ADVANCE_PX + accidentalWidth
    );
  });
});

describe('computeFirstGraceHeadX', () => {
  it('lands left of noteX by leftwardWidth, plus half a head advance for a plain grace note', () => {
    const graceNotes: Note[] = ['B'];
    const leftwardWidth = computeGraceFootprintWidth(graceNotes);
    const x = computeFirstGraceHeadX(100, leftwardWidth, graceNotes);
    expect(x).toBe(100 - leftwardWidth + GRACE_NOTE_ADVANCE_PX / 2);
  });

  it('shifts right by the first grace note’s own accidental width when it has a suffix', () => {
    const graceNotes: Note[] = ['F#', 'G'];
    const leftwardWidth = computeGraceFootprintWidth(graceNotes);
    const accidentalWidth =
      GRACE_SCALE * (ACCIDENTAL_SYMBOL_WIDTH.sharp + ACCIDENTAL_NOTE_GAP);
    const x = computeFirstGraceHeadX(100, leftwardWidth, graceNotes);
    expect(x).toBe(
      100 - leftwardWidth + accidentalWidth + GRACE_NOTE_ADVANCE_PX / 2
    );
  });

  it('prefers the resolved accidental over the suffix for the first grace note', () => {
    const graceNotes: Note[] = ['F'];
    const resolved: ('natural' | null)[] = ['natural'];
    const leftwardWidth = computeGraceFootprintWidth(graceNotes, resolved);
    const naturalWidth =
      GRACE_SCALE * (ACCIDENTAL_SYMBOL_WIDTH.natural + ACCIDENTAL_NOTE_GAP);
    const x = computeFirstGraceHeadX(100, leftwardWidth, graceNotes, resolved);
    expect(x).toBe(
      100 - leftwardWidth + naturalWidth + GRACE_NOTE_ADVANCE_PX / 2
    );
  });

  it('only considers the first grace note — a later accidental does not change its own offset within the group', () => {
    // The first head's offset from the group's own local origin (its X=0
    // point, i.e. noteX - leftwardWidth) should be identical whether or not
    // a later grace note in the group carries an accidental — only that
    // later note's own column width changes, not anything about the first.
    const withLaterAccidental: Note[] = ['G', 'F#'];
    const plain: Note[] = ['G', 'A'];
    const leftwardWidthWithLater =
      computeGraceFootprintWidth(withLaterAccidental);
    const leftwardWidthPlain = computeGraceFootprintWidth(plain);
    const offsetWithLater =
      computeFirstGraceHeadX(100, leftwardWidthWithLater, withLaterAccidental) -
      (100 - leftwardWidthWithLater);
    const offsetPlain =
      computeFirstGraceHeadX(100, leftwardWidthPlain, plain) -
      (100 - leftwardWidthPlain);
    expect(offsetWithLater).toBe(offsetPlain);
  });

  it('falls back to noteX - leftwardWidth for an empty grace list', () => {
    expect(computeFirstGraceHeadX(100, 20, [])).toBe(80);
  });
});

describe('computeGraceBeamYs', () => {
  it('renders a flat beam at full stem length for a flat contour', () => {
    const beamYs = computeGraceBeamYs([0, 10, 20], [50, 50, 50]);
    expect(beamYs).toEqual([
      50 - GRACE_STEM_LENGTH_PX,
      50 - GRACE_STEM_LENGTH_PX,
      50 - GRACE_STEM_LENGTH_PX,
    ]);
  });

  it('slopes the beam between the first and last heads', () => {
    const beamYs = computeGraceBeamYs([0, 10], [50, 40]);
    expect(beamYs[0]).toBe(50 - GRACE_STEM_LENGTH_PX);
    expect(beamYs[1]).toBe(40 - GRACE_STEM_LENGTH_PX);
  });

  it('raises the whole beam line when an interior stem would be too short', () => {
    // Interior head much higher (smaller Y) than the endpoints.
    const headYs = [50, 30, 50];
    const beamYs = computeGraceBeamYs([0, 10, 20], headYs);
    for (let i = 0; i < beamYs.length; i++) {
      const stemLength = headYs[i] - beamYs[i];
      expect(stemLength).toBeGreaterThanOrEqual(GRACE_MIN_STEM_LENGTH_PX);
    }
    // Uniform raise keeps the beam parallel to the original line.
    expect(beamYs[2] - beamYs[0]).toBe(0);
  });
});

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
      { relativeStaffSteps: -3, accidental: null },
      { relativeStaffSteps: -2, accidental: null },
    ]);
  });

  it('is accidental-agnostic for steps but captures the accidental', () => {
    const descriptors = buildGraceNoteDescriptors(['F#', 'Bb'], [4, 4], 'C', 4);
    expect(descriptors[0]).toEqual({
      relativeStaffSteps: 3,
      accidental: 'sharp',
    });
    expect(descriptors[1]).toEqual({
      relativeStaffSteps: 6,
      accidental: 'flat',
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
    });
    expect(descriptors[1]).toEqual({ relativeStaffSteps: 5, accidental: null });
  });

  it('defaults a null octave slot (invalid token) to the reference octave', () => {
    const descriptors = buildGraceNoteDescriptors(['G'], [null], 'C', 5);
    expect(descriptors[0]).toEqual({
      relativeStaffSteps: 4,
      accidental: null,
    });
  });
});

describe('computeGraceLayout', () => {
  it('advances one column per grace head', () => {
    const layout = computeGraceLayout([
      { relativeStaffSteps: 0, accidental: null },
      { relativeStaffSteps: 1, accidental: null },
      { relativeStaffSteps: 2, accidental: null },
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
      { relativeStaffSteps: 0, accidental: 'sharp' },
      { relativeStaffSteps: 1, accidental: null },
    ]);
    expect(layout.totalWidth).toBe(2 * GRACE_NOTE_ADVANCE_PX + accidentalWidth);
    expect(layout.headXCenters[0]).toBe(
      accidentalWidth + GRACE_NOTE_ADVANCE_PX / 2
    );
  });

  it('produces monotonically increasing x centers', () => {
    const layout = computeGraceLayout([
      { relativeStaffSteps: 0, accidental: 'flat' },
      { relativeStaffSteps: 1, accidental: 'sharp' },
      { relativeStaffSteps: 2, accidental: null },
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

/**
 * @jest-environment jsdom
 */
import { ADJACENT_NOTE_X_DISPLACEMENT_PX } from '../utils/svgCreator/note';
import { computeAdjacentDisplacements } from './chordRules';

const DISPLACEMENT = ADJACENT_NOTE_X_DISPLACEMENT_PX; // 8px

describe('computeAdjacentDisplacements', () => {
  it('returns [] for a single note', () => {
    expect(computeAdjacentDisplacements([70], true)).toEqual([]);
  });

  it('returns [] for an empty array', () => {
    expect(computeAdjacentDisplacements([], true)).toEqual([]);
  });

  it('returns [] when no notes are adjacent (10px apart)', () => {
    // E4=70, G4=60, B4=50 — non-adjacent major triad
    expect(computeAdjacentDisplacements([70, 60, 50], true)).toEqual([]);
  });

  describe('two adjacent notes', () => {
    it('displaces the upper note right (+8px) for stem-up: E4(70)+F4(65)', () => {
      // stem-up: scan descending [70, 65]; stem note=70(E4); 65(F4) adjacent → displaced
      const result = computeAdjacentDisplacements([70, 65], true);
      expect(result).toHaveLength(1);
      expect(result[0].noteIndex).toBe(1); // index of F4=65 in original array
      expect(result[0].xOffset).toBeCloseTo(DISPLACEMENT);
    });

    it('displaces the lower note left (-8px) for stem-down: E4(70)+F4(65)', () => {
      // stem-down: scan ascending [65, 70]; stem note=65(F4); 70(E4) adjacent → displaced
      const result = computeAdjacentDisplacements([70, 65], false);
      expect(result).toHaveLength(1);
      expect(result[0].noteIndex).toBe(0); // index of E4=70 in original array
      expect(result[0].xOffset).toBeCloseTo(-DISPLACEMENT);
    });

    it('displaces index 1 for C4(80)+D4(75) stem-up', () => {
      // stem note = C4=80 (largest Y); D4=75 adjacent → displaced
      const result = computeAdjacentDisplacements([80, 75], true);
      expect(result).toHaveLength(1);
      expect(result[0].noteIndex).toBe(1);
      expect(result[0].xOffset).toBeCloseTo(DISPLACEMENT);
    });
  });

  describe('three adjacent notes (alternating pattern)', () => {
    it('C4(80)-D4(75)-E4(70) stem-up: only D4 displaced', () => {
      // Scan descending: [80, 75, 70]
      // 80→75: adj, prev not displaced → displace 75 (index 1)
      // 75→70: adj, prev WAS displaced → no displacement
      const result = computeAdjacentDisplacements([80, 75, 70], true);
      expect(result).toHaveLength(1);
      expect(result[0].noteIndex).toBe(1); // D4=75
      expect(result[0].xOffset).toBeCloseTo(DISPLACEMENT);
    });

    it('E4(70)-F4(65)-G4(60) stem-up: only F4 displaced', () => {
      // Scan descending: [70, 65, 60]
      // 70→65: adj → displace 65 (index 1); 65→60: adj, prev displaced → skip
      const result = computeAdjacentDisplacements([70, 65, 60], true);
      expect(result).toHaveLength(1);
      expect(result[0].noteIndex).toBe(1); // F4=65
    });
  });

  describe('four adjacent notes (C-D-E-F)', () => {
    it('C4(80)-D4(75)-E4(70)-F4(65) stem-up: D4 and F4 displaced', () => {
      // Scan descending: [80, 75, 70, 65]
      // 80→75: adj → displace 75 (index 1)
      // 75→70: adj, prev displaced → skip 70 (index 2)
      // 70→65: adj, prev NOT displaced → displace 65 (index 3)
      const result = computeAdjacentDisplacements([80, 75, 70, 65], true);
      expect(result).toHaveLength(2);
      const indices = result.map((d) => d.noteIndex).sort((a, b) => a - b);
      expect(indices).toEqual([1, 3]); // D4 and F4
      result.forEach((d) => expect(d.xOffset).toBeCloseTo(DISPLACEMENT));
    });
  });

  describe('non-adjacent gaps break the alternation', () => {
    it('C4(80)-D4(75) adjacent + G4(60)-A4(55) adjacent: two independent pairs stem-up', () => {
      // Scan descending: [80, 75, 60, 55]
      // 80→75: adj → displace 75 (index 1)
      // 75→60: diff=15, NOT adj → prevDisplaced=false
      // 60→55: adj, prev NOT displaced → displace 55 (index 3)
      const result = computeAdjacentDisplacements([80, 75, 60, 55], true);
      expect(result).toHaveLength(2);
      const indices = result.map((d) => d.noteIndex).sort((a, b) => a - b);
      expect(indices).toEqual([1, 3]); // D4 and A4
    });
  });
});

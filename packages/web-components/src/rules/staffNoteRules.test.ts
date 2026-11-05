/**
 * @jest-environment jsdom
 */
import { computeLedgerLines } from './staffNoteRules';

describe('computeLedgerLines', () => {
  describe('no ledger lines needed', () => {
    it('returns [] when all notes are within the staff', () => {
      // E4(70), G4(60), B4(50) — all between 30 and 70 inclusive
      expect(computeLedgerLines([70, 60, 50], true)).toEqual([]);
    });

    it('returns [] for a note on the top staff line (F5=30)', () => {
      expect(computeLedgerLines([30], true)).toEqual([]);
    });

    it('returns [] for a note on the bottom staff line (E4=70)', () => {
      expect(computeLedgerLines([70], true)).toEqual([]);
    });

    it('returns [] for D4(75) — space below staff, no line position', () => {
      expect(computeLedgerLines([75], true)).toEqual([]);
    });

    it('returns [] for G5(25) — space above staff, no line position', () => {
      expect(computeLedgerLines([25], true)).toEqual([]);
    });
  });

  describe('single note below staff', () => {
    it('C4(80) → one single-width ledger at Y=80', () => {
      expect(computeLedgerLines([80], true)).toEqual([
        { staffY: 80, widthType: 'single' },
      ]);
    });

    it('B3(90) → two single-width ledgers at Y=80 and Y=90', () => {
      const result = computeLedgerLines([90], true);
      expect(result).toEqual([
        { staffY: 80, widthType: 'single' },
        { staffY: 90, widthType: 'single' },
      ]);
    });
  });

  describe('single note above staff', () => {
    it('A5(20) → one single-width ledger at Y=20', () => {
      expect(computeLedgerLines([20], true)).toEqual([
        { staffY: 20, widthType: 'single' },
      ]);
    });

    it('C6(10) → two single-width ledgers at Y=10 and Y=20', () => {
      const result = computeLedgerLines([10], true);
      expect(result).toEqual([
        { staffY: 10, widthType: 'single' },
        { staffY: 20, widthType: 'single' },
      ]);
    });

    it('B5(15) — space above first ledger → one single-width ledger at Y=20', () => {
      expect(computeLedgerLines([15], true)).toEqual([
        { staffY: 20, widthType: 'single' },
      ]);
    });
  });

  describe('adjacent pair below staff — width rules', () => {
    it('C4(80)+D4(75): outermost C4 on a line → double-width ledger at Y=80', () => {
      // C4=80 is outermost (largest Y), on a line (80%10=0) → double
      const result = computeLedgerLines([80, 75], true);
      expect(result).toEqual([{ staffY: 80, widthType: 'double' }]);
    });

    it('C4(80)+E4(70): non-adjacent (10 apart) → single-width', () => {
      // E4=70 is on the bottom staff line, C4=80 is below — non-adjacent pair
      const result = computeLedgerLines([80, 70], true);
      expect(result).toEqual([{ staffY: 80, widthType: 'single' }]);
    });
  });

  describe('adjacent pair above staff — width rules', () => {
    it('A5(20)+B5(15): outermost B5 in a space → innermost ledger single', () => {
      // B5=15 is outermost (smallest Y), in a space (15%10=5)
      // Only one ledger line at Y=20 → it is the innermost → single
      const result = computeLedgerLines([20, 15], true);
      expect(result).toEqual([{ staffY: 20, widthType: 'single' }]);
    });

    it('C6(10)+B5(15): outermost C6 on a line → all double', () => {
      // C6=10 is outermost (smallest Y), on a line (10%10=0) → all double
      const result = computeLedgerLines([10, 15], true);
      expect(result).toEqual([
        { staffY: 10, widthType: 'double' },
        { staffY: 20, widthType: 'double' },
      ]);
    });
  });

  describe('non-adjacent notes both needing ledger lines', () => {
    it('C4(80) and A3(90) non-adjacent below: both single-width', () => {
      // |80-90|=10, not adjacent → single
      const result = computeLedgerLines([80, 90], true);
      expect(result).toEqual([
        { staffY: 80, widthType: 'single' },
        { staffY: 90, widthType: 'single' },
      ]);
    });
  });

  describe('stemUp parameter does not affect ledger positions', () => {
    it('C4(80) returns same ledger for stem-down', () => {
      expect(computeLedgerLines([80], false)).toEqual([
        { staffY: 80, widthType: 'single' },
      ]);
    });
  });
});

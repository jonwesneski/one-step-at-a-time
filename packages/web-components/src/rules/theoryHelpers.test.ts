import {
  extrapolateYCoordinate,
  generateYCoordinates,
  getChordNotes,
  getNotes,
} from './theoryHelpers';

describe('Theory Helpers', () => {
  describe('getNotes', () => {
    it('same octave', () => {
      expect(getNotes('A', [4, 7])).toEqual(['A', 'C#', 'E']);
    });

    it('single pass 11th position', () => {
      expect(getNotes('F#', [4, 7])).toEqual(['F#', 'A#', 'C#']);
    });

    it('multi pass 11th position', () => {
      expect(getNotes('F#', [4, 7, 10, 14, 21])).toEqual([
        'F#',
        'A#',
        'C#',
        'E',
        'G#',
        'D#',
      ]);
    });
  });

  describe('getChordNotes', () => {
    it('major root', () => {
      expect(getChordNotes('C')).toEqual(['C', 'E', 'G']);
    });

    it('double-sharp root', () => {
      expect(getChordNotes('A#')).toEqual(['A#', 'C##', 'E#']);
    });

    it('flat root', () => {
      expect(getChordNotes('Eb')).toEqual(['Eb', 'G', 'Bb']);
    });

    it('extension chord', () => {
      expect(getChordNotes('Fmaj7#11')).toEqual(['F', 'A', 'C', 'E', 'B']);
    });

    it('use alias', () => {
      expect(getChordNotes('G+')).toEqual(['G', 'B', 'D#']);
    });

    it('deal with Fb', () => {
      expect(getChordNotes('Gb7#9')).toEqual(['Gb', 'Bb', 'Db', 'Fb', 'A']);
    });

    // Level 4: double-sharp-biased roots
    it('D# major', () => {
      expect(getChordNotes('D#')).toEqual(['D#', 'F##', 'A#']);
    });

    // Level 3: sharp-biased roots
    it('F# major 7', () => {
      expect(getChordNotes('F#maj7')).toEqual(['F#', 'A#', 'C#', 'E#']);
    });

    it('C# major 7', () => {
      expect(getChordNotes('C#maj7')).toEqual(['C#', 'E#', 'G#', 'B#']);
    });

    it('G# major', () => {
      expect(getChordNotes('G#')).toEqual(['G#', 'B#', 'D#']);
    });

    // Level 1: flat-biased — latent Cbsus4 bug fix
    it('Gb sus4', () => {
      expect(getChordNotes('Gbsus4')).toEqual(['Gb', 'Cb', 'Db']);
    });

    // Level 0: double-flat-biased roots
    it('Cb major', () => {
      expect(getChordNotes('Cb')).toEqual(['Cb', 'Eb', 'Gb']);
    });

    it('Cb7', () => {
      expect(getChordNotes('Cb7')).toEqual(['Cb', 'Eb', 'Gb', 'Bbb']);
    });

    it('Cb minor', () => {
      expect(getChordNotes('Cbmin')).toEqual(['Cb', 'Ebb', 'Gb']);
    });
  });

  describe('extrapolateYCoordinate', () => {
    const trebleTable = generateYCoordinates('C6', 'C4');
    const c4 = trebleTable.C4 ?? 0;
    const d4 = trebleTable.D4 ?? 0;
    const c6 = trebleTable.C6 ?? 0;
    // One diatonic step's worth of Y — C4 and D4 are truly adjacent (unlike
    // B4/C4, which are 6 steps apart despite the similar-looking octave
    // labels, since the octave number increments at C).
    const stepIncrement = c4 - d4;

    it("extrapolates below the table's lowest entry, continuing the same diatonic step increment", () => {
      expect(extrapolateYCoordinate('B', 3, trebleTable)).toBe(
        c4 + stepIncrement
      );
      expect(extrapolateYCoordinate('A', 3, trebleTable)).toBe(
        c4 + stepIncrement * 2
      );
      expect(extrapolateYCoordinate('G', 3, trebleTable)).toBe(
        c4 + stepIncrement * 3
      );
    });

    it("extrapolates above the table's highest entry, continuing the same diatonic step increment", () => {
      expect(extrapolateYCoordinate('D', 6, trebleTable)).toBe(
        c6 - stepIncrement
      );
    });

    it('does not alter any existing entry in the table passed in', () => {
      const before = { ...trebleTable };
      extrapolateYCoordinate('B', 3, trebleTable);
      expect(trebleTable).toEqual(before);
    });

    it('returns 0 for an empty table', () => {
      expect(extrapolateYCoordinate('C', 4, {})).toBe(0);
    });
  });
});

import { getChordNotes, getNotes } from './theoryHelpers';

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

    it('sharp root', () => {
      expect(getChordNotes('A#')).toEqual(['A#', 'D', 'F']);
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

    it.skip('deal with Fb', () => {
      // expect(getChordNotes('Gb7#9')).toEqual(['Gb', 'Bb', 'Db', 'E', 'A']);
      /**
       * TODO: figure out how to deal with stuff like this
       * The Gb minor scale and its notes are:
      Gb - Ab - Bbb - Cb - Db - Ebb - Fb - Gb */
      expect(getChordNotes('Gb7#9')).toEqual(['Gb', 'Bb', 'Db', 'Fb', 'A']);
    });
  });
});

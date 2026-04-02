import { StaffClassicalElementBase } from '../staffClassicalBase';
import type { KeySignatureYCoordinates, YCoordinates } from '../types/elements';
import { LetterOctave, Octave } from '../types/theory';
import { createTrebleClefSvg } from '../utils/svgCreator/clefs';
import { generateYCoordinates } from '../utils/theoryHelpers';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class StaffTrebleElement extends StaffClassicalElementBase {
    static #trebleClefSvg = createTrebleClefSvg();
    static #yCoordinates = generateYCoordinates('C6', 'C4');
    static #sharps: LetterOctave[] = ['F5', 'C5', 'G5', 'D5', 'A4', 'E5', 'B4'];
    static #majorSharpYCoordinates: KeySignatureYCoordinates = {
      G: StaffTrebleElement.#sharps
        .filter((_, i) => i < 1)
        .map((note) => StaffTrebleElement.#yCoordinates[note])
        .filter((y): y is number => y !== undefined),
      D: StaffTrebleElement.#sharps
        .filter((_, i) => i < 2)
        .map((note) => StaffTrebleElement.#yCoordinates[note])
        .filter((y): y is number => y !== undefined),
      A: StaffTrebleElement.#sharps
        .filter((_, i) => i < 3)
        .map((note) => StaffTrebleElement.#yCoordinates[note])
        .filter((y): y is number => y !== undefined),
      E: StaffTrebleElement.#sharps
        .filter((_, i) => i < 4)
        .map((note) => StaffTrebleElement.#yCoordinates[note])
        .filter((y): y is number => y !== undefined),
      B: StaffTrebleElement.#sharps
        .filter((_, i) => i < 5)
        .map((note) => StaffTrebleElement.#yCoordinates[note])
        .filter((y): y is number => y !== undefined),
      ['F#']: StaffTrebleElement.#sharps
        .filter((_, i) => i < 6)
        .map((note) => StaffTrebleElement.#yCoordinates[note])
        .filter((y): y is number => y !== undefined),
      ['C#']: StaffTrebleElement.#sharps
        .filter((_, i) => i < 7)
        .map((note) => StaffTrebleElement.#yCoordinates[note])
        .filter((y): y is number => y !== undefined),
    };
    static #minorSharpYCoordinates: KeySignatureYCoordinates = {
      E: StaffTrebleElement.#majorSharpYCoordinates.G,
      B: StaffTrebleElement.#majorSharpYCoordinates.D,
      ['F#']: StaffTrebleElement.#majorSharpYCoordinates.A,
      ['C#']: StaffTrebleElement.#majorSharpYCoordinates.E,
      ['G#']: StaffTrebleElement.#majorSharpYCoordinates.B,
      ['D#']: StaffTrebleElement.#majorSharpYCoordinates['F#'],
      ['A#']: StaffTrebleElement.#majorSharpYCoordinates['C#'],
    };
    static #flats: LetterOctave[] = ['B4', 'E5', 'A4', 'D5', 'G4', 'C5', 'F4'];
    static #majorFlatYCoordinates: KeySignatureYCoordinates = {
      F: StaffTrebleElement.#flats
        .filter((_, i) => i < 1)
        .map((note) => StaffTrebleElement.#yCoordinates[note])
        .filter((y): y is number => y !== undefined),
      Bb: StaffTrebleElement.#flats
        .filter((_, i) => i < 2)
        .map((note) => StaffTrebleElement.#yCoordinates[note])
        .filter((y): y is number => y !== undefined),
      Eb: StaffTrebleElement.#flats
        .filter((_, i) => i < 3)
        .map((note) => StaffTrebleElement.#yCoordinates[note])
        .filter((y): y is number => y !== undefined),
      Ab: StaffTrebleElement.#flats
        .filter((_, i) => i < 4)
        .map((note) => StaffTrebleElement.#yCoordinates[note])
        .filter((y): y is number => y !== undefined),
      Db: StaffTrebleElement.#flats
        .filter((_, i) => i < 5)
        .map((note) => StaffTrebleElement.#yCoordinates[note])
        .filter((y): y is number => y !== undefined),
      Gb: StaffTrebleElement.#flats
        .filter((_, i) => i < 6)
        .map((note) => StaffTrebleElement.#yCoordinates[note])
        .filter((y): y is number => y !== undefined),
      Cb: StaffTrebleElement.#flats
        .filter((_, i) => i < 7)
        .map((note) => StaffTrebleElement.#yCoordinates[note])
        .filter((y): y is number => y !== undefined),
    };
    static #minorFlatYCoordinates: KeySignatureYCoordinates = {
      D: StaffTrebleElement.#majorFlatYCoordinates.F,
      G: StaffTrebleElement.#majorFlatYCoordinates.Bb,
      C: StaffTrebleElement.#majorFlatYCoordinates.Eb,
      F: StaffTrebleElement.#majorFlatYCoordinates.Ab,
      Bb: StaffTrebleElement.#majorFlatYCoordinates.Db,
      Eb: StaffTrebleElement.#majorFlatYCoordinates.Gb,
      Ab: StaffTrebleElement.#majorFlatYCoordinates.Cb,
    };

    get yCoordinates(): YCoordinates {
      return StaffTrebleElement.#yCoordinates;
    }

    get octaves(): Octave[] {
      return [4, 5, 6];
    }

    public getKeyYCoordinates(): { useSharps: boolean; coordinates: number[] } {
      const _key = this.keySig;
      const answer: { useSharps: boolean; coordinates: number[] } = {
        useSharps: false,
        coordinates: [],
      };
      if (this.mode === 'major') {
        answer.useSharps = !!StaffTrebleElement.#majorSharpYCoordinates[_key];
        answer.coordinates =
          StaffTrebleElement.#majorSharpYCoordinates[_key] ??
          StaffTrebleElement.#majorFlatYCoordinates[_key] ??
          [];
      } else {
        answer.useSharps = !!StaffTrebleElement.#minorSharpYCoordinates[_key];
        answer.coordinates =
          StaffTrebleElement.#minorSharpYCoordinates[_key] ??
          StaffTrebleElement.#minorFlatYCoordinates[_key] ??
          [];
      }
      return answer;
    }

    protected get clefSvg() {
      return StaffTrebleElement.#trebleClefSvg;
    }
  }

  if (!customElements.get('music-staff-treble')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the Base-Element has runtime typing
    customElements.define('music-staff-treble', StaffTrebleElement as any);
  }
}

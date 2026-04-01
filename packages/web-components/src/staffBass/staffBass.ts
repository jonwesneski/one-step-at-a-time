import { StaffClassicalElementBase } from '../staffClassicalBase';
import { YCoordinates } from '../types/elements';
import { LetterOctave, Octave } from '../types/theory';
import { createBassClefSvg } from '../utils/svgCreator/clefs';
import { generateYCoordinates } from '../utils/theoryHelpers';
if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class StaffBassElement extends StaffClassicalElementBase {
    static #bassClefSvg = createBassClefSvg();
    static #yCoordinates = generateYCoordinates('E4', 'E2');
    static #sharps: LetterOctave[] = ['F3', 'C3', 'G3', 'D3', 'A2', 'E3', 'B2'];
    static #majorSharpYCoordinates = {
      G: StaffBassElement.#sharps
        .filter((_, i) => i < 1)
        .map((note) => StaffBassElement.#yCoordinates[note]),
      D: StaffBassElement.#sharps
        .filter((_, i) => i < 2)
        .map((note) => StaffBassElement.#yCoordinates[note]),
      A: StaffBassElement.#sharps
        .filter((_, i) => i < 3)
        .map((note) => StaffBassElement.#yCoordinates[note]),
      E: StaffBassElement.#sharps
        .filter((_, i) => i < 4)
        .map((note) => StaffBassElement.#yCoordinates[note]),
      B: StaffBassElement.#sharps
        .filter((_, i) => i < 5)
        .map((note) => StaffBassElement.#yCoordinates[note]),
      ['F#']: StaffBassElement.#sharps
        .filter((_, i) => i < 6)
        .map((note) => StaffBassElement.#yCoordinates[note]),
      ['C#']: StaffBassElement.#sharps
        .filter((_, i) => i < 7)
        .map((note) => StaffBassElement.#yCoordinates[note]),
    };
    static #minorSharpYCoordinates = {
      E: StaffBassElement.#majorSharpYCoordinates.G,
      B: StaffBassElement.#majorSharpYCoordinates.D,
      ['F#']: StaffBassElement.#majorSharpYCoordinates.A,
      ['C#']: StaffBassElement.#majorSharpYCoordinates.E,
      ['G#']: StaffBassElement.#majorSharpYCoordinates.B,
      ['D#']: StaffBassElement.#majorSharpYCoordinates['F#'],
      ['A#']: StaffBassElement.#majorSharpYCoordinates['C#'],
    };
    static #flats: LetterOctave[] = ['B2', 'E3', 'A2', 'D3', 'G2', 'C3', 'F2'];
    static #majorFlatYCoordinates = {
      F: StaffBassElement.#flats
        .filter((_, i) => i < 1)
        .map((note) => StaffBassElement.#yCoordinates[note]),
      Bb: StaffBassElement.#flats
        .filter((_, i) => i < 2)
        .map((note) => StaffBassElement.#yCoordinates[note]),
      Eb: StaffBassElement.#flats
        .filter((_, i) => i < 3)
        .map((note) => StaffBassElement.#yCoordinates[note]),
      Ab: StaffBassElement.#flats
        .filter((_, i) => i < 4)
        .map((note) => StaffBassElement.#yCoordinates[note]),
      Db: StaffBassElement.#flats
        .filter((_, i) => i < 5)
        .map((note) => StaffBassElement.#yCoordinates[note]),
      Gb: StaffBassElement.#flats
        .filter((_, i) => i < 6)
        .map((note) => StaffBassElement.#yCoordinates[note]),
      Cb: StaffBassElement.#flats
        .filter((_, i) => i < 7)
        .map((note) => StaffBassElement.#yCoordinates[note]),
    };
    static #minorFlatYCoordinates = {
      D: StaffBassElement.#majorFlatYCoordinates.F,
      G: StaffBassElement.#majorFlatYCoordinates.Bb,
      C: StaffBassElement.#majorFlatYCoordinates.Eb,
      F: StaffBassElement.#majorFlatYCoordinates.Ab,
      Bb: StaffBassElement.#majorFlatYCoordinates.Db,
      Eb: StaffBassElement.#majorFlatYCoordinates.Gb,
      Ab: StaffBassElement.#majorFlatYCoordinates.Cb,
    };

    protected get clefSvg() {
      return StaffBassElement.#bassClefSvg;
    }

    get yCoordinates(): YCoordinates {
      return StaffBassElement.#yCoordinates;
    }

    get octaves(): Octave[] {
      return [2, 3, 4];
    }

    public getKeyYCoordinates(): { useSharps: boolean; coordinates: number[] } {
      // todo: remove 'as never' and then address typing error
      const _key = this.keySig as never;

      const answer: { useSharps: boolean; coordinates: number[] } = {
        useSharps: false,
        coordinates: [],
      };
      if (this.mode === 'major') {
        answer.useSharps = !!StaffBassElement.#majorSharpYCoordinates[_key];
        answer.coordinates =
          StaffBassElement.#majorSharpYCoordinates[_key] ??
          StaffBassElement.#majorFlatYCoordinates[_key] ??
          [];
      } else {
        answer.useSharps = !!StaffBassElement.#minorSharpYCoordinates[_key];
        answer.coordinates =
          StaffBassElement.#minorSharpYCoordinates[_key] ??
          StaffBassElement.#minorFlatYCoordinates[_key] ??
          [];
      }
      return answer;
    }
  }

  if (!customElements.get('music-staff-bass')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the Base-Element has runtime typing
    customElements.define('music-staff-bass', StaffBassElement as any);
  }
}

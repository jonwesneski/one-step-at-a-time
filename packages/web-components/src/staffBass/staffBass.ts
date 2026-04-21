import { StaffClassicalElementBase } from '@/src/staffClassicalBase';
import type {
  KeySignatureYCoordinates,
  YCoordinates,
} from '@/src/types/elements';
import { LetterOctave, Octave } from '@/src/types/theory';
import { createBassClefSvg } from '@/src/utils/svgCreator/clefs';
import {
  generateKeySignatureYCoordinates,
  generateYCoordinates,
} from '@/src/utils/theoryHelpers';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class StaffBassElement extends StaffClassicalElementBase {
    static #bassClefSvg = createBassClefSvg();
    static #yCoordinates = generateYCoordinates('E4', 'E2');
    static #sharps: LetterOctave[] = ['F3', 'C3', 'G3', 'D3', 'A2', 'E3', 'B2'];
    static #majorSharpYCoordinates: KeySignatureYCoordinates =
      generateKeySignatureYCoordinates(
        {
          G: 1,
          D: 2,
          A: 3,
          E: 4,
          B: 5,
          'F#': 6,
          'C#': 7,
        },
        StaffBassElement.#sharps,
        StaffBassElement.#yCoordinates
      );
    static #minorSharpYCoordinates: KeySignatureYCoordinates = {
      E: StaffBassElement.#majorSharpYCoordinates.G,
      B: StaffBassElement.#majorSharpYCoordinates.D,
      ['F#']: StaffBassElement.#majorSharpYCoordinates.A,
      ['C#']: StaffBassElement.#majorSharpYCoordinates.E,
      ['G#']: StaffBassElement.#majorSharpYCoordinates.B,
      ['D#']: StaffBassElement.#majorSharpYCoordinates['F#'],
      ['A#']: StaffBassElement.#majorSharpYCoordinates['C#'],
    };
    static #flats: LetterOctave[] = ['B2', 'E3', 'A2', 'D3', 'G2', 'C3', 'F2'];
    static #majorFlatYCoordinates: KeySignatureYCoordinates =
      generateKeySignatureYCoordinates(
        { F: 1, Bb: 2, Eb: 3, Ab: 4, Db: 5, Gb: 6, Cb: 7 },
        StaffBassElement.#flats,
        StaffBassElement.#yCoordinates
      );
    static #minorFlatYCoordinates: KeySignatureYCoordinates = {
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
      const _key = this.keySig;

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

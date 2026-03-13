import { StaffClassicalElementBase } from './staffClassicalBase';
import { YCoordinates } from './types/elements';
import { Octave } from './types/theory';
if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class StaffTrebleElement extends StaffClassicalElementBase {
    static #trebleClefSvg = `
      <svg x="0" y="24" width="30px" height="60px">
        <svg class="clef" version="1.1" xmlns="www.w3.org" viewBox="150 0 165.4 496.2" stroke="currentColor" preserveAspectRatio="xMidYMid meet">
            <path style="fill:currentColor" d="M263.3,240.3c-2.3-12.6-3.4-26.3-5.6-39.1c19.4-19.5,42-45.4,44.4-86.7c0.8-14.2-2.1-26.1-5.6-39.1 c-2.4-9-8.8-33.1-18.4-29.2c-33.6,13.7-41.5,80-32,122.1c-23.2,23.9-62.4,47.9-68.3,94.3c-3.1,24.4,4.7,45.9,15.8,61.6 c14.3,20.3,41.9,38.5,76.9,30.5c4.3,29.3,15.2,72.4-13.2,84.7c-10.4,4.5-33.8,4.9-36.1-8.5c31.3,4.9,31.2-39,9-44.2 c-18.4-4.4-29.4,13.6-30.2,25.5c-1.5,22.3,19.6,38.4,42.8,37.9c24.9-0.5,42.5-15.7,41.8-47.1c-0.4-17.4-5.5-30.9-6.3-50.8 c20.1-9.6,38.1-23.4,40.5-50.8C321.6,268.8,301.2,238.2,263.3,240.3z M268.8,87c9-8.7,24.2-7.8,24.9,8.3 c0.7,15.6-7.4,29.5-14.9,40.3c-7.8,11.2-16,20.9-26.2,26.8C246.9,138,254.5,101,268.8,87z M193,287.6c1.2-20.7,10.8-35.8,21-48 c11-13.2,24.3-23.3,36.8-33.2c2.2,11.2,3.3,23.5,4.8,35.4c-16.9,7.5-36,20.8-35.2,48.1c0.3,9.4,4.2,18.5,9.5,25.6 c4.9,6.4,12.3,14.3,21,13.1c-0.4-5.3-6.8-6.6-10-9.8c-16.1-15.5-4-47.5,18.6-50.2c3.1,26.5,6.8,52.3,10.1,78.6 C221.5,354.5,190.7,324.5,193,287.6z M276.8,344.6c-2.7-26.1-7.2-50.7-9.7-77c9.7,1.2,18,4.8,23.8,10.2 C310.9,296.6,302.6,337.8,276.8,344.6z"></path>
        </svg>
      </svg>
    `;
    static #yCoordinates: { [x in string]: number } = {
      // Above 1st line
      C6: 10,
      B5: 15,
      A5: 20,
      G5: 25,

      // 1st line
      F5: 30,
      E5: 35,
      D5: 40,
      C5: 45,
      B4: 50,
      A4: 55,
      G4: 60,
      F4: 65,
      E4: 70,

      // Below last line
      D4: 75,
      C4: 80,
      // B3: 65,
      // A3: 70,
      // G3: 75,
      // F3: 80,
      // E3: 85,
      // D3: 90,
    };
    static #sharps = ['F5', 'C5', 'G5', 'D5', 'A4', 'E5', 'B4'];
    static #majorSharpYCoordinates = {
      G: StaffTrebleElement.#sharps
        .filter((_, i) => i < 1)
        .map((note) => StaffTrebleElement.#yCoordinates[note]),
      D: StaffTrebleElement.#sharps
        .filter((_, i) => i < 2)
        .map((note) => StaffTrebleElement.#yCoordinates[note]),
      A: StaffTrebleElement.#sharps
        .filter((_, i) => i < 3)
        .map((note) => StaffTrebleElement.#yCoordinates[note]),
      E: StaffTrebleElement.#sharps
        .filter((_, i) => i < 4)
        .map((note) => StaffTrebleElement.#yCoordinates[note]),
      B: StaffTrebleElement.#sharps
        .filter((_, i) => i < 5)
        .map((note) => StaffTrebleElement.#yCoordinates[note]),
      ['F#']: StaffTrebleElement.#sharps
        .filter((_, i) => i < 6)
        .map((note) => StaffTrebleElement.#yCoordinates[note]),
      ['C#']: StaffTrebleElement.#sharps
        .filter((_, i) => i < 7)
        .map((note) => StaffTrebleElement.#yCoordinates[note]),
    };
    static #minorSharpYCoordinates = {
      E: StaffTrebleElement.#majorSharpYCoordinates.G,
      B: StaffTrebleElement.#majorSharpYCoordinates.D,
      ['F#']: StaffTrebleElement.#majorSharpYCoordinates.A,
      ['C#']: StaffTrebleElement.#majorSharpYCoordinates.E,
      ['G#']: StaffTrebleElement.#majorSharpYCoordinates.B,
      ['D#']: StaffTrebleElement.#majorSharpYCoordinates['F#'],
      ['A#']: StaffTrebleElement.#majorSharpYCoordinates['C#'],
    };
    static #flats = ['B4', 'E5', 'A4', 'D5', 'G4', 'C5', 'F4'];
    static #majorFlatYCoordinates = {
      F: StaffTrebleElement.#flats
        .filter((_, i) => i < 1)
        .map((note) => StaffTrebleElement.#yCoordinates[note]),
      Bb: StaffTrebleElement.#flats
        .filter((_, i) => i < 2)
        .map((note) => StaffTrebleElement.#yCoordinates[note]),
      Eb: StaffTrebleElement.#flats
        .filter((_, i) => i < 3)
        .map((note) => StaffTrebleElement.#yCoordinates[note]),
      Ab: StaffTrebleElement.#flats
        .filter((_, i) => i < 4)
        .map((note) => StaffTrebleElement.#yCoordinates[note]),
      Db: StaffTrebleElement.#flats
        .filter((_, i) => i < 5)
        .map((note) => StaffTrebleElement.#yCoordinates[note]),
      Gb: StaffTrebleElement.#flats
        .filter((_, i) => i < 6)
        .map((note) => StaffTrebleElement.#yCoordinates[note]),
      Cb: StaffTrebleElement.#flats
        .filter((_, i) => i < 7)
        .map((note) => StaffTrebleElement.#yCoordinates[note]),
    };
    static #minorFlatYCoordinates = {
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
      const _key = this.keySig as never;
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

    protected render(): void {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- contructor creates it
      this.shadowRoot!.innerHTML = this.build(
        StaffTrebleElement.#trebleClefSvg
      );
    }
  }

  if (!customElements.get('music-staff-treble')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the Base-Element has runtime typing
    customElements.define('music-staff-treble', StaffTrebleElement as any);
  }
}

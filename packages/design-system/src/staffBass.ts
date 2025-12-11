import { StaffElementBase } from './staffBase';
if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class StaffBassElement extends StaffElementBase {
    static #bassClefSvg = `
      <svg class="clef" height="80px" width="80px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:svg="http://www.w3.org/2000/svg" viewBox="0 0 744.09 1052.4" version="1.1">
        <path style="fill:currentColor" d="m190.85 451.25c11.661 14.719 32.323 24.491 55.844 24.491 36.401 0 65.889-23.372 65.889-52.214s-29.488-52.214-65.889-52.214c-20.314 4.1522-28.593 9.0007-33.143-2.9091 17.976-54.327 46.918-66.709 96.546-66.709 65.914 0 96.969 59.897 96.969 142.97-18.225 190.63-205.95 286.75-246.57 316.19 5.6938 13.103 5.3954 12.631 5.3954 12.009 189.78-86.203 330.69-204.43 330.69-320.74 0-92.419-58.579-175.59-187.72-172.8-77.575 0-170.32 86.203-118 171.93zm328.1-89.88c0 17.852 14.471 32.323 32.323 32.323s32.323-14.471 32.323-32.323-14.471-32.323-32.323-32.323-32.323 14.471-32.323 32.323zm0 136.75c0 17.852 14.471 32.323 32.323 32.323s32.323-14.471 32.323-32.323-14.471-32.323-32.323-32.323-32.323 14.471-32.323 32.323z" stroke="currentColor"/>
      </svg>
    `;
    static #bassYCoordinates: { [x in string]: number } = {
      // Above 1st line
      E4: 10,
      D4: 15,
      C4: 20,
      B3: 25,

      // 1st line
      A3: 30,
      G3: 35,
      F3: 40,
      E3: 45,
      D3: 50,
      C3: 55,
      B2: 60,
      A2: 65,
      G2: 70,
      // Below last line
      F2: 75,
      E2: 80,
    };
    // TODO: do I still need this?, figure out once class is more fleshed out
    // #bassMainLines: string[] = ['G', 'E', 'C', 'A', 'F2'];

    // Return the y-coordinate for a given note name (e.g., 'A', 'E', 'C2')
    public getYCoordinate(note: string): number {
      if (!note) {
        return 0;
      }

      const key = note.trim().toUpperCase();
      // direct match
      if (StaffBassElement.#bassYCoordinates[key] !== undefined) {
        return StaffBassElement.#bassYCoordinates[key];
      }

      // try with a suffix like '2' if the user provided octave info loosely
      for (const n of [2, 3, 4]) {
        if (StaffBassElement.#bassYCoordinates[`${key}${n}`] !== undefined) {
          return StaffBassElement.#bassYCoordinates[`${key}${n}`];
        }
      }
      return 0;
    }

    protected render(): void {
      this.shadowRoot!.innerHTML = this.build(StaffBassElement.#bassClefSvg);
    }
  }

  if (!customElements.get('music-staff-bass')) {
    customElements.define('music-staff-bass', StaffBassElement as any);
  }
}

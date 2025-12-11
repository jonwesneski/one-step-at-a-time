import { StaffElementBase } from './staffBase';
if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class StaffTrebleElement extends StaffElementBase {
    static #trebleClefSvg = `
      <svg height="60px" width="30px" version="1.1" xmlns="www.w3.org" xmlns:xlink="www.w3.org" viewBox="150 0 165.4 496.2" xml:space="preserve" stroke="currentColor">
        <path style="fill:currentColor" d="M263.3,240.3c-2.3-12.6-3.4-26.3-5.6-39.1c19.4-19.5,42-45.4,44.4-86.7c0.8-14.2-2.1-26.1-5.6-39.1 c-2.4-9-8.8-33.1-18.4-29.2c-33.6,13.7-41.5,80-32,122.1c-23.2,23.9-62.4,47.9-68.3,94.3c-3.1,24.4,4.7,45.9,15.8,61.6 c14.3,20.3,41.9,38.5,76.9,30.5c4.3,29.3,15.2,72.4-13.2,84.7c-10.4,4.5-33.8,4.9-36.1-8.5c31.3,4.9,31.2-39,9-44.2 c-18.4-4.4-29.4,13.6-30.2,25.5c-1.5,22.3,19.6,38.4,42.8,37.9c24.9-0.5,42.5-15.7,41.8-47.1c-0.4-17.4-5.5-30.9-6.3-50.8 c20.1-9.6,38.1-23.4,40.5-50.8C321.6,268.8,301.2,238.2,263.3,240.3z M268.8,87c9-8.7,24.2-7.8,24.9,8.3 c0.7,15.6-7.4,29.5-14.9,40.3c-7.8,11.2-16,20.9-26.2,26.8C246.9,138,254.5,101,268.8,87z M193,287.6c1.2-20.7,10.8-35.8,21-48 c11-13.2,24.3-23.3,36.8-33.2c2.2,11.2,3.3,23.5,4.8,35.4c-16.9,7.5-36,20.8-35.2,48.1c0.3,9.4,4.2,18.5,9.5,25.6 c4.9,6.4,12.3,14.3,21,13.1c-0.4-5.3-6.8-6.6-10-9.8c-16.1-15.5-4-47.5,18.6-50.2c3.1,26.5,6.8,52.3,10.1,78.6 C221.5,354.5,190.7,324.5,193,287.6z M276.8,344.6c-2.7-26.1-7.2-50.7-9.7-77c9.7,1.2,18,4.8,23.8,10.2 C310.9,296.6,302.6,337.8,276.8,344.6z"></path>
      </svg>
    `;
    #trebleYCoordinates: { [x in string]: number } = {
      F: 10,
      E: 15,
      D: 20,
      C: 25,
      B: 30,
      A: 25, //todo need to update other coordinates
      G: 40,
      F2: 45,
      E2: 50,
      D2: 55,
      C2: 60,
      B2: 65,
      A2: 70,
      G2: 75,
      F3: 80,
      E3: 85,
      D3: 90,
    };
    // TODO: do I still need this?, figure out once class is more fleshed out
    // #trebleMainLines: string[] = ['F', 'D', 'B', 'G', 'E2'];

    // Return the y-coordinate for a given note name (e.g., 'A', 'E', 'C2')
    public getYCoordinate(note: string): number {
      if (!note) {
        return 0;
      }

      const key = note.trim().toUpperCase();
      // direct match
      if (this.#trebleYCoordinates[key] !== undefined) {
        return this.#trebleYCoordinates[key];
      }
      // try with a suffix like '2' if the user provided octave info loosely
      if (this.#trebleYCoordinates[`${key}2`] !== undefined) {
        return this.#trebleYCoordinates[`${key}2`];
      }
      return 0;
    }

    protected render(): void {
      this.shadowRoot!.innerHTML = this.build(
        StaffTrebleElement.#trebleClefSvg
      );
    }
  }

  if (!customElements.get('music-staff-treble')) {
    customElements.define('music-staff-treble', StaffTrebleElement as any);
  }
}

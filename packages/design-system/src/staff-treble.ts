if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class StaffTrebleElement extends HTMLElement {
    #trebleYCoordinates: { [x in string]: number } = {
      F: 10,
      E: 15,
      D: 20,
      C: 25,
      B: 30,
      A: 35,
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
    #trebleMainLines: string[] = ['F', 'D', 'B', 'G', 'E2'];
    static get observedAttributes(): string[] {
      return [];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

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

    connectedCallback(): void {
      this.render();
    }

    attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null
    ): void {
      if (oldValue !== newValue) {
        this.render();
      }
    }

    private render(): void {
      // Build horizontal staff lines
      // from top to bottom
      const staffLines = ['<g>'];
      for (const key of this.#trebleMainLines) {
        const y = this.#trebleYCoordinates[key];
        staffLines.push(`
          <line
            x1="0"
            y1="${y}"
            x2="200"
            y2="${y}"
            stroke="blue"
            stroke-width="2"
          />
        `);
      }
      staffLines.push('</g>');

      this.shadowRoot!.innerHTML = `
        <div style="position: relative; width: 33.333333%; min-width: 300px; height: 100px;">
          <svg
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
            height="100"
            viewBox="0 0 200 100"
            preserveAspectRatio="none"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="100"
              stroke="blue"
              stroke-width="1"
            />
            ${staffLines.join('')}
            <line
              x1="200"
              y1="0"
              x2="200"
              y2="100"
              stroke="blue"
              stroke-width="1"
            />
          </svg>
          <div id="children-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"><slot></slot></div>
        </div>
      `;
    }
  }

  if (!customElements.get('music-staff-treble')) {
    customElements.define('music-staff-treble', StaffTrebleElement);
  }
}

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class StaffGuitarTabElement extends HTMLElement {
    static #tabSvg = `
      <svg height="80px" width="80px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:svg="http://www.w3.org/2000/svg" version="1.1">
        <text x="40" font-size="20" text-anchor="middle" fill="currentColor" font-weight="bold">
            <tspan x="20" dy="20">T</tspan>
            <tspan x="20" dy="20">A</tspan>
            <tspan x="18" dy="20">B</tspan>
        </text>
      </svg>
    `;
    #linesY: number[] = [10, 20, 30, 40, 50, 60];

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    // TODO: figure out y-coordinates for guitar tab notation
    public getYCoordinate(note: string): number {
      if (!note) {
        return 0;
      }

      return 0;
    }

    connectedCallback(): void {
      this.render();
    }

    disconnectedCallback(): void {}

    attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null
    ): void {
      if (oldValue !== newValue) {
        this.render();
      }
    }

    protected render(): void {
      // Build horizontal staff lines
      // from top to bottom
      const staffLines = ['<g>'];
      for (const y of this.#linesY) {
        staffLines.push(`
          <line
            x1="0"
            y1="${y}"
            x2="200"
            y2="${y}"
            stroke="currentColor"
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
              stroke="currentColor"
              stroke-width="1"
            />
            ${StaffGuitarTabElement.#tabSvg}
            ${staffLines.join('')}
            <line
              x1="200"
              y1="0"
              x2="200"
              y2="100"
              stroke="currentColor"
              stroke-width="1"
            />
          </svg>
          <div id="children-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"><slot></slot></div>
        </div>
      `;
    }
  }

  if (!customElements.get('music-staff-guitar-tab')) {
    customElements.define(
      'music-staff-guitar-tab',
      StaffGuitarTabElement as any
    );
  }
}

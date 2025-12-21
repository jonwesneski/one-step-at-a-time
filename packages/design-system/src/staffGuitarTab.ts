import { SVG_NS } from './utils';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class StaffGuitarTabElement extends HTMLElement {
    static #tabSvg = `
      <svg class="clef" height="80px" width="80px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:svg="http://www.w3.org/2000/svg" version="1.1">
        <text x="40" font-size="20" text-anchor="middle" fill="currentColor" font-weight="bold">
            <tspan x="20" dy="20">T</tspan>
            <tspan x="20" dy="20">A</tspan>
            <tspan x="18" dy="20">B</tspan>
        </text>
      </svg>
    `;
    protected static lineStart = 10;
    protected static lineSpacing = 10;
    protected static linesY: number[] = Array.from(
      { length: 6 },
      (_, i) =>
        StaffGuitarTabElement.lineStart + i * StaffGuitarTabElement.lineSpacing
    );

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
      const staffLines = this.#buildStaffLines();
      const transribe = this.#buildTranscribe();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- contructor creates it
      this.shadowRoot!.innerHTML = `
        <style>
      :host {
          flex: var(--flex-staff-basis, 1 1 280px);
          min-width: var(--flex-staff-minw, 280px);
          box-sizing: border-box;
          display: block;
        }

        .staff-wrapper {
          position: relative;
          min-height: 100px;
        }

        .staff-container {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
        }
      </style>
      <div class="staff-wrapper">
        ${staffLines.outerHTML}
        ${transribe.outerHTML}
        <slot></slot>
      </div>
      `;
    }

    #buildStaffLines() {
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('class', 'staff-container');
      svg.setAttribute(
        'style',
        'position: absolute; inset: 0; width: 100%; height: 100px; display: block;'
      );
      svg.setAttribute('viewBox', '0 0 200 100');
      svg.setAttribute('preserveAspectRatio', 'none');

      // Left/Opening vertical line
      const leftLine = document.createElementNS(SVG_NS, 'line');
      leftLine.setAttribute('x1', '0');
      leftLine.setAttribute('y1', '0');
      leftLine.setAttribute('x2', '0');
      leftLine.setAttribute('y2', '100');
      leftLine.setAttribute('stroke', 'currentColor');
      leftLine.setAttribute('stroke-width', '1');
      svg.appendChild(leftLine);

      // Build horizontal staff lines
      // from top to bottom
      const gLines = document.createElementNS(SVG_NS, 'g');
      gLines.setAttribute('class', 'staff-lines');
      for (const y of StaffGuitarTabElement.linesY) {
        const lineSvg = document.createElementNS(SVG_NS, 'line');
        lineSvg.setAttribute('x1', '0');
        lineSvg.setAttribute('y1', y.toString());
        lineSvg.setAttribute('x2', '200');
        lineSvg.setAttribute('y2', y.toString());
        lineSvg.setAttribute('stroke', 'currentColor');
        lineSvg.setAttribute('stroke-width', '2');
        gLines.appendChild(lineSvg);
      }
      svg.appendChild(gLines);

      // Right/Closing vertical line
      const rightLine = document.createElementNS(SVG_NS, 'line');
      rightLine.setAttribute('x1', '200');
      rightLine.setAttribute('y1', '0');
      rightLine.setAttribute('x2', '200');
      rightLine.setAttribute('y2', '100');
      rightLine.setAttribute('stroke', 'currentColor');
      rightLine.setAttribute('stroke-width', '1');
      svg.appendChild(rightLine);
      return svg;
    }

    // Transcribe is: TAB and notes
    #buildTranscribe() {
      const transcribe = document.createElementNS(SVG_NS, 'svg');
      transcribe.setAttribute('class', 'transcribe-container');
      transcribe.setAttribute(
        'style',
        'position: absolute; inset: 0; width: 100%; height: 100px; pointer-events: none'
      );

      const gDescribe = document.createElementNS(SVG_NS, 'g');
      gDescribe.setAttribute('class', 'describe-container');
      gDescribe.innerHTML = StaffGuitarTabElement.#tabSvg;
      transcribe.appendChild(gDescribe);

      // Notes are added here at runtime
      const gNotes = document.createElementNS(SVG_NS, 'g');
      gNotes.setAttribute('class', 'notes-container');
      transcribe.appendChild(gNotes);

      return transcribe;
    }
  }

  if (!customElements.get('music-staff-guitar-tab')) {
    customElements.define('music-staff-guitar-tab', StaffGuitarTabElement);
  }
}

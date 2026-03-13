import { StaffElementBase } from './staffBase';
import { SVG_NS } from './utils';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class StaffGuitarTabElement extends StaffElementBase {
    static #tabSvg = `
      <svg class="clef" height="80px" width="80px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:svg="http://www.w3.org/2000/svg" version="1.1">
        <text x="40" font-size="20" text-anchor="middle" fill="currentColor" font-weight="bold">
            <tspan x="20" dy="20">T</tspan>
            <tspan x="20" dy="20">A</tspan>
            <tspan x="18" dy="20">B</tspan>
        </text>
      </svg>
    `;
    protected override get staffLineCount(): number {
      return 6;
    }

    static get observedAttributes(): string[] {
      return [];
    }

    // TODO: figure out y-coordinates for guitar tab notation
    public getYCoordinate(note: string): number {
      if (!note) {
        return 0;
      }

      return 0;
    }

    protected render(): void {
      const staffHeight =
        (this.staffLineCount - 1) * this.staffLineSpacing;
      const transcribe = this.#buildTranscribe();

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
            left: 0;
            right: 0;
            height: ${staffHeight}px;
            display: block;
            border-top: 1px solid currentColor;
            border-right: 1px solid currentColor;
            border-bottom: 1px solid currentColor;
            border-left: 1px solid currentColor;
            margin-top: ${this.staffLineStart}px;
          }

          .staff-line {
            position: absolute;
            left: 0;
            right: 0;
            height: 0.5px;
            background: currentColor;
          }
        </style>
        <div class="staff-wrapper">
          ${transcribe.outerHTML}
          <slot></slot>
        </div>
      `;

      const wrapper = this.shadowRoot!.querySelector('.staff-wrapper')!;
      this.buildStaffLines(this.staffContainer);
      wrapper.prepend(this.staffContainer);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the Base-Element has runtime typing
    customElements.define('music-staff-guitar-tab', StaffGuitarTabElement as any);
  }
}

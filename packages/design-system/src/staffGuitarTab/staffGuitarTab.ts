import { StaffElementBase } from '../staffBase';
import { SVG_NS } from '../utils';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class StaffGuitarTabElement extends StaffElementBase {
    static #tabSvg = `
      <svg class="clef" y="20" height="80px" width="80px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:svg="http://www.w3.org/2000/svg" version="1.1">
        <text x="40" font-size="20" text-anchor="middle" fill="currentColor" font-weight="bold">
            <tspan x="20" dy="20">T</tspan>
            <tspan x="20" dy="20">A</tspan>
            <tspan x="18" dy="20">B</tspan>
        </text>
      </svg>
    `;
    #describeContainer: SVGGElement;

    constructor() {
      super();
      // this.#mutationObservers = [];

      // const measure = this.closest('music-measure');
      // const composition = this.closest('music-composition');
      // this.#parentTime =
      //   measure?.getAttribute('time') ??
      //   composition?.getAttribute('time') ??
      //   '4/4';
      // const timeTime = this.getAttribute('time');
      // if (timeTime) {
      //   this.#timeInts = this.#convertTotimeInts(timeTime);
      // }

      this.#describeContainer = document.createElementNS(SVG_NS, 'g');
    }

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

    protected onConnectedCallback() {
      this.#describeContainer.setAttribute('class', 'describe-container');
      this.#describeContainer.innerHTML = StaffGuitarTabElement.#tabSvg;
      this.transcribeContainer.appendChild(this.#describeContainer);

      // Notes are added here at runtime
      const gNotes = document.createElementNS(SVG_NS, 'g');
      gNotes.setAttribute('class', 'notes-container');
      this.transcribeContainer.appendChild(gNotes);
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function -- will handle later
    protected override onDisconnectedCallback(): void {}

    // eslint-disable-next-line @typescript-eslint/no-empty-function -- will handle later
    protected override onHandleSlotChange(event: Event): void {}

    // eslint-disable-next-line @typescript-eslint/no-empty-function -- will handle later
    protected override onStaffResize(): void {}
  }

  if (!customElements.get('music-staff-guitar-tab')) {
    customElements.define(
      'music-staff-guitar-tab',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the Base-Element has runtime typing
      StaffGuitarTabElement as any
    );
  }
}

import { StaffElementBase } from '../staffBase';
import { GuitarNoteElementType } from '../types/elements';
import {
  MUSIC_GUITAR_CHORD_NODE,
  MUSIC_GUITAR_NOTE,
  MUSIC_GUITAR_NOTE_NODE,
  MUSIC_STAFF_GUITAR_TAB,
  STAFF_EVENTS,
  SVG_NS,
} from '../utils/consts';
import {
  MIN_NOTE_WIDTH,
  STAFF_LINE_SPACING,
  STAFF_LINE_START,
} from '../utils/notationDimensions';
import { durationToFactor } from '../utils/theoryConsts';

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
    #currentElements: GuitarNoteElementType[] = [];
    #yCoordinates: Record<number, number> = {
      6: STAFF_LINE_START,
      5: STAFF_LINE_START + STAFF_LINE_SPACING,
      4: STAFF_LINE_START + STAFF_LINE_SPACING * 2,
      3: STAFF_LINE_START + STAFF_LINE_SPACING * 3,
      2: STAFF_LINE_START + STAFF_LINE_SPACING * 4,
      1: STAFF_LINE_START + STAFF_LINE_SPACING * 5,
    };

    constructor() {
      super();
      this.#describeContainer = document.createElementNS(SVG_NS, 'g');
    }

    protected override get staffLineCount(): number {
      return 6;
    }

    protected override get additionalStyles(): string {
      return `
        ::slotted(${MUSIC_GUITAR_NOTE}) {
          position: absolute;
        }
      `;
    }

    static get observedAttributes(): string[] {
      return [];
    }

    protected onConnectedCallback() {
      this.#describeContainer.setAttribute('class', 'describe-container');
      this.#describeContainer.innerHTML = StaffGuitarTabElement.#tabSvg;
      this.transcribeContainer.appendChild(this.#describeContainer);
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function -- will handle later
    protected override onDisconnectedCallback(): void {}

    protected override onHandleSlotChange(event: Event): void {
      const slot = event.target as HTMLSlotElement;
      const assignedElements = slot
        .assignedElements({ flatten: true })
        .filter(
          (e) =>
            e.nodeName === MUSIC_GUITAR_NOTE_NODE ||
            e.nodeName === MUSIC_GUITAR_CHORD_NODE
        ) as GuitarNoteElementType[];

      this.#renderNotes(assignedElements);
    }

    #renderNotes(assignedElements: GuitarNoteElementType[]) {
      this.#currentElements = assignedElements;
      this.#spaceElements(assignedElements);
      this.dispatchEvent(
        new CustomEvent(STAFF_EVENTS.NOTES_POSITIONED, {
          bubbles: true,
          composed: true,
        })
      );
    }

    #spaceElements(assignedElements: GuitarNoteElementType[]) {
      const transcribeRect = this.transcribeContainer.getBoundingClientRect();
      const describeRect = this.#describeContainer.getBoundingClientRect();
      const describeEndX = Math.round(describeRect.right - transcribeRect.left);
      const remainingWidth = transcribeRect.width - describeEndX;
      const proportionalWidth =
        remainingWidth - assignedElements.length * MIN_NOTE_WIDTH;

      let beatOffset = 0;
      for (let i = 0; i < assignedElements.length; i++) {
        const element = assignedElements[i];
        const xOffsetInNotesSpace =
          i * MIN_NOTE_WIDTH + beatOffset * proportionalWidth;
        element.style.left = `${describeEndX + xOffsetInNotesSpace}px`;
        element.style.top = `${
          this.#yCoordinates[element.string] ?? STAFF_LINE_START
        }px`;
        beatOffset += durationToFactor[element.duration];
      }
    }

    protected override onStaffResize(): void {
      if (this.#currentElements.length > 0) {
        this.#spaceElements(this.#currentElements);
        this.dispatchEvent(
          new CustomEvent(STAFF_EVENTS.NOTES_POSITIONED, {
            bubbles: true,
            composed: true,
          })
        );
      }
    }
  }

  if (!customElements.get(MUSIC_STAFF_GUITAR_TAB)) {
    customElements.define(
      MUSIC_STAFF_GUITAR_TAB,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the Base-Element has runtime typing
      StaffGuitarTabElement as any
    );
  }
}

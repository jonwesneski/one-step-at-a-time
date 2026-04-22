import {
  ChordNote,
  ConnectorRole,
  IChordElement,
  NoteElementType,
} from '../types/elements';
import { Chord, DurationType } from '../types/theory';
import { createChordSvg } from '../utils';
import {
  CHORD_EVENTS,
  MUSIC_CHORD,
  MUSIC_NOTE,
  NOTE_EVENTS,
} from '../utils/consts';
import { STAFF_TRANSCRIPTION_HEIGHT } from '../utils/notationDimensions';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class ChordElement extends HTMLElement implements IChordElement {
    static get observedAttributes(): string[] {
      return ['currentCount', 'duration', 'tie', 'slur'];
    }

    #stemUp = true;
    #stemExtension = 0;
    #noFlags = false;
    #staffYCoordinates: number[] | null = null;
    #batchDepth = 0;
    #renderPending = false;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    get duration(): DurationType {
      return (this.getAttribute('duration') as DurationType) ?? 'quarter';
    }

    set duration(value: DurationType) {
      this.setAttribute('duration', value);
    }

    get value(): Chord | null {
      return this.getAttribute('value') as Chord | null;
    }

    set value(val: Chord | null) {
      if (val === null) this.removeAttribute('value');
      else this.setAttribute('value', val);
    }

    get notes(): ChordNote[] {
      const noteElements: NodeListOf<NoteElementType> =
        this.querySelectorAll(MUSIC_NOTE);
      const notes: ChordNote[] = [];
      if (noteElements.length) {
        noteElements.forEach((node, i) => {
          if (node.value === 'rest') {
            console.error(
              `Rests are not allowed in chords; note at index ${i} is a rest`
            );
          } else {
            notes.push({ value: node.value, duration: node.duration });
          }
        });
      } else {
        // todo build out notes from value: Chord
        // like if Amaj then notes will be: A, C, E
        // need chord formulas built out first
      }
      return notes;
    }

    get stemUp(): boolean {
      return this.#stemUp;
    }
    set stemUp(v: boolean) {
      this.#stemUp = v;
      this.#scheduleRender();
    }

    get stemExtension(): number {
      return this.#stemExtension;
    }
    set stemExtension(v: number) {
      this.#stemExtension = v;
      this.#scheduleRender();
    }

    get noFlags(): boolean {
      return this.#noFlags;
    }
    set noFlags(v: boolean) {
      this.#noFlags = v;
      this.#scheduleRender();
    }

    get staffYCoordinates(): number[] | null {
      return this.#staffYCoordinates;
    }
    set staffYCoordinates(v: number[] | null) {
      this.#staffYCoordinates = v;
      this.#scheduleRender();
    }

    get tie(): ConnectorRole | null {
      const raw = this.getAttribute('tie');
      if (raw === 'start' || raw === 'end') {
        return raw;
      }
      return null;
    }
    set tie(value: ConnectorRole | null) {
      if (value === null) {
        this.removeAttribute('tie');
      } else {
        this.setAttribute('tie', value);
      }
    }

    get slur(): ConnectorRole | null {
      const raw = this.getAttribute('slur');
      if (raw === 'start' || raw === 'end') {
        return raw;
      }
      return null;
    }
    set slur(value: ConnectorRole | null) {
      if (value === null) {
        this.removeAttribute('slur');
      } else {
        this.setAttribute('slur', value);
      }
    }

    batchUpdate(fn: () => void): void {
      this.#batchDepth++;
      try {
        fn();
      } finally {
        this.#batchDepth--;
        if (this.#batchDepth === 0 && this.#renderPending) {
          this.#renderPending = false;
          this.render();
        }
      }
    }

    #scheduleRender(): void {
      if (this.#batchDepth > 0) {
        this.#renderPending = true;
      } else if (this.shadowRoot) {
        this.render();
      }
    }

    connectedCallback(): void {
      this.render();
    }

    attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null
    ): void {
      if (oldValue === newValue || !this.isConnected) {
        return;
      }

      if (name === 'tie' || name === 'slur') {
        this.dispatchEvent(
          new CustomEvent(NOTE_EVENTS.CONNECTOR_ATTRIBUTE_CHANGE, {
            bubbles: true,
            composed: true,
          })
        );
        return;
      }

      this.render();
    }

    private render(): void {
      if (this.#staffYCoordinates) {
        const [chordSvg] = createChordSvg({
          duration: this.duration,
          staffYCoordinates: this.#staffYCoordinates,
          noFlags: this.#noFlags,
          stemUp: this.#stemUp,
          stemExtension: this.#stemExtension,
          qualifiedElementName: 'g',
        });
        chordSvg.setAttribute('overflow', 'visible');

        // Wrap in an SVG element for display
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- contructor creates it
        this.shadowRoot!.innerHTML = `
          <style>
            :host { display: inline-block; overflow: visible; }
            svg { overflow: visible; }
          </style>
        `;
        const svg = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'svg'
        );
        svg.setAttribute('width', '32');
        svg.setAttribute('height', `${STAFF_TRANSCRIPTION_HEIGHT}`);
        svg.setAttribute('overflow', 'visible');
        svg.appendChild(chordSvg);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- constructor creates it
        this.shadowRoot!.appendChild(svg);

        svg.addEventListener('click', (e) => {
          this.dispatchEvent(
            new CustomEvent(CHORD_EVENTS.CLICK, {
              bubbles: true,
              composed: true,
              detail: {
                notes: this.notes,
                duration: this.duration,
                originalEvent: e,
              },
            })
          );
        });
        svg.addEventListener('pointerdown', (e) => {
          this.dispatchEvent(
            new CustomEvent(CHORD_EVENTS.POINTERDOWN, {
              bubbles: true,
              composed: true,
              detail: {
                notes: this.notes,
                duration: this.duration,
                originalEvent: e,
              },
            })
          );
        });
        svg.addEventListener('pointerup', (e) => {
          this.dispatchEvent(
            new CustomEvent(CHORD_EVENTS.POINTERUP, {
              bubbles: true,
              composed: true,
              detail: {
                notes: this.notes,
                duration: this.duration,
                originalEvent: e,
              },
            })
          );
        });
      } else {
        // todo: still need to properly set y/top coordinates of notes
        // Standalone mode: slot-based rendering
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- constructor creates it
        this.shadowRoot!.innerHTML = `
          <style>
            :host { display: inline-block; }
          </style>
          <div style="position: relative; display: flex; flex-direction: column;">
            <slot></slot>
          </div>
        `;
      }
    }
  }

  if (!customElements.get(MUSIC_CHORD)) {
    customElements.define(MUSIC_CHORD, ChordElement);
  }
}

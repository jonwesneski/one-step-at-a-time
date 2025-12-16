import { ChordNote, IChordElement, NoteElementType } from './types/elements';
import { Chord, DurationType } from './types/theory';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class ChordElement extends HTMLElement implements IChordElement {
    static get observedAttributes(): string[] {
      return ['currentCount'];
    }

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
        this.querySelectorAll('music-note');
      const notes: ChordNote[] = [];
      if (noteElements.length) {
        noteElements.forEach((node) => {
          notes.push({ value: node.value, duration: node.duration });
        });
      } else {
        // todo build out notes from value: Chord
        // like if Amaj then notes will be: A, C, E
        // need chord formulas built out first
      }
      return notes;
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
      // TODO: since i am setting style top in note.ts, Check to see if I might be
      // calculating top incorrectly in chords
      this.shadowRoot!.innerHTML = `
       <style>
          :host {
            display: inline-block;
          }
        </style>
        <div style="position: relative; display: flex; flex-direction: column;">
          <slot></slot>
        </div>
      `;
    }
  }

  if (!customElements.get('music-chord')) {
    customElements.define('music-chord', ChordElement);
  }
}

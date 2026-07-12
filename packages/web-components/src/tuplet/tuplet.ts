import { ITupletElement, NoteChordOrRestElementType } from '../types/elements';
import { TupletRatio } from '../types/theory';
import { MUSIC_TUPLET } from '../utils/consts';
import { flattenSlotElements } from '../utils/slotElements';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class TupletElement extends HTMLElement implements ITupletElement {
    static get observedAttributes(): string[] {
      return ['ratio'];
    }

    constructor() {
      super();
      // todo: I may want to revisit this if I do standalone mode
      // this.attachShadow({ mode: 'open' });
      // this.shadowRoot!.innerHTML = '<slot></slot>';
    }

    get ratio(): TupletRatio {
      return (this.getAttribute('ratio') ?? '3') as TupletRatio;
    }

    set ratio(value: TupletRatio) {
      this.setAttribute('ratio', value);
    }

    get flatElements(): NoteChordOrRestElementType[] {
      return flattenSlotElements(Array.from(this.children)).flatElements;
    }
  }

  customElements.define(MUSIC_TUPLET, TupletElement);
}

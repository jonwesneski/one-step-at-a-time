import { ITupletElement, NoteChordOrRestElementType } from '../types/elements';
import { TupletRatio } from '../types/theory';
import { MUSIC_TUPLET } from '../utils/consts';
import { flattenSlotElements } from '../utils/slotElements';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  /**
   * Wraps slotted `<music-note>` / `<music-chord>` / `<music-rest>` children as a
   * tuplet (triplet, quintuplet, …). The staff reads the group and draws the
   * bracket and numeral; the wrapper itself is layout-only.
   *
   * @customElement music-tuplet
   * @attr {TupletRatio} ratio - Tuplet ratio: a bare count like `3` or a full `actual:normal` form like `3:2`. Defaults to `3`.
   *
   * @example
   * <music-staff clef="treble" time="4/4">
   *   <music-tuplet ratio="3">
   *     <music-note note="C" octave="5" duration="eighth"></music-note>
   *     <music-note note="D" octave="5" duration="eighth"></music-note>
   *     <music-note note="E" octave="5" duration="eighth"></music-note>
   *   </music-tuplet>
   * </music-staff>
   */
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

  if (!customElements.get(MUSIC_TUPLET)) {
    customElements.define(MUSIC_TUPLET, TupletElement);
  }
}

import { getClefRenderData } from '../rules/clefRules';
import { IClefElement } from '../types/elements';
import { ClefType } from '../types/theory';
import { MUSIC_CLEF } from '../utils/consts';
import { parseClef } from '../utils/parsers';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class ClefElement extends HTMLElement implements IClefElement {
    static get observedAttributes(): string[] {
      return ['clef'];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    get clef(): ClefType {
      return parseClef(this.getAttribute('clef')) ?? 'treble';
    }

    set clef(value: ClefType) {
      this.setAttribute('clef', value);
    }

    connectedCallback(): void {
      this.render();
    }

    attributeChangedCallback(
      _name: string,
      oldValue: string | null,
      newValue: string | null
    ): void {
      if (oldValue === newValue || !this.isConnected) {
        return;
      }
      this.render();
    }

    private render(): void {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- constructor creates it
      this.shadowRoot!.innerHTML = `
        <style>
          :host { display: inline-block; width: 30px; height: 60px; overflow: visible; }
        </style>
        <svg width="30" height="84" viewBox="0 0 30 84" style="overflow: visible">
          ${getClefRenderData(this.clef).clefSvg}
        </svg>
      `;
    }
  }

  if (!customElements.get(MUSIC_CLEF)) {
    customElements.define(MUSIC_CLEF, ClefElement);
  }
}

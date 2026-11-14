import { getClefRenderData } from '../rules/clefRules';
import { IClefElement } from '../types/elements';
import { ClefType } from '../types/theory';
import { CLEF_EVENTS, MUSIC_CLEF } from '../utils/consts';
import { MID_STREAM_CLEF_SVG_HEIGHT_PX } from '../utils/notationDimensions';
import { parseClef } from '../utils/parsers';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  /**
   * A clef glyph. Standalone it renders just the symbol; placed in a
   * `<music-staff>`'s note stream it marks a mid-piece clef change (it reserves
   * horizontal space but consumes no beat duration).
   *
   * @customElement music-clef
   * @attr {'treble' | 'bass'} clef - Which clef to draw. Defaults to `treble`.
   *
   * @example
   * <music-staff clef="treble">
   *   <music-note note="C" octave="4" duration="quarter"></music-note>
   *   <music-clef clef="bass"></music-clef>
   *   <music-note note="C" octave="3" duration="quarter"></music-note>
   * </music-staff>
   */
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
      this.dispatchEvent(
        new CustomEvent(CLEF_EVENTS.ATTRIBUTE_CHANGE, {
          bubbles: true,
          composed: true,
        })
      );
    }

    private render(): void {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- constructor creates it
      this.shadowRoot!.innerHTML = `
        <style>
          :host { display: inline-block; width: 30px; height: 60px; overflow: visible; }
        </style>
        <svg width="30" height="${MID_STREAM_CLEF_SVG_HEIGHT_PX}" viewBox="0 0 30 ${MID_STREAM_CLEF_SVG_HEIGHT_PX}" style="overflow: visible">
          ${getClefRenderData(this.clef).clefSvg}
        </svg>
      `;
    }
  }

  if (!customElements.get(MUSIC_CLEF)) {
    customElements.define(MUSIC_CLEF, ClefElement);
  }
}

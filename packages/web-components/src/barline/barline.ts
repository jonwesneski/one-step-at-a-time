import { barlineGlyphWidth, barlineVerticalSpan } from '../rules/barlineRules';
import { IBarlineElement } from '../types/elements';
import { BarlineType } from '../types/theory';
import { BARLINE_EVENTS, MUSIC_BARLINE, STAFF_TAGS } from '../utils/consts';
import { STAFF_WRAPPER_MIN_HEIGHT } from '../utils/notationDimensions';
import { parseBarlineType } from '../utils/parsers';
import { createBarlineSvg } from '../utils/svgCreator/barlines';

const FIVE_LINES = 5;

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  /**
   * A barline. Standalone it renders just the glyph; placed in a
   * `<music-staff>`'s note stream it marks a mid-bar barline, drawn through
   * every staff of its `<music-measure>` at that beat. It reserves horizontal
   * space but consumes no beat duration. For a barline at the start or end of
   * a bar, use `<music-measure>`'s `repeat-start` and `barline` instead.
   *
   * @customElement music-barline
   * @attr {BarlineType} type - `double` (default; a thin double barline marks repetition and departure points mid-bar), `single`, `final`, `repeat-start`, `repeat-end` or `repeat-both`.
   *
   * @example
   * <music-staff clef="treble" time="4/4">
   *   <music-note note="F" octave="4" duration="half"></music-note>
   *   <music-note note="F" octave="4" duration="eighth"></music-note>
   *   <music-barline type="repeat-start"></music-barline>
   *   <music-note note="F" octave="4" duration="eighth"></music-note>
   *   <music-note note="F" octave="4" duration="quarter"></music-note>
   * </music-staff>
   */
  class BarlineElement extends HTMLElement implements IBarlineElement {
    static get observedAttributes(): string[] {
      return ['type'];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    get type(): BarlineType {
      return parseBarlineType(this.getAttribute('type')) ?? 'double';
    }

    set type(value: BarlineType) {
      this.setAttribute('type', value);
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
        new CustomEvent(BARLINE_EVENTS.ATTRIBUTE_CHANGE, {
          bubbles: true,
          composed: true,
        })
      );
    }

    private render(): void {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- constructor creates it
      const root = this.shadowRoot!;
      // In a staff, every staff of the measure draws the barline itself.
      if (this.closest(STAFF_TAGS) !== null) {
        root.innerHTML = '<style>:host { display: none; }</style>';
        return;
      }
      const width = Math.ceil(barlineGlyphWidth(this.type));
      const { bottom } = barlineVerticalSpan(FIVE_LINES);
      const height = Math.max(STAFF_WRAPPER_MIN_HEIGHT, Math.ceil(bottom));
      root.innerHTML = `
        <style>
          :host { display: inline-block; width: ${width}px; height: ${height}px; overflow: visible; }
        </style>
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible"></svg>
      `;
      root
        .querySelector('svg')
        ?.appendChild(createBarlineSvg(this.type, FIVE_LINES, 0));
    }
  }

  if (!customElements.get(MUSIC_BARLINE)) {
    customElements.define(MUSIC_BARLINE, BarlineElement);
  }
}

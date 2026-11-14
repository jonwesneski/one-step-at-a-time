/**
 * Lives under staffVocal rather than its own folder since lyrics aren't a
 * standalone element like note/chord — that may change if standalone
 * support is added later.
 */

import { ILyricsElement, LyricSyllablePosition } from '../types/elements';
import { SVG_NS } from '../utils';

const SSRSafeHTMLElement: typeof HTMLElement =
  typeof HTMLElement !== 'undefined'
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

/**
 * One verse of lyrics for a `<music-staff-vocal>`. Its text content is split on
 * spaces into words and on `-` into syllables (`Ky-ri-e`); a trailing `_` on a
 * syllable marks a melisma. The vocal staff positions each syllable under the
 * matching note.
 *
 * @customElement music-lyrics
 * @attr {string} verse - Verse number, used to stack multiple verses. Defaults to `1`.
 *
 * @example
 * <music-staff-vocal voice="soprano">
 *   <music-note note="C" octave="5" duration="quarter"></music-note>
 *   <music-note note="D" octave="5" duration="quarter"></music-note>
 *   <music-lyrics verse="1">Ky-ri</music-lyrics>
 * </music-staff-vocal>
 */
export class MusicLyricsElement
  extends SSRSafeHTMLElement
  implements ILyricsElement
{
  #syllablePositions: LyricSyllablePosition[] = [];
  #lyricContainer: SVGSVGElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  get verse(): string {
    return this.getAttribute('verse') ?? '1';
  }

  set verse(value: string) {
    this.setAttribute('verse', value);
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      return;
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          pointer-events: none;
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }
        text {
          font-family: serif;
          font-size: 12px;
          fill: currentColor;
          user-select: none;
        }
        .hyphen {
          font-size: 10px;
        }
      </style>
      <svg></svg>
    `;

    this.#lyricContainer = this.shadowRoot.querySelector(
      'svg'
    ) as SVGSVGElement;
  }

  updatePositions(positions: LyricSyllablePosition[]) {
    this.#syllablePositions = positions;
    if (positions.length === 0) {
      return;
    }

    this.#render();
  }

  #render() {
    if (!this.#lyricContainer) {
      return;
    }

    this.#lyricContainer.innerHTML = '';
    this.#lyricContainer.removeAttribute('viewBox');
    this.#lyricContainer.style.width = '100%';
    this.#lyricContainer.style.height = '100%';

    for (let i = 0; i < this.#syllablePositions.length; i++) {
      const syllable = this.#syllablePositions[i];

      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', syllable.x.toString());
      text.setAttribute('y', syllable.y.toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'hanging');
      text.setAttribute('font-size', '12');
      text.textContent = syllable.text;
      this.#lyricContainer.appendChild(text);

      if (syllable.isHyphenated && i < this.#syllablePositions.length - 1) {
        const nextSyllable = this.#syllablePositions[i + 1];
        const hyphenX = (syllable.x + nextSyllable.x) / 2;
        const hyphen = document.createElementNS(SVG_NS, 'text');
        hyphen.setAttribute('x', hyphenX.toString());
        hyphen.setAttribute('y', syllable.y.toString());
        hyphen.setAttribute('text-anchor', 'middle');
        hyphen.setAttribute('dominant-baseline', 'hanging');
        hyphen.setAttribute('class', 'hyphen');
        hyphen.textContent = '-';
        this.#lyricContainer.appendChild(hyphen);
      }

      if (syllable.isMelisma && i < this.#syllablePositions.length - 1) {
        const nextSyllable = this.#syllablePositions[i + 1];
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', (syllable.x + 8).toString());
        line.setAttribute('y1', (syllable.y + 6).toString());
        line.setAttribute('x2', (nextSyllable.x - 8).toString());
        line.setAttribute('y2', (syllable.y + 6).toString());
        line.setAttribute('stroke', 'currentColor');
        line.setAttribute('stroke-width', '0.5');
        this.#lyricContainer.appendChild(line);
      }
    }
  }
}

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  if (!customElements.get('music-lyrics')) {
    customElements.define('music-lyrics', MusicLyricsElement);
  }
}

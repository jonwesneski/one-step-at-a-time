/**
 * I didn't create a separate /lyrics folder because it is not currently a
 * standalone like note or chord are; it is only used in staffVocal for now.
 * Maybe I'll think about supporting lyrics as a standalone in the future.
 */

import { ILyricsElement, LyricSyllablePosition } from '../types/elements';

const SSRSafeHTMLElement: typeof HTMLElement =
  typeof HTMLElement !== 'undefined'
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

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

  get syllables(): LyricSyllablePosition[] {
    return this.#syllablePositions;
  }

  set syllables(value: LyricSyllablePosition[]) {
    this.#syllablePositions = value;
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

  updatePositions() {
    if (this.#syllablePositions.length === 0) {
      return;
    }

    this.#render();
  }

  #render() {
    if (!this.#lyricContainer) {
      return;
    }

    // Clear previous rendering
    this.#lyricContainer.innerHTML = '';

    // Set SVG to use pixel coordinate system (no viewBox scaling)
    this.#lyricContainer.removeAttribute('viewBox');
    this.#lyricContainer.style.width = '100%';
    this.#lyricContainer.style.height = '100%';

    for (let i = 0; i < this.#syllablePositions.length; i++) {
      const syllable = this.#syllablePositions[i];

      // Render syllable text
      const text = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'text'
      );
      text.setAttribute('x', syllable.x.toString());
      text.setAttribute('y', syllable.y.toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'hanging');
      text.setAttribute('font-size', '12');
      text.textContent = syllable.text;
      this.#lyricContainer.appendChild(text);

      // Render hyphen if needed
      if (syllable.isHyphenated && i < this.#syllablePositions.length - 1) {
        const nextSyllable = this.#syllablePositions[i + 1];
        const hyphenX = (syllable.x + nextSyllable.x) / 2;
        const hyphen = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'text'
        );
        hyphen.setAttribute('x', hyphenX.toString());
        hyphen.setAttribute('y', syllable.y.toString());
        hyphen.setAttribute('text-anchor', 'middle');
        hyphen.setAttribute('dominant-baseline', 'hanging');
        hyphen.setAttribute('class', 'hyphen');
        hyphen.textContent = '-';
        this.#lyricContainer.appendChild(hyphen);
      }

      // Render extender line if melisma
      if (syllable.isMelisma && i < this.#syllablePositions.length - 1) {
        const nextSyllable = this.#syllablePositions[i + 1];
        const line = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'line'
        );
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

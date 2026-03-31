/**
 * I didn't create a separate /lyrics folder because it is not currently a
 * standalone like note or chord are; it is only used in staffVocal for now.
 * Maybe I'll think about supporting lyrics as a standalone in the future.
 */

export class MusicLyricsElement extends HTMLElement {
  #syllablePositions: Array<{
    text: string;
    x: number;
    y: number;
    isMelisma: boolean;
    isHyphenated: boolean;
  }> = [];

  #svgContainer: SVGSVGElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    if (!this.shadowRoot) return;

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

    this.#svgContainer = this.shadowRoot.querySelector('svg') as SVGSVGElement;
  }

  get verse(): string {
    return this.getAttribute('verse') ?? '1';
  }

  set verse(value: string) {
    this.setAttribute('verse', value);
  }

  updatePositions() {
    if (!this.#svgContainer) {
      return;
    }

    const stored = this.dataset.syllables;
    if (!stored) {
      return;
    }

    try {
      const positions = JSON.parse(stored);
      this.#syllablePositions = positions;
      this.#render();
    } catch {
      // Invalid JSON, skip
    }
  }

  #render() {
    if (!this.#svgContainer) {
      return;
    }

    // Clear previous rendering
    this.#svgContainer.innerHTML = '';

    // Set SVG to use pixel coordinate system (no viewBox scaling)
    this.#svgContainer.removeAttribute('viewBox');
    this.#svgContainer.style.width = '100%';
    this.#svgContainer.style.height = '100%';

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
      this.#svgContainer.appendChild(text);

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
        this.#svgContainer.appendChild(hyphen);
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
        this.#svgContainer.appendChild(line);
      }
    }
  }
}

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  if (!customElements.get('music-lyrics')) {
    customElements.define('music-lyrics', MusicLyricsElement);
  }
}

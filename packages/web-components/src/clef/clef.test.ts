/**
 * @jest-environment jsdom
 */
import type { ClefElementType } from '../types/elements';
import { CLEFS } from '../utils';
import { MUSIC_CLEF } from '../utils/consts';
import './index';

afterEach(() => {
  document.body.innerHTML = '';
});

describe(MUSIC_CLEF, () => {
  it('registers as a custom element', () => {
    expect(customElements.get(MUSIC_CLEF)).toBeDefined();
  });

  it('defaults clef to treble when attribute is absent', () => {
    const clefElement = document.createElement(MUSIC_CLEF) as ClefElementType;
    document.body.appendChild(clefElement);

    expect(clefElement.clef).toBe('treble');
  });

  it('renders standalone (without a staff parent) with a non-empty shadow DOM', () => {
    const clefElement = document.createElement(MUSIC_CLEF) as ClefElementType;
    document.body.appendChild(clefElement);

    expect(clefElement.shadowRoot?.innerHTML).not.toBe('');
    expect(clefElement.shadowRoot?.querySelector('svg')).not.toBeNull();
  });

  it('renders a clef glyph for every supported clef value', () => {
    for (const clef of CLEFS) {
      const clefElement = document.createElement(MUSIC_CLEF) as ClefElementType;
      clefElement.setAttribute('clef', clef);
      document.body.appendChild(clefElement);

      expect(clefElement.shadowRoot?.querySelector('svg.clef')).not.toBeNull();

      document.body.innerHTML = '';
    }
  });

  it('re-renders when the clef attribute changes', () => {
    const clefElement = document.createElement(MUSIC_CLEF) as ClefElementType;
    clefElement.setAttribute('clef', 'treble');
    document.body.appendChild(clefElement);

    const initialHtml = clefElement.shadowRoot?.innerHTML;

    clefElement.setAttribute('clef', 'bass');

    expect(clefElement.shadowRoot?.innerHTML).not.toBe(initialHtml);
    expect(clefElement.clef).toBe('bass');
  });
});

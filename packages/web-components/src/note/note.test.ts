/**
 * @jest-environment jsdom
 */
import { MUSIC_NOTE } from '../utils/consts';
import './index';

afterEach(() => {
  document.body.innerHTML = '';
});

describe(MUSIC_NOTE, () => {
  it('registers as a custom element', () => {
    expect(customElements.get(MUSIC_NOTE)).toBeDefined();
  });

  it('renders with default duration and note', () => {
    const el = document.createElement(MUSIC_NOTE) as any;
    document.body.appendChild(el);

    expect(el.duration).toBe('quarter');
    expect(el.note).toBe('C');
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot.innerHTML).not.toBe('');
  });
});

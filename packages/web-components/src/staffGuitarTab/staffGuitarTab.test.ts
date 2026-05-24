/**
 * @jest-environment jsdom
 */
import { MUSIC_STAFF_GUITAR_TAB } from '../utils/consts';
import './index';

afterEach(() => {
  document.body.innerHTML = '';
});

describe(MUSIC_STAFF_GUITAR_TAB, () => {
  it('registers as a custom element', () => {
    expect(customElements.get(MUSIC_STAFF_GUITAR_TAB)).toBeDefined();
  });

  it('renders shadow root with 6-line tab staff', () => {
    const el = document.createElement(MUSIC_STAFF_GUITAR_TAB) as any;
    document.body.appendChild(el);

    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot.innerHTML).not.toBe('');
  });
});

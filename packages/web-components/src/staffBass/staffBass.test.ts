/**
 * @jest-environment jsdom
 */
import { COMMON_ATTRIBUTES, MUSIC_STAFF_BASS } from '../utils/consts';
import './index';

afterEach(() => {
  document.body.innerHTML = '';
});

describe(MUSIC_STAFF_BASS, () => {
  it('registers as a custom element', () => {
    expect(customElements.get(MUSIC_STAFF_BASS)).toBeDefined();
  });

  it('renders shadow root with provided key signature attributes', () => {
    const el = document.createElement(MUSIC_STAFF_BASS) as any;
    el.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
    el.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
    el.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
    document.body.appendChild(el);

    expect(el.keySig).toBe('C');
    expect(el.mode).toBe('major');
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot.innerHTML).not.toBe('');
  });
});

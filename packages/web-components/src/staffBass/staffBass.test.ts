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
    const element = document.createElement(MUSIC_STAFF_BASS) as any;
    element.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
    element.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
    element.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
    document.body.appendChild(element);

    expect(element.keySig).toBe('C');
    expect(element.mode).toBe('major');
    expect(element.shadowRoot).not.toBeNull();
    expect(element.shadowRoot.innerHTML).not.toBe('');
  });
});

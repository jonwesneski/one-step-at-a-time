/**
 * @jest-environment jsdom
 */
import { MUSIC_MEASURE } from '../utils/consts';
import './index';

afterEach(() => {
  document.body.innerHTML = '';
});

describe(MUSIC_MEASURE, () => {
  it('registers as a custom element', () => {
    expect(customElements.get(MUSIC_MEASURE)).toBeDefined();
  });

  it('renders with default keySig, mode, and time', () => {
    const el = document.createElement(MUSIC_MEASURE) as any;
    document.body.appendChild(el);

    expect(el.keySig).toBe('C');
    expect(el.mode).toBe('major');
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot.innerHTML).not.toBe('');
  });
});

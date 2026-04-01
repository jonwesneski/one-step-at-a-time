/**
 * @jest-environment jsdom
 */
import './index';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('music-composition', () => {
  it('registers as a custom element', () => {
    expect(customElements.get('music-composition')).toBeDefined();
  });

  it('renders with default keySig, mode, and time', () => {
    const el = document.createElement('music-composition') as any;
    document.body.appendChild(el);

    expect(el.keySig).toBe('C');
    expect(el.mode).toBe('major');
    expect(el.time).toBe('4/4');
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot.innerHTML).not.toBe('');
  });
});

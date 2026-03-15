/**
 * @jest-environment jsdom
 */
import './index';


describe('music-measure', () => {
  it('registers as a custom element', () => {
    expect(customElements.get('music-measure')).toBeDefined();
  });

  it('renders with default keySig, mode, and time', () => {
    const el = document.createElement('music-measure') as any;
    document.body.appendChild(el);

    expect(el.keySig).toBe('C');
    expect(el.mode).toBe('major');
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot.innerHTML).not.toBe('');

    el.remove();
  });
});

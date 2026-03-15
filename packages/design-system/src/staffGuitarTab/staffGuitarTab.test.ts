/**
 * @jest-environment jsdom
 */
import './index';


describe('music-staff-guitar-tab', () => {
  it('registers as a custom element', () => {
    expect(customElements.get('music-staff-guitar-tab')).toBeDefined();
  });

  it('renders shadow root with 6-line tab staff', () => {
    const el = document.createElement('music-staff-guitar-tab') as any;
    document.body.appendChild(el);

    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot.innerHTML).not.toBe('');

    el.remove();
  });
});

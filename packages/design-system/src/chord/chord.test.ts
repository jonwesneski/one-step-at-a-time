/**
 * @jest-environment jsdom
 */
import './index';

describe('music-chord', () => {
  it('registers as a custom element', () => {
    expect(customElements.get('music-chord')).toBeDefined();
  });

  it('renders shadow root with default duration', () => {
    const el = document.createElement('music-chord') as any;
    document.body.appendChild(el);

    expect(el.duration).toBe('quarter');
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot.innerHTML).not.toBe('');

    el.remove();
  });
});

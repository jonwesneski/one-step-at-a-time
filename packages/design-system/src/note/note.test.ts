/**
 * @jest-environment jsdom
 */
import './index';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('music-note', () => {
  it('registers as a custom element', () => {
    expect(customElements.get('music-note')).toBeDefined();
  });

  it('renders with default duration and value', () => {
    const el = document.createElement('music-note') as any;
    document.body.appendChild(el);

    expect(el.duration).toBe('quarter');
    expect(el.value).toBe('C');
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot.innerHTML).not.toBe('');
  });
});

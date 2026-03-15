/**
 * @jest-environment jsdom
 */
import './index';

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('music-staff-treble', () => {
  it('registers as a custom element', () => {
    expect(customElements.get('music-staff-treble')).toBeDefined();
  });

  it('renders shadow root with provided key signature attributes', () => {
    const el = document.createElement('music-staff-treble') as any;
    el.setAttribute('keySig', 'C');
    el.setAttribute('mode', 'major');
    el.setAttribute('time', '4/4');
    document.body.appendChild(el);

    expect(el.keySig).toBe('C');
    expect(el.mode).toBe('major');
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot.innerHTML).not.toBe('');

    el.remove();
  });
});

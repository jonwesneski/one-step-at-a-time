/**
 * @jest-environment jsdom
 */
import '../index';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('music-guitar-note', () => {
  it('registers as a custom element', () => {
    expect(customElements.get('music-guitar-note')).toBeDefined();
  });

  it('renders with default fret, string, and duration', () => {
    const el = document.createElement('music-guitar-note') as any;
    document.body.appendChild(el);

    expect(el.fret).toBe(0);
    expect(el.string).toBe(1);
    expect(el.duration).toBe('quarter');
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot.innerHTML).not.toBe('');
  });

  it('accepts numeric fret and muted "x" fret', () => {
    const el = document.createElement('music-guitar-note') as any;
    el.setAttribute('fret', '7');
    document.body.appendChild(el);
    expect(el.fret).toBe(7);

    el.setAttribute('fret', 'x');
    expect(el.fret).toBe('x');
  });

  it('parses connector attributes as start/end or null', () => {
    const el = document.createElement('music-guitar-note') as any;
    el.setAttribute('hammer-on', 'start');
    el.setAttribute('slide', 'end');
    document.body.appendChild(el);

    expect(el.hammerOn).toBe('start');
    expect(el.slide).toBe('end');
    expect(el.pullOff).toBeNull();
    expect(el.tie).toBeNull();
  });

  it('dispatches connector-attribute-change when tie is toggled', () => {
    const el = document.createElement('music-guitar-note') as any;
    document.body.appendChild(el);

    const handler = jest.fn();
    el.addEventListener('connector-attribute-change', handler);
    el.setAttribute('tie', 'start');

    expect(handler).toHaveBeenCalled();
  });
});

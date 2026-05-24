/**
 * @jest-environment jsdom
 */
import { DURATIONS } from '../utils';
import { MUSIC_REST } from '../utils/consts';
import './index';

afterEach(() => {
  document.body.innerHTML = '';
});

describe(MUSIC_REST, () => {
  it('registers as a custom element', () => {
    expect(customElements.get(MUSIC_REST)).toBeDefined();
  });

  it('renders a rest SVG in shadow DOM', () => {
    const el = document.createElement(MUSIC_REST) as any;
    el.setAttribute('duration', 'quarter');
    document.body.appendChild(el);

    // jsdom shadow DOM does not support CSS class selectors on SVG elements,
    // so we use attribute-based class matching instead.
    const restSvg = el.shadowRoot.querySelector('svg[class~="rest"]');
    expect(restSvg).not.toBeNull();
  });

  it('sets the correct data-duration for all durations', () => {
    for (const duration of DURATIONS) {
      const el = document.createElement(MUSIC_REST) as any;
      el.setAttribute('duration', duration);
      document.body.appendChild(el);

      const restSvg = el.shadowRoot.querySelector('svg[class~="rest"]');
      expect(restSvg).not.toBeNull();
      expect(restSvg.dataset.duration).toBe(duration);

      document.body.innerHTML = '';
    }
  });

  it('renders standalone (without a staff parent) with non-empty shadow DOM', () => {
    const el = document.createElement(MUSIC_REST) as any;
    el.setAttribute('duration', 'half');
    document.body.appendChild(el);

    expect(el.shadowRoot.innerHTML).not.toBe('');
    expect(el.shadowRoot.querySelector('svg')).not.toBeNull();
  });

  it('does not render accidental elements in shadow DOM', () => {
    const el = document.createElement(MUSIC_REST) as any;
    el.setAttribute('duration', 'eighth');
    document.body.appendChild(el);

    const accidentals = el.shadowRoot.querySelectorAll(
      '.sharp, .flat, .natural'
    );
    expect(accidentals.length).toBe(0);
  });

  it('defaults duration to quarter when attribute is absent', () => {
    const el = document.createElement(MUSIC_REST) as any;
    document.body.appendChild(el);

    expect(el.duration).toBe('quarter');
  });

  it('re-renders when duration attribute changes', () => {
    const el = document.createElement(MUSIC_REST) as any;
    el.setAttribute('duration', 'whole');
    document.body.appendChild(el);

    let restSvg = el.shadowRoot.querySelector('svg[class~="rest"]');
    expect(restSvg?.dataset.duration).toBe('whole');

    el.setAttribute('duration', 'eighth');
    restSvg = el.shadowRoot.querySelector('svg[class~="rest"]');
    expect(restSvg?.dataset.duration).toBe('eighth');
  });
});

/**
 * @jest-environment jsdom
 */
import '../staffTreble/index';
import { restToYCoordinate } from '../rules/restRules';
import { RestElementType } from '../types/elements';
import type { DurationType, TimeSignature } from '../types/theory';
import { DURATIONS } from '../utils';
import {
  COMMON_ATTRIBUTES,
  MUSIC_REST,
  MUSIC_STAFF_TREBLE,
} from '../utils/consts';
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

function makeStaff(): Element {
  const el = document.createElement(MUSIC_STAFF_TREBLE) as any;
  el.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
  el.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
  el.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
  document.body.appendChild(el);
  return el;
}

function renderRest(staff: Element, duration: DurationType): RestElementType {
  const rest = document.createElement(MUSIC_REST) as RestElementType;
  rest.setAttribute('duration', duration);
  staff.appendChild(rest);
  const slot = (staff as any).shadowRoot.querySelector('slot');
  slot.assignedElements = () => [rest];
  slot.dispatchEvent(new Event('slotchange'));
  return rest;
}

describe('staff integration', () => {
  it('positions quarter rest at the correct Y for its duration', () => {
    const staff = makeStaff();
    const rest = renderRest(staff, 'quarter');
    expect(rest.style.top).toBe(`${restToYCoordinate('quarter')}px`);
  });

  it('repositions Y and preserves X when duration changes from quarter to half', () => {
    const staff = makeStaff();
    const rest = renderRest(staff, 'quarter');
    const initialLeft = rest.style.left;

    rest.setAttribute('duration', 'half' satisfies DurationType);

    expect(rest.style.top).toBe(`${restToYCoordinate('half')}px`);
    expect(rest.style.left).toBe(initialLeft);
  });

  it('positions whole rest at the correct Y for its duration', () => {
    const staff = makeStaff();
    const rest = renderRest(staff, 'whole');
    expect(rest.style.top).toBe(`${restToYCoordinate('whole')}px`);
  });

  it('renders a double-whole rest in a 4/2 staff without overflow error', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const staff = document.createElement(MUSIC_STAFF_TREBLE) as any;
    staff.setAttribute(
      COMMON_ATTRIBUTES.TIME_SIG,
      '4/2' satisfies TimeSignature
    );
    document.body.appendChild(staff);

    const rest = document.createElement(MUSIC_REST) as any;
    rest.setAttribute('duration', 'double-whole' satisfies DurationType);

    const slot = staff.shadowRoot.querySelector('slot');
    slot.assignedElements = () => [rest];
    slot.dispatchEvent(new Event('slotchange'));

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

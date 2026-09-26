/**
 * @jest-environment jsdom
 */
import { restToYCoordinate } from '../rules/restRules';
import '../staff/index';
import type { RestElementType } from '../types/elements';
import type { DurationType, TimeSignature } from '../types/theory';
import { DURATIONS } from '../utils';
import {
  COMMON_ATTRIBUTES,
  MUSIC_REST,
  MUSIC_STAFF,
  NOTE_EVENTS,
} from '../utils/consts';
import './index';

afterEach(() => {
  document.body.innerHTML = '';
});

describe(MUSIC_REST, () => {
  it('renders a rest SVG in shadow DOM', () => {
    const restElement = document.createElement(MUSIC_REST) as RestElementType;
    restElement.setAttribute('duration', 'quarter');
    document.body.appendChild(restElement);

    // jsdom shadow DOM does not support CSS class selectors on SVG elements,
    // so we use attribute-based class matching instead.
    const restSvg = restElement.shadowRoot?.querySelector('svg[class~="rest"]');
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
    const restElement = document.createElement(MUSIC_REST) as RestElementType;
    restElement.setAttribute('duration', 'half');
    document.body.appendChild(restElement);

    expect(restElement.shadowRoot?.innerHTML).not.toBe('');
    expect(restElement.shadowRoot?.querySelector('svg')).not.toBeNull();
  });

  it('does not render accidental elements in shadow DOM', () => {
    const restElement = document.createElement(MUSIC_REST) as RestElementType;
    restElement.setAttribute('duration', 'eighth');
    document.body.appendChild(restElement);

    const accidentals = restElement.shadowRoot?.querySelectorAll(
      '.sharp, .flat, .natural'
    );
    expect(accidentals?.length).toBe(0);
  });

  it('defaults duration to quarter when attribute is absent', () => {
    const restElement = document.createElement(MUSIC_REST) as RestElementType;
    document.body.appendChild(restElement);

    expect(restElement.duration).toBe('quarter');
  });

  it('re-renders when duration attribute changes', () => {
    const restElement = document.createElement(MUSIC_REST) as any;
    restElement.setAttribute('duration', 'whole');
    document.body.appendChild(restElement);

    let restSvg = restElement.shadowRoot.querySelector('svg[class~="rest"]');
    expect(restSvg?.dataset.duration).toBe('whole');

    restElement.setAttribute('duration', 'eighth');
    restSvg = restElement.shadowRoot.querySelector('svg[class~="rest"]');
    expect(restSvg?.dataset.duration).toBe('eighth');
  });

  describe('beam group', () => {
    it('round-trips beam-group as a plain string attribute', () => {
      const restElement = document.createElement(MUSIC_REST) as RestElementType;
      document.body.appendChild(restElement);

      expect(restElement.beamGroup).toBeNull();
      restElement.beamGroup = 'rh-lh-1';
      expect(restElement.getAttribute('beam-group')).toBe('rh-lh-1');
      expect(restElement.beamGroup).toBe('rh-lh-1');

      restElement.beamGroup = null;
      expect(restElement.getAttribute('beam-group')).toBeNull();
    });

    it('dispatches BEAM_GROUP_ATTRIBUTE_CHANGE without re-rendering the rest locally', () => {
      const restElement = document.createElement(MUSIC_REST) as RestElementType;
      document.body.appendChild(restElement);
      const handler = jest.fn();
      restElement.addEventListener(
        NOTE_EVENTS.BEAM_GROUP_ATTRIBUTE_CHANGE,
        handler
      );

      restElement.beamGroup = 'rh-lh-1';

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('rest staff side', () => {
    it('defaults to null and round-trips valid values', () => {
      const restElement = document.createElement(MUSIC_REST) as RestElementType;
      document.body.appendChild(restElement);

      expect(restElement.restStaffSide).toBeNull();

      restElement.restStaffSide = 'above';
      expect(restElement.getAttribute('rest-staff-side')).toBe('above');
      expect(restElement.restStaffSide).toBe('above');

      restElement.restStaffSide = 'below';
      expect(restElement.restStaffSide).toBe('below');

      restElement.restStaffSide = 'centered';
      expect(restElement.restStaffSide).toBe('centered');

      restElement.restStaffSide = null;
      expect(restElement.getAttribute('rest-staff-side')).toBeNull();
    });

    it('rejects an invalid attribute value, falling back to null', () => {
      const restElement = document.createElement(MUSIC_REST) as RestElementType;
      restElement.setAttribute('rest-staff-side', 'sideways');
      document.body.appendChild(restElement);

      expect(restElement.restStaffSide).toBeNull();
    });

    it('dispatches REST_STAFF_SIDE_ATTRIBUTE_CHANGE without re-rendering the rest locally', () => {
      const restElement = document.createElement(MUSIC_REST) as RestElementType;
      document.body.appendChild(restElement);
      const handler = jest.fn();
      restElement.addEventListener(
        NOTE_EVENTS.REST_STAFF_SIDE_ATTRIBUTE_CHANGE,
        handler
      );

      restElement.restStaffSide = 'centered';

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});

function makeStaff(): Element {
  const staff = document.createElement(MUSIC_STAFF) as any;
  staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
  staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
  staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
  document.body.appendChild(staff);
  return staff;
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

  it('renders a double-whole rest in a 4/2 staff without overflow warning', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const staff = document.createElement(MUSIC_STAFF) as any;
    staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/2' satisfies TimeSignature);
    document.body.appendChild(staff);

    const rest = document.createElement(MUSIC_REST) as any;
    rest.setAttribute('duration', 'double-whole' satisfies DurationType);

    const slot = staff.shadowRoot.querySelector('slot');
    slot.assignedElements = () => [rest];
    slot.dispatchEvent(new Event('slotchange'));

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

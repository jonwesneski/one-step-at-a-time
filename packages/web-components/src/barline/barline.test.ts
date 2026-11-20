/**
 * @jest-environment jsdom
 */
import type { BarlineElementType } from '../types/elements';
import {
  BARLINE_EVENTS,
  BARLINE_TYPES,
  MUSIC_BARLINE,
  MUSIC_STAFF,
} from '../utils/consts';
import './index';

afterEach(() => {
  document.body.innerHTML = '';
});

const makeBarline = (type?: string): BarlineElementType => {
  const element = document.createElement(MUSIC_BARLINE) as BarlineElementType;
  if (type !== undefined) {
    element.setAttribute('type', type);
  }
  document.body.appendChild(element);
  return element;
};

describe(MUSIC_BARLINE, () => {
  it('defaults to a thin double barline', () => {
    expect(makeBarline().type).toBe('double');
    expect(makeBarline('sideways').type).toBe('double');
  });

  it('renders every barline design standalone', () => {
    for (const type of BARLINE_TYPES) {
      const element = makeBarline(type);
      expect(
        element.shadowRoot?.querySelector(`g.barline-${type}`)
      ).not.toBeNull();
    }
  });

  it('draws repeat dots only on repeat barlines', () => {
    expect(
      makeBarline('final').shadowRoot?.querySelectorAll('circle.repeat-dot')
    ).toHaveLength(0);
    expect(
      makeBarline('repeat-start').shadowRoot?.querySelectorAll(
        'circle.repeat-dot'
      )
    ).toHaveLength(2);
    expect(
      makeBarline('repeat-both').shadowRoot?.querySelectorAll(
        'circle.repeat-dot'
      )
    ).toHaveLength(4);
  });

  it('draws nothing itself inside a staff, which draws it instead', () => {
    const staff = document.createElement(MUSIC_STAFF);
    const element = document.createElement(MUSIC_BARLINE) as BarlineElementType;
    staff.appendChild(element);
    document.body.appendChild(staff);

    expect(element.shadowRoot?.querySelector('svg')).toBeNull();
    expect(element.shadowRoot?.innerHTML).toContain('display: none');
  });

  it('dispatches a bubbling, composed attribute-change event when connected and the value changes', () => {
    const element = makeBarline('double');
    const listener = jest.fn();
    element.addEventListener(BARLINE_EVENTS.ATTRIBUTE_CHANGE, listener);

    element.setAttribute('type', 'final');
    element.setAttribute('type', 'final');

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
  });
});

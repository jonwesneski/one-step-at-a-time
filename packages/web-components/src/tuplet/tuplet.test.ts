/**
 * @jest-environment jsdom
 */
import '../note/index';
import '../staff/index';
import { NoteElementType, TupletElementType } from '../types/elements';
import type {
  DurationType,
  Note,
  Octave,
  TimeSignature,
  TupletPlacement,
  TupletRatio,
} from '../types/theory';
import {
  COMMON_ATTRIBUTES,
  MUSIC_NOTE,
  MUSIC_STAFF,
  MUSIC_TUPLET,
  TUPLET_EVENTS,
} from '../utils/consts';
import {
  STAFF_BOTTOM_LINE_Y,
  STAFF_TOP_LINE_Y,
} from '../utils/notationDimensions';
import './index';

afterEach(() => {
  document.body.innerHTML = '';
});

describe(MUSIC_TUPLET, () => {
  it('returns default ratio of "3" when no attribute set', () => {
    const element = document.createElement(MUSIC_TUPLET) as TupletElementType;
    document.body.appendChild(element);

    expect(element.ratio).toBe('3');
  });

  it('reads ratio from attribute', () => {
    const element = document.createElement(MUSIC_TUPLET) as TupletElementType;
    element.setAttribute('ratio', '5:4' satisfies TupletRatio);
    document.body.appendChild(element);

    expect(element.ratio).toBe('5:4');
  });

  it('sets ratio via setter', () => {
    const element = document.createElement(MUSIC_TUPLET) as TupletElementType;
    document.body.appendChild(element);
    element.ratio = '7' satisfies TupletRatio;

    expect(element.getAttribute('ratio')).toBe('7');
    expect(element.ratio).toBe('7');
  });

  it('round-trips tuplet-group as a plain string attribute', () => {
    const element = document.createElement(MUSIC_TUPLET) as TupletElementType;
    document.body.appendChild(element);

    expect(element.tupletGroup).toBeNull();
    element.tupletGroup = 't1';
    expect(element.getAttribute('tuplet-group')).toBe('t1');
    element.tupletGroup = null;
    expect(element.hasAttribute('tuplet-group')).toBe(false);
  });

  it('round-trips valid placement values and rejects invalid ones', () => {
    const element = document.createElement(MUSIC_TUPLET) as TupletElementType;
    document.body.appendChild(element);

    expect(element.placement).toBeNull();
    element.placement = 'below' satisfies TupletPlacement;
    expect(element.getAttribute('placement')).toBe('below');
    expect(element.placement).toBe('below');
    element.setAttribute('placement', 'sideways');
    expect(element.placement).toBeNull();
    element.placement = null;
    expect(element.hasAttribute('placement')).toBe(false);
  });

  it.each(['ratio', 'tuplet-group', 'placement'])(
    'dispatches a bubbling, composed TUPLET_EVENTS.ATTRIBUTE_CHANGE when %s changes',
    (attribute) => {
      const element = document.createElement(MUSIC_TUPLET) as TupletElementType;
      document.body.appendChild(element);
      const listener = jest.fn();
      document.body.addEventListener(TUPLET_EVENTS.ATTRIBUTE_CHANGE, listener);

      element.setAttribute(attribute, attribute === 'ratio' ? '5' : 'above');

      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0][0] as CustomEvent;
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
    }
  );

  it('has no shadow root (pure grouping wrapper, no self-rendering)', () => {
    const element = document.createElement(MUSIC_TUPLET) as TupletElementType;
    document.body.appendChild(element);

    expect(element.shadowRoot).toBeNull();
  });

  it('flatElements returns empty array when no children', () => {
    const element = document.createElement(MUSIC_TUPLET) as TupletElementType;
    document.body.appendChild(element);

    expect(element.flatElements).toHaveLength(0);
  });

  it('flatElements returns direct note children', () => {
    const element = document.createElement(MUSIC_TUPLET) as TupletElementType;
    for (let i = 0; i < 3; i++) {
      const note = document.createElement(MUSIC_NOTE);
      note.setAttribute('note', 'C');
      note.setAttribute('duration', 'eighth');
      element.appendChild(note);
    }
    document.body.appendChild(element);

    expect(element.flatElements).toHaveLength(3);
  });

  it('flatElements flattens nested music-tuplet children', () => {
    const outer = document.createElement(MUSIC_TUPLET) as TupletElementType;
    outer.setAttribute('ratio', '5:4' satisfies TupletRatio);

    const note1 = document.createElement(MUSIC_NOTE);
    note1.setAttribute('note', 'C');
    note1.setAttribute('duration', 'sixteenth');
    outer.appendChild(note1);

    const inner = document.createElement(MUSIC_TUPLET) as TupletElementType;
    inner.setAttribute('ratio', '3' satisfies TupletRatio);
    for (let i = 0; i < 3; i++) {
      const note = document.createElement(MUSIC_NOTE);
      note.setAttribute('note', 'D');
      note.setAttribute('duration', 'thirty-second');
      inner.appendChild(note);
    }
    outer.appendChild(inner);

    const note2 = document.createElement(MUSIC_NOTE);
    note2.setAttribute('note', 'E');
    note2.setAttribute('duration', 'sixteenth');
    outer.appendChild(note2);

    document.body.appendChild(outer);

    // 1 + 3 inner + 1 = 5 total flat elements
    expect(outer.flatElements).toHaveLength(5);
  });
});

describe('staff integration', () => {
  it('renders a .tuplets-container svg in the shadow DOM when a tuplet is slotted', () => {
    const staff = document.createElement(MUSIC_STAFF) as any;
    staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4' satisfies TimeSignature);
    document.body.appendChild(staff);

    const tuplet = document.createElement(MUSIC_TUPLET) as TupletElementType;
    tuplet.setAttribute('ratio', '3');
    for (let i = 0; i < 3; i++) {
      const note = document.createElement(MUSIC_NOTE);
      note.setAttribute('note', 'E' satisfies Note);
      note.setAttribute('octave', `${4 satisfies Octave}`);
      note.setAttribute('duration', 'eighth' satisfies DurationType);
      tuplet.appendChild(note);
    }

    const slot = staff.shadowRoot.querySelector('slot');
    slot.assignedElements = () => [tuplet];
    slot.dispatchEvent(new Event('slotchange'));

    const tupletsContainer =
      staff.shadowRoot.querySelector('.tuplets-container');
    expect(tupletsContainer).not.toBeNull();
  });

  it('renders a .tuplet-group inside .tuplets-container for a triplet', () => {
    const staff = document.createElement(MUSIC_STAFF) as any;
    staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4' satisfies TimeSignature);
    document.body.appendChild(staff);

    const tuplet = document.createElement(MUSIC_TUPLET) as TupletElementType;
    tuplet.setAttribute('ratio', '3' satisfies TupletRatio);
    for (let i = 0; i < 3; i++) {
      const note = document.createElement(MUSIC_NOTE);
      note.setAttribute('note', 'E' satisfies Note);
      note.setAttribute('octave', `${4 satisfies Octave}`);
      note.setAttribute('duration', 'eighth' satisfies DurationType);
      tuplet.appendChild(note);
    }

    const slot = staff.shadowRoot.querySelector('slot');
    slot.assignedElements = () => [tuplet];
    slot.dispatchEvent(new Event('slotchange'));

    const tupletsContainer =
      staff.shadowRoot.querySelector('.tuplets-container');
    const tupletGroup = tupletsContainer?.querySelector('.tuplet-group');
    expect(tupletGroup).not.toBeNull();
  });

  it.each([
    [null, true],
    ['below' satisfies TupletPlacement, false],
  ] as const)(
    'placement=%s draws the numeral above the staff = %s for stem-up notes',
    (placement, numeralAboveStaff) => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4' satisfies TimeSignature);
      document.body.appendChild(staff);

      const tuplet = document.createElement(MUSIC_TUPLET) as TupletElementType;
      tuplet.setAttribute('ratio', '3' satisfies TupletRatio);
      if (placement !== null) {
        tuplet.setAttribute('placement', placement);
      }
      for (let i = 0; i < 3; i++) {
        const note = document.createElement(MUSIC_NOTE);
        note.setAttribute('note', 'E' satisfies Note);
        note.setAttribute('octave', `${4 satisfies Octave}`);
        note.setAttribute('duration', 'quarter' satisfies DurationType);
        tuplet.appendChild(note);
      }

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => [tuplet];
      slot.dispatchEvent(new Event('slotchange'));

      const numeralY = Number(
        staff.shadowRoot
          .querySelector('.tuplets-container .tuplet-numeral')
          .getAttribute('y')
      );
      if (numeralAboveStaff) {
        expect(numeralY).toBeLessThan(STAFF_TOP_LINE_Y);
      } else {
        expect(numeralY).toBeGreaterThan(STAFF_BOTTOM_LINE_Y);
      }
    }
  );

  describe('crossStaffTupletRoles', () => {
    function renderTriplet(octave: Octave) {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4' satisfies TimeSignature);
      document.body.appendChild(staff);

      const tuplet = document.createElement(MUSIC_TUPLET) as TupletElementType;
      tuplet.setAttribute('ratio', '3' satisfies TupletRatio);
      const notes: NoteElementType[] = [];
      for (let i = 0; i < 3; i++) {
        const note = document.createElement(MUSIC_NOTE) as NoteElementType;
        note.setAttribute('note', 'E' satisfies Note);
        note.setAttribute('octave', `${octave}`);
        note.setAttribute('duration', 'quarter' satisfies DurationType);
        tuplet.appendChild(note);
        notes.push(note);
      }

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => [tuplet];
      slot.dispatchEvent(new Event('slotchange'));
      return { staff, tuplet, notes };
    }

    it("forces its members' stems and suppresses the bracket when another level draws it", () => {
      const { staff, tuplet, notes } = renderTriplet(4);
      expect(notes.every((note) => note.stemUp)).toBe(true);

      staff.crossStaffTupletRoles = new Map([
        [tuplet, { stemUp: false, rendering: 'suppressed' }],
      ]);

      expect(notes.every((note) => !note.stemUp)).toBe(true);
      expect(
        staff.shadowRoot.querySelector('.tuplets-container .tuplet-group')
      ).toBeNull();
    });

    it("draws the bracket on the role's forced side, outranking the wrapper's own placement", () => {
      const { staff, tuplet } = renderTriplet(5);
      tuplet.setAttribute('placement', 'below' satisfies TupletPlacement);

      staff.crossStaffTupletRoles = new Map([
        [tuplet, { stemUp: false, rendering: 'above' }],
      ]);

      const numeralY = Number(
        staff.shadowRoot
          .querySelector('.tuplets-container .tuplet-numeral')
          .getAttribute('y')
      );
      expect(numeralY).toBeLessThan(STAFF_TOP_LINE_Y);
    });

    it('releases everything when the role map is cleared', () => {
      const { staff, tuplet, notes } = renderTriplet(4);
      staff.crossStaffTupletRoles = new Map([
        [tuplet, { stemUp: false, rendering: 'suppressed' }],
      ]);

      staff.crossStaffTupletRoles = null;

      expect(notes.every((note) => note.stemUp)).toBe(true);
      expect(
        staff.shadowRoot.querySelector('.tuplets-container .tuplet-group')
      ).not.toBeNull();
    });
  });
});

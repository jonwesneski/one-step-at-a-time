/**
 * @jest-environment jsdom
 */
import '../composition/index';
import '../guitarNote/index';
import '../measure/index';
import type { StaffElementBaseType } from '../types/elements';
import type { DurationType } from '../types/theory';
import {
  COMMON_ATTRIBUTES,
  MUSIC_COMPOSITION,
  MUSIC_GUITAR_NOTE,
  MUSIC_MEASURE,
  MUSIC_STAFF_GUITAR_TAB,
  STAFF_EVENTS,
} from '../utils/consts';
import {
  STAFF_LINE_SPACING,
  STAFF_LINE_START,
} from '../utils/notationDimensions';
import './index';

afterEach(() => {
  document.body.innerHTML = '';
});

describe(MUSIC_STAFF_GUITAR_TAB, () => {
  it('renders shadow root with 6-line tab staff', () => {
    const el = document.createElement(MUSIC_STAFF_GUITAR_TAB) as any;
    document.body.appendChild(el);

    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot.innerHTML).not.toBe('');
  });
});

describe(`${MUSIC_STAFF_GUITAR_TAB} time signature`, () => {
  it('defaults time to 4/4', () => {
    const staff = document.createElement(
      MUSIC_STAFF_GUITAR_TAB
    ) as StaffElementBaseType;
    document.body.appendChild(staff);

    expect(staff.time).toBe('4/4');
  });

  it('is settable/gettable via the time property', () => {
    const staff = document.createElement(
      MUSIC_STAFF_GUITAR_TAB
    ) as StaffElementBaseType;
    document.body.appendChild(staff);

    staff.time = '3/4';

    expect(staff.time).toBe('3/4');
  });

  it('inherits time from a <music-measure> ancestor', () => {
    const measure = document.createElement(MUSIC_MEASURE) as any;
    measure.setAttribute(COMMON_ATTRIBUTES.TIME, '6/8');
    document.body.appendChild(measure);

    const staff = document.createElement(
      MUSIC_STAFF_GUITAR_TAB
    ) as StaffElementBaseType;
    measure.appendChild(staff);

    expect(staff.time).toBe('6/8');
  });

  it('inherits time from a <music-composition> ancestor', () => {
    const composition = document.createElement(MUSIC_COMPOSITION) as any;
    composition.setAttribute(COMMON_ATTRIBUTES.TIME, '5/4');
    document.body.appendChild(composition);

    const measure = document.createElement(MUSIC_MEASURE) as any;
    composition.appendChild(measure);

    const staff = document.createElement(
      MUSIC_STAFF_GUITAR_TAB
    ) as StaffElementBaseType;
    measure.appendChild(staff);

    expect(staff.time).toBe('5/4');
  });

  it('respects a staff-level time override over the measure value', () => {
    const measure = document.createElement(MUSIC_MEASURE) as any;
    measure.setAttribute(COMMON_ATTRIBUTES.TIME, '6/8');
    document.body.appendChild(measure);

    const staff = document.createElement(
      MUSIC_STAFF_GUITAR_TAB
    ) as StaffElementBaseType;
    staff.setAttribute(COMMON_ATTRIBUTES.TIME, '2/4');
    measure.appendChild(staff);

    expect(staff.time).toBe('2/4');
  });
});

describe(`${MUSIC_STAFF_GUITAR_TAB} mirroring a notation staff`, () => {
  const renderTab = () => {
    const staff = document.createElement(MUSIC_STAFF_GUITAR_TAB) as any;
    document.body.appendChild(staff);
    const notes = [0, 1, 2, 3].map((fret) => {
      const note = document.createElement(MUSIC_GUITAR_NOTE);
      note.setAttribute('fret', `${fret}`);
      note.setAttribute('string', '1');
      note.setAttribute('duration', 'quarter' satisfies DurationType);
      return note as HTMLElement;
    });
    const slot = staff.shadowRoot.querySelector('slot');
    slot.assignedElements = () => notes;
    slot.dispatchEvent(new Event('slotchange'));
    return { staff, notes };
  };
  it('relays out for a mirrored clef change, but not for an unchanged list', () => {
    const { staff } = renderTab();
    const relayouts = jest.fn();
    staff.addEventListener(STAFF_EVENTS.STAFF_MIN_WIDTH, relayouts);

    staff.measureClefChangeBeats = [1 / 2];
    expect(relayouts).toHaveBeenCalledTimes(1);

    staff.measureClefChangeBeats = [1 / 2];
    expect(relayouts).toHaveBeenCalledTimes(1);
  });

  it("starts its notes at a sibling staff's wider start area, relaying out only on a change", () => {
    const { staff, notes } = renderTab();
    const ownFirstX = parseFloat(notes[0].style.left);
    const relayouts = jest.fn();
    staff.addEventListener(STAFF_EVENTS.STAFF_MIN_WIDTH, relayouts);

    const notesStartX = staff.ownNotesStartX + 40;
    staff.measureNotesStartX = notesStartX;
    expect(parseFloat(notes[0].style.left)).toBe(ownFirstX + 40);
    expect(relayouts).toHaveBeenCalledTimes(1);

    staff.measureNotesStartX = notesStartX;
    expect(relayouts).toHaveBeenCalledTimes(1);
  });

  it('draws string 1 on the top line and string 6 on the bottom line', () => {
    const staff = document.createElement(MUSIC_STAFF_GUITAR_TAB) as any;
    document.body.appendChild(staff);
    const notes = [1, 6].map((string) => {
      const note = document.createElement(MUSIC_GUITAR_NOTE);
      note.setAttribute('fret', '0');
      note.setAttribute('string', `${string}`);
      note.setAttribute('duration', 'half' satisfies DurationType);
      return note as HTMLElement;
    });
    const slot = staff.shadowRoot.querySelector('slot');
    slot.assignedElements = () => notes;
    slot.dispatchEvent(new Event('slotchange'));

    expect(notes.map((note) => parseFloat(note.style.top))).toEqual([
      STAFF_LINE_START,
      STAFF_LINE_START + STAFF_LINE_SPACING * 5,
    ]);
  });

  it('round-trips tab-for and part through attributes', () => {
    const staff = document.createElement(MUSIC_STAFF_GUITAR_TAB) as any;
    document.body.appendChild(staff);

    staff.tabFor = 'guitar';
    staff.part = 'tab';

    expect(staff.getAttribute('tab-for')).toBe('guitar');
    expect(staff.getAttribute('part')).toBe('tab');
    staff.tabFor = null;
    expect(staff.hasAttribute('tab-for')).toBe(false);
  });
});

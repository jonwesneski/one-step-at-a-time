/**
 * @jest-environment jsdom
 */
import '../note/index';
import '../staff/index';
import { TupletElementType } from '../types/elements';
import type {
  DurationType,
  Note,
  Octave,
  TimeSignature,
  TupletRatio,
} from '../types/theory';
import {
  COMMON_ATTRIBUTES,
  MUSIC_NOTE,
  MUSIC_STAFF,
  MUSIC_TUPLET,
} from '../utils/consts';
import './index';

afterEach(() => {
  document.body.innerHTML = '';
});

describe(MUSIC_TUPLET, () => {
  it('registers as a custom element', () => {
    expect(customElements.get(MUSIC_TUPLET)).toBeDefined();
  });

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
    staff.setAttribute(
      COMMON_ATTRIBUTES.TIME_SIG,
      '4/4' satisfies TimeSignature
    );
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
    staff.setAttribute(
      COMMON_ATTRIBUTES.TIME_SIG,
      '4/4' satisfies TimeSignature
    );
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
});

/**
 * @jest-environment jsdom
 */
import '../staffTreble/index';
import type { NoteLetterOctave } from '../types/elements';
import type {
  DurationType,
  Note,
  Octave,
  TimeSignature,
} from '../types/theory';
import {
  COMMON_ATTRIBUTES,
  MUSIC_NOTE,
  MUSIC_STAFF_TREBLE,
} from '../utils/consts';
import {
  NOTE_Y_HEAD_OFFSET_STEM_DOWN,
  NOTE_Y_HEAD_OFFSET_STEM_UP,
} from '../utils/svgCreator/note';
import './index';
import '../tuplet/index';

afterEach(() => {
  document.body.innerHTML = '';
});

describe(MUSIC_NOTE, () => {
  it('registers as a custom element', () => {
    expect(customElements.get(MUSIC_NOTE)).toBeDefined();
  });

  it('renders with default duration and note', () => {
    const el = document.createElement(MUSIC_NOTE) as any;
    document.body.appendChild(el);

    expect(el.duration).toBe('quarter');
    expect(el.note).toBe('C');
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot.innerHTML).not.toBe('');
  });
});

const TREBLE_STAFF_Y: Record<string, number> = {
  C6: 10,
  B5: 15,
  A5: 20,
  G5: 25,
  F5: 30,
  E5: 35,
  D5: 40,
  C5: 45,
  B4: 50,
  A4: 55,
  G4: 60,
  F4: 65,
  E4: 70,
  D4: 75,
  C4: 80,
};

const MIDDLE_STAFF_Y = 50;
const STAFF_Y_PADDING = 8;

function expectedNoteTop(value: NoteLetterOctave): string {
  const staffY = TREBLE_STAFF_Y[value];
  const stemUp = staffY > MIDDLE_STAFF_Y;
  const yHeadOffset = stemUp
    ? NOTE_Y_HEAD_OFFSET_STEM_UP
    : NOTE_Y_HEAD_OFFSET_STEM_DOWN;
  return `${STAFF_Y_PADDING + staffY - yHeadOffset}px`;
}

function makeStaff(): Element {
  const el = document.createElement(MUSIC_STAFF_TREBLE) as any;
  el.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
  el.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
  el.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
  document.body.appendChild(el);
  return el;
}

function renderNote(
  staff: Element,
  value: Note,
  octave: Octave,
  duration: DurationType = 'quarter'
): HTMLElement {
  const note = document.createElement(MUSIC_NOTE) as any;
  note.setAttribute('duration', duration);
  note.setAttribute('note', value);
  note.setAttribute('octave', `${octave}`);
  staff.appendChild(note);
  const slot = (staff as any).shadowRoot.querySelector('slot');
  slot.assignedElements = () => [note];
  slot.dispatchEvent(new Event('slotchange'));
  return note;
}

describe('staff integration', () => {
  it('repositions Y and preserves X when note attribute changes', () => {
    const staff = makeStaff();
    const note = renderNote(staff, 'E', 4);
    const initialLeft = note.style.left;

    note.setAttribute('note', 'G' satisfies Note);
    note.setAttribute('octave', `${4 satisfies Octave}`);

    expect(note.style.top).toBe(expectedNoteTop('G4'));
    expect(note.style.left).toBe(initialLeft);
  });

  it('repositions Y and preserves X when octave attribute changes', () => {
    const staff = makeStaff();
    const note = renderNote(staff, 'E', 4);
    const initialLeft = note.style.left;

    note.setAttribute('octave', `${5 satisfies Octave}`);

    expect(note.style.top).toBe(expectedNoteTop('E5'));
    expect(note.style.left).toBe(initialLeft);
  });

  it('flips stem direction when note moves across the middle of the staff', () => {
    const staff = makeStaff();
    // C4 (staffY=80 > 50) → stemUp=true
    const note = renderNote(staff, 'C', 4) as any;
    expect(note.stemUp).toBe(true);

    // C5 (staffY=45 ≤ 50) → stemUp=false
    note.setAttribute('note', 'C' satisfies Note);
    note.setAttribute('octave', `${5 satisfies Octave}`);

    expect(note.stemUp).toBe(false);
  });

  it('keeps noFlags=false on a single eighth note after note changes (flag is drawn)', () => {
    const staff = makeStaff();
    const note = renderNote(staff, 'E', 4, 'eighth') as any;
    expect(note.noFlags).toBe(false);

    note.setAttribute('note', 'G' satisfies Note);
    note.setAttribute('octave', `${4 satisfies Octave}`);

    expect(note.noFlags).toBe(false);
  });

  it('keeps noFlags=true on beamed eighth notes after note changes', () => {
    const staff = makeStaff();
    const note1 = document.createElement(MUSIC_NOTE) as any;
    note1.setAttribute('duration', 'eighth' satisfies DurationType);
    note1.setAttribute('note', 'E' satisfies Note);
    note1.setAttribute('octave', `${4 satisfies Octave}`);
    const note2 = document.createElement(MUSIC_NOTE) as any;
    note2.setAttribute('duration', 'eighth' satisfies DurationType);
    note2.setAttribute('note', 'G' satisfies Note);
    note2.setAttribute('octave', `${4 satisfies Octave}`);

    const slot = (staff as any).shadowRoot.querySelector('slot');
    slot.assignedElements = () => [note1, note2];
    slot.dispatchEvent(new Event('slotchange'));

    expect(note1.noFlags).toBe(true);

    note1.setAttribute('note', 'A' satisfies Note);

    expect(note1.noFlags).toBe(true);
  });

  it('repositions Y correctly for a whole note when note attribute changes', () => {
    const staff = makeStaff();
    const note = renderNote(staff, 'E', 4, 'whole');
    const initialLeft = note.style.left;

    note.setAttribute('note', 'G' satisfies Note);
    note.setAttribute('octave', `${4 satisfies Octave}`);

    expect(note.style.top).toBe(expectedNoteTop('G4'));
    expect(note.style.left).toBe(initialLeft);
  });

  it('renders a double-whole note in a 4/2 staff without overflow error', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const staff = document.createElement(MUSIC_STAFF_TREBLE) as any;
    staff.setAttribute(
      COMMON_ATTRIBUTES.TIME_SIG,
      '4/2' satisfies TimeSignature
    );
    document.body.appendChild(staff);

    const note = document.createElement(MUSIC_NOTE) as any;
    note.setAttribute('duration', 'double-whole' satisfies DurationType);
    note.setAttribute('note', 'C');
    note.setAttribute('octave', `${4 satisfies Octave}`);

    const slot = staff.shadowRoot.querySelector('slot');
    slot.assignedElements = () => [note];
    slot.dispatchEvent(new Event('slotchange'));

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

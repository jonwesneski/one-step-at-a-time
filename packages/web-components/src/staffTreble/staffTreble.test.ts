/**
 * @jest-environment jsdom
 */
import '../index';
import {
  NOTE_Y_HEAD_OFFSET_STEM_DOWN,
  NOTE_Y_HEAD_OFFSET_STEM_UP,
} from '../utils/svgCreator/note';

afterEach(() => {
  document.body.innerHTML = '';
});

// Y staff coordinate for each note in the treble clef (mirrors StaffTrebleElement's yCoordinates).
const TREBLE_STAFF_Y: Record<string, number> = {
  C6: 10,
  B5: 15,
  A5: 20,
  G5: 25, // ^ above staff
  F5: 30,
  E5: 35,
  D5: 40,
  C5: 45,
  B4: 50,
  A4: 55,
  G4: 60,
  F4: 65,
  E4: 70,
  // below staff
  D4: 75,
  C4: 80,
};

const MIDDLE_STAFF_Y = 50;
const STAFF_Y_PADDING = 8;

// Expected `style.top` value on the positioned <music-note> element.
// Stem direction mirrors StaffClassicalElementBase#determineStemDirections.
function expectedNoteTop(value: string): string {
  const staffY = TREBLE_STAFF_Y[value];
  const stemUp = staffY > MIDDLE_STAFF_Y;
  const yHeadOffset = stemUp
    ? NOTE_Y_HEAD_OFFSET_STEM_UP
    : NOTE_Y_HEAD_OFFSET_STEM_DOWN;
  return `${STAFF_Y_PADDING + staffY - yHeadOffset}px`;
}

function makeStaff(): Element {
  const el = document.createElement('music-staff-treble') as any;
  el.setAttribute('keysig', 'C');
  el.setAttribute('mode', 'major');
  el.setAttribute('time', '4/4');
  document.body.appendChild(el);
  return el;
}

function renderNote(staff: Element, value: string): HTMLElement {
  const note = document.createElement('music-note') as any;
  note.setAttribute('duration', 'quarter');
  note.setAttribute('value', value);
  const slot = (staff as any).shadowRoot.querySelector('slot');
  slot.assignedElements = () => [note];
  slot.dispatchEvent(new Event('slotchange'));
  return note;
}

describe('music-staff-treble', () => {
  it('registers as a custom element', () => {
    expect(customElements.get('music-staff-treble')).toBeDefined();
  });

  it('renders shadow root with provided key signature attributes', () => {
    const el = document.createElement('music-staff-treble') as any;
    el.setAttribute('keysig', 'C');
    el.setAttribute('mode', 'major');
    el.setAttribute('time', '4/4');
    document.body.appendChild(el);

    expect(el.keySig).toBe('C');
    expect(el.mode).toBe('major');
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot.innerHTML).not.toBe('');
  });
});

describe('music-staff-treble note head alignment', () => {
  describe('octave 4 — notes within the staff', () => {
    it('places E4 (5th/bottom staff line) at the correct y', () => {
      const note = renderNote(makeStaff(), 'E4');
      expect(note.style.top).toBe(expectedNoteTop('E4'));
    });

    it('places A4 (3rd space, between 3rd and 4th line) at the correct y', () => {
      const note = renderNote(makeStaff(), 'A4');
      expect(note.style.top).toBe(expectedNoteTop('A4'));
    });
  });

  describe('octave 5 — notes within the staff', () => {
    it('places F5 stem down (1st/top staff line) at the correct y', () => {
      const note = renderNote(makeStaff(), 'F5');
      expect(note.style.top).toBe(expectedNoteTop('F5'));
    });

    it('places E5 stem down (1st space, between 1st and 2nd line) at the correct y', () => {
      const note = renderNote(makeStaff(), 'E5');
      expect(note.style.top).toBe(expectedNoteTop('E5'));
    });
  });

  describe('notes above the staff', () => {
    it('places G5 stem down (1 position above top line F5) 5px above F5', () => {
      const note = renderNote(makeStaff(), 'G5');
      expect(note.style.top).toBe(expectedNoteTop('G5'));
    });

    it('places B5 stem down (3 positions above top line F5) 15px above F5', () => {
      const note = renderNote(makeStaff(), 'B5');
      expect(note.style.top).toBe(expectedNoteTop('B5'));
    });

    it('places C6 stem down (1st ledger line above, 4 positions above F5) 20px above F5', () => {
      const note = renderNote(makeStaff(), 'C6');
      expect(note.style.top).toBe(expectedNoteTop('C6'));
    });
  });

  describe('notes below the staff', () => {
    it('places D4 (1 position below bottom line E4) 5px below E4', () => {
      const note = renderNote(makeStaff(), 'D4');
      expect(note.style.top).toBe(expectedNoteTop('D4'));
    });

    it('places C4 (1st ledger line below, middle C, 2 positions below E4) 10px below E4', () => {
      const note = renderNote(makeStaff(), 'C4');
      expect(note.style.top).toBe(expectedNoteTop('C4'));
    });
  });
});

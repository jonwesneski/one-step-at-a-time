/**
 * @jest-environment jsdom
 */
import './index';
import type { NoteLetterOctave } from './types/elements';
import { ChordElementType, RestElementType } from './types/elements';
import type { DurationType, Note, Octave } from './types/theory';
import { restToYCoordinate } from './rules/restRules';
import {
  NOTE_Y_HEAD_OFFSET_STEM_DOWN,
  NOTE_Y_HEAD_OFFSET_STEM_UP,
} from './utils/svgCreator/note';

afterEach(() => {
  document.body.innerHTML = '';
});

// I'm using <music-staff-treble /> to test staffClassicalBase specific scenarios
describe('staffClassicalBase', () => {
  it('logs an error when adding another note on a filled measure', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const el = document.createElement('music-staff-treble') as any;
    el.setAttribute('time', '4/4');
    document.body.appendChild(el);

    const notes = Array.from({ length: 5 }, () => {
      const note = document.createElement('music-note') as any;
      note.setAttribute('duration', 'quarter');
      note.setAttribute('note', 'C4');
      return note;
    });

    const slot = el.shadowRoot.querySelector('slot');
    slot.assignedElements = () => notes;
    slot.dispatchEvent(new Event('slotchange'));

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('no more room for note(s)')
    );

    errorSpy.mockRestore();
  });

  it('logs an error when adding a note that partially exceeds the remaining available space in measure', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const el = document.createElement('music-staff-treble') as any;
    el.setAttribute('time', '4/4');
    document.body.appendChild(el);

    const notes = [
      ...Array.from({ length: 3 }, () => {
        const note = document.createElement('music-note') as any;
        note.setAttribute('duration', 'quarter');
        note.setAttribute('note', 'C4');
        return note;
      }),
      (() => {
        const note = document.createElement('music-note') as any;
        note.setAttribute('duration', 'half');
        note.setAttribute('note', 'C4');
        return note;
      })(),
    ];

    const slot = el.shadowRoot.querySelector('slot');
    slot.assignedElements = () => notes;
    slot.dispatchEvent(new Event('slotchange'));

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('no more room for note(s)')
    );

    errorSpy.mockRestore();
  });

  it('assigns ascending pitch Y coordinates to a chord driven by chord attribute', () => {
    const staff = document.createElement('music-staff-treble') as any;
    document.body.appendChild(staff);

    const chord = document.createElement('music-chord') as ChordElementType;
    chord.setAttribute('chord', 'Bmaj');
    chord.setAttribute('duration', 'quarter');
    document.body.appendChild(chord);

    const slot = staff.shadowRoot.querySelector('slot');
    slot.assignedElements = () => [chord];
    slot.dispatchEvent(new Event('slotchange'));

    const coords = chord.staffYCoordinates;
    expect(coords).not.toBeNull();
    expect(coords!.length).toBe(3);
    // Each note should be higher in pitch (lower Y) than the previous
    expect(coords![1]).toBeLessThan(coords![0]);
    expect(coords![2]).toBeLessThan(coords![1]);
  });
});

// Y staff coordinate for each note in the treble clef (mirrors StaffTrebleElement's yCoordinates).
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
  const el = document.createElement('music-staff-treble') as any;
  el.setAttribute('keysig', 'C');
  el.setAttribute('mode', 'major');
  el.setAttribute('time', '4/4');
  document.body.appendChild(el);
  return el;
}

function renderNote(
  staff: Element,
  value: NoteLetterOctave,
  duration: DurationType = 'quarter'
): HTMLElement {
  const note = document.createElement('music-note') as any;
  note.setAttribute('duration', duration);
  note.setAttribute('note', value[0] as Note);
  note.setAttribute('octave', value[1] as unknown as Octave);
  staff.appendChild(note);
  const slot = (staff as any).shadowRoot.querySelector('slot');
  slot.assignedElements = () => [note];
  slot.dispatchEvent(new Event('slotchange'));
  return note;
}

function renderRest(staff: Element, duration: DurationType): RestElementType {
  const rest = document.createElement('music-rest') as RestElementType;
  rest.setAttribute('duration', duration);
  staff.appendChild(rest);
  const slot = (staff as any).shadowRoot.querySelector('slot');
  slot.assignedElements = () => [rest];
  slot.dispatchEvent(new Event('slotchange'));
  return rest;
}

function renderChordByNotes(
  staff: Element,
  notes: NoteLetterOctave[],
  duration: DurationType = 'quarter'
): ChordElementType {
  const chord = document.createElement('music-chord') as ChordElementType;
  chord.setAttribute('duration', duration);
  for (const value of notes) {
    const note = document.createElement('music-note') as any;
    note.setAttribute('note', value[0] as Note);
    note.setAttribute('octave', value[1] as unknown as Octave);
    chord.appendChild(note);
  }
  staff.appendChild(chord);
  const slot = (staff as any).shadowRoot.querySelector('slot');
  slot.assignedElements = () => [chord];
  slot.dispatchEvent(new Event('slotchange'));
  return chord;
}

function renderChordByAttribute(
  staff: Element,
  chordAttr: string,
  duration: DurationType = 'quarter'
): ChordElementType {
  const chord = document.createElement('music-chord') as ChordElementType;
  chord.setAttribute('chord', chordAttr);
  chord.setAttribute('duration', duration);
  staff.appendChild(chord);
  const slot = (staff as any).shadowRoot.querySelector('slot');
  slot.assignedElements = () => [chord];
  slot.dispatchEvent(new Event('slotchange'));
  return chord;
}

describe('note integration', () => {
  it('repositions Y and preserves X when note attribute changes', () => {
    const staff = makeStaff();
    const note = renderNote(staff, 'E4');
    const initialLeft = note.style.left;

    note.setAttribute('note', 'G' as Note);

    expect(note.style.top).toBe(expectedNoteTop('G4'));
    expect(note.style.left).toBe(initialLeft);
  });

  it('repositions Y and preserves X when octave attribute changes', () => {
    const staff = makeStaff();
    const note = renderNote(staff, 'E4');
    const initialLeft = note.style.left;

    note.setAttribute('octave', `${5 satisfies Octave}`);

    expect(note.style.top).toBe(expectedNoteTop('E5'));
    expect(note.style.left).toBe(initialLeft);
  });

  it('flips stem direction when note moves across the middle of the staff', () => {
    const staff = makeStaff();
    // C4 (staffY=80 > 50) → stemUp=true
    const note = renderNote(staff, 'C4') as any;
    expect(note.stemUp).toBe(true);

    // C5 (staffY=45 ≤ 50) → stemUp=false
    note.setAttribute('note', 'C' as Note);
    note.setAttribute('octave', `${5 satisfies Octave}`);

    expect(note.stemUp).toBe(false);
  });

  it('keeps noFlags=false on a single eighth note after note changes (flag is drawn)', () => {
    const staff = makeStaff();
    const note = renderNote(staff, 'E4', 'eighth') as any;
    expect(note.noFlags).toBe(false);

    note.setAttribute('note', 'G' as Note);

    expect(note.noFlags).toBe(false);
  });

  it('keeps noFlags=true on beamed eighth notes after note changes', () => {
    const staff = makeStaff();
    const note1 = document.createElement('music-note') as any;
    note1.setAttribute('duration', 'eighth' as DurationType);
    note1.setAttribute('note', 'E' as Note);
    note1.setAttribute('octave', `${4 satisfies Octave}`);
    const note2 = document.createElement('music-note') as any;
    note2.setAttribute('duration', 'eighth' as DurationType);
    note2.setAttribute('note', 'G' as Note);
    note2.setAttribute('octave', `${4 satisfies Octave}`);

    const slot = (staff as any).shadowRoot.querySelector('slot');
    slot.assignedElements = () => [note1, note2];
    slot.dispatchEvent(new Event('slotchange'));

    expect(note1.noFlags).toBe(true);

    note1.setAttribute('note', 'A' as Note);

    expect(note1.noFlags).toBe(true);
  });

  it('repositions Y correctly for a whole note when note attribute changes', () => {
    const staff = makeStaff();
    const note = renderNote(staff, 'E4', 'whole');
    const initialLeft = note.style.left;

    note.setAttribute('note', 'G' as Note);

    expect(note.style.top).toBe(expectedNoteTop('G4'));
    expect(note.style.left).toBe(initialLeft);
  });
});

describe('chord integration', () => {
  it('positions chord at top 0px (Y is handled internally by chord SVG)', () => {
    const staff = makeStaff();
    const chord = renderChordByNotes(staff, ['E4', 'G4', 'B4']);
    expect(chord.style.top).toBe('0px');
  });

  it('flips stem direction when all notes move above the middle of the staff', () => {
    const staff = makeStaff();
    // E4(70), G4(60) — both > MIDDLE_STAFF_Y(50) → stemUp=true
    const chord = renderChordByNotes(staff, ['E4', 'G4']) as any;
    expect(chord.stemUp).toBe(true);

    // Re-render with E5(35), G5(25) — both ≤ MIDDLE_STAFF_Y → stemUp=false
    const updatedChord = renderChordByNotes(staff, ['E5', 'G5']) as any;
    const slot = (staff as any).shadowRoot.querySelector('slot');
    slot.assignedElements = () => [updatedChord];
    slot.dispatchEvent(new Event('slotchange'));

    expect(updatedChord.stemUp).toBe(false);
  });

  it('assigns descending Y coordinates (ascending pitch) for a chord driven by chord attribute', () => {
    const staff = makeStaff();
    // Cmaj = C4(80), E4(70), G4(60) in treble — descending Y = ascending pitch
    const chord = renderChordByAttribute(staff, 'Cmaj');
    const coords = chord.staffYCoordinates;
    expect(coords).not.toBeNull();
    expect(coords!.length).toBe(3);
    expect(coords![0]).toBe(TREBLE_STAFF_Y['C4']); // 80 — root, lowest pitch
    expect(coords![1]).toBe(TREBLE_STAFF_Y['E4']); // 70
    expect(coords![2]).toBe(TREBLE_STAFF_Y['G4']); // 60 — highest pitch
  });
});

describe('rest integration', () => {
  it('positions quarter rest at the correct Y for its duration', () => {
    const staff = makeStaff();
    const rest = renderRest(staff, 'quarter');
    expect(rest.style.top).toBe(`${restToYCoordinate('quarter')}px`);
  });

  it('repositions Y and preserves X when duration changes from quarter to half', () => {
    const staff = makeStaff();
    const rest = renderRest(staff, 'quarter');
    const initialLeft = rest.style.left;

    rest.setAttribute('duration', 'half' as DurationType);

    expect(rest.style.top).toBe(`${restToYCoordinate('half')}px`);
    expect(rest.style.left).toBe(initialLeft);
  });

  it('positions whole rest at the correct Y for its duration', () => {
    const staff = makeStaff();
    const rest = renderRest(staff, 'whole');
    expect(rest.style.top).toBe(`${restToYCoordinate('whole')}px`);
  });
});

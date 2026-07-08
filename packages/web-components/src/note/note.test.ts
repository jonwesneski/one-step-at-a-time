/**
 * @jest-environment jsdom
 */
import '../staffTreble/index';
import '../tuplet/index';
import type { NoteElementType, NoteLetterOctave } from '../types/elements';
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

afterEach(() => {
  document.body.innerHTML = '';
});

describe(MUSIC_NOTE, () => {
  it('registers as a custom element', () => {
    expect(customElements.get(MUSIC_NOTE)).toBeDefined();
  });

  it('renders with default duration and note', () => {
    const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
    document.body.appendChild(noteElement);

    expect(noteElement.duration).toBe('quarter');
    expect(noteElement.note).toBe('C');
    expect(noteElement.shadowRoot).not.toBeNull();
    expect(noteElement.shadowRoot?.innerHTML).not.toBe('');
  });
});

describe('diminuendo alias', () => {
  it('normalizes the diminuendo attribute into decrescendo', () => {
    const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
    document.body.appendChild(noteElement);

    noteElement.setAttribute('diminuendo', 'start');

    expect(noteElement.getAttribute('decrescendo')).toBe('start');
    expect(noteElement.getAttribute('diminuendo')).toBeNull();
    expect(noteElement.decrescendo).toBe('start');
    expect(noteElement.diminuendo).toBe('start');
  });

  it('sets decrescendo through the diminuendo property setter', () => {
    const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
    document.body.appendChild(noteElement);

    noteElement.diminuendo = 'end';

    expect(noteElement.decrescendo).toBe('end');
    expect(noteElement.getAttribute('decrescendo')).toBe('end');
    expect(noteElement.getAttribute('diminuendo')).toBeNull();
  });

  it('clears decrescendo when diminuendo is set to null', () => {
    const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
    document.body.appendChild(noteElement);

    noteElement.decrescendo = 'start';
    noteElement.diminuendo = null;

    expect(noteElement.decrescendo).toBeNull();
    expect(noteElement.getAttribute('decrescendo')).toBeNull();
  });
});

describe('articulations', () => {
  it('round-trips the articulation and stress slots between property and attribute', () => {
    const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
    document.body.appendChild(noteElement);

    noteElement.articulation = 'marcato-portato';
    noteElement.stress = 'stressed';

    expect(noteElement.getAttribute('articulation')).toBe('marcato-portato');
    expect(noteElement.getAttribute('stress')).toBe('stressed');
    expect(noteElement.articulation).toBe('marcato-portato');
    expect(noteElement.stress).toBe('stressed');
  });

  it('ignores unrecognized articulation values, including illegal combinations', () => {
    const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
    document.body.appendChild(noteElement);

    // Illegal combos are simply not values of the union → parsed as null.
    noteElement.setAttribute('articulation', 'fermata-staccato');
    expect(noteElement.articulation).toBeNull();

    noteElement.setAttribute('articulation', 'staccato-staccatissimo');
    expect(noteElement.articulation).toBeNull();

    noteElement.setAttribute('stress', 'loud');
    expect(noteElement.stress).toBeNull();
  });

  it('clears the articulation slot when set to null', () => {
    const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
    document.body.appendChild(noteElement);

    noteElement.articulation = 'staccato';
    noteElement.articulation = null;

    expect(noteElement.articulation).toBeNull();
    expect(noteElement.getAttribute('articulation')).toBeNull();
  });

  it('renders the decomposed glyphs for a combined value inside the note SVG', () => {
    const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
    // accent-portato = standard accent + (tenuto + staccato).
    noteElement.setAttribute('articulation', 'accent-portato');
    document.body.appendChild(noteElement);

    const marks = noteElement.shadowRoot?.querySelector('.articulations');
    expect(marks).not.toBeNull();
    expect(marks?.querySelector('.staccato')).not.toBeNull();
    expect(marks?.querySelector('.tenuto')).not.toBeNull();
    expect(marks?.querySelector('.accent')).not.toBeNull();
  });

  it('places the fermata opposite the stem, outermost of the marks', () => {
    // Stem-up note: marks go below the head. Fermata sits below, further out
    // than the accent.
    const stemUpNote = document.createElement(MUSIC_NOTE) as NoteElementType;
    stemUpNote.stemUp = true;
    stemUpNote.setAttribute('articulation', 'accent-fermata');
    document.body.appendChild(stemUpNote);

    const fermata = stemUpNote.shadowRoot?.querySelector('.fermata');
    const accent = stemUpNote.shadowRoot?.querySelector('.accent');
    const head = stemUpNote.shadowRoot?.querySelector('.head');
    expect(fermata).not.toBeNull();
    expect(accent).not.toBeNull();

    const fermataDotY = Number(
      fermata?.querySelector('circle')?.getAttribute('cy')
    );
    const headY = Number(head?.getAttribute('cy'));
    // Middle vertex of the accent chevron ("x1,y1 x2,y2 x3,y3") is its center y.
    const accentPoints = accent?.getAttribute('points') ?? '';
    const accentY = Number(accentPoints.split(' ')[1]?.split(',')[1]);
    // Below the head (larger y), and further from it than the accent chevron.
    expect(fermataDotY).toBeGreaterThan(headY);
    expect(fermataDotY).toBeGreaterThan(accentY);
  });

  it('places the fermata above a stem-down note', () => {
    const stemDownNote = document.createElement(MUSIC_NOTE) as NoteElementType;
    stemDownNote.stemUp = false;
    stemDownNote.setAttribute('articulation', 'fermata');
    document.body.appendChild(stemDownNote);

    const fermataDotY = Number(
      stemDownNote.shadowRoot
        ?.querySelector('.fermata')
        ?.querySelector('circle')
        ?.getAttribute('cy')
    );
    const headY = Number(
      stemDownNote.shadowRoot?.querySelector('.head')?.getAttribute('cy')
    );
    expect(fermataDotY).toBeLessThan(headY);
  });

  it('renders no articulation group when no marks are set', () => {
    const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
    document.body.appendChild(noteElement);

    expect(noteElement.shadowRoot?.querySelector('.articulations')).toBeNull();
  });

  it('places marks on the side opposite the stem', () => {
    // Stem-up note (default standalone): marks sit below the notehead (larger y).
    const stemUpNote = document.createElement(MUSIC_NOTE) as NoteElementType;
    stemUpNote.stemUp = true;
    stemUpNote.setAttribute('articulation', 'staccato');
    document.body.appendChild(stemUpNote);
    const upDot = stemUpNote.shadowRoot?.querySelector('.staccato');
    const upHead = stemUpNote.shadowRoot?.querySelector('.head');

    const stemDownNote = document.createElement(MUSIC_NOTE) as NoteElementType;
    stemDownNote.stemUp = false;
    stemDownNote.setAttribute('articulation', 'staccato');
    document.body.appendChild(stemDownNote);
    const downDot = stemDownNote.shadowRoot?.querySelector('.staccato');
    const downHead = stemDownNote.shadowRoot?.querySelector('.head');

    const upDotY = Number(upDot?.getAttribute('cy'));
    const upHeadY = Number(upHead?.getAttribute('cy'));
    const downDotY = Number(downDot?.getAttribute('cy'));
    const downHeadY = Number(downHead?.getAttribute('cy'));

    // Below the head when stem is up, above it when stem is down.
    expect(upDotY).toBeGreaterThan(upHeadY);
    expect(downDotY).toBeLessThan(downHeadY);
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
  const staffTreble = document.createElement(MUSIC_STAFF_TREBLE) as any;
  staffTreble.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
  staffTreble.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
  staffTreble.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
  document.body.appendChild(staffTreble);
  return staffTreble;
}

function renderNote(
  staff: Element,
  value: Note,
  octave: Octave,
  duration: DurationType = 'quarter'
): HTMLElement {
  const note = document.createElement(MUSIC_NOTE) as NoteElementType;
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

  it('renders a double-whole note in a 4/2 staff without overflow warning', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

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

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

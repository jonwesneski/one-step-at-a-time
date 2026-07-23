/**
 * @jest-environment jsdom
 */
import '../index';
import { generateYCoordinates } from '../rules/theoryHelpers';
import type { ClefElementType, NoteLetterOctave } from '../types/elements';
import type { ClefType } from '../types/theory';
import {
  COMMON_ATTRIBUTES,
  MUSIC_CLEF,
  MUSIC_NOTE,
  MUSIC_STAFF,
  MUSIC_TUPLET,
} from '../utils/consts';
import {
  NOTE_Y_HEAD_OFFSET_STEM_DOWN,
  NOTE_Y_HEAD_OFFSET_STEM_UP,
} from '../utils/svgCreator/note';

afterEach(() => {
  document.body.innerHTML = '';
});

const CLEF_RANGES: Record<ClefType, [NoteLetterOctave, NoteLetterOctave]> = {
  treble: ['C6', 'C4'],
  bass: ['E4', 'E2'],
};

const MIDDLE_STAFF_Y = 50;
const STAFF_Y_PADDING = 8;

// Expected `style.top` value on the positioned <music-note> element, derived
// from the same generateYCoordinates helper the staff itself uses — this
// verifies the staff wires its `clef` attribute to the correct table rather
// than re-deriving the table by hand (already regression-locked separately
// in rules/clefRules.test.ts).
function expectedNoteTop(clef: ClefType, value: NoteLetterOctave): string {
  const [highest, lowest] = CLEF_RANGES[clef];
  const yCoordinates = generateYCoordinates(highest, lowest);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- test fixture values are always in range
  const staffY = yCoordinates[value]!;
  const stemUp = staffY > MIDDLE_STAFF_Y;
  const yHeadOffset = stemUp
    ? NOTE_Y_HEAD_OFFSET_STEM_UP
    : NOTE_Y_HEAD_OFFSET_STEM_DOWN;
  return `${STAFF_Y_PADDING + staffY - yHeadOffset}px`;
}

function makeStaff(clef: ClefType = 'treble'): any {
  const element = document.createElement(MUSIC_STAFF) as any;
  element.setAttribute('clef', clef);
  element.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
  element.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
  element.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
  document.body.appendChild(element);
  return element;
}

function renderNote(staff: any, value: NoteLetterOctave): HTMLElement {
  const note = document.createElement(MUSIC_NOTE) as any;
  note.setAttribute('duration', 'quarter');
  note.setAttribute('note', value[0]);
  note.setAttribute('octave', value[1]);
  const slot = staff.shadowRoot.querySelector('slot');
  slot.assignedElements = () => [note];
  slot.dispatchEvent(new Event('slotchange'));
  return note;
}

describe(MUSIC_STAFF, () => {
  it('registers as a custom element', () => {
    expect(customElements.get(MUSIC_STAFF)).toBeDefined();
  });

  it('defaults clef to treble when attribute is absent', () => {
    const element = document.createElement(MUSIC_STAFF) as any;
    document.body.appendChild(element);
    expect(element.clef).toBe('treble');
  });

  it('renders shadow root with provided key signature attributes', () => {
    const element = makeStaff('treble');
    expect(element.keySig).toBe('C');
    expect(element.mode).toBe('major');
    expect(element.shadowRoot).not.toBeNull();
    expect(element.shadowRoot.innerHTML).not.toBe('');
  });

  it.each<ClefType>(['treble', 'bass'])(
    'renders a %s clef glyph in shadow DOM',
    (clef) => {
      const element = makeStaff(clef);
      expect(element.shadowRoot.querySelector('svg.clef')).not.toBeNull();
    }
  );
});

describe(`${MUSIC_STAFF} note head alignment`, () => {
  it.each<ClefType>(['treble', 'bass'])(
    'places the clef range boundary notes at the correct y (%s)',
    (clef) => {
      const [highest, lowest] = CLEF_RANGES[clef];
      const staff = makeStaff(clef);

      const highNote = renderNote(staff, highest);
      expect(highNote.style.top).toBe(expectedNoteTop(clef, highest));

      const staff2 = makeStaff(clef);
      const lowNote = renderNote(staff2, lowest);
      expect(lowNote.style.top).toBe(expectedNoteTop(clef, lowest));
    }
  );

  it('places the same note letter+octave at different Y positions depending on clef', () => {
    const trebleStaff = makeStaff('treble');
    const trebleNote = renderNote(trebleStaff, 'C4');

    const bassStaff = makeStaff('bass');
    const bassNote = renderNote(bassStaff, 'C4');

    expect(trebleNote.style.top).not.toBe(bassNote.style.top);
  });
});

describe(`${MUSIC_STAFF} clef changes`, () => {
  function makeClefMarker(clef: ClefType): ClefElementType {
    const clefEl = document.createElement(MUSIC_CLEF) as ClefElementType;
    clefEl.setAttribute('clef', clef);
    return clefEl;
  }

  function renderElements(staff: any, elements: Element[]): void {
    const slot = staff.shadowRoot.querySelector('slot');
    slot.assignedElements = () => elements;
    slot.dispatchEvent(new Event('slotchange'));
  }

  it('notes before a marker use the staff clef; notes after use the marker clef', () => {
    const staff = makeStaff('treble');

    const noteBefore = document.createElement(MUSIC_NOTE) as any;
    noteBefore.setAttribute('duration', 'quarter');
    noteBefore.setAttribute('note', 'C');
    noteBefore.setAttribute('octave', '4');

    const clefMarker = makeClefMarker('bass');

    const noteAfter = document.createElement(MUSIC_NOTE) as any;
    noteAfter.setAttribute('duration', 'quarter');
    noteAfter.setAttribute('note', 'C');
    noteAfter.setAttribute('octave', '4');

    renderElements(staff, [noteBefore, clefMarker, noteAfter]);

    expect(noteBefore.style.top).toBe(expectedNoteTop('treble', 'C4'));
    expect(noteAfter.style.top).toBe(expectedNoteTop('bass', 'C4'));
    expect(noteBefore.style.top).not.toBe(noteAfter.style.top);
  });

  it('supports multiple clef markers producing multiple segments', () => {
    const staff = makeStaff('treble');

    const note1 = document.createElement(MUSIC_NOTE) as any;
    note1.setAttribute('duration', 'quarter');
    note1.setAttribute('note', 'C');
    note1.setAttribute('octave', '4');

    const clef1 = makeClefMarker('bass');

    const note2 = document.createElement(MUSIC_NOTE) as any;
    note2.setAttribute('duration', 'quarter');
    note2.setAttribute('note', 'C');
    note2.setAttribute('octave', '4');

    const clef2 = makeClefMarker('treble');

    const note3 = document.createElement(MUSIC_NOTE) as any;
    note3.setAttribute('duration', 'quarter');
    note3.setAttribute('note', 'C');
    note3.setAttribute('octave', '4');

    renderElements(staff, [note1, clef1, note2, clef2, note3]);

    expect(note1.style.top).toBe(expectedNoteTop('treble', 'C4'));
    expect(note2.style.top).toBe(expectedNoteTop('bass', 'C4'));
    expect(note3.style.top).toBe(expectedNoteTop('treble', 'C4'));
  });

  it('a clef marker at the very start (afterElementIndex -1) applies to the first note', () => {
    const staff = makeStaff('treble');

    const clefMarker = makeClefMarker('bass');
    const note = document.createElement(MUSIC_NOTE) as any;
    note.setAttribute('duration', 'quarter');
    note.setAttribute('note', 'C');
    note.setAttribute('octave', '4');

    renderElements(staff, [clefMarker, note]);

    expect(note.style.top).toBe(expectedNoteTop('bass', 'C4'));
    expect(staff.effectiveStartClef).toBe('bass');
  });

  it('warns and drops a clef marker nested inside a tuplet', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const staff = makeStaff('treble');

    const tuplet = document.createElement(MUSIC_TUPLET) as any;
    tuplet.setAttribute('ratio', '3');
    const clefMarker = makeClefMarker('bass');
    tuplet.appendChild(clefMarker);
    for (let i = 0; i < 3; i++) {
      const note = document.createElement(MUSIC_NOTE) as any;
      note.setAttribute('duration', 'eighth');
      note.setAttribute('note', 'C');
      note.setAttribute('octave', '4');
      tuplet.appendChild(note);
    }

    renderElements(staff, [tuplet]);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('<music-clef> inside <music-tuplet>')
    );
    expect(staff.effectiveEndClef).toBe('treble');

    consoleSpy.mockRestore();
  });

  it('drops and hides a clef marker whose anchor note is truncated by measure overflow', () => {
    const staff = makeStaff('treble');
    staff.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '1/4');

    const note1 = document.createElement(MUSIC_NOTE) as any;
    note1.setAttribute('duration', 'quarter');
    note1.setAttribute('note', 'C');
    note1.setAttribute('octave', '4');

    // This second note exceeds the 1/4 measure and gets truncated — the
    // marker anchored after it (afterElementIndex 1) must be dropped and
    // hidden too, since its anchor no longer exists in the rendered array.
    const note2 = document.createElement(MUSIC_NOTE) as any;
    note2.setAttribute('duration', 'quarter');
    note2.setAttribute('note', 'D');
    note2.setAttribute('octave', '4');

    const clefMarker = makeClefMarker('bass');

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    renderElements(staff, [note1, note2, clefMarker]);
    consoleSpy.mockRestore();

    expect(note2.style.display).toBe('none');
    expect(clefMarker.style.display).toBe('none');
    expect(staff.effectiveEndClef).toBe('treble');
  });
});

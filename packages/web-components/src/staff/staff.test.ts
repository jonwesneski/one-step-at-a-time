/**
 * @jest-environment jsdom
 */
import '../index';
import type { MarkerBeat } from '../rules/streamMarkerRules';
import {
  extrapolateYCoordinate,
  generateYCoordinates,
} from '../rules/theoryHelpers';
import type {
  ClefElementType,
  NoteElementType,
  NoteLetterOctave,
  StaffElementType,
  TupletElementType,
} from '../types/elements';
import type { ClefType } from '../types/theory';
import {
  COMMON_ATTRIBUTES,
  MUSIC_BARLINE,
  MUSIC_CLEF,
  MUSIC_NOTE,
  MUSIC_STAFF,
  MUSIC_TUPLET,
  MUSIC_VOICE,
  STAFF_EVENTS,
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

// Expected `style.top` on the positioned <music-note>, from the same
// generateYCoordinates helper the staff uses: checks the `clef` attribute
// picks the right table.
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
  const element = document.createElement(MUSIC_STAFF) as StaffElementType;
  element.setAttribute('clef', clef);
  element.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
  element.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
  element.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
  document.body.appendChild(element);
  return element;
}

function renderNote(staff: any, value: NoteLetterOctave): HTMLElement {
  const note = document.createElement(MUSIC_NOTE) as NoteElementType;
  note.setAttribute('duration', 'quarter');
  note.setAttribute('note', value[0]);
  note.setAttribute('octave', value[1]);
  const slot = staff.shadowRoot.querySelector('slot');
  slot.assignedElements = () => [note];
  slot.dispatchEvent(new Event('slotchange'));
  return note;
}

describe(MUSIC_STAFF, () => {
  it('defaults clef to treble when attribute is absent', () => {
    const element = document.createElement(MUSIC_STAFF) as StaffElementType;
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

    const noteBefore = document.createElement(MUSIC_NOTE) as NoteElementType;
    noteBefore.setAttribute('duration', 'quarter');
    noteBefore.setAttribute('note', 'C');
    noteBefore.setAttribute('octave', '4');

    const clefMarker = makeClefMarker('bass');

    const noteAfter = document.createElement(MUSIC_NOTE) as NoteElementType;
    noteAfter.setAttribute('duration', 'quarter');
    noteAfter.setAttribute('note', 'C');
    noteAfter.setAttribute('octave', '4');

    renderElements(staff, [noteBefore, clefMarker, noteAfter]);

    expect(noteBefore.style.top).toBe(expectedNoteTop('treble', 'C4'));
    expect(noteAfter.style.top).toBe(expectedNoteTop('bass', 'C4'));
    expect(noteBefore.style.top).not.toBe(noteAfter.style.top);
  });

  it('a clef change reaches other voices where it is written, not at the start of the note before it', () => {
    const staff = makeStaff('treble');
    const makeNote = (
      octave: string,
      duration: 'quarter' | 'eighth'
    ): NoteElementType => {
      const note = document.createElement(MUSIC_NOTE) as NoteElementType;
      note.setAttribute('duration', duration);
      note.setAttribute('note', 'C');
      note.setAttribute('octave', octave);
      return note;
    };
    const voice1 = document.createElement(MUSIC_VOICE);
    voice1.append(
      makeNote('5', 'quarter'),
      makeClefMarker('bass'),
      makeNote('3', 'quarter')
    );
    const voice2Notes = [0, 1, 2, 3].map(() => makeNote('4', 'eighth'));
    const voice2 = document.createElement(MUSIC_VOICE);
    voice2.append(...voice2Notes);

    renderElements(staff, [voice1, voice2]);

    const trebleC4 = staff.noteToYCoordinate('C', 4, 0);
    const bassC4 = staff.noteToYCoordinate('C', 4, 1);
    expect(trebleC4).not.toBe(bassC4);
    // Beats 0 and 1/8 sound during the voice-1 quarter before the change.
    expect(voice2Notes.map((note) => (note as any).staffY)).toEqual([
      trebleC4,
      trebleC4,
      bassC4,
      bassC4,
    ]);
  });

  it("relays out for a sibling staff's clef changes, but not for an unchanged list", () => {
    const staff = makeStaff('treble');
    const notes = ['C', 'D', 'E', 'F'].map((pitch) => {
      const note = document.createElement(MUSIC_NOTE) as NoteElementType;
      note.setAttribute('duration', 'quarter');
      note.setAttribute('note', pitch);
      note.setAttribute('octave', '4');
      return note;
    });
    renderElements(staff, notes);
    const relayouts = jest.fn();
    staff.addEventListener(STAFF_EVENTS.STAFF_MIN_WIDTH, relayouts);

    staff.measureMarkerBeats = [
      { beat: 1 / 2, kind: 'clef', width: 40, barlineType: null },
    ];
    expect(relayouts).toHaveBeenCalledTimes(1);

    staff.measureMarkerBeats = [
      { beat: 0.25 + 0.25, kind: 'clef', width: 40, barlineType: null },
    ];
    expect(relayouts).toHaveBeenCalledTimes(1);
  });

  it("starts its notes at a sibling staff's wider start area, relaying out only on a change", () => {
    const staff = makeStaff('treble');
    const notes = ['C', 'D', 'E', 'F'].map((pitch) => {
      const note = document.createElement(MUSIC_NOTE) as NoteElementType;
      note.setAttribute('duration', 'quarter');
      note.setAttribute('note', pitch);
      note.setAttribute('octave', '4');
      return note;
    });
    renderElements(staff, notes);
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

  it('reports its own clef changes, by the beat each takes effect', () => {
    const staff = makeStaff('treble');
    const quarter = () => {
      const note = document.createElement(MUSIC_NOTE) as NoteElementType;
      note.setAttribute('duration', 'quarter');
      note.setAttribute('note', 'C');
      note.setAttribute('octave', '4');
      return note;
    };
    renderElements(staff, [
      makeClefMarker('bass'),
      quarter(),
      quarter(),
      makeClefMarker('treble'),
      quarter(),
    ]);

    expect(
      staff.ownMarkerBeats.map((marker: MarkerBeat) => marker.beat)
    ).toEqual([-1, 1 / 2]);
  });

  it('mutating an already-slotted marker clef attribute relayouts notes after it, without a new slotchange', () => {
    const staff = makeStaff('treble');

    const noteBefore = document.createElement(MUSIC_NOTE) as NoteElementType;
    noteBefore.setAttribute('duration', 'quarter');
    noteBefore.setAttribute('note', 'C');
    noteBefore.setAttribute('octave', '4');

    const clefMarker = makeClefMarker('bass');

    const noteAfter = document.createElement(MUSIC_NOTE) as NoteElementType;
    noteAfter.setAttribute('duration', 'quarter');
    noteAfter.setAttribute('note', 'C');
    noteAfter.setAttribute('octave', '4');

    // The marker must actually be connected to the document (as a real
    // light-DOM child of the staff, mirroring real usage) for its own
    // attributeChangedCallback to fire and dispatch the change event —
    // the mocked slot.assignedElements() below only fakes slot content.
    staff.appendChild(clefMarker);

    renderElements(staff, [noteBefore, clefMarker, noteAfter]);
    expect(noteAfter.style.top).toBe(expectedNoteTop('bass', 'C4'));

    clefMarker.setAttribute('clef', 'treble');

    expect(noteAfter.style.top).toBe(expectedNoteTop('treble', 'C4'));
    expect(noteBefore.style.top).toBe(expectedNoteTop('treble', 'C4'));
  });

  it('supports multiple clef markers producing multiple segments', () => {
    const staff = makeStaff('treble');

    const note1 = document.createElement(MUSIC_NOTE) as NoteElementType;
    note1.setAttribute('duration', 'quarter');
    note1.setAttribute('note', 'C');
    note1.setAttribute('octave', '4');

    const clef1 = makeClefMarker('bass');

    const note2 = document.createElement(MUSIC_NOTE) as NoteElementType;
    note2.setAttribute('duration', 'quarter');
    note2.setAttribute('note', 'C');
    note2.setAttribute('octave', '4');

    const clef2 = makeClefMarker('treble');

    const note3 = document.createElement(MUSIC_NOTE) as NoteElementType;
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
    const note = document.createElement(MUSIC_NOTE) as NoteElementType;
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

    const tuplet = document.createElement(MUSIC_TUPLET) as TupletElementType;
    tuplet.setAttribute('ratio', '3');
    const clefMarker = makeClefMarker('bass');
    tuplet.appendChild(clefMarker);
    for (let i = 0; i < 3; i++) {
      const note = document.createElement(MUSIC_NOTE) as NoteElementType;
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

  it('noteToYCoordinate with an elementIndex resolves the active segment', () => {
    // A note past a mid-stream clef marker must resolve its Y against the
    // marker's clef table, not the staff's own — this locks that in for any
    // caller that passes an elementIndex (rendering, and external consumers
    // driving their own pitch editing).
    const staff = makeStaff('treble');

    const noteBefore = document.createElement(MUSIC_NOTE) as NoteElementType;
    noteBefore.setAttribute('duration', 'quarter');
    noteBefore.setAttribute('note', 'C');
    noteBefore.setAttribute('octave', '4');

    const clefMarker = makeClefMarker('bass');

    // C3 exists in the bass range (E4-E2) but not the treble range (C6-C4).
    const noteAfter = document.createElement(MUSIC_NOTE) as NoteElementType;
    noteAfter.setAttribute('duration', 'quarter');
    noteAfter.setAttribute('note', 'C');
    noteAfter.setAttribute('octave', '3');

    renderElements(staff, [noteBefore, clefMarker, noteAfter]);

    const treble = generateYCoordinates(...CLEF_RANGES.treble);
    const bass = generateYCoordinates(...CLEF_RANGES.bass);

    expect(staff.noteToYCoordinate('C', 4, 0)).toBe(treble['C4']);
    // Absent from the treble table entirely — resolving against the base
    // (index-less) staff table would return 0, the "not found" sentinel.
    expect(treble['C3']).toBeUndefined();
    expect(staff.noteToYCoordinate('C', 3, 2)).toBe(bass['C3']);
    expect(staff.noteToYCoordinate('C', 3, 2)).not.toBe(0);
  });

  it('noteToYCoordinate extrapolates a real below/above-staff position for a note outside the clef\'s own table, instead of the "not found" sentinel', () => {
    // The `octave` attribute isn't clef-restricted, so a treble staff
    // accepts notes outside its pre-generated C6-C4 table.
    const staff = makeStaff('treble');
    renderElements(staff, []);

    const treble = generateYCoordinates(...CLEF_RANGES.treble);

    expect(staff.noteToYCoordinate('B', 3)).toBe(
      extrapolateYCoordinate('B', 3, treble)
    );
    expect(staff.noteToYCoordinate('B', 3)).not.toBe(0);
    expect(staff.noteToYCoordinate('B', 3)).toBeGreaterThan(treble['C4'] ?? 0);

    expect(staff.noteToYCoordinate('D', 6)).toBe(
      extrapolateYCoordinate('D', 6, treble)
    );
    expect(staff.noteToYCoordinate('D', 6)).not.toBe(0);
    expect(staff.noteToYCoordinate('D', 6)).toBeLessThan(treble['C6'] ?? 0);
  });

  it('drops and hides a clef marker whose anchor note is truncated by measure overflow', () => {
    const staff = makeStaff('treble');
    staff.setAttribute(COMMON_ATTRIBUTES.TIME, '1/4');

    const note1 = document.createElement(MUSIC_NOTE) as NoteElementType;
    note1.setAttribute('duration', 'quarter');
    note1.setAttribute('note', 'C');
    note1.setAttribute('octave', '4');

    // This second note exceeds the 1/4 measure and gets truncated — the
    // marker anchored after it (afterElementIndex 1) must be dropped and
    // hidden too, since its anchor no longer exists in the rendered array.
    const note2 = document.createElement(MUSIC_NOTE) as NoteElementType;
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

  it('warns and ignores a second clef marker sitting directly after the first', () => {
    const staff = makeStaff('treble');

    const note = document.createElement(MUSIC_NOTE) as NoteElementType;
    note.setAttribute('duration', 'quarter');
    note.setAttribute('note', 'C');
    note.setAttribute('octave', '4');

    const firstClef = makeClefMarker('bass');
    const secondClef = makeClefMarker('treble');

    const noteAfter = document.createElement(MUSIC_NOTE) as NoteElementType;
    noteAfter.setAttribute('duration', 'quarter');
    noteAfter.setAttribute('note', 'C');
    noteAfter.setAttribute('octave', '4');

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    renderElements(staff, [note, firstClef, secondClef, noteAfter]);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('consecutive <music-clef>')
    );
    consoleSpy.mockRestore();

    expect(secondClef.style.display).toBe('none');
    expect(noteAfter.style.top).toBe(expectedNoteTop('bass', 'C4'));
    expect(staff.effectiveEndClef).toBe('bass');
  });

  it('keeps only the first of three consecutive clef markers', () => {
    const staff = makeStaff('treble');

    const note = document.createElement(MUSIC_NOTE) as NoteElementType;
    note.setAttribute('duration', 'quarter');
    note.setAttribute('note', 'C');
    note.setAttribute('octave', '4');

    const firstClef = makeClefMarker('bass');
    const secondClef = makeClefMarker('treble');
    const thirdClef = makeClefMarker('treble');

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    renderElements(staff, [note, firstClef, secondClef, thirdClef]);
    consoleSpy.mockRestore();

    expect(secondClef.style.display).toBe('none');
    expect(thirdClef.style.display).toBe('none');
    expect(staff.effectiveEndClef).toBe('bass');
  });

  it('honors two clef markers separated by a note without warning', () => {
    const staff = makeStaff('treble');

    const note1 = document.createElement(MUSIC_NOTE) as NoteElementType;
    note1.setAttribute('duration', 'quarter');
    note1.setAttribute('note', 'C');
    note1.setAttribute('octave', '4');

    const clef1 = makeClefMarker('bass');

    const note2 = document.createElement(MUSIC_NOTE) as NoteElementType;
    note2.setAttribute('duration', 'quarter');
    note2.setAttribute('note', 'C');
    note2.setAttribute('octave', '4');

    const clef2 = makeClefMarker('treble');

    const note3 = document.createElement(MUSIC_NOTE) as NoteElementType;
    note3.setAttribute('duration', 'quarter');
    note3.setAttribute('note', 'C');
    note3.setAttribute('octave', '4');

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    renderElements(staff, [note1, clef1, note2, clef2, note3]);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();

    expect(clef2.style.display).not.toBe('none');
    expect(note2.style.top).toBe(expectedNoteTop('bass', 'C4'));
    expect(note3.style.top).toBe(expectedNoteTop('treble', 'C4'));
  });

  it('re-shows a previously-ignored clef once a note is inserted between the pair', () => {
    const staff = makeStaff('treble');

    const note1 = document.createElement(MUSIC_NOTE) as NoteElementType;
    note1.setAttribute('duration', 'quarter');
    note1.setAttribute('note', 'C');
    note1.setAttribute('octave', '4');

    const firstClef = makeClefMarker('bass');
    const secondClef = makeClefMarker('treble');

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    renderElements(staff, [note1, firstClef, secondClef]);
    expect(secondClef.style.display).toBe('none');

    const inserted = document.createElement(MUSIC_NOTE) as NoteElementType;
    inserted.setAttribute('duration', 'quarter');
    inserted.setAttribute('note', 'C');
    inserted.setAttribute('octave', '4');

    const noteAfter = document.createElement(MUSIC_NOTE) as NoteElementType;
    noteAfter.setAttribute('duration', 'quarter');
    noteAfter.setAttribute('note', 'C');
    noteAfter.setAttribute('octave', '4');

    renderElements(staff, [note1, firstClef, inserted, secondClef, noteAfter]);
    consoleSpy.mockRestore();

    expect(secondClef.style.display).not.toBe('none');
    expect(inserted.style.top).toBe(expectedNoteTop('bass', 'C4'));
    expect(noteAfter.style.top).toBe(expectedNoteTop('treble', 'C4'));
  });
});

describe(`${MUSIC_STAFF} barlines`, () => {
  function quarter(pitch = 'C'): NoteElementType {
    const note = document.createElement(MUSIC_NOTE) as NoteElementType;
    note.setAttribute('duration', 'quarter');
    note.setAttribute('note', pitch);
    note.setAttribute('octave', '4');
    return note;
  }

  function render(staff: any, elements: Element[]): void {
    const slot = staff.shadowRoot.querySelector('slot');
    slot.assignedElements = () => elements;
    slot.dispatchEvent(new Event('slotchange'));
  }

  const container = (staff: any): HTMLElement =>
    staff.shadowRoot.querySelector('.staff-container');

  it('keeps a plain end barline as the container border', () => {
    const staff = makeStaff();
    render(staff, [quarter()]);

    expect(staff.endBarline).toBe('single');
    expect(container(staff).style.borderRightWidth).toBe('');
    expect(staff.shadowRoot.querySelector('.end-barline g')).toBeNull();
  });

  it('draws any other end barline itself, in place of the border', () => {
    const staff = makeStaff();
    render(staff, [quarter()]);

    staff.endBarline = 'final';
    expect(container(staff).style.borderRightWidth).toBe('0px');
    expect(
      staff.shadowRoot.querySelector('.end-barline g.barline-final')
    ).not.toBeNull();

    staff.endBarline = 'single';
    expect(container(staff).style.borderRightWidth).toBe('');
    expect(staff.shadowRoot.querySelector('.end-barline g')).toBeNull();
  });

  it('widens its start area for a start repeat and relays out its notes', () => {
    const staff = makeStaff();
    const notes = [quarter(), quarter('D')];
    render(staff, notes);
    const firstX = parseFloat(notes[0].style.left);
    const startX = staff.ownNotesStartX;

    staff.startRepeat = 'full';

    expect(staff.ownNotesStartX).toBeGreaterThan(startX);
    expect(parseFloat(notes[0].style.left)).toBeGreaterThan(firstX);
    expect(
      staff.shadowRoot.querySelector(
        '.start-repeat-container g.barline-repeat-start'
      )
    ).not.toBeNull();
  });

  it('draws a mid-bar barline in its slot', () => {
    const staff = makeStaff();
    const barline = document.createElement(MUSIC_BARLINE);
    barline.setAttribute('type', 'repeat-start');
    const before = [quarter(), quarter('D')];
    const after = [quarter('E'), quarter('F')];
    render(staff, [...before, barline, ...after]);

    expect(staff.ownMarkerBeats).toEqual([
      expect.objectContaining({ beat: 1 / 2, kind: 'barline' }),
    ]);
    expect(
      staff.shadowRoot.querySelector(
        '.mid-bar-barlines-container g.barline-repeat-start'
      )
    ).not.toBeNull();
  });

  it("draws a sibling staff's mid-bar barline too", () => {
    const staff = makeStaff();
    render(staff, [quarter(), quarter(), quarter(), quarter()]);

    staff.measureMarkerBeats = [
      { beat: 1 / 2, kind: 'barline', width: 20, barlineType: 'final' },
    ];

    expect(
      staff.shadowRoot.querySelector(
        '.mid-bar-barlines-container g.barline-final'
      )
    ).not.toBeNull();
    expect(staff.ownBarlineSlotLefts).toHaveLength(1);
  });
});

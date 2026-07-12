/**
 * @jest-environment jsdom
 */
import '../note/index';
import '../staffTreble/index';
import type { ChordElementType, NoteElementType } from '../types/elements';
import type { Chord, DurationType, Note, Octave } from '../types/theory';
import {
  COMMON_ATTRIBUTES,
  MUSIC_CHORD,
  MUSIC_NOTE,
  MUSIC_STAFF_TREBLE,
} from '../utils/consts';
import { NOTE_SCALE } from '../utils/svgCreator/note';
import './index';

afterEach(() => {
  document.body.innerHTML = '';
});

describe(MUSIC_CHORD, () => {
  it('registers as a custom element', () => {
    expect(customElements.get(MUSIC_CHORD)).toBeDefined();
  });

  it('renders shadow root with default duration', () => {
    const chordElement = document.createElement(
      MUSIC_CHORD
    ) as ChordElementType;
    document.body.appendChild(chordElement);

    expect(chordElement.duration).toBe('quarter');
    expect(chordElement.shadowRoot).not.toBeNull();
    expect(chordElement?.shadowRoot?.innerHTML).not.toBe('');
  });

  describe('diminuendo alias', () => {
    it('normalizes the diminuendo attribute into decrescendo', () => {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      document.body.appendChild(chordElement);

      chordElement.setAttribute('diminuendo', 'start');

      expect(chordElement.getAttribute('decrescendo')).toBe('start');
      expect(chordElement.getAttribute('diminuendo')).toBeNull();
      expect(chordElement.decrescendo).toBe('start');
      expect(chordElement.diminuendo).toBe('start');
    });

    it('sets decrescendo through the diminuendo property setter', () => {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      document.body.appendChild(chordElement);

      chordElement.diminuendo = 'end';

      expect(chordElement.decrescendo).toBe('end');
      expect(chordElement.getAttribute('decrescendo')).toBe('end');
      expect(chordElement.getAttribute('diminuendo')).toBeNull();
    });

    it('clears decrescendo when diminuendo is set to null', () => {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      document.body.appendChild(chordElement);

      chordElement.decrescendo = 'start';
      chordElement.diminuendo = null;

      expect(chordElement.decrescendo).toBeNull();
      expect(chordElement.getAttribute('decrescendo')).toBeNull();
    });
  });

  describe('articulations', () => {
    function makeChordWithNotes(): ChordElementType {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      for (const value of ['C', 'E', 'G'] satisfies Note[]) {
        const note = document.createElement(MUSIC_NOTE) as NoteElementType;
        note.setAttribute('note', value);
        note.setAttribute('octave', `${4 satisfies Octave}`);
        chordElement.appendChild(note);
      }
      return chordElement;
    }

    it('round-trips the articulation and stress slots between property and attribute', () => {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      document.body.appendChild(chordElement);

      chordElement.articulation = 'accent-tenuto';
      chordElement.stress = 'unstressed';

      expect(chordElement.getAttribute('articulation')).toBe('accent-tenuto');
      expect(chordElement.getAttribute('stress')).toBe('unstressed');
      expect(chordElement.articulation).toBe('accent-tenuto');
      expect(chordElement.stress).toBe('unstressed');
    });

    it('ignores unrecognized articulation values, including illegal combinations', () => {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      document.body.appendChild(chordElement);

      chordElement.setAttribute('articulation', 'fermata-staccato');

      expect(chordElement.articulation).toBeNull();
    });

    it('draws the chord-level mark exactly once, not per notehead', () => {
      const chordElement = makeChordWithNotes();
      chordElement.setAttribute('articulation', 'staccato');
      document.body.appendChild(chordElement);

      const groups =
        chordElement.shadowRoot?.querySelectorAll('.articulations') ?? [];
      expect(groups.length).toBe(1);
      // Exactly one staccato dot for the whole 3-note chord.
      expect(
        chordElement.shadowRoot?.querySelectorAll('.staccato').length
      ).toBe(1);
    });

    it('draws a chord fermata exactly once', () => {
      const chordElement = makeChordWithNotes();
      chordElement.setAttribute('articulation', 'fermata');
      document.body.appendChild(chordElement);

      expect(chordElement.shadowRoot?.querySelectorAll('.fermata').length).toBe(
        1
      );
    });
  });

  describe('notes getter', () => {
    it('returns empty array when no chord attribute and no child notes', () => {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      document.body.appendChild(chordElement);

      expect(chordElement.notes).toEqual([]);
    });

    it('returns notes derived from chord attribute when no child notes exist', () => {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      chordElement.setAttribute('chord', 'Amaj');
      chordElement.setAttribute('duration', 'quarter');
      document.body.appendChild(chordElement);

      const notes = chordElement.notes;
      const values: Note[] = notes.map((n: { value: Note }) => n.value);
      expect(values).toEqual(['A', 'C#', 'E']);
      notes.forEach((n: { duration: DurationType }) => {
        expect(n.duration).toBe('quarter');
      });
    });

    it('returns child music-note elements when they exist, ignoring chord attribute', () => {
      const el = document.createElement(MUSIC_CHORD) as ChordElementType;
      el.setAttribute('chord', 'Amaj');
      document.body.appendChild(el);

      const noteC = document.createElement(MUSIC_NOTE) as NoteElementType;
      noteC.setAttribute('note', 'C');
      noteC.setAttribute('duration', 'quarter');
      const noteE = document.createElement(MUSIC_NOTE) as NoteElementType;
      noteE.setAttribute('note', 'E');
      noteE.setAttribute('duration', 'quarter');
      el.appendChild(noteC);
      el.appendChild(noteE);

      const values: Note[] = el.notes.map((n: { value: Note }) => n.value);
      expect(values).toEqual(['C', 'E']);
    });
  });

  describe('grace notes', () => {
    function makeChordWithNotes(
      values: [Note, Octave][],
      grace?: string,
      graceOctave?: string,
      graceArticulation?: string
    ): ChordElementType {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      for (const [value, octave] of values) {
        const note = document.createElement(MUSIC_NOTE) as NoteElementType;
        note.setAttribute('note', value);
        note.setAttribute('octave', `${octave}`);
        chordElement.appendChild(note);
      }
      if (grace !== undefined) {
        chordElement.setAttribute('grace', grace);
      }
      if (graceOctave !== undefined) {
        chordElement.setAttribute('grace-octave', graceOctave);
      }
      if (graceArticulation !== undefined) {
        chordElement.setAttribute('grace-articulation', graceArticulation);
      }
      document.body.appendChild(chordElement);
      return chordElement;
    }

    it('round-trips the grace attributes between property and attribute', () => {
      const chordElement = makeChordWithNotes([
        ['C', 4],
        ['E', 4],
      ]);

      chordElement.grace = ['D', 'E'];
      chordElement.graceOctave = [4, 4];
      chordElement.graceType = 'appoggiatura';

      expect(chordElement.getAttribute('grace')).toBe('D,E');
      expect(chordElement.grace).toEqual(['D', 'E']);
      expect(chordElement.getAttribute('grace-octave')).toBe('4,4');
      expect(chordElement.graceOctave).toEqual([4, 4]);
      expect(chordElement.graceType).toBe('appoggiatura');
      expect(chordElement.graceSlur).toBe('auto');
      expect(chordElement.graceDuration).toBeNull();
    });

    it('renders grace notes on a standalone chord', () => {
      const chordElement = makeChordWithNotes(
        [
          ['C', 4],
          ['E', 4],
          ['G', 4],
        ],
        'B,C',
        '3,4'
      );

      const graceGroup = chordElement.shadowRoot?.querySelector('.grace-notes');
      expect(graceGroup).not.toBeNull();
      expect(graceGroup?.querySelectorAll('.grace-head')).toHaveLength(2);
      expect(graceGroup?.querySelectorAll('.grace-beam')).toHaveLength(2);
      expect(graceGroup?.querySelector('.grace-slash')).not.toBeNull();
      expect(graceGroup?.querySelector('.grace-slur')).not.toBeNull();
    });

    it('routes the grace slur clear of the reference note accidental horizontally, without growing its gap to the notehead', () => {
      const endPoint = (element: ChordElementType): number[] => {
        const d =
          element.shadowRoot
            ?.querySelector('.grace-slur path')
            ?.getAttribute('d') ?? '';
        const [, , , , endX, endY] =
          d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
        return [endX, endY];
      };

      const withAccidental = makeChordWithNotes(
        [
          ['C#', 4],
          ['E', 4],
        ],
        'B',
        '4'
      );
      const plain = makeChordWithNotes(
        [
          ['C', 4],
          ['E', 4],
        ],
        'B',
        '4'
      );

      const [endXWithAccidental, endYWithAccidental] = endPoint(withAccidental);
      const headCxAttr = Number(
        withAccidental.shadowRoot?.querySelector('.head')?.getAttribute('cx')
      );
      // Every note in a chord shares the same internal (undisplaced) head
      // cx/cy — chord.ts renders them all with the same duration/stemUp —
      // so querying any one '.head' gives the right X regardless of which
      // note the slur targets (per-note X differences come only from a
      // wrapper <svg x=...> offset for adjacent-note displacement, which
      // these thirds-apart test chords never trigger).
      const mainHeadCenterX = headCxAttr * NOTE_SCALE;
      // Standalone chords resolve Y from the same C6..C4 note-name map as an
      // in-staff treble chord (accidentals don't move a note's staff line).
      // mainHeadCenterY = STAFF_Y_PADDING + staffY - NOTE_HEAD_Y_OFFSET_CORRECTION
      // withAccidental=[C#4(80),E4(70)]: bulge above targets the top note,
      // E4. plain=[C4(80),E4(70)]: bulge below targets the reference
      // (bottom/index-0) note, C4.
      const mainHeadCenterYWithAccidental = 8 + 70 - 10;
      const mainHeadCenterYPlain = 8 + 80 - 10;
      // A sharp is 10px wide (ACCIDENTAL_SYMBOL_WIDTH), sat ACCIDENTAL_NOTE_GAP
      // (-7px, i.e. overlapping) left of the head center.
      const accidentalLeftEdgeX = mainHeadCenterX - (10 + -7);

      // Clears the accidental horizontally...
      expect(endXWithAccidental).toBeLessThan(accidentalLeftEdgeX);

      // ...and the endpoint's distance to its target notehead is the same
      // constant whether or not an accidental is shown (only which note it
      // targets, and the horizontal pullback, differ).
      const [, endYPlain] = endPoint(plain);
      const gapWithAccidental = Math.abs(
        mainHeadCenterYWithAccidental - endYWithAccidental
      );
      const gapPlain = Math.abs(mainHeadCenterYPlain - endYPlain);
      expect(gapWithAccidental).toBeCloseTo(gapPlain, 5);
    });

    it('keeps the slur-to-notehead gap constant regardless of which chord note the accidental sits on', () => {
      // Accidental sits only on G#4 (index 2), not the reference note C4
      // (index 0) — C4=80, G4=60, 20px of staffY apart. Both cases bulge
      // above (an accidental is shown either way) and target their own top
      // note: E4(70) for the 2-note chord, G#4(60) for the 3-note chord.
      const accidentalOnReference = makeChordWithNotes(
        [
          ['C#', 4],
          ['E', 4],
        ],
        'B',
        '4'
      );
      const accidentalOnNonReference = makeChordWithNotes(
        [
          ['C', 4],
          ['E', 4],
          ['G#', 4],
        ],
        'B',
        '4'
      );

      const endY = (element: ChordElementType): number => {
        const d =
          element.shadowRoot
            ?.querySelector('.grace-slur path')
            ?.getAttribute('d') ?? '';
        const [, , , , , y] = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
        return y;
      };

      const gapOnReference = Math.abs(
        8 + 70 - 10 - endY(accidentalOnReference) // top note E4, staffY=70
      );
      const gapOnNonReference = Math.abs(
        8 + 60 - 10 - endY(accidentalOnNonReference) // top note G#4, staffY=60
      );
      expect(gapOnNonReference).toBeCloseTo(gapOnReference, 5);
    });

    it('keeps the slur-to-notehead gap constant for a grace GROUP into a chord with a multi-position accidental column', () => {
      // Mirrors chord.stories.ts's WithGraceNotes second chord: a 2-note
      // grace group into a chord with accidentals on both the reference note
      // (C#4, index 0) and a note 20px of staffY away (G#4, index 2). Both
      // chords' top note is at staffY=60 (G#4 and G4 share the same staff
      // position — an accidental doesn't move it).
      const twoAccidentals = makeChordWithNotes(
        [
          ['C#', 4],
          ['E', 4],
          ['G#', 4],
        ],
        'C,D',
        '4,4'
      );
      const oneAccidental = makeChordWithNotes(
        [
          ['C#', 4],
          ['E', 4],
          ['G', 4],
        ],
        'C,D',
        '4,4'
      );

      const endY = (element: ChordElementType): number => {
        const d =
          element.shadowRoot
            ?.querySelector('.grace-slur path')
            ?.getAttribute('d') ?? '';
        const [, , , , , y] = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
        return y;
      };

      const topNoteHeadCenterY = 8 + 60 - 10; // top note G#4/G4, staffY=60
      const gapTwoAccidentals = Math.abs(
        topNoteHeadCenterY - endY(twoAccidentals)
      );
      const gapOneAccidental = Math.abs(
        topNoteHeadCenterY - endY(oneAccidental)
      );
      // The 2-accidental case's gap must not be larger than the 1-accidental
      // case's — this is exactly the regression the user reported (chords
      // with more accidentals showing a visibly bigger end-point gap).
      expect(gapTwoAccidentals).toBeCloseTo(gapOneAccidental, 5);
    });

    it('positions grace heads relative to the reference note (notes[0])', () => {
      // Grace pitch equals the reference pitch → same head Y as the lowest
      // chord note; one step up → 5px higher (smaller y).
      const samePitch = makeChordWithNotes(
        [
          ['C', 4],
          ['E', 4],
        ],
        'C',
        '4'
      );
      const stepUp = makeChordWithNotes(
        [
          ['C', 4],
          ['E', 4],
        ],
        'D',
        '4'
      );

      const headTransformY = (chordElement: ChordElementType): number => {
        const transform =
          chordElement.shadowRoot
            ?.querySelector('.grace-notes .grace-note')
            ?.getAttribute('transform') ?? '';
        const match = transform.match(/translate\([^ ]+ ([^)]+)\)/);
        return Number(match?.[1]);
      };

      expect(headTransformY(stepUp)).toBeCloseTo(headTransformY(samePitch) - 5);
    });

    it('defaults the grace octave to the reference note octave when grace-octave is omitted', () => {
      const withDefault = makeChordWithNotes(
        [
          ['C', 4],
          ['E', 4],
        ],
        'C'
      );
      const withExplicit = makeChordWithNotes(
        [
          ['C', 4],
          ['E', 4],
        ],
        'C',
        '4'
      );

      const headTransform = (chordElement: ChordElementType): string | null =>
        chordElement.shadowRoot
          ?.querySelector('.grace-notes .grace-note')
          ?.getAttribute('transform') ?? null;

      expect(headTransform(withDefault)).toBe(headTransform(withExplicit));
    });

    it('renders no grace group when the chord has no notes', () => {
      const chordElement = document.createElement(
        MUSIC_CHORD
      ) as ChordElementType;
      chordElement.setAttribute('grace', 'C');
      chordElement.setAttribute('grace-octave', '4');
      document.body.appendChild(chordElement);

      expect(chordElement.shadowRoot?.querySelector('.grace-notes')).toBeNull();
    });

    describe('grace articulation', () => {
      it('round-trips the grace-articulation attribute between property and attribute', () => {
        const chordElement = makeChordWithNotes([
          ['C', 4],
          ['E', 4],
        ]);

        chordElement.grace = ['D', 'E'];
        chordElement.graceArticulation = ['staccato', 'accent'];

        expect(chordElement.getAttribute('grace-articulation')).toBe(
          'staccato,accent'
        );
        expect(chordElement.graceArticulation).toEqual(['staccato', 'accent']);
      });

      it('falls back to no mark for missing or invalid grace-articulation slots, without rejecting the whole list', () => {
        const chordElement = makeChordWithNotes(
          [
            ['C', 4],
            ['E', 4],
          ],
          'A,B'
        );

        expect(chordElement.graceArticulation).toBeNull();

        chordElement.setAttribute('grace-articulation', 'staccato,not-a-mark');
        expect(chordElement.graceArticulation).toEqual(['staccato', null]);
      });

      it('renders a mark on each grace note in a group independently, on a standalone chord', () => {
        const chordElement = makeChordWithNotes(
          [
            ['C', 4],
            ['E', 4],
          ],
          'A,B',
          '4,4',
          'staccato,accent'
        );

        const graceGroup =
          chordElement.shadowRoot?.querySelector('.grace-notes');
        expect(graceGroup?.querySelectorAll('.articulations')).toHaveLength(2);
        expect(graceGroup?.querySelector('.staccato')).not.toBeNull();
        expect(graceGroup?.querySelector('.accent')).not.toBeNull();
      });

      it('renders a mark on a single (non-grouped) grace note', () => {
        const chordElement = makeChordWithNotes(
          [
            ['C', 4],
            ['E', 4],
          ],
          'B',
          '4',
          'tenuto'
        );

        const graceGroup =
          chordElement.shadowRoot?.querySelector('.grace-notes');
        expect(graceGroup?.querySelector('.articulations')).not.toBeNull();
        expect(graceGroup?.querySelector('.tenuto')).not.toBeNull();
      });

      it('renders no articulation marks when grace-articulation is unset', () => {
        const chordElement = makeChordWithNotes(
          [
            ['C', 4],
            ['E', 4],
          ],
          'A,B',
          '4,4'
        );

        const graceGroup =
          chordElement.shadowRoot?.querySelector('.grace-notes');
        expect(graceGroup?.querySelector('.articulations')).toBeNull();
      });

      it('nests the marks in the same two scale levels (GRACE_SCALE, then NOTE_SCALE) as the grace head itself', () => {
        // Regression test: createArticulationMarks() draws in the same
        // 600-unit note-space createNoteSvg uses for the head, and
        // createNoteSvg wraps that space in its own inner scale(NOTE_SCALE)
        // before the outer translate+scale(GRACE_SCALE) grace wrapper — the
        // marks must mirror that exact nesting or they render ~1/NOTE_SCALE
        // too large and land outside any clipped viewBox (invisible in-staff).
        const chordElement = makeChordWithNotes(
          [
            ['C', 4],
            ['E', 4],
          ],
          'B',
          '4',
          'tenuto'
        );

        const graceGroup =
          chordElement.shadowRoot?.querySelector('.grace-notes');
        const headInnerScale = graceGroup
          ?.querySelector('.grace-head')
          ?.closest('g[transform^="scale("]')
          ?.getAttribute('transform');
        const marksInnerScale = graceGroup
          ?.querySelector('.articulations')
          ?.closest('g[transform^="scale("]')
          ?.getAttribute('transform');

        expect(headInnerScale).not.toBeNull();
        expect(marksInnerScale).toBe(headInnerScale);
        expect(marksInnerScale).toContain(`scale(${NOTE_SCALE}`);
      });
    });
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

function makeStaff(): Element {
  const staffTreble = document.createElement(MUSIC_STAFF_TREBLE) as any;
  staffTreble.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
  staffTreble.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
  staffTreble.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
  document.body.appendChild(staffTreble);
  return staffTreble;
}

function renderChordByNotes(
  staff: Element,
  notes: { value: Note; octave: Octave }[],
  duration: DurationType = 'quarter'
): ChordElementType {
  const chord = document.createElement(MUSIC_CHORD) as ChordElementType;
  chord.setAttribute('duration', duration);
  for (const { value, octave } of notes) {
    const note = document.createElement(MUSIC_NOTE) as NoteElementType;
    note.setAttribute('note', value);
    note.setAttribute('octave', `${octave}`);
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
  const chord = document.createElement(MUSIC_CHORD) as ChordElementType;
  chord.setAttribute('chord', chordAttr);
  chord.setAttribute('duration', duration);
  staff.appendChild(chord);
  const slot = (staff as any).shadowRoot.querySelector('slot');
  slot.assignedElements = () => [chord];
  slot.dispatchEvent(new Event('slotchange'));
  return chord;
}

// STAFF_LINE_SPACING(10) * 0.8
const STAFF_Y_PADDING = 8;
// 150 * (32/600) = 8
const ADJACENT_NOTE_X_DISPLACEMENT_PX = 8;

describe('staff integration', () => {
  it('positions chord at top 0px (Y is handled internally by chord SVG)', () => {
    const staff = makeStaff();
    const chord = renderChordByNotes(staff, [
      { value: 'E', octave: 4 },
      { value: 'G', octave: 4 },
      { value: 'B', octave: 4 },
    ]);
    expect(chord.style.top).toBe('0px');
  });

  it('flips stem direction when all notes move above the middle of the staff', () => {
    const staff = makeStaff();
    // E4(70), G4(60) — both > MIDDLE_STAFF_Y(50) → stemUp=true
    const chord = renderChordByNotes(staff, [
      { value: 'E', octave: 4 },
      { value: 'G', octave: 4 },
    ]) as any;
    expect(chord.stemUp).toBe(true);

    // Re-render with E5(35), G5(25) — both ≤ MIDDLE_STAFF_Y → stemUp=false
    const updatedChord = renderChordByNotes(staff, [
      { value: 'E', octave: 5 },
      { value: 'G', octave: 5 },
    ]) as any;
    const slot = (staff as any).shadowRoot.querySelector('slot');
    slot.assignedElements = () => [updatedChord];
    slot.dispatchEvent(new Event('slotchange'));

    expect(updatedChord.stemUp).toBe(false);
  });

  it('assigns descending Y coordinates (ascending pitch) for a chord driven by chord attribute', () => {
    const staff = makeStaff();
    // Cmaj = C4(80), E4(70), G4(60) in treble — descending Y = ascending pitch
    const chord = renderChordByAttribute(staff, 'Cmaj' satisfies Chord);
    const coords = chord.staffYCoordinates;
    expect(coords).not.toBeNull();
    expect(coords!.length).toBe(3);
    expect(coords![0]).toBe(TREBLE_STAFF_Y['C4']); // 80 — root, lowest pitch
    expect(coords![1]).toBe(TREBLE_STAFF_Y['E4']); // 70
    expect(coords![2]).toBe(TREBLE_STAFF_Y['G4']); // 60 — highest pitch
  });

  describe('ledger lines', () => {
    it('renders no ledger lines when all notes are within the staff', () => {
      const staff = makeStaff();
      const chord = renderChordByNotes(staff, [
        { value: 'E', octave: 4 },
        { value: 'G', octave: 4 },
        { value: 'B', octave: 4 },
      ]);
      const lines = chord.shadowRoot!.querySelectorAll('.ledger-line');
      expect(lines.length).toBe(0);
    });

    it('renders one single-width ledger line for C4 alone (below staff)', () => {
      const staff = makeStaff();
      const chord = renderChordByNotes(staff, [{ value: 'C', octave: 4 }]);
      const lines = chord.shadowRoot!.querySelectorAll('.ledger-line');
      expect(lines.length).toBe(1);
      const expectedY = (
        STAFF_Y_PADDING -
        10 +
        TREBLE_STAFF_Y['C4']
      ).toString(); // 78
      expect(lines[0].getAttribute('y1')).toBe(expectedY);
      expect(lines[0].getAttribute('y2')).toBe(expectedY);
    });

    it('renders one double-width ledger line for adjacent C4+D4 pair (outermost C4 on a line)', () => {
      const staff = makeStaff();
      // C4(80) and D4(75) are adjacent; outermost C4 is on a line → double width
      const chord = renderChordByNotes(staff, [
        { value: 'C', octave: 4 },
        { value: 'D', octave: 4 },
      ]);
      const lines = chord.shadowRoot!.querySelectorAll('.ledger-line');
      expect(lines.length).toBe(1);
      const x1 = parseFloat(lines[0].getAttribute('x1')!);
      const x2 = parseFloat(lines[0].getAttribute('x2')!);
      // Double-width line extends by ADJACENT_NOTE_X_DISPLACEMENT_PX beyond the notehead
      // so the width should be greater than a single-width line (~4.27+4.27+3+3 = ~14.5px)
      expect(x2 - x1).toBeGreaterThan(ADJACENT_NOTE_X_DISPLACEMENT_PX + 14);
    });

    it('renders a narrower single-width ledger line for C4 alone than the double-width C4+D4 line', () => {
      const staff = makeStaff();

      const singleChord = renderChordByNotes(staff, [
        { value: 'C', octave: 4 },
      ]);
      const singleLines =
        singleChord.shadowRoot!.querySelectorAll('.ledger-line');
      const singleWidth =
        parseFloat(singleLines[0].getAttribute('x2')!) -
        parseFloat(singleLines[0].getAttribute('x1')!);

      const staff2 = makeStaff();
      const doubleChord = renderChordByNotes(staff2, [
        { value: 'C', octave: 4 },
        { value: 'D', octave: 4 },
      ]);
      const doubleLines =
        doubleChord.shadowRoot!.querySelectorAll('.ledger-line');
      const doubleWidth =
        parseFloat(doubleLines[0].getAttribute('x2')!) -
        parseFloat(doubleLines[0].getAttribute('x1')!);

      expect(doubleWidth).toBeGreaterThan(singleWidth);
    });

    it('renders two ledger lines for C4+B3 (two notes below staff)', () => {
      // B3 is one step below C4 — if TREBLE_STAFF_Y were extended, B3 ≈ 85
      // Using just C4 and the adjacent space below: test two ledger-requiring notes
      // C6(10) needs ledger lines at Y=20 and Y=10 (above staff)
      const staff = makeStaff();
      const chord = renderChordByNotes(staff, [{ value: 'C', octave: 6 }]);
      const lines = chord.shadowRoot!.querySelectorAll('.ledger-line');
      // C6 at staffY=10 needs ledger at 10 and 20
      expect(lines.length).toBe(2);
    });
  });

  describe('adjacent notehead displacement', () => {
    it('does not displace notes in a non-adjacent chord', () => {
      const staff = makeStaff();
      // E4(70), G4(60), B4(50) — non-adjacent (gaps of 10px)
      const chord = renderChordByNotes(staff, [
        { value: 'E', octave: 4 },
        { value: 'G', octave: 4 },
        { value: 'B', octave: 4 },
      ]);
      const notes = chord.shadowRoot!.querySelectorAll('.note');
      notes.forEach((note) => {
        expect(note.getAttribute('x')).toBeNull();
      });
    });

    it('displaces one note when two adjacent notes are in the chord (stem-up)', () => {
      const staff = makeStaff();
      // C4(80) and D4(75) — adjacent; stem-up (both > MIDDLE_STAFF_Y=50)
      // D4 (higher pitch, lower Y=75) is displaced +8px
      const chord = renderChordByNotes(staff, [
        { value: 'C', octave: 4 },
        { value: 'D', octave: 4 },
      ]);
      const notes = chord.shadowRoot!.querySelectorAll('.note');
      const xValues = Array.from(notes).map((n) => n.getAttribute('x'));
      expect(xValues).toContain(ADJACENT_NOTE_X_DISPLACEMENT_PX.toString());
      // exactly one note is displaced
      expect(xValues.filter((x) => x !== null).length).toBe(1);
    });

    it('alternates displacement for three adjacent notes (C4-D4-E4, stem-up)', () => {
      const staff = makeStaff();
      // C4(80), D4(75), E4(70) — all adjacent in stem-up order: C4 normal, D4 displaced, E4 normal
      const chord = renderChordByNotes(staff, [
        { value: 'C', octave: 4 },
        { value: 'D', octave: 4 },
        { value: 'E', octave: 4 },
      ]);
      const notes = chord.shadowRoot!.querySelectorAll('.note');
      const xValues = Array.from(notes).map((n) => n.getAttribute('x'));
      // Exactly one note (D4) is displaced
      expect(xValues.filter((x) => x !== null).length).toBe(1);
      expect(xValues).toContain(ADJACENT_NOTE_X_DISPLACEMENT_PX.toString());
    });
  });
});

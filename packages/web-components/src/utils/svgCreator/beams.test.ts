/**
 * @jest-environment jsdom
 */

import '../../index';
import { ChordElementType } from '../../types/elements';
import { DurationType } from '../../types/theory';
import { NOTE_SCALE } from './note';
import { makeNote, makeChord } from '../../test-fixtures/unitHelpers';
import {
  COMMON_ATTRIBUTES,
  MUSIC_CHORD,
  MUSIC_NOTE,
  MUSIC_STAFF,
} from '../consts';

const NOTE_STEM_X_OFFSET_PX = 365 * NOTE_SCALE;

afterEach(() => {
  document.body.innerHTML = '';
});

function triggerSlotChange(staff: any, notes: HTMLElement[]) {
  const slot = staff.shadowRoot.querySelector('slot');
  slot.assignedElements = () => notes;
  slot.dispatchEvent(new Event('slotchange'));
}

// ─── Polygon helpers ──────────────────────────────────────────────────────────

// Parses `points` into [[x,y], [x,y], [x,y], [x,y]] (4 corners).
// BeamGroup.space() always emits corners in this order:
//   [0] left-outer, [1] left-inner, [2] right-inner, [3] right-outer
// "Outer" = the edge touching stem tips.
function parsePoints(polygon: Element): number[][] {
  return (polygon.getAttribute('points') ?? '')
    .trim()
    .split(/\s+/)
    .map((p) => p.split(',').map(Number));
}

function beamWidth(polygon: Element): number {
  const points = parsePoints(polygon);
  return Math.abs(points[3][0] - points[0][0]);
}

// Interpolated y on the outer edge (toward stem tips) at x.
function outerEdgeY(polygon: Element, x: number): number {
  const points = parsePoints(polygon);
  const interpolationFactor =
    (x - points[0][0]) / (points[3][0] - points[0][0]);
  return points[0][1] + (points[3][1] - points[0][1]) * interpolationFactor;
}

// Interpolated y on the inner edge (toward noteheads) at x.
function innerEdgeY(polygon: Element, x: number): number {
  const points = parsePoints(polygon);
  const interpolationFactor =
    (x - points[1][0]) / (points[2][0] - points[1][0]);
  return points[1][1] + (points[2][1] - points[1][1]) * interpolationFactor;
}

// ─── Note/chord position helpers ─────────────────────────────────────────────

function getNoteX(note: HTMLElement): number {
  return parseFloat((note as HTMLElement).style.left) || 0;
}

function getNoteY(note: HTMLElement): number {
  return parseFloat((note as HTMLElement).style.top) || 0;
}

function getNoteStem(note: HTMLElement): Element | null {
  return (note as any).shadowRoot?.querySelector('.stem') ?? null;
}

// For chords: get the stem from the chord's shadow DOM SVG
function getChordStem(chord: HTMLElement): Element | null {
  return (chord as any).shadowRoot?.querySelector('.stem') ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('beams', () => {
  describe('beam groups are created for beamable note sequences', () => {
    it('creates one beam group for two consecutive eighth notes', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
      staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
      staff.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
      document.body.appendChild(staff);

      const notes = [
        makeNote({ note: 'C', octave: 4, duration: 'eighth' }),
        makeNote({ note: 'D', octave: 4, duration: 'eighth' }),
      ];
      triggerSlotChange(staff, notes);

      expect(staff.shadowRoot.querySelectorAll('.beam-group')).toHaveLength(1);
    });

    it('does not create a beam group for a lone beamable note', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
      staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
      staff.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
      document.body.appendChild(staff);

      const notes = [
        makeNote({ note: 'C', octave: 4, duration: 'quarter' }),
        makeNote({ note: 'E', octave: 4, duration: 'eighth' }),
      ];
      triggerSlotChange(staff, notes);

      expect(staff.shadowRoot.querySelectorAll('.beam-group')).toHaveLength(0);
    });

    it('splits 4/4 eighth notes into two groups at the half-measure boundary', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
      staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
      staff.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
      document.body.appendChild(staff);

      const notes = [
        // group 1
        makeNote({ note: 'C', octave: 4, duration: 'eighth' }),
        makeNote({ note: 'D', octave: 4, duration: 'eighth' }),
        makeNote({ note: 'E', octave: 4, duration: 'eighth' }),
        makeNote({ note: 'F', octave: 4, duration: 'eighth' }),
        // group 2
        makeNote({ note: 'G', octave: 4, duration: 'eighth' }),
        makeNote({ note: 'A', octave: 4, duration: 'eighth' }),
        makeNote({ note: 'B', octave: 4, duration: 'eighth' }),
        makeNote({ note: 'C', octave: 5, duration: 'eighth' }),
      ];
      triggerSlotChange(staff, notes);

      expect(staff.shadowRoot.querySelectorAll('.beam-group')).toHaveLength(2);
    });

    it('groups 6/8 eighth notes into two dotted-quarter beats', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
      staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
      staff.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '6/8');
      document.body.appendChild(staff);

      const notes = [
        // group 1
        makeNote({ note: 'C', octave: 4, duration: 'eighth' }),
        makeNote({ note: 'D', octave: 4, duration: 'eighth' }),
        makeNote({ note: 'E', octave: 4, duration: 'eighth' }),
        // group 2
        makeNote({ note: 'F', octave: 4, duration: 'eighth' }),
        makeNote({ note: 'G', octave: 4, duration: 'eighth' }),
        makeNote({ note: 'A', octave: 4, duration: 'eighth' }),
      ];
      triggerSlotChange(staff, notes);

      expect(staff.shadowRoot.querySelectorAll('.beam-group')).toHaveLength(2);
    });
  });

  describe('primary beam (eighth notes)', () => {
    it('has exactly one beam polygon for a group of eighth notes', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
      staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
      staff.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
      document.body.appendChild(staff);

      const notes = [
        makeNote({ note: 'C', octave: 4, duration: 'eighth' }),
        makeNote({ note: 'E', octave: 4, duration: 'eighth' }),
      ];
      triggerSlotChange(staff, notes);

      const beamGroup = staff.shadowRoot.querySelector('.beam-group');
      expect(beamGroup.querySelectorAll('.beam')).toHaveLength(1);
    });

    it('primary beam polygon spans the full width of the note group', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
      staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
      staff.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
      document.body.appendChild(staff);

      const notes = [
        makeNote({ note: 'C', octave: 4, duration: 'eighth' }),
        makeNote({ note: 'E', octave: 4, duration: 'eighth' }),
      ];
      triggerSlotChange(staff, notes);

      const primary = staff.shadowRoot.querySelector('.beam-group .beam');
      // Spanning beam must be noticeably wider than a fractional stub (6 px).
      expect(beamWidth(primary)).toBeGreaterThan(10);
    });
  });

  describe('secondary beam (sixteenth notes)', () => {
    it('adds a secondary beam polygon for a group of sixteenth notes', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
      staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
      staff.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
      document.body.appendChild(staff);

      const notes = [
        makeNote({ note: 'C', octave: 4, duration: 'sixteenth' }),
        makeNote({ note: 'D', octave: 4, duration: 'sixteenth' }),
        makeNote({ note: 'E', octave: 4, duration: 'sixteenth' }),
        makeNote({ note: 'F', octave: 4, duration: 'sixteenth' }),
      ];
      triggerSlotChange(staff, notes);

      const beamGroup = staff.shadowRoot.querySelector('.beam-group');
      expect(beamGroup.querySelectorAll('.beam')).toHaveLength(2);
    });

    it('secondary beam is no wider than the primary beam', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
      staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
      staff.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
      document.body.appendChild(staff);

      const notes = [
        makeNote({ note: 'C', octave: 4, duration: 'eighth' }),
        makeNote({ note: 'D', octave: 4, duration: 'sixteenth' }),
        makeNote({ note: 'E', octave: 4, duration: 'sixteenth' }),
      ];
      triggerSlotChange(staff, notes);

      const beams = staff.shadowRoot.querySelectorAll('.beam-group .beam');
      const [primary, secondary] = beams;
      expect(beamWidth(secondary)).toBeLessThanOrEqual(beamWidth(primary));
    });
  });

  describe('fractional beams', () => {
    it('adds a fractional when a single sixteenth is adjacent to an eighth', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
      staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
      staff.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
      document.body.appendChild(staff);

      const notes = [
        makeNote({ note: 'C', octave: 4, duration: 'eighth' }),
        makeNote({ note: 'D', octave: 4, duration: 'sixteenth' }),
      ];
      triggerSlotChange(staff, notes);

      const beams = staff.shadowRoot.querySelectorAll('.beam-group .beam');
      expect(beams).toHaveLength(2);
      const [primary, stub] = beams;
      expect(beamWidth(stub)).toBeLessThan(beamWidth(primary));
      expect(beamWidth(stub)).toBeLessThanOrEqual(10);
    });

    it('adds two fractionals for a sixteenth-eighth-sixteenth pattern', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
      staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
      staff.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
      document.body.appendChild(staff);

      const notes = [
        makeNote({ note: 'C', octave: 4, duration: 'sixteenth' }), // left fractional
        makeNote({ note: 'D', octave: 4, duration: 'eighth' }),
        makeNote({ note: 'E', octave: 4, duration: 'sixteenth' }), // right fractional
      ];
      triggerSlotChange(staff, notes);

      const beams = staff.shadowRoot.querySelectorAll('.beam-group .beam');
      expect(beams).toHaveLength(3);
      const [primary, stub1, stub2] = beams;
      expect(beamWidth(stub1)).toBeLessThan(beamWidth(primary));
      expect(beamWidth(stub2)).toBeLessThan(beamWidth(primary));
    });
  });

  describe('stem tips are inside the beam polygon', () => {
    // Notes render their own SVGs in their shadow DOM.
    // The staff positions them via inline styles. Stem geometry is in note.shadowRoot.
    // In jsdom, getBoundingClientRect returns 0 so describeEndX = 0 and
    // style.left directly equals the beamsContainer-relative x coordinate.

    it('stem-up notes: stem tips are enclosed by the primary beam', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
      staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
      staff.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
      document.body.appendChild(staff);

      const notes = [
        makeNote({ note: 'C', octave: 4, duration: 'eighth' }),
        makeNote({ note: 'D', octave: 4, duration: 'eighth' }),
      ];
      triggerSlotChange(staff, notes);

      const primaryBeam = staff.shadowRoot.querySelector('.beam-group .beam');

      expect(notes.length).toBeGreaterThan(0);
      for (const note of notes) {
        const noteY = getNoteY(note);
        const noteX = getNoteX(note);
        const stem = getNoteStem(note)!;
        expect(stem).not.toBeNull();

        const tipY = noteY + parseFloat(stem.getAttribute('y1')!) * NOTE_SCALE;
        const tipX = noteX + parseFloat(stem.getAttribute('x1')!) * NOTE_SCALE;

        const outer = outerEdgeY(primaryBeam, tipX);
        const inner = innerEdgeY(primaryBeam, tipX);
        expect(tipY).toBeGreaterThanOrEqual(Math.min(outer, inner) - 1);
        expect(tipY).toBeLessThanOrEqual(Math.max(outer, inner) + 1);
      }
    });

    it('stem-down notes: stem tips are enclosed by the primary beam', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
      staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
      staff.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
      document.body.appendChild(staff);

      const notes = [
        makeNote({ note: 'C', octave: 5, duration: 'eighth' }),
        makeNote({ note: 'D', octave: 5, duration: 'eighth' }),
      ];
      triggerSlotChange(staff, notes);

      const primaryBeam = staff.shadowRoot.querySelector('.beam-group .beam');

      expect(notes.length).toBeGreaterThan(0);
      for (const note of notes) {
        const noteY = getNoteY(note);
        const noteX = getNoteX(note);
        const stem = getNoteStem(note)!;
        expect(stem).not.toBeNull();

        const tipY = noteY + parseFloat(stem.getAttribute('y2')!) * NOTE_SCALE;
        const tipX = noteX + parseFloat(stem.getAttribute('x1')!) * NOTE_SCALE;

        const outer = outerEdgeY(primaryBeam, tipX);
        const inner = innerEdgeY(primaryBeam, tipX);
        expect(tipY).toBeGreaterThanOrEqual(Math.min(outer, inner) - 1);
        expect(tipY).toBeLessThanOrEqual(Math.max(outer, inner) + 1);
      }
    });
  });

  describe('beam slant follows pitch contour', () => {
    it('beam ascends when the first note is lower than the last', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
      staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
      staff.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
      document.body.appendChild(staff);

      const notes = [
        makeNote({ note: 'C', octave: 4, duration: 'eighth' }),
        makeNote({ note: 'A', octave: 4, duration: 'eighth' }),
      ];
      triggerSlotChange(staff, notes);

      const points = parsePoints(
        staff.shadowRoot.querySelector('.beam-group .beam')
      );
      expect(points[0][1]).toBeGreaterThan(points[3][1]);
    });

    it('beam descends when the first note is higher than the last', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
      staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
      staff.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
      document.body.appendChild(staff);

      const notes = [
        makeNote({ note: 'A', octave: 4, duration: 'eighth' }),
        makeNote({ note: 'C', octave: 4, duration: 'eighth' }),
      ];
      triggerSlotChange(staff, notes);

      const points = parsePoints(
        staff.shadowRoot.querySelector('.beam-group .beam')
      );
      expect(points[0][1]).toBeLessThan(points[3][1]);
    });

    it('beam is horizontal when all notes are the same pitch', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
      staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
      staff.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
      document.body.appendChild(staff);

      const notes = [
        makeNote({ note: 'C', octave: 4, duration: 'eighth' }),
        makeNote({ note: 'C', octave: 4, duration: 'eighth' }),
      ];
      triggerSlotChange(staff, notes);

      const pts = parsePoints(
        staff.shadowRoot.querySelector('.beam-group .beam')
      );
      expect(Math.abs(pts[0][1] - pts[3][1])).toBeLessThan(1);
    });
  });

  describe('beam clears chord noteheads', () => {
    it('beam inner edge stays above the non-extremal notehead in a stem-up chord', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
      staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
      staff.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
      document.body.appendChild(staff);

      const chords = [
        makeChord({
          duration: 'eighth',
          notes: [
            { note: 'C', octave: 4 },
            { note: 'E', octave: 4 },
          ],
        }),
        makeChord({
          duration: 'eighth',
          notes: [
            { note: 'B', octave: 4 },
            { note: 'D', octave: 4 },
          ],
        }),
      ];
      triggerSlotChange(staff, chords);

      const primaryBeam = staff.shadowRoot.querySelector('.beam-group .beam');

      const B4_STAFF_Y = 50;
      const NOTEHEAD_V_RADIUS = 3.2;
      const noteheadTop = B4_STAFF_Y - NOTEHEAD_V_RADIUS;

      // Get chord 2 x position from its inline style
      const chord2X = getNoteX(chords[1]);
      const stemX = chord2X + NOTE_STEM_X_OFFSET_PX;
      const beamInnerY = innerEdgeY(primaryBeam, stemX);
      expect(beamInnerY).toBeLessThan(noteheadTop);
    });

    it('extremal note stems in all chords still reach the beam after clearance shift', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
      staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
      staff.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
      document.body.appendChild(staff);

      const chords = [
        makeChord({
          duration: 'eighth',
          notes: [
            { note: 'C', octave: 4 },
            { note: 'E', octave: 4 },
          ],
        }),
        makeChord({
          duration: 'eighth',
          notes: [
            { note: 'B', octave: 4 },
            { note: 'D', octave: 4 },
          ],
        }),
      ];
      triggerSlotChange(staff, chords);

      const primaryBeam = staff.shadowRoot.querySelector('.beam-group .beam');

      for (const chord of chords) {
        const chordX = getNoteX(chord);
        const stemX = chordX + NOTE_STEM_X_OFFSET_PX;
        const stem = getChordStem(chord)!;
        expect(stem).not.toBeNull();

        // Get the extremal note's y offset from the chord's internal SVG
        const extremalNoteSvg = stem.closest('svg') as SVGElement;
        const stemNoteY = parseFloat(extremalNoteSvg?.getAttribute('y') ?? '0');
        const tipY =
          stemNoteY + parseFloat(stem.getAttribute('y1')!) * NOTE_SCALE;
        const outer = outerEdgeY(primaryBeam, stemX);
        const inner = innerEdgeY(primaryBeam, stemX);

        expect(tipY).toBeGreaterThanOrEqual(Math.min(outer, inner) - 1);
        expect(tipY).toBeLessThanOrEqual(Math.max(outer, inner) + 1);
      }
    });

    it('secondary beam inner edge stays above non-extremal notehead in sixteenth chord', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
      staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
      staff.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
      document.body.appendChild(staff);

      const chords = [
        makeChord({
          duration: 'eighth',
          notes: [
            { note: 'G', octave: 4 },
            { note: 'B', octave: 4 },
          ],
        }),
        makeChord({
          duration: 'sixteenth',
          notes: [
            { note: 'B', octave: 4 },
            { note: 'D', octave: 4 },
          ],
        }),
      ];
      triggerSlotChange(staff, chords);

      const beams = [
        ...staff.shadowRoot.querySelectorAll('.beam-group .beam'),
      ] as Element[];

      expect(beams.length).toBeGreaterThanOrEqual(2);
      const primaryBeam = beams[0];
      const secondaryBeam = beams[1];

      const chord2X = getNoteX(chords[1]);
      const stemX = chord2X + NOTE_STEM_X_OFFSET_PX;

      const B4_TOP = 50 - 3.2;
      expect(innerEdgeY(primaryBeam, stemX)).toBeLessThan(B4_TOP);
      expect(innerEdgeY(secondaryBeam, stemX)).toBeLessThan(B4_TOP);
    });
  });

  describe('beamed chords with octave-ambiguous notes use close-voicing resolution', () => {
    // Regression test: chords with notes that lack an explicit octave must use
    // close-voicing resolution (same as chord rendering) when computing beam Y
    // and stem direction. Without the fix, the simple octave-search order
    // returned the wrong octave (e.g. E4 instead of E5), causing the wrong
    // stem direction and a beam that floated in the middle of the stems.
    function makeAmbiguousChord(duration: DurationType): ChordElementType {
      const chord = document.createElement(MUSIC_CHORD);
      chord.setAttribute('duration', duration);
      // Notes without octave attribute — resolved by close-voicing logic
      const noteA = document.createElement(MUSIC_NOTE);
      noteA.setAttribute('note', 'A');
      const noteE = document.createElement(MUSIC_NOTE);
      noteE.setAttribute('note', 'E');
      chord.appendChild(noteA);
      chord.appendChild(noteE);
      return chord as unknown as ChordElementType;
    }

    it('stem tips of both chords sit inside the beam polygon', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
      staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
      staff.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
      document.body.appendChild(staff);

      const chords = [
        makeAmbiguousChord('eighth'),
        makeAmbiguousChord('eighth'),
      ];
      triggerSlotChange(staff, chords);

      const primaryBeam = staff.shadowRoot.querySelector('.beam-group .beam');
      expect(primaryBeam).not.toBeNull();

      // Close-voicing resolves ['A','E'] to A4 (staffY=55) and E5 (staffY=35).
      // E5 is above the middle staff line (B4, staffY=50), so stems go DOWN and
      // the beam must be below all noteheads.
      const NOTE_STEM_X_OFFSET_STEM_DOWN_PX = 247 * NOTE_SCALE;
      for (const chord of chords) {
        const chordX = getNoteX(chord);
        const stemX = chordX + NOTE_STEM_X_OFFSET_STEM_DOWN_PX;
        const stem = getChordStem(chord);
        expect(stem).not.toBeNull();

        // Stem tip (y2 for stem-down) must sit within the beam polygon.
        const extremalNoteSvg = stem!.closest('svg') as SVGElement;
        const stemNoteY = parseFloat(extremalNoteSvg?.getAttribute('y') ?? '0');
        const tipY =
          stemNoteY + parseFloat(stem!.getAttribute('y2')!) * NOTE_SCALE;
        const outer = outerEdgeY(primaryBeam!, stemX);
        const inner = innerEdgeY(primaryBeam!, stemX);
        expect(tipY).toBeGreaterThanOrEqual(Math.min(outer, inner) - 1);
        expect(tipY).toBeLessThanOrEqual(Math.max(outer, inner) + 1);
      }
    });

    it('beam outer edge is below both chord noteheads for stem-down', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
      staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
      staff.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
      document.body.appendChild(staff);

      const chords = [
        makeAmbiguousChord('eighth'),
        makeAmbiguousChord('eighth'),
      ];
      triggerSlotChange(staff, chords);

      const primaryBeam = staff.shadowRoot.querySelector('.beam-group .beam');
      expect(primaryBeam).not.toBeNull();

      // A4 (staffY=55) notehead center is at approximately staffY - 2 = 53.
      // E5 (staffY=35) notehead center is at approximately staffY - 2 = 33.
      // Both noteheads must be above (smaller Y than) the beam outer edge.
      const NOTE_STEM_X_OFFSET_STEM_DOWN_PX = 247 * NOTE_SCALE;
      const A4_NOTEHEAD_Y = 53;
      const E5_NOTEHEAD_Y = 33;

      for (const chord of chords) {
        const chordX = getNoteX(chord);
        const stemX = chordX + NOTE_STEM_X_OFFSET_STEM_DOWN_PX;
        const outer = outerEdgeY(primaryBeam!, stemX);
        expect(outer).toBeGreaterThan(A4_NOTEHEAD_Y);
        expect(outer).toBeGreaterThan(E5_NOTEHEAD_Y);
      }
    });
  });

  describe('minimum stem length is enforced', () => {
    it('no stem is shorter than 25 px when a steep-pitch beam group requires shifting', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
      staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
      staff.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
      document.body.appendChild(staff);

      const steepGapNotes = [
        makeNote({ note: 'C', octave: 4, duration: 'eighth' }),
        makeNote({ note: 'G', octave: 5, duration: 'eighth' }),
        makeNote({ note: 'C', octave: 4, duration: 'eighth' }),
        makeNote({ note: 'G', octave: 5, duration: 'eighth' }),
      ];
      triggerSlotChange(staff, steepGapNotes);

      expect(steepGapNotes.length).toBeGreaterThan(0);
      for (const note of steepGapNotes) {
        const stem = getNoteStem(note);
        if (!stem) continue;
        const y1 = parseFloat(stem.getAttribute('y1')!);
        const y2 = parseFloat(stem.getAttribute('y2')!);
        const stemLengthPx = Math.abs(y2 - y1) * NOTE_SCALE;

        expect(stemLengthPx).toBeGreaterThanOrEqual(24);
      }
    });
  });
});

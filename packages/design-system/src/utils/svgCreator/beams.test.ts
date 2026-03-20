/**
 * @jest-environment jsdom
 *
 * Treble-staff Y coordinates used throughout these tests:
 *   C4=80  D4=75  E4=70  G4=60  A4=55  B4=50 (middle line)
 *   C5=45  D5=40  E5=35  G5=25
 * Notes with staffY > 50 (below middle line) get stem-up.
 * Notes with staffY ≤ 50 (on/above middle line) get stem-down.
 */

import '../../index'; // registers all custom elements

// Internal scale: 600-unit note coordinate space → 32 px viewport.
const NOTE_SCALE = 32 / 600;

afterEach(() => {
  document.body.innerHTML = '';
});

function makeNote(value: string, duration: string): HTMLElement {
  const note = document.createElement('music-note') as any;
  note.setAttribute('value', value);
  note.setAttribute('duration', duration);
  return note;
}

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

// Width of the beam polygon in pixels.
function beamWidth(polygon: Element): number {
  const pts = parsePoints(polygon);
  return Math.abs(pts[3][0] - pts[0][0]);
}

// Interpolated y on the outer edge (toward stem tips) at x.
function outerEdgeY(polygon: Element, x: number): number {
  const pts = parsePoints(polygon);
  const t = (x - pts[0][0]) / (pts[3][0] - pts[0][0]);
  return pts[0][1] + (pts[3][1] - pts[0][1]) * t;
}

// Interpolated y on the inner edge (toward noteheads) at x.
function innerEdgeY(polygon: Element, x: number): number {
  const pts = parsePoints(polygon);
  const t = (x - pts[1][0]) / (pts[2][0] - pts[1][0]);
  return pts[1][1] + (pts[2][1] - pts[1][1]) * t;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('beams', () => {
  describe('beam groups are created for beamable note sequences', () => {
    it('creates one beam group for two consecutive eighth notes', () => {
      const staff = document.createElement('music-staff-treble') as any;
      staff.setAttribute('keySig', 'C');
      staff.setAttribute('mode', 'major');
      staff.setAttribute('time', '4/4');
      document.body.appendChild(staff);

      const notes = [makeNote('C4', 'eighth'), makeNote('D4', 'eighth')];
      triggerSlotChange(staff, notes);

      expect(staff.shadowRoot.querySelectorAll('.beam-group')).toHaveLength(1);
    });

    it('does not create a beam group for a lone beamable note', () => {
      const staff = document.createElement('music-staff-treble') as any;
      staff.setAttribute('keySig', 'C');
      staff.setAttribute('mode', 'major');
      staff.setAttribute('time', '4/4');
      document.body.appendChild(staff);

      // Only one eighth note — too few to beam.
      const notes = [makeNote('C4', 'quarter'), makeNote('E4', 'eighth')];
      triggerSlotChange(staff, notes);

      expect(staff.shadowRoot.querySelectorAll('.beam-group')).toHaveLength(0);
    });

    it('splits 4/4 eighth notes into two groups at the half-measure boundary', () => {
      const staff = document.createElement('music-staff-treble') as any;
      staff.setAttribute('keySig', 'C');
      staff.setAttribute('mode', 'major');
      staff.setAttribute('time', '4/4');
      document.body.appendChild(staff);

      // 4/4 window = 0.5 whole note. Offsets 0–3/8 → group 1; 4/8–7/8 → group 2.
      const notes = [
        makeNote('C4', 'eighth'),
        makeNote('D4', 'eighth'),
        makeNote('E4', 'eighth'),
        makeNote('F4', 'eighth'),
        makeNote('G4', 'eighth'),
        makeNote('A4', 'eighth'),
        makeNote('B4', 'eighth'),
        makeNote('C5', 'eighth'),
      ];
      triggerSlotChange(staff, notes);

      expect(staff.shadowRoot.querySelectorAll('.beam-group')).toHaveLength(2);
    });

    it('groups 6/8 eighth notes into two dotted-quarter beats', () => {
      const staff = document.createElement('music-staff-treble') as any;
      staff.setAttribute('keySig', 'C');
      staff.setAttribute('mode', 'major');
      staff.setAttribute('time', '6/8');
      document.body.appendChild(staff);

      // 6/8 window = 3/8. Offsets 0,1/8,2/8 → group 1; 3/8,4/8,5/8 → group 2.
      const notes = [
        makeNote('C4', 'eighth'),
        makeNote('D4', 'eighth'),
        makeNote('E4', 'eighth'),
        makeNote('F4', 'eighth'),
        makeNote('G4', 'eighth'),
        makeNote('A4', 'eighth'),
      ];
      triggerSlotChange(staff, notes);

      expect(staff.shadowRoot.querySelectorAll('.beam-group')).toHaveLength(2);
    });
  });

  describe('primary beam (eighth notes)', () => {
    it('has exactly one beam polygon for a group of eighth notes', () => {
      const staff = document.createElement('music-staff-treble') as any;
      staff.setAttribute('keySig', 'C');
      staff.setAttribute('mode', 'major');
      staff.setAttribute('time', '4/4');
      document.body.appendChild(staff);

      const notes = [makeNote('C4', 'eighth'), makeNote('E4', 'eighth')];
      triggerSlotChange(staff, notes);

      const beamGroup = staff.shadowRoot.querySelector('.beam-group');
      expect(beamGroup.querySelectorAll('.beam')).toHaveLength(1);
    });

    it('primary beam polygon spans the full width of the note group', () => {
      const staff = document.createElement('music-staff-treble') as any;
      staff.setAttribute('keySig', 'C');
      staff.setAttribute('mode', 'major');
      staff.setAttribute('time', '4/4');
      document.body.appendChild(staff);

      const notes = [makeNote('C4', 'eighth'), makeNote('E4', 'eighth')];
      triggerSlotChange(staff, notes);

      const primary = staff.shadowRoot.querySelector('.beam-group .beam');
      // Spanning beam must be noticeably wider than a fractional stub (6 px).
      expect(beamWidth(primary)).toBeGreaterThan(10);
    });
  });

  describe('secondary beam (sixteenth notes)', () => {
    it('adds a secondary beam polygon for a group of sixteenth notes', () => {
      const staff = document.createElement('music-staff-treble') as any;
      staff.setAttribute('keySig', 'C');
      staff.setAttribute('mode', 'major');
      staff.setAttribute('time', '4/4');
      document.body.appendChild(staff);

      const notes = [
        makeNote('C4', 'sixteenth'),
        makeNote('D4', 'sixteenth'),
        makeNote('E4', 'sixteenth'),
        makeNote('F4', 'sixteenth'),
      ];
      triggerSlotChange(staff, notes);

      const beamGroup = staff.shadowRoot.querySelector('.beam-group');
      // Primary beam + secondary beam = 2 polygons.
      expect(beamGroup.querySelectorAll('.beam')).toHaveLength(2);
    });

    it('secondary beam is no wider than the primary beam', () => {
      const staff = document.createElement('music-staff-treble') as any;
      staff.setAttribute('keySig', 'C');
      staff.setAttribute('mode', 'major');
      staff.setAttribute('time', '4/4');
      document.body.appendChild(staff);

      const notes = [
        makeNote('C4', 'eighth'),
        makeNote('D4', 'sixteenth'),
        makeNote('E4', 'sixteenth'),
      ];
      triggerSlotChange(staff, notes);

      const beams = staff.shadowRoot.querySelectorAll('.beam-group .beam');
      const [primary, secondary] = beams;
      expect(beamWidth(secondary)).toBeLessThanOrEqual(beamWidth(primary));
    });
  });

  describe('fractional beams', () => {
    it('adds a narrow stub when a single sixteenth is adjacent to an eighth', () => {
      const staff = document.createElement('music-staff-treble') as any;
      staff.setAttribute('keySig', 'C');
      staff.setAttribute('mode', 'major');
      staff.setAttribute('time', '4/4');
      document.body.appendChild(staff);

      // The isolated sixteenth needs a left-pointing fractional stub for its
      // second beam level.
      const notes = [makeNote('C4', 'eighth'), makeNote('D4', 'sixteenth')];
      triggerSlotChange(staff, notes);

      const beams = staff.shadowRoot.querySelectorAll('.beam-group .beam');
      expect(beams).toHaveLength(2);
      const [primary, stub] = beams;
      expect(beamWidth(stub)).toBeLessThan(beamWidth(primary));
      expect(beamWidth(stub)).toBeLessThanOrEqual(10); // fractionalBeamWidth = 6 px
    });

    it('adds two stubs for a sixteenth–eighth–sixteenth pattern', () => {
      const staff = document.createElement('music-staff-treble') as any;
      staff.setAttribute('keySig', 'C');
      staff.setAttribute('mode', 'major');
      staff.setAttribute('time', '4/4');
      document.body.appendChild(staff);

      const notes = [
        makeNote('C4', 'sixteenth'),
        makeNote('D4', 'eighth'),
        makeNote('E4', 'sixteenth'),
      ];
      triggerSlotChange(staff, notes);

      const beams = staff.shadowRoot.querySelectorAll('.beam-group .beam');
      // primary + right-pointing stub (C4) + left-pointing stub (E4)
      expect(beams).toHaveLength(3);
      const [primary, stub1, stub2] = beams;
      expect(beamWidth(stub1)).toBeLessThan(beamWidth(primary));
      expect(beamWidth(stub2)).toBeLessThan(beamWidth(primary));
    });
  });

  describe('stem tips are inside the beam polygon', () => {
    // For each note SVG in a beam group the stem tip must sit between the
    // outer edge (the side touching stem tips) and the inner edge (toward
    // noteheads) of the primary beam polygon.  A 1 px tolerance covers
    // floating-point rounding.  This ensures no visible gap and no stem
    // protruding through the beam.

    it('stem-up notes: stem tips are enclosed by the primary beam', () => {
      const staff = document.createElement('music-staff-treble') as any;
      staff.setAttribute('keySig', 'C');
      staff.setAttribute('mode', 'major');
      staff.setAttribute('time', '4/4');
      document.body.appendChild(staff);

      // C4 (staffY=80) and D4 (staffY=75) are both below the middle line → stem-up.
      const notes = [makeNote('C4', 'eighth'), makeNote('D4', 'eighth')];
      triggerSlotChange(staff, notes);

      const primaryBeam = staff.shadowRoot.querySelector('.beam-group .beam');
      const noteSvgs = [
        ...staff.shadowRoot.querySelectorAll(
          '.notes-container > svg[data-duration]'
        ),
      ] as SVGElement[];

      expect(noteSvgs.length).toBeGreaterThan(0);
      for (const svg of noteSvgs) {
        const noteY = parseFloat(svg.getAttribute('y') ?? '0');
        const noteX = parseFloat(svg.getAttribute('x') ?? '0');
        const stem = svg.querySelector('.stem')!;
        // Stem-up: tip is at y1 (smaller y = top of stem).
        const tipY = noteY + parseFloat(stem.getAttribute('y1')!) * NOTE_SCALE;
        const tipX = noteX + parseFloat(stem.getAttribute('x1')!) * NOTE_SCALE;

        const outer = outerEdgeY(primaryBeam, tipX);
        const inner = innerEdgeY(primaryBeam, tipX);
        expect(tipY).toBeGreaterThanOrEqual(Math.min(outer, inner) - 1);
        expect(tipY).toBeLessThanOrEqual(Math.max(outer, inner) + 1);
      }
    });

    it('stem-down notes: stem tips are enclosed by the primary beam', () => {
      const staff = document.createElement('music-staff-treble') as any;
      staff.setAttribute('keySig', 'C');
      staff.setAttribute('mode', 'major');
      staff.setAttribute('time', '4/4');
      document.body.appendChild(staff);

      // C5 (staffY=45) and D5 (staffY=40) are above the middle line → stem-down.
      const notes = [makeNote('C5', 'eighth'), makeNote('D5', 'eighth')];
      triggerSlotChange(staff, notes);

      const primaryBeam = staff.shadowRoot.querySelector('.beam-group .beam');
      const noteSvgs = [
        ...staff.shadowRoot.querySelectorAll(
          '.notes-container > svg[data-duration]'
        ),
      ] as SVGElement[];

      expect(noteSvgs.length).toBeGreaterThan(0);
      for (const svg of noteSvgs) {
        const noteY = parseFloat(svg.getAttribute('y') ?? '0');
        const noteX = parseFloat(svg.getAttribute('x') ?? '0');
        const stem = svg.querySelector('.stem')!;
        // Stem-down: tip is at y2 (larger y = bottom of stem).
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
    // The primary beam is drawn between the first and last stem tips.
    // Because SVG Y increases downward, a higher-pitched note has a smaller
    // Y value, so the beam's outer-edge Y decreases when pitch rises and
    // increases when pitch falls.
    //
    // outerY(left)  > outerY(right) → ascending beam  (pitch rises L→R)
    // outerY(left)  < outerY(right) → descending beam (pitch falls L→R)
    // outerY(left) ≈ outerY(right)  → horizontal beam (same pitch)

    it('beam ascends when the first note is lower than the last', () => {
      const staff = document.createElement('music-staff-treble') as any;
      staff.setAttribute('keySig', 'C');
      staff.setAttribute('mode', 'major');
      staff.setAttribute('time', '4/4');
      document.body.appendChild(staff);

      // C4 (staffY=80, lower pitch) → A4 (staffY=55, higher pitch)
      const notes = [makeNote('C4', 'eighth'), makeNote('A4', 'eighth')];
      triggerSlotChange(staff, notes);

      const pts = parsePoints(
        staff.shadowRoot.querySelector('.beam-group .beam')
      );
      // Outer-left y is larger (beam starts lower) than outer-right y (beam ends higher).
      expect(pts[0][1]).toBeGreaterThan(pts[3][1]);
    });

    it('beam descends when the first note is higher than the last', () => {
      const staff = document.createElement('music-staff-treble') as any;
      staff.setAttribute('keySig', 'C');
      staff.setAttribute('mode', 'major');
      staff.setAttribute('time', '4/4');
      document.body.appendChild(staff);

      // A4 (staffY=55, higher pitch) → C4 (staffY=80, lower pitch)
      const notes = [makeNote('A4', 'eighth'), makeNote('C4', 'eighth')];
      triggerSlotChange(staff, notes);

      const pts = parsePoints(
        staff.shadowRoot.querySelector('.beam-group .beam')
      );
      // Outer-left y is smaller (beam starts higher) than outer-right y (beam ends lower).
      expect(pts[0][1]).toBeLessThan(pts[3][1]);
    });

    it('beam is horizontal when all notes are the same pitch', () => {
      const staff = document.createElement('music-staff-treble') as any;
      staff.setAttribute('keySig', 'C');
      staff.setAttribute('mode', 'major');
      staff.setAttribute('time', '4/4');
      document.body.appendChild(staff);

      const notes = [makeNote('C4', 'eighth'), makeNote('C4', 'eighth')];
      triggerSlotChange(staff, notes);

      const pts = parsePoints(
        staff.shadowRoot.querySelector('.beam-group .beam')
      );
      expect(Math.abs(pts[0][1] - pts[3][1])).toBeLessThan(1);
    });
  });

  describe('minimum stem length is enforced', () => {
    it('no stem is shorter than 25 px when a steep-pitch beam group requires shifting', () => {
      const staff = document.createElement('music-staff-treble') as any;
      staff.setAttribute('keySig', 'C');
      staff.setAttribute('mode', 'major');
      staff.setAttribute('time', '4/4');
      document.body.appendChild(staff);

      // C4 (staffY=80) alternating with G5 (staffY=25) creates a steep beam.
      // The beam-shift mechanism must raise the beam so the shortened stems
      // (on G5 notes) still reach the 25 px minimum beamed-stem length.
      const notes = [
        makeNote('C4', 'eighth'),
        makeNote('G5', 'eighth'),
        makeNote('C4', 'eighth'),
        makeNote('G5', 'eighth'),
      ];
      triggerSlotChange(staff, notes);

      const noteSvgs = staff.shadowRoot.querySelectorAll(
        '.notes-container > svg[data-duration]'
      ) as SVGElement[];
      expect(noteSvgs.length).toBeGreaterThan(0);

      for (const svg of noteSvgs) {
        const stem = svg.querySelector('.stem');
        if (!stem) continue;
        const y1 = parseFloat(stem.getAttribute('y1')!);
        const y2 = parseFloat(stem.getAttribute('y2')!);
        const stemLengthPx = Math.abs(y2 - y1) * NOTE_SCALE;
        // 1 px tolerance for floating-point arithmetic.
        expect(stemLengthPx).toBeGreaterThanOrEqual(24);
      }
    });
  });
});

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
import { GRACE_SCALE } from '../utils/notationDimensions';
import { SLUR_HEAD_CLEARANCE_PX } from '../utils/svgCreator/graceNotes';
import {
  NOTE_HEAD_RADIUS_PX,
  NOTE_SCALE,
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

describe('grace notes', () => {
  it('round-trips the grace attributes between property and attribute', () => {
    const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
    document.body.appendChild(noteElement);

    noteElement.grace = ['F#', 'G'];
    noteElement.graceOctave = [4, 4];
    noteElement.graceType = 'appoggiatura';
    noteElement.graceDuration = 'sixteenth';
    noteElement.graceSlur = 'none';

    expect(noteElement.getAttribute('grace')).toBe('F#,G');
    expect(noteElement.grace).toEqual(['F#', 'G']);
    expect(noteElement.getAttribute('grace-octave')).toBe('4,4');
    expect(noteElement.graceOctave).toEqual([4, 4]);
    expect(noteElement.graceType).toBe('appoggiatura');
    expect(noteElement.graceDuration).toBe('sixteenth');
    expect(noteElement.graceSlur).toBe('none');
  });

  it('defaults grace-type to acciaccatura and grace-slur to auto', () => {
    const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
    document.body.appendChild(noteElement);

    expect(noteElement.graceType).toBe('acciaccatura');
    expect(noteElement.graceSlur).toBe('auto');
    expect(noteElement.graceDuration).toBeNull();
    expect(noteElement.graceOctave).toBeNull();

    noteElement.setAttribute('grace-type', 'trill');
    expect(noteElement.graceType).toBe('acciaccatura');
  });

  it('rejects the whole grace list when any note token is invalid', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
    document.body.appendChild(noteElement);

    for (const invalid of ['G4', 'H', 'F#4', 'G,H']) {
      noteElement.setAttribute('grace', invalid);
      expect(noteElement.grace).toBeNull();
    }
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('falls back to the main note octave for missing or invalid grace-octave slots', () => {
    const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
    noteElement.setAttribute('note', 'C' satisfies Note);
    noteElement.setAttribute('octave', '5');
    noteElement.setAttribute('grace', 'B');
    document.body.appendChild(noteElement);

    // grace-octave omitted entirely → getter returns null.
    expect(noteElement.graceOctave).toBeNull();

    // Invalid single token → null slot, not a rejection.
    noteElement.setAttribute('grace-octave', 'x');
    expect(noteElement.graceOctave).toEqual([null]);

    // Out of range → null slot.
    noteElement.setAttribute('grace-octave', '9');
    expect(noteElement.graceOctave).toEqual([null]);
  });

  it('re-renders grace notes on attribute change when used standalone', () => {
    const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
    noteElement.setAttribute('note', 'C' satisfies Note);
    noteElement.setAttribute('octave', '5');
    document.body.appendChild(noteElement);
    expect(noteElement.shadowRoot?.querySelector('.grace-notes')).toBeNull();

    // With no parent staff to catch the NOTE_Y_CHANGE event, the element
    // must render itself directly or this update would never appear.
    noteElement.setAttribute('grace', 'B');
    noteElement.setAttribute('grace-octave', '4');

    const graceGroup = noteElement.shadowRoot?.querySelector('.grace-notes');
    expect(graceGroup).not.toBeNull();
    expect(graceGroup?.querySelectorAll('.grace-head')).toHaveLength(1);
  });

  it('renders a single grace note as a small flagged note with a slash and slur', () => {
    const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
    noteElement.setAttribute('note', 'C' satisfies Note);
    noteElement.setAttribute('octave', '5');
    noteElement.setAttribute('grace', 'B');
    noteElement.setAttribute('grace-octave', '4');
    document.body.appendChild(noteElement);

    const graceGroup = noteElement.shadowRoot?.querySelector('.grace-notes');
    expect(graceGroup).not.toBeNull();
    expect(graceGroup?.querySelectorAll('.grace-head')).toHaveLength(1);
    expect(graceGroup?.querySelector('.flag')).not.toBeNull();
    expect(graceGroup?.querySelector('.grace-slash')).not.toBeNull();
    expect(graceGroup?.querySelector('.grace-slur')).not.toBeNull();
    expect(graceGroup?.querySelectorAll('.grace-beam')).toHaveLength(0);
  });

  it('renders the same layout when grace-octave is omitted and defaults to the main octave', () => {
    const explicit = document.createElement(MUSIC_NOTE) as NoteElementType;
    explicit.setAttribute('note', 'C' satisfies Note);
    explicit.setAttribute('octave', '5');
    explicit.setAttribute('grace', 'B');
    explicit.setAttribute('grace-octave', '5');
    document.body.appendChild(explicit);

    const defaulted = document.createElement(MUSIC_NOTE) as NoteElementType;
    defaulted.setAttribute('note', 'C' satisfies Note);
    defaulted.setAttribute('octave', '5');
    defaulted.setAttribute('grace', 'B');
    document.body.appendChild(defaulted);

    const headTransform = (element: NoteElementType): string | null =>
      element.shadowRoot
        ?.querySelector('.grace-notes .grace-note')
        ?.getAttribute('transform') ?? null;

    expect(headTransform(defaulted)).toBe(headTransform(explicit));
  });

  it('renders no slash for an appoggiatura and no slur when grace-slur is none', () => {
    const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
    noteElement.setAttribute('grace', 'B');
    noteElement.setAttribute('grace-octave', '4');
    noteElement.setAttribute('grace-type', 'appoggiatura');
    noteElement.setAttribute('grace-slur', 'none');
    document.body.appendChild(noteElement);

    const graceGroup = noteElement.shadowRoot?.querySelector('.grace-notes');
    expect(graceGroup).not.toBeNull();
    expect(graceGroup?.querySelector('.grace-slash')).toBeNull();
    expect(graceGroup?.querySelector('.grace-slur')).toBeNull();
  });

  it('renders a grace group as beamed stemless heads with two beams and no flags', () => {
    const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
    noteElement.setAttribute('note', 'C' satisfies Note);
    noteElement.setAttribute('octave', '5');
    noteElement.setAttribute('grace', 'G,A,B');
    noteElement.setAttribute('grace-octave', '4,4,4');
    document.body.appendChild(noteElement);

    const graceGroup = noteElement.shadowRoot?.querySelector('.grace-notes');
    expect(graceGroup?.querySelectorAll('.grace-head')).toHaveLength(3);
    expect(graceGroup?.querySelectorAll('.grace-stem')).toHaveLength(3);
    expect(graceGroup?.querySelectorAll('.grace-beam')).toHaveLength(2);
    expect(graceGroup?.querySelector('.flag')).toBeNull();
    expect(graceGroup?.querySelector('.grace-slash')).not.toBeNull();
  });

  it('controls flag count on a single grace via grace-duration', () => {
    const sixteenth = document.createElement(MUSIC_NOTE) as NoteElementType;
    sixteenth.setAttribute('grace', 'B');
    sixteenth.setAttribute('grace-octave', '4');
    sixteenth.setAttribute('grace-duration', 'sixteenth');
    document.body.appendChild(sixteenth);
    // A sixteenth flag is the base path plus one <use> copy.
    expect(
      sixteenth.shadowRoot?.querySelectorAll('.grace-notes .flag use')
    ).toHaveLength(1);

    const quarter = document.createElement(MUSIC_NOTE) as NoteElementType;
    quarter.setAttribute('grace', 'B');
    quarter.setAttribute('grace-octave', '4');
    quarter.setAttribute('grace-duration', 'quarter');
    document.body.appendChild(quarter);
    expect(quarter.shadowRoot?.querySelector('.grace-notes .flag')).toBeNull();
    expect(
      quarter.shadowRoot?.querySelector('.grace-notes .stem')
    ).not.toBeNull();
  });

  it('keeps the single-grace slash anchored near the stem tip regardless of flag count', () => {
    const slashY = (duration: 'eighth' | 'sixteenth' | 'thirtysecond') => {
      const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
      noteElement.setAttribute('grace', 'B');
      noteElement.setAttribute('grace-octave', '4');
      noteElement.setAttribute('grace-duration', duration);
      document.body.appendChild(noteElement);
      const slash = noteElement.shadowRoot?.querySelector('.grace-slash');
      expect(slash).not.toBeNull();
      const y1 = Number(slash?.getAttribute('y1'));
      const y2 = Number(slash?.getAttribute('y2'));
      return (y1 + y2) / 2;
    };

    // Extra flags stack downward toward the head on a stem-up note, so the
    // stem tip — and the slash crossing it — must not shift with flag count.
    const eighthY = slashY('eighth');
    const sixteenthY = slashY('sixteenth');
    const thirtysecondY = slashY('thirtysecond');
    expect(sixteenthY).toBeCloseTo(eighthY, 5);
    expect(thirtysecondY).toBeCloseTo(eighthY, 5);
  });

  it('controls beam count on a grace group via grace-duration', () => {
    const thirtysecond = document.createElement(MUSIC_NOTE) as NoteElementType;
    thirtysecond.setAttribute('grace', 'G,A');
    thirtysecond.setAttribute('grace-octave', '4,4');
    thirtysecond.setAttribute('grace-duration', 'thirtysecond');
    document.body.appendChild(thirtysecond);
    expect(
      thirtysecond.shadowRoot?.querySelectorAll('.grace-notes .grace-beam')
    ).toHaveLength(3);

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const quarter = document.createElement(MUSIC_NOTE) as NoteElementType;
    quarter.setAttribute('grace', 'G,A');
    quarter.setAttribute('grace-octave', '4,4');
    quarter.setAttribute('grace-duration', 'quarter');
    document.body.appendChild(quarter);
    expect(
      quarter.shadowRoot?.querySelectorAll('.grace-notes .grace-beam')
    ).toHaveLength(2);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('keeps grace heads out of pitch-drag hit testing', () => {
    const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
    noteElement.setAttribute('grace', 'G,A');
    noteElement.setAttribute('grace-octave', '4,4');
    document.body.appendChild(noteElement);

    const graceGroup = noteElement.shadowRoot?.querySelector('.grace-notes');
    expect(graceGroup?.querySelector('.head-hit-zone')).toBeNull();
    expect(graceGroup?.querySelector('.head')).toBeNull();
  });

  it('renders a scaled accidental for a grace pitch with a suffix', () => {
    const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
    noteElement.setAttribute('grace', 'F#');
    noteElement.setAttribute('grace-octave', '4');
    document.body.appendChild(noteElement);

    expect(
      noteElement.shadowRoot?.querySelector('.grace-notes .grace-accidental')
    ).not.toBeNull();
  });

  it('arcs the slur above the heads when the main note shows an accidental', () => {
    const withAccidental = document.createElement(
      MUSIC_NOTE
    ) as NoteElementType;
    withAccidental.setAttribute('note', 'C#' satisfies Note);
    withAccidental.setAttribute('octave', '5');
    withAccidental.setAttribute('grace', 'B');
    withAccidental.setAttribute('grace-octave', '4');
    document.body.appendChild(withAccidental);

    const plain = document.createElement(MUSIC_NOTE) as NoteElementType;
    plain.setAttribute('note', 'C' satisfies Note);
    plain.setAttribute('octave', '5');
    plain.setAttribute('grace', 'B');
    plain.setAttribute('grace-octave', '4');
    document.body.appendChild(plain);

    // Path shape: M x y Q mx my ex ey — the control point y sits on the
    // bulge side of the endpoints.
    const controlPointY = (element: NoteElementType): number[] => {
      const d =
        element.shadowRoot
          ?.querySelector('.grace-slur path')
          ?.getAttribute('d') ?? '';
      const numbers = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
      return numbers; // [x, y, mx, my, ex, ey]
    };

    const above = controlPointY(withAccidental);
    expect(above[3]).toBeLessThan(Math.min(above[1], above[5]));

    const below = controlPointY(plain);
    expect(below[3]).toBeGreaterThan(Math.max(below[1], below[5]));
  });

  it('routes the slur clear of the main accidental horizontally, without growing its gap to the notehead', () => {
    const endPoint = (element: NoteElementType): number[] => {
      const d =
        element.shadowRoot
          ?.querySelector('.grace-slur path')
          ?.getAttribute('d') ?? '';
      const [, , , , endX, endY] = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
      return [endX, endY];
    };
    const headCenter = (element: NoteElementType): number[] => {
      const head = element.shadowRoot?.querySelector('.head');
      const cx = Number(head?.getAttribute('cx'));
      const cy = Number(head?.getAttribute('cy'));
      return [cx * NOTE_SCALE, cy * NOTE_SCALE];
    };

    const withAccidental = document.createElement(
      MUSIC_NOTE
    ) as NoteElementType;
    withAccidental.setAttribute('note', 'C#' satisfies Note);
    withAccidental.setAttribute('octave', '5');
    withAccidental.setAttribute('grace', 'B');
    withAccidental.setAttribute('grace-octave', '4');
    document.body.appendChild(withAccidental);

    const plain = document.createElement(MUSIC_NOTE) as NoteElementType;
    plain.setAttribute('note', 'C' satisfies Note);
    plain.setAttribute('octave', '5');
    plain.setAttribute('grace', 'B');
    plain.setAttribute('grace-octave', '4');
    document.body.appendChild(plain);

    const [endXWithAccidental, endYWithAccidental] = endPoint(withAccidental);
    const [mainHeadCenterX, mainHeadCenterY] = headCenter(withAccidental);
    // A sharp is 10px wide (ACCIDENTAL_SYMBOL_WIDTH), sat ACCIDENTAL_NOTE_GAP
    // (-7px, i.e. overlapping) left of the head center — so its bounding box
    // left edge sits accidentalWidth + gap px away.
    const accidentalLeftEdgeX = mainHeadCenterX - (10 + -7);

    // The slur's main-side endpoint must clear the accidental horizontally...
    expect(endXWithAccidental).toBeLessThan(accidentalLeftEdgeX);

    // ...but its *distance to the main notehead* must be the same constant
    // whether or not an accidental is shown — the accidental should only
    // ever push the endpoint further left (X), never further from the head
    // (Y), no matter how tall/wide the accidental is.
    const [, endYPlain] = endPoint(plain);
    const [, mainHeadCenterYPlain] = headCenter(plain);
    const gapWithAccidental = Math.abs(mainHeadCenterY - endYWithAccidental);
    const gapPlain = Math.abs(mainHeadCenterYPlain - endYPlain);
    expect(gapWithAccidental).toBeCloseTo(gapPlain, 5);
  });

  it('anchors the grace-side slur start at the stem/beam tip (not the notehead) when clearing a main accidental', () => {
    const graceHeadY = (element: NoteElementType): number => {
      const transform =
        element.shadowRoot
          ?.querySelector('.grace-note')
          ?.getAttribute('transform') ?? '';
      const [, y] = transform.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
      return y;
    };
    const slurStartY = (element: NoteElementType): number => {
      const d =
        element.shadowRoot
          ?.querySelector('.grace-slur path')
          ?.getAttribute('d') ?? '';
      const [, y] = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
      return y;
    };
    const firstBeamTopY = (element: NoteElementType): number => {
      const points =
        element.shadowRoot
          ?.querySelector('.grace-beam')
          ?.getAttribute('points') ?? '';
      const [, y] = points.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
      return y;
    };

    const withAccidental = document.createElement(
      MUSIC_NOTE
    ) as NoteElementType;
    withAccidental.setAttribute('note', 'C#' satisfies Note);
    withAccidental.setAttribute('octave', '5');
    withAccidental.setAttribute('grace', 'G,A,B');
    withAccidental.setAttribute('grace-octave', '4,4,4');
    document.body.appendChild(withAccidental);

    const plain = document.createElement(MUSIC_NOTE) as NoteElementType;
    plain.setAttribute('note', 'C' satisfies Note);
    plain.setAttribute('octave', '5');
    plain.setAttribute('grace', 'G,A,B');
    plain.setAttribute('grace-octave', '4,4,4');
    document.body.appendChild(plain);

    // With an accidental shown, the slur must start near the beam tip — well
    // above (numerically less than) the grace notehead — rather than near
    // the notehead itself.
    expect(slurStartY(withAccidental)).toBeLessThan(graceHeadY(withAccidental));
    expect(
      Math.abs(slurStartY(withAccidental) - firstBeamTopY(withAccidental))
    ).toBeLessThan(
      Math.abs(slurStartY(withAccidental) - graceHeadY(withAccidental))
    );

    // Without an accidental, the default notehead-to-notehead rule still
    // applies: the slur start stays close to (below) the notehead, not the
    // beam tip.
    expect(slurStartY(plain)).toBeGreaterThan(graceHeadY(plain));
  });

  it("clears the beam's highest point on an ascending grace group, not just the first note's beam Y", () => {
    const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
    noteElement.setAttribute('note', 'C#' satisfies Note);
    noteElement.setAttribute('octave', '5');
    // Ascending group (C4 -> D4): the first note's beam Y is the beam's
    // lowest point, not its highest — the slur must clear the highest point
    // (near the last note), not just the first.
    noteElement.setAttribute('grace', 'C,D');
    noteElement.setAttribute('grace-octave', '4,4');
    document.body.appendChild(noteElement);

    const stemTopYs = Array.from(
      noteElement.shadowRoot?.querySelectorAll('.grace-stem') ?? []
    ).map((stem) => Number(stem.getAttribute('y1')));
    const highestBeamY = Math.min(...stemTopYs);

    const d =
      noteElement.shadowRoot
        ?.querySelector('.grace-slur path')
        ?.getAttribute('d') ?? '';
    const [, startY] = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];

    expect(startY).toBeLessThan(highestBeamY);
  });

  it('anchors the slur clear of the grace stem and main stem', () => {
    // Path shape: M x y Q mx my ex ey
    const pathPoints = (element: NoteElementType): number[] => {
      const d =
        element.shadowRoot
          ?.querySelector('.grace-slur path')
          ?.getAttribute('d') ?? '';
      return d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []; // [x, y, mx, my, ex, ey]
    };
    const graceHeadX = (element: NoteElementType): number => {
      const transform =
        element.shadowRoot
          ?.querySelector('.grace-note')
          ?.getAttribute('transform') ?? '';
      const [x] = transform.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
      return x;
    };

    const stemUpMain = document.createElement(MUSIC_NOTE) as NoteElementType;
    stemUpMain.setAttribute('note', 'C' satisfies Note);
    stemUpMain.setAttribute('octave', '5');
    stemUpMain.setAttribute('grace', 'B');
    stemUpMain.setAttribute('grace-octave', '4');
    document.body.appendChild(stemUpMain);

    const [startX] = pathPoints(stemUpMain);
    expect(startX).toBeGreaterThan(graceHeadX(stemUpMain));

    // The end anchor must clear the main notehead's own horizontal radius,
    // not just a flat pixel gap — otherwise a diagonally-approaching curve
    // still visually touches the (wider-than-tall) notehead ellipse.
    const headCxAttr = Number(
      stemUpMain.shadowRoot?.querySelector('.head')?.getAttribute('cx')
    );
    const mainHeadCenterXPx = headCxAttr * NOTE_SCALE;
    const stemUpEndX = pathPoints(stemUpMain).at(-2) as number;
    expect(mainHeadCenterXPx - stemUpEndX).toBeGreaterThanOrEqual(
      NOTE_HEAD_RADIUS_PX + SLUR_HEAD_CLEARANCE_PX
    );

    // Only stemUp and accidental-shown vary. The stem-down + no-accidental
    // combination is the only one where the main stem sits in the slur's
    // approach path (the notehead-radius clearance and the stem clearance
    // both apply — whichever is larger wins), but the accidental-shown case
    // clears the accidental's own rendered edge, a fixed ~8.5px pullback
    // that's larger than the stem clearance in this codebase's current
    // constants — so the accidental case pulls back the most of the three.
    const stemDownNoAccidental = document.createElement(
      MUSIC_NOTE
    ) as NoteElementType;
    stemDownNoAccidental.setAttribute('note', 'C' satisfies Note);
    stemDownNoAccidental.setAttribute('octave', '5');
    stemDownNoAccidental.setAttribute('grace', 'B');
    stemDownNoAccidental.setAttribute('grace-octave', '4');
    document.body.appendChild(stemDownNoAccidental);
    stemDownNoAccidental.stemUp = false;

    const stemDownWithAccidental = document.createElement(
      MUSIC_NOTE
    ) as NoteElementType;
    stemDownWithAccidental.setAttribute('note', 'C' satisfies Note);
    stemDownWithAccidental.setAttribute('octave', '5');
    stemDownWithAccidental.setAttribute('grace', 'B');
    stemDownWithAccidental.setAttribute('grace-octave', '4');
    document.body.appendChild(stemDownWithAccidental);
    stemDownWithAccidental.stemUp = false;
    stemDownWithAccidental.showAccidental = 'natural';

    const stemDownEnd = pathPoints(stemDownNoAccidental).at(-2) as number;
    const stemDownAccidentalEnd = pathPoints(stemDownWithAccidental).at(
      -2
    ) as number;
    expect(stemDownAccidentalEnd).toBeLessThanOrEqual(stemDownEnd);
  });

  describe('grace articulation', () => {
    it('round-trips the grace-articulation attribute between property and attribute', () => {
      const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
      document.body.appendChild(noteElement);

      noteElement.grace = ['F#', 'G'];
      noteElement.graceArticulation = ['staccato', 'accent'];

      expect(noteElement.getAttribute('grace-articulation')).toBe(
        'staccato,accent'
      );
      expect(noteElement.graceArticulation).toEqual(['staccato', 'accent']);
    });

    it('falls back to no mark for missing or invalid grace-articulation slots, without rejecting the whole list', () => {
      const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
      noteElement.setAttribute('note', 'C' satisfies Note);
      noteElement.setAttribute('grace', 'A,B,C');
      document.body.appendChild(noteElement);

      // grace-articulation omitted entirely → getter returns null.
      expect(noteElement.graceArticulation).toBeNull();

      // Middle token invalid, trailing token missing → both fall back to
      // null for that position only, the valid first token still parses.
      noteElement.setAttribute('grace-articulation', 'staccato,not-a-mark');
      expect(noteElement.graceArticulation).toEqual(['staccato', null]);
    });

    it('renders a mark on each grace note in a group independently', () => {
      const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
      noteElement.setAttribute('note', 'C' satisfies Note);
      noteElement.setAttribute('octave', '5');
      noteElement.setAttribute('grace', 'A,B');
      noteElement.setAttribute('grace-octave', '4,4');
      noteElement.setAttribute('grace-articulation', 'staccato,accent');
      document.body.appendChild(noteElement);

      const graceGroup = noteElement.shadowRoot?.querySelector('.grace-notes');
      expect(graceGroup?.querySelectorAll('.articulations')).toHaveLength(2);
      expect(graceGroup?.querySelector('.staccato')).not.toBeNull();
      expect(graceGroup?.querySelector('.accent')).not.toBeNull();
    });

    it('renders no mark for a grace note whose slot is null, while its sibling still gets one', () => {
      const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
      noteElement.setAttribute('note', 'C' satisfies Note);
      noteElement.setAttribute('octave', '5');
      noteElement.setAttribute('grace', 'A,B');
      noteElement.setAttribute('grace-octave', '4,4');
      noteElement.setAttribute('grace-articulation', ',accent');
      document.body.appendChild(noteElement);

      const graceGroup = noteElement.shadowRoot?.querySelector('.grace-notes');
      expect(graceGroup?.querySelectorAll('.articulations')).toHaveLength(1);
      expect(graceGroup?.querySelector('.accent')).not.toBeNull();
    });

    it('renders a mark on a single (non-grouped) grace note', () => {
      const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
      noteElement.setAttribute('note', 'C' satisfies Note);
      noteElement.setAttribute('octave', '5');
      noteElement.setAttribute('grace', 'B');
      noteElement.setAttribute('grace-octave', '4');
      noteElement.setAttribute('grace-articulation', 'tenuto');
      document.body.appendChild(noteElement);

      const graceGroup = noteElement.shadowRoot?.querySelector('.grace-notes');
      expect(graceGroup?.querySelector('.articulations')).not.toBeNull();
      expect(graceGroup?.querySelector('.tenuto')).not.toBeNull();
    });

    it('scales the articulation mark with the grace note (GRACE_SCALE transform)', () => {
      const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
      noteElement.setAttribute('note', 'C' satisfies Note);
      noteElement.setAttribute('octave', '5');
      noteElement.setAttribute('grace', 'B');
      noteElement.setAttribute('grace-octave', '4');
      noteElement.setAttribute('grace-articulation', 'staccato');
      document.body.appendChild(noteElement);

      const marksOuterWrapper = noteElement.shadowRoot
        ?.querySelector('.grace-notes .articulations')
        ?.closest('g[transform^="translate("]');
      expect(marksOuterWrapper?.getAttribute('transform')).toContain(
        `scale(${GRACE_SCALE})`
      );
    });

    it('nests the marks in the same two scale levels (GRACE_SCALE, then NOTE_SCALE) as the grace head itself', () => {
      // Regression test: createArticulationMarks() draws in the same
      // 600-unit note-space createNoteSvg uses for the head, and
      // createNoteSvg wraps that space in its own inner scale(NOTE_SCALE)
      // before the outer translate+scale(GRACE_SCALE) grace wrapper — the
      // marks must mirror that exact nesting or they render ~1/NOTE_SCALE
      // too large and land outside any clipped viewBox (invisible in-staff).
      const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
      noteElement.setAttribute('note', 'C' satisfies Note);
      noteElement.setAttribute('octave', '5');
      noteElement.setAttribute('grace', 'B');
      noteElement.setAttribute('grace-octave', '4');
      noteElement.setAttribute('grace-articulation', 'staccato');
      document.body.appendChild(noteElement);

      const graceGroup = noteElement.shadowRoot?.querySelector('.grace-notes');
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

    it('renders no articulation marks when grace-articulation is unset', () => {
      const noteElement = document.createElement(MUSIC_NOTE) as NoteElementType;
      noteElement.setAttribute('note', 'C' satisfies Note);
      noteElement.setAttribute('octave', '5');
      noteElement.setAttribute('grace', 'A,B');
      noteElement.setAttribute('grace-octave', '4,4');
      document.body.appendChild(noteElement);

      const graceGroup = noteElement.shadowRoot?.querySelector('.grace-notes');
      expect(graceGroup?.querySelector('.articulations')).toBeNull();
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

  describe('grace notes', () => {
    function renderNotes(staff: Element, notes: NoteElementType[]): void {
      for (const note of notes) {
        staff.appendChild(note);
      }
      const slot = (staff as any).shadowRoot.querySelector('slot');
      slot.assignedElements = () => notes;
      slot.dispatchEvent(new Event('slotchange'));
    }

    function makeQuarterNote(
      value: Note,
      octave: Octave,
      grace?: string,
      graceOctave?: string
    ): NoteElementType {
      const note = document.createElement(MUSIC_NOTE) as NoteElementType;
      note.setAttribute('duration', 'quarter' satisfies DurationType);
      note.setAttribute('note', value);
      note.setAttribute('octave', `${octave}`);
      if (grace !== undefined) {
        note.setAttribute('grace', grace);
      }
      if (graceOctave !== undefined) {
        note.setAttribute('grace-octave', graceOctave);
      }
      return note;
    }

    it('pushes a graced note right so the grace group clears the previous note', () => {
      const staff = makeStaff();
      const plainFirst = makeQuarterNote('E', 4);
      const gracedSecond = makeQuarterNote('G', 4, 'A,B', '4,4');
      renderNotes(staff, [plainFirst, gracedSecond]);

      const firstLeft = parseFloat(plainFirst.style.left);
      const secondLeft = parseFloat(gracedSecond.style.left);
      // The grace footprint (2 columns + gap = 25px) must fit between the
      // previous note's right edge (left + 32px note width) and this note.
      expect(secondLeft).toBeGreaterThanOrEqual(firstLeft + 32 + 25);
    });

    it('grows the staff min-width when a note gains grace notes', () => {
      const staff = makeStaff();
      const minWidths: number[] = [];
      staff.addEventListener('staff-min-width', (event) => {
        minWidths.push((event as CustomEvent).detail.minWidth);
      });

      const note = makeQuarterNote('E', 4);
      renderNotes(staff, [note]);
      const withoutGrace = minWidths[minWidths.length - 1];

      note.setAttribute('grace', 'A,B');
      const withGrace = minWidths[minWidths.length - 1];

      expect(withGrace).toBe(withoutGrace + 25);
    });

    it('suppresses grace accidentals covered by the key signature and shows naturals', () => {
      const staff = document.createElement(MUSIC_STAFF_TREBLE) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'D' satisfies Note);
      staff.setAttribute(COMMON_ATTRIBUTES.MODE, 'major');
      staff.setAttribute(
        COMMON_ATTRIBUTES.TIME_SIG,
        '4/4' satisfies TimeSignature
      );
      document.body.appendChild(staff);

      // In D major F# is in the key signature: no symbol on a grace F#4.
      const sharpGrace = makeQuarterNote('G', 4, 'F#', '4');
      renderNotes(staff, [sharpGrace]);
      expect(
        sharpGrace.shadowRoot?.querySelector('.grace-notes .grace-accidental')
      ).toBeNull();

      // A grace F natural against the key signature takes a natural symbol.
      const naturalGrace = makeQuarterNote('G', 4, 'F', '4');
      renderNotes(staff, [naturalGrace]);
      expect(
        naturalGrace.shadowRoot?.querySelector('.grace-notes .grace-accidental')
      ).not.toBeNull();
    });

    it('carries a grace accidental through the measure to the main notes', () => {
      const staff = makeStaff();
      const graced = makeQuarterNote('G', 4, 'F#', '4');
      const laterSharp = makeQuarterNote('F#', 4);
      renderNotes(staff, [graced, laterSharp]);

      // The grace F# earlier in the measure already displayed the sharp.
      expect(laterSharp.showAccidental).toBeNull();
    });

    it('renders ledger lines for grace pitches beyond the staff', () => {
      const staff = makeStaff();
      const highGrace = makeQuarterNote('C', 5, 'C', '6');
      renderNotes(staff, [highGrace]);
      // C6 (staffY 10) needs ledger lines at staffY 20 and 10.
      expect(
        highGrace.shadowRoot?.querySelectorAll(
          '.grace-notes .grace-ledger-line'
        )
      ).toHaveLength(2);

      const inStaffGrace = makeQuarterNote('C', 5, 'B', '4');
      renderNotes(staff, [inStaffGrace]);
      expect(
        inStaffGrace.shadowRoot?.querySelectorAll(
          '.grace-notes .grace-ledger-line'
        )
      ).toHaveLength(0);
    });

    it('re-renders grace notes on attribute change when inside a staff', () => {
      const staff = makeStaff();
      const note = makeQuarterNote('E', 4);
      renderNotes(staff, [note]);
      expect(note.shadowRoot?.querySelector('.grace-notes')).toBeNull();

      // The staff's NOTE_Y_CHANGE listener round-trips into a batchUpdate
      // that re-renders this note — the direct render() call in note.ts is
      // skipped here since a parent staff is present.
      note.setAttribute('grace', 'A,B');
      note.setAttribute('grace-octave', '4,4');

      const graceGroup = note.shadowRoot?.querySelector('.grace-notes');
      expect(graceGroup).not.toBeNull();
      expect(graceGroup?.querySelectorAll('.grace-head')).toHaveLength(2);
    });

    it('defaults the grace octave to the main note octave when grace-octave is omitted', () => {
      const staff = makeStaff();
      const highGrace = makeQuarterNote('C', 5, 'C');
      renderNotes(staff, [highGrace]);
      // Without an explicit grace-octave, "C" defaults to the main note's own
      // octave (5) — same pitch as the main note, not the C6 above the staff.
      expect(
        highGrace.shadowRoot?.querySelectorAll(
          '.grace-notes .grace-ledger-line'
        )
      ).toHaveLength(0);
    });
  });
});

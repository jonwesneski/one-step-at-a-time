/**
 * @jest-environment jsdom
 */
import './index';
import type { CrossStaffDynamicsOverride } from './rules/hairpinPlacementRules';
import { ChordElementType, StaffElementType } from './types/elements';
import type { Chord, DurationType, Octave } from './types/theory';
import {
  COMMON_ATTRIBUTES,
  MUSIC_CHORD,
  MUSIC_MEASURE,
  MUSIC_NOTE,
  MUSIC_REST,
  MUSIC_STAFF,
  MUSIC_TUPLET,
  MUSIC_VOICE,
  STAFF_EVENTS,
} from './utils/consts';
import {
  BASE_STEM_LENGTH_PX,
  DYNAMICS_BASELINE_Y,
  MIDDLE_STAFF_Y,
  MIN_NOTE_WIDTH,
  MIN_STEM_LENGTH_PX,
  STAFF_BOTTOM_LINE_Y,
  STAFF_LINE_SPACING,
  STAFF_TOP_LINE_Y,
  STAFF_Y_PADDING,
  TREMOLO_LABEL_FONT_SIZE_PX,
  TREMOLO_LABEL_GAP_PX,
  TRIANGLE_OUTSIDE_STAFF_PX,
  TRIANGLE_RUN_CLEARANCE_PX,
  TRILL_ABOVE_STAFF_GAP_PX,
  TRILL_SIGN_HEIGHT_PX,
} from './utils/notationDimensions';
import {
  flagStemExtensionPx,
  NOTE_HEAD_Y_OFFSET_CORRECTION,
  NOTE_SCALE,
  NOTE_STEM_X_OFFSET,
  NOTE_STEM_X_OFFSET_STEM_DOWN,
  noteHeadCenter,
  TAIL_DOWN_WIDTH_PX,
  TAIL_UP_WIDTH_PX,
} from './utils/svgCreator/note';

afterEach(() => {
  document.body.innerHTML = '';
});

// <music-staff> (default clef="treble") stands in for StaffNotationElementBase.
describe('staffNotationBase', () => {
  it('logs a warning when adding another note on a filled measure', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const staff = document.createElement(MUSIC_STAFF) as any;
    staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
    document.body.appendChild(staff);

    const notes = Array.from({ length: 5 }, () => {
      const note = document.createElement(MUSIC_NOTE) as any;
      note.setAttribute('duration', 'quarter');
      note.setAttribute('note', 'C');
      note.setAttribute('octave', `${4 satisfies Octave}`);
      return note;
    });

    const slot = staff.shadowRoot.querySelector('slot');
    slot.assignedElements = () => notes;
    slot.dispatchEvent(new Event('slotchange'));

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('no more room for note(s)')
    );
    for (const note of notes.slice(0, 4)) {
      expect(note.style.display).not.toBe('none');
    }
    expect(notes[4].style.display).toBe('none');

    consoleSpy.mockRestore();
  });

  it('logs a warning when adding a note that partially exceeds the remaining available space in measure', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const staff = document.createElement(MUSIC_STAFF) as any;
    staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
    document.body.appendChild(staff);

    const notes = [
      ...Array.from({ length: 3 }, () => {
        const note = document.createElement(MUSIC_NOTE) as any;
        note.setAttribute('duration', 'quarter');
        note.setAttribute('note', 'C');
        note.setAttribute('octave', `${4 satisfies Octave}`);
        return note;
      }),
      (() => {
        const note = document.createElement(MUSIC_NOTE) as any;
        note.setAttribute('duration', 'half');
        note.setAttribute('note', 'C');
        note.setAttribute('octave', `${4 satisfies Octave}`);
        return note;
      })(),
    ];

    const slot = staff.shadowRoot.querySelector('slot');
    slot.assignedElements = () => notes;
    slot.dispatchEvent(new Event('slotchange'));

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('no more room for note(s)')
    );
    for (const note of notes.slice(0, 3)) {
      expect(note.style.display).not.toBe('none');
    }
    expect(notes[3].style.display).toBe('none');

    consoleSpy.mockRestore();
  });

  it('assigns ascending pitch Y coordinates to a chord driven by chord attribute', () => {
    const staff = document.createElement(MUSIC_STAFF) as any;
    document.body.appendChild(staff);

    const chord = document.createElement(MUSIC_CHORD) as ChordElementType;
    chord.setAttribute('chord', 'Bmaj' satisfies Chord);
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

  describe('hairpin/dynamics overlap warning', () => {
    function makeNote(attrs: Record<string, string>) {
      const note = document.createElement(MUSIC_NOTE) as any;
      note.setAttribute('duration', 'quarter');
      note.setAttribute('note', 'C');
      note.setAttribute('octave', `${4 satisfies Octave}`);
      for (const [key, value] of Object.entries(attrs)) {
        note.setAttribute(key, value);
      }
      return note;
    }

    // Endpoint-collision math (shrinking startX/endX and falling back when the
    // gaps would invert, plus the "enough room, no warning" case) is covered
    // directly in dynamicsRules.test.ts against injected noteXPositions —
    // jsdom has no real container width, so every note collapses to the same
    // x here and can't be driven to reproduce realistic spacing end-to-end.

    it('warns when an interim dynamic sits strictly between a hairpin start and end', () => {
      const consoleSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const staff = document.createElement(MUSIC_STAFF) as any;
      document.body.appendChild(staff);

      const notes = [
        makeNote({ crescendo: 'start' }),
        makeNote({ dynamic: 'mf' }),
        makeNote({ crescendo: 'end' }),
      ];

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => notes;
      slot.dispatchEvent(new Event('slotchange'));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('overlaps an interim dynamic marking'),
        ])
      );

      consoleSpy.mockRestore();
    });
  });

  describe('dynamics row under slurs', () => {
    // E4 stems up, so its marks and slur sit below, on the dynamics side.
    function hairpinBaseline(noteAttrs: Record<string, string>[]): number {
      const staff = document.createElement(MUSIC_STAFF) as any;
      document.body.appendChild(staff);
      const notes = noteAttrs.map((attrs) => {
        const note = document.createElement(MUSIC_NOTE) as any;
        note.setAttribute('duration', 'quarter');
        note.setAttribute('note', 'E');
        note.setAttribute('octave', `${4 satisfies Octave}`);
        for (const [key, value] of Object.entries(attrs)) {
          note.setAttribute(key, value);
        }
        return note;
      });
      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => notes;
      slot.dispatchEvent(new Event('slotchange'));
      return staff.hairpinDefaultsForMeasure().pairs[0].baselineClientY;
    }

    const deepMarks = { articulation: 'accent-portato', stress: 'stressed' };

    it('moves past a slur enclosing deep marks', () => {
      const unslurred = hairpinBaseline([
        { ...deepMarks, crescendo: 'start' },
        { ...deepMarks },
        { ...deepMarks, crescendo: 'end' },
      ]);
      const slurred = hairpinBaseline([
        { ...deepMarks, crescendo: 'start', slur: 'start' },
        { ...deepMarks },
        { ...deepMarks, crescendo: 'end', slur: 'end' },
      ]);
      expect(slurred).toBeGreaterThan(unslurred);
    });

    it('stays put for a slur over unmarked notes', () => {
      const unslurred = hairpinBaseline([
        { crescendo: 'start' },
        {},
        { crescendo: 'end' },
      ]);
      const slurred = hairpinBaseline([
        { crescendo: 'start', slur: 'start' },
        {},
        { crescendo: 'end', slur: 'end' },
      ]);
      expect(slurred).toBe(unslurred);
    });
  });

  describe('crossStaffDynamicsOverrides', () => {
    function makeNote(attrs: Record<string, string>) {
      const note = document.createElement(MUSIC_NOTE) as any;
      note.setAttribute('duration', 'quarter');
      note.setAttribute('note', 'C');
      note.setAttribute('octave', `${5 satisfies Octave}`);
      for (const [key, value] of Object.entries(attrs)) {
        note.setAttribute(key, value);
      }
      return note;
    }

    function renderStaffWithHairpin() {
      const staff = document.createElement(MUSIC_STAFF) as any;
      document.body.appendChild(staff);
      const notes = [
        makeNote({ crescendo: 'start', dynamic: 'p' }),
        makeNote({}),
        makeNote({ crescendo: 'end', dynamic: 'f' }),
      ];
      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => notes;
      slot.dispatchEvent(new Event('slotchange'));
      return { staff, start: notes[0], end: notes[2] };
    }

    const hairpinYs = (staff: any): number[] =>
      Array.from<SVGPathElement>(
        staff.shadowRoot.querySelectorAll('.hairpin path')
      ).flatMap((path) => {
        const [, , y1, , , y2] = (path.getAttribute('d') ?? '').split(' ');
        return [Number(y1), Number(y2)];
      });

    const markingTexts = (staff: any): string[] =>
      Array.from<SVGTextElement>(
        staff.shadowRoot.querySelectorAll('.dynamic-marking')
      ).map((text) => text.textContent ?? '');

    const overrides = (
      entries: [unknown, CrossStaffDynamicsOverride][]
    ): Map<unknown, CrossStaffDynamicsOverride> => new Map(entries);

    it('draws neither the hairpin nor its markings when the measure takes them over', () => {
      const { staff, start, end } = renderStaffWithHairpin();
      expect(staff.shadowRoot.querySelectorAll('.hairpin').length).toBe(1);

      staff.crossStaffDynamicsOverrides = overrides([
        [start, { hairpin: 'measure', marking: 'measure' }],
        [end, { hairpin: null, marking: 'measure' }],
      ]);

      expect(staff.shadowRoot.querySelectorAll('.hairpin').length).toBe(0);
      expect(markingTexts(staff)).toEqual([]);
    });

    it('draws a hairpin forced above the stave above its top line', () => {
      const { staff, start, end } = renderStaffWithHairpin();
      expect(hairpinYs(staff).every((y) => y > STAFF_TOP_LINE_Y)).toBe(true);

      staff.crossStaffDynamicsOverrides = overrides([
        [start, { hairpin: 'above', marking: 'above' }],
        [end, { hairpin: null, marking: 'above' }],
      ]);

      const ys = hairpinYs(staff);
      expect(ys.length).toBe(4);
      expect(ys.every((y) => y < STAFF_TOP_LINE_Y)).toBe(true);
    });

    it('re-lays out only when a forced side changes, never for an identical map', () => {
      const { staff, start } = renderStaffWithHairpin();
      const listener = jest.fn();
      staff.addEventListener(STAFF_EVENTS.STAFF_MIN_WIDTH, listener);

      staff.crossStaffDynamicsOverrides = overrides([
        [start, { hairpin: 'measure', marking: null }],
      ]);
      expect(listener).not.toHaveBeenCalled();

      staff.crossStaffDynamicsOverrides = overrides([
        [start, { hairpin: 'above', marking: null }],
      ]);
      const relayouts = listener.mock.calls.length;
      expect(relayouts).toBeGreaterThan(0);

      staff.crossStaffDynamicsOverrides = overrides([
        [start, { hairpin: 'above', marking: null }],
      ]);
      expect(listener.mock.calls.length).toBe(relayouts);
    });

    it('reports its default placement regardless of overrides', () => {
      const { staff, start, end } = renderStaffWithHairpin();
      const defaults = staff.hairpinDefaultsForMeasure();
      expect(defaults.pairs).toEqual([
        expect.objectContaining({
          kind: 'crescendo',
          side: 'below',
          startElement: start,
          endElement: end,
        }),
      ]);
      expect(defaults.pairs[0].baselineClientY).toBeGreaterThanOrEqual(
        DYNAMICS_BASELINE_Y
      );

      staff.crossStaffDynamicsOverrides = overrides([
        [start, { hairpin: 'above', marking: 'above' }],
      ]);

      expect(staff.hairpinDefaultsForMeasure()).toEqual(defaults);
    });
  });

  describe('grace-dynamic', () => {
    function makeNote(attrs: Record<string, string>) {
      const note = document.createElement(MUSIC_NOTE) as any;
      note.setAttribute('duration', 'quarter');
      note.setAttribute('note', 'C');
      note.setAttribute('octave', `${4 satisfies Octave}`);
      for (const [key, value] of Object.entries(attrs)) {
        note.setAttribute(key, value);
      }
      return note;
    }

    it('renders a dynamic-marking text for grace-dynamic, left of the main note’s own dynamic', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      document.body.appendChild(staff);

      const note = makeNote({
        grace: 'B',
        'grace-octave': '4',
        'grace-dynamic': 'f',
        dynamic: 'p',
      });

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => [note];
      slot.dispatchEvent(new Event('slotchange'));

      const markings = staff.shadowRoot.querySelectorAll('.dynamic-marking');
      expect(markings).toHaveLength(2);
      const texts = Array.from(markings).map((el: any) => el.textContent);
      expect(texts).toEqual(expect.arrayContaining(['f', 'p']));

      const graceMarking = Array.from(markings).find(
        (el: any) => el.textContent === 'f'
      ) as SVGTextElement;
      const mainMarking = Array.from(markings).find(
        (el: any) => el.textContent === 'p'
      ) as SVGTextElement;
      const graceX = Number(graceMarking.getAttribute('x'));
      const mainX = Number(mainMarking.getAttribute('x'));
      expect(graceX).toBeLessThan(mainX);
    });

    it('renders only the grace-dynamic marking when the main dynamic is unset', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      document.body.appendChild(staff);

      const note = makeNote({
        grace: 'B',
        'grace-octave': '4',
        'grace-dynamic': 'mf',
      });

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => [note];
      slot.dispatchEvent(new Event('slotchange'));

      const markings = staff.shadowRoot.querySelectorAll('.dynamic-marking');
      expect(markings).toHaveLength(1);
      expect(markings[0].textContent).toBe('mf');
    });

    it('renders no grace-dynamic marking when grace-dynamic is set but the note has no grace notes', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      document.body.appendChild(staff);

      const note = makeNote({ 'grace-dynamic': 'f' });

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => [note];
      slot.dispatchEvent(new Event('slotchange'));

      expect(
        staff.shadowRoot.querySelectorAll('.dynamic-marking')
      ).toHaveLength(0);
    });
  });

  describe('time signature visibility', () => {
    function hasTimeSignature(staff: any): boolean {
      return staff.shadowRoot.querySelector('.time-signature') !== null;
    }

    it('shows the time signature on a standalone staff with no measure ancestor', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.TIME, '3/4');
      document.body.appendChild(staff);

      expect(hasTimeSignature(staff)).toBe(true);
    });

    it('shows the time signature when its measure is number 1', () => {
      const measure = document.createElement(MUSIC_MEASURE) as any;
      measure.setAttribute('number', '1');
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
      measure.appendChild(staff);
      document.body.appendChild(measure);

      expect(hasTimeSignature(staff)).toBe(true);
    });

    it('hides the time signature on a later measure when timeChangeAtBoundary is not set', () => {
      const measure = document.createElement(MUSIC_MEASURE) as any;
      measure.setAttribute('number', '2');
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
      measure.appendChild(staff);
      document.body.appendChild(measure);

      expect(hasTimeSignature(staff)).toBe(false);
    });

    it('shows the time signature on a later measure once timeChangeAtBoundary is set', () => {
      const measure = document.createElement(MUSIC_MEASURE) as any;
      measure.setAttribute('number', '2');
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.TIME, '3/4');
      measure.appendChild(staff);
      document.body.appendChild(measure);

      staff.timeChangeAtBoundary = true;

      expect(hasTimeSignature(staff)).toBe(true);
    });

    it('timeChangeAtBoundary getter/setter round-trips and is a no-op when set to the same value', () => {
      const measure = document.createElement(MUSIC_MEASURE) as any;
      measure.setAttribute('number', '2');
      const staff = document.createElement(MUSIC_STAFF) as any;
      measure.appendChild(staff);
      document.body.appendChild(measure);

      expect(staff.timeChangeAtBoundary).toBe(false);
      staff.timeChangeAtBoundary = true;
      expect(staff.timeChangeAtBoundary).toBe(true);
      staff.timeChangeAtBoundary = true;
      expect(staff.timeChangeAtBoundary).toBe(true);
      staff.timeChangeAtBoundary = false;
      expect(staff.timeChangeAtBoundary).toBe(false);
    });
  });

  describe('<music-arpeggio>', () => {
    it('exempts run notes from bar-fit and beams them', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.TIME, '1/4');
      document.body.appendChild(staff);

      const wrapper = document.createElement('music-arpeggio');
      const runPitches = ['C', 'E', 'G'];
      const runNotes = runPitches.map((pitch) => {
        const note = document.createElement(MUSIC_NOTE);
        note.setAttribute('note', pitch);
        note.setAttribute('octave', `${4 satisfies Octave}`);
        return note;
      });
      const chord = document.createElement(MUSIC_CHORD) as ChordElementType;
      chord.setAttribute('chord', 'Cmaj' satisfies Chord);
      chord.setAttribute('duration', 'quarter');
      wrapper.append(...runNotes, chord);
      staff.appendChild(wrapper);

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => [wrapper];
      slot.dispatchEvent(new Event('slotchange'));

      // Run notes fit despite 3×1/32 + 1/4 > 1/4, and are drawn.
      for (const note of runNotes) {
        expect(note.style.display).not.toBe('none');
        expect(note.getAttribute('duration')).toBe('thirtysecond');
      }
      expect(chord.style.display).not.toBe('none');
      expect(
        staff.shadowRoot.querySelectorAll('.beams-container .beam').length
      ).toBeGreaterThan(0);
    });
  });

  describe('<music-voice>', () => {
    function makeQuarterNote(pitch: string): HTMLElement {
      const note = document.createElement(MUSIC_NOTE) as any;
      note.setAttribute('duration', 'quarter');
      note.setAttribute('note', pitch);
      note.setAttribute('octave', `${4 satisfies Octave}`);
      return note;
    }

    it('wrapping every note in a single <music-voice> renders byte-identical to leaving them unwrapped', () => {
      const unwrappedStaff = document.createElement(MUSIC_STAFF) as any;
      unwrappedStaff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
      document.body.appendChild(unwrappedStaff);
      const unwrappedNotes = ['C', 'D', 'E', 'F'].map(makeQuarterNote);
      const unwrappedSlot = unwrappedStaff.shadowRoot.querySelector('slot');
      unwrappedSlot.assignedElements = () => unwrappedNotes;
      unwrappedSlot.dispatchEvent(new Event('slotchange'));

      const wrappedStaff = document.createElement(MUSIC_STAFF) as any;
      wrappedStaff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
      document.body.appendChild(wrappedStaff);
      const wrappedNotes = ['C', 'D', 'E', 'F'].map(makeQuarterNote);
      const voice = document.createElement('music-voice');
      voice.append(...wrappedNotes);
      const wrappedSlot = wrappedStaff.shadowRoot.querySelector('slot');
      wrappedSlot.assignedElements = () => [voice];
      wrappedSlot.dispatchEvent(new Event('slotchange'));

      for (let i = 0; i < unwrappedNotes.length; i++) {
        expect((wrappedNotes[i] as any).staffY).toBe(
          (unwrappedNotes[i] as any).staffY
        );
        expect(wrappedNotes[i].style.left).toBe(unwrappedNotes[i].style.left);
        expect((wrappedNotes[i] as any).stemUp).toBe(
          (unwrappedNotes[i] as any).stemUp
        );
      }
    });

    it('renders both voices when a staff has multiple <music-voice> siblings, voice 1 stems up and voice 2 stems down', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
      document.body.appendChild(staff);

      // Voice 2 uses a different duration than voice 1 so these notes are
      // never auto-combine-eligible (see rules/voiceCombineRules.ts) — this
      // test is about independent per-voice rendering, not the v1-scoped
      // combine optimization (covered separately in voiceCombineRules.test.ts).
      // Voice 2 sits below voice 1 so the parts don't cross (crossed parts
      // are offset — see rules/voiceRules.ts#computeCrossVoiceDisplacements).
      const voice1Notes = ['C', 'D'].map(makeQuarterNote);
      const voice2Notes = ['E', 'F'].map((pitch) => {
        const note = document.createElement(MUSIC_NOTE) as any;
        note.setAttribute('duration', 'half');
        note.setAttribute('note', pitch);
        note.setAttribute('octave', `${3 satisfies Octave}`);
        return note;
      });
      const voice1 = document.createElement('music-voice');
      voice1.append(...voice1Notes);
      const voice2 = document.createElement('music-voice');
      voice2.append(...voice2Notes);

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => [voice1, voice2];
      slot.dispatchEvent(new Event('slotchange'));

      for (const note of [...voice1Notes, ...voice2Notes]) {
        expect((note as any).staffY).not.toBeNull();
      }
      // Voice-policy stem direction, not pitch-driven: voice 1 always up,
      // voice 2 always down, regardless of the actual pitches chosen above.
      for (const note of voice1Notes) {
        expect((note as any).stemUp).toBe(true);
      }
      for (const note of voice2Notes) {
        expect((note as any).stemUp).toBe(false);
      }
      // Same-beat notes across voices land at the same x (shared beat-offset
      // formula) — voice1Notes[0]/voice2Notes[0] are both the first entry in
      // their own voice.
      expect(voice1Notes[0].style.left).toBe(voice2Notes[0].style.left);
    });

    it("gives each voice its own beam group, so a rest in one voice does not break the other voice's beam", () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
      document.body.appendChild(staff);

      const eighth = (pitch: string) => {
        const note = document.createElement(MUSIC_NOTE) as any;
        note.setAttribute('duration', 'eighth');
        note.setAttribute('note', pitch);
        note.setAttribute('octave', `${4 satisfies Octave}`);
        return note;
      };
      const voice1Notes = ['C', 'D'].map(eighth); // two beamable eighths, no rest
      const voice1 = document.createElement('music-voice');
      voice1.append(...voice1Notes);

      const rest = document.createElement('music-rest') as any;
      rest.setAttribute('duration', 'eighth');
      const voice2Note = eighth('E');
      // A distinguishing dynamic keeps this note out of the v1-scoped
      // auto-combine optimization (rules/voiceCombineRules.ts), which would
      // otherwise merge it with voice1Notes[1] (same beat offset, same
      // duration, no other markings on either) — this test is specifically
      // about beam-group independence, covered separately from combine.
      voice2Note.setAttribute('dynamic', 'mf');
      const voice2 = document.createElement('music-voice');
      voice2.append(rest, voice2Note); // a rest between two notes in voice 2

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => [voice1, voice2];
      slot.dispatchEvent(new Event('slotchange'));

      expect((voice1Notes[0] as any).noFlags).toBe(true);
      expect((voice1Notes[1] as any).noFlags).toBe(true);
    });

    it('renders a tuplet bracket for a tuplet in voice 2 without disturbing voice 1', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
      document.body.appendChild(staff);

      const voice1Notes = ['C', 'D'].map(makeQuarterNote);
      const voice1 = document.createElement('music-voice');
      voice1.append(...voice1Notes);

      const tuplet = document.createElement(MUSIC_TUPLET);
      tuplet.setAttribute('ratio', '3');
      const tripletNotes = ['E', 'F', 'G'].map((pitch) => {
        const note = document.createElement(MUSIC_NOTE) as any;
        note.setAttribute('duration', 'eighth');
        note.setAttribute('note', pitch);
        note.setAttribute('octave', `${4 satisfies Octave}`);
        return note;
      });
      tuplet.append(...tripletNotes);
      const voice2 = document.createElement('music-voice');
      voice2.appendChild(tuplet);

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => [voice1, voice2];
      slot.dispatchEvent(new Event('slotchange'));

      for (const note of voice1Notes) {
        expect((note as any).staffY).not.toBeNull();
      }
      const tupletGroups = staff.shadowRoot.querySelectorAll('.tuplet-group');
      expect(tupletGroups.length).toBeGreaterThan(0);
    });

    it('renders dynamics in both voices, not just voice 1', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
      document.body.appendChild(staff);

      const voice1Note = makeQuarterNote('C');
      voice1Note.setAttribute('dynamic', 'f');
      const voice1 = document.createElement('music-voice');
      voice1.appendChild(voice1Note);

      const voice2Note = document.createElement(MUSIC_NOTE) as any;
      voice2Note.setAttribute('duration', 'half');
      voice2Note.setAttribute('note', 'E');
      voice2Note.setAttribute('octave', `${4 satisfies Octave}`);
      voice2Note.setAttribute('dynamic', 'pp');
      const voice2 = document.createElement('music-voice');
      voice2.appendChild(voice2Note);

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => [voice1, voice2];
      slot.dispatchEvent(new Event('slotchange'));

      const dynamicsContainers = staff.shadowRoot.querySelectorAll(
        '.dynamics-container'
      );
      const totalDynamicMarks = Array.from(dynamicsContainers).reduce(
        (sum: number, container: any) =>
          sum + container.querySelectorAll('.dynamic-marking').length,
        0
      );
      expect(totalDynamicMarks).toBe(2);
    });

    it('renders a trill line/sign for a trill in voice 2 without needing a trill in voice 1', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
      document.body.appendChild(staff);

      const voice1 = document.createElement('music-voice');
      voice1.appendChild(makeQuarterNote('C'));

      const voice2Note = document.createElement(MUSIC_NOTE) as any;
      voice2Note.setAttribute('duration', 'half');
      voice2Note.setAttribute('note', 'E');
      voice2Note.setAttribute('octave', `${4 satisfies Octave}`);
      voice2Note.setAttribute('trill', '');
      const voice2 = document.createElement('music-voice');
      voice2.appendChild(voice2Note);

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => [voice1, voice2];
      slot.dispatchEvent(new Event('slotchange'));

      expect((voice2Note as any).resolvedTrillPitch).not.toBeNull();
      expect(voice2Note.shadowRoot.querySelector('.trill-sign')).not.toBeNull();
    });

    it('combines two rhythmically-identical voices onto one synthetic chord (v1-scoped auto-combine)', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
      document.body.appendChild(staff);

      const voice1Note = makeQuarterNote('C');
      const voice1 = document.createElement('music-voice');
      voice1.appendChild(voice1Note);

      const voice2Note = makeQuarterNote('E');
      const voice2 = document.createElement('music-voice');
      voice2.appendChild(voice2Note);

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => [voice1, voice2];
      slot.dispatchEvent(new Event('slotchange'));

      // Source notes are hidden, not removed — combination is re-derived
      // fresh every render pass, never authored.
      expect(voice1Note.style.display).toBe('none');
      expect(voice2Note.style.display).toBe('none');
      const synthesizedChord = staff.shadowRoot.querySelector(MUSIC_CHORD);
      expect(synthesizedChord).not.toBeNull();
      expect(synthesizedChord.notes.map((n: any) => n.value).sort()).toEqual([
        'C',
        'E',
      ]);
    });

    it('keeps a dynamic reminder on the combined chord', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
      document.body.appendChild(staff);

      const voice1Note = makeQuarterNote('C');
      const voice2Note = makeQuarterNote('E');
      for (const note of [voice1Note, voice2Note]) {
        note.setAttribute('dynamic', 'p');
        note.setAttribute('dynamic-reminder', '');
      }
      const voice1 = document.createElement('music-voice');
      voice1.appendChild(voice1Note);
      const voice2 = document.createElement('music-voice');
      voice2.appendChild(voice2Note);

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => [voice1, voice2];
      slot.dispatchEvent(new Event('slotchange'));

      const synthesizedChord = staff.shadowRoot.querySelector(MUSIC_CHORD);
      expect(synthesizedChord.dynamicReminder).toBe(true);
    });

    describe('re-combines when articulation-repeat changes', () => {
      function makeRepeatedStaccato(element: HTMLElement): HTMLElement {
        element.setAttribute('tremolo', '2');
        element.setAttribute('articulation', 'staccato');
        element.setAttribute('articulation-repeat', '');
        return element;
      }

      function renderVoices(first: HTMLElement, second: HTMLElement): any {
        const staff = document.createElement(MUSIC_STAFF) as any;
        staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
        document.body.appendChild(staff);
        const voice1 = document.createElement('music-voice');
        voice1.appendChild(first);
        const voice2 = document.createElement('music-voice');
        voice2.appendChild(second);
        staff.append(voice1, voice2);
        const slot = staff.shadowRoot.querySelector('slot');
        slot.assignedElements = () => [voice1, voice2];
        slot.dispatchEvent(new Event('slotchange'));
        return staff;
      }

      it('on a note', () => {
        const voice1Note = makeRepeatedStaccato(makeQuarterNote('C'));
        const voice2Note = makeRepeatedStaccato(makeQuarterNote('E'));
        const staff = renderVoices(voice1Note, voice2Note);
        const synthesizedChord = staff.shadowRoot.querySelector(MUSIC_CHORD);
        expect(
          synthesizedChord.shadowRoot.querySelectorAll('.staccato')
        ).toHaveLength(4);

        voice2Note.removeAttribute('articulation-repeat');

        expect(staff.shadowRoot.querySelector(MUSIC_CHORD)).toBeNull();
        expect(voice1Note.style.display).not.toBe('none');
        expect(voice2Note.style.display).not.toBe('none');
      });

      it('on a chord', () => {
        const voice1Note = makeRepeatedStaccato(makeQuarterNote('B'));
        const voice2Chord = document.createElement(
          MUSIC_CHORD
        ) as ChordElementType;
        voice2Chord.setAttribute('chord', 'Cmaj' satisfies Chord);
        voice2Chord.setAttribute('duration', 'quarter');
        makeRepeatedStaccato(voice2Chord);
        const staff = renderVoices(voice1Note, voice2Chord);
        expect(staff.shadowRoot.querySelector(MUSIC_CHORD)).not.toBeNull();

        voice2Chord.removeAttribute('articulation-repeat');

        expect(staff.shadowRoot.querySelector(MUSIC_CHORD)).toBeNull();
        expect(voice2Chord.style.display).not.toBe('none');
      });
    });

    it('renders one centered shared rest when every voice is silent for the whole measure (v1-scoped shared rest)', () => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
      document.body.appendChild(staff);

      const voice1Rest = document.createElement(MUSIC_REST) as any;
      voice1Rest.setAttribute('duration', 'whole');
      const voice1 = document.createElement('music-voice');
      voice1.appendChild(voice1Rest);

      const voice2Rest = document.createElement(MUSIC_REST) as any;
      voice2Rest.setAttribute('duration', 'whole');
      const voice2 = document.createElement('music-voice');
      voice2.appendChild(voice2Rest);

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => [voice1, voice2];
      slot.dispatchEvent(new Event('slotchange'));

      expect(voice1Rest.style.display).toBe('none');
      expect(voice2Rest.style.display).toBe('none');
      const synthesizedRest = staff.shadowRoot.querySelector(MUSIC_REST);
      expect(synthesizedRest).not.toBeNull();
      expect(synthesizedRest.style.display).not.toBe('none');
    });
  });

  describe('trill lines', () => {
    function makeTrillStaff(): any {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
      document.body.appendChild(staff);
      return staff;
    }

    function makeQuarterNote(tie?: 'start' | 'end'): any {
      const note = document.createElement(MUSIC_NOTE) as any;
      note.setAttribute('duration', 'quarter');
      note.setAttribute('note', 'C');
      note.setAttribute('octave', `${4 satisfies Octave}`);
      if (tie) {
        note.setAttribute('tie', tie);
      }
      return note;
    }

    // jsdom's transcribeContainer.getBoundingClientRect() is always a zero
    // rect, so the wavy line itself (which needs real pixel geometry) never
    // actually draws here regardless of hasLine — see trill.browser-test.ts
    // for real default-line-drawn coverage. This only confirms the sign
    // renders and nothing throws.
    it('renders the sign for an untied single trill note without error', () => {
      const staff = makeTrillStaff();
      const note = makeQuarterNote();
      note.setAttribute('trill', '');

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => [note];
      slot.dispatchEvent(new Event('slotchange'));

      expect(note.shadowRoot.querySelector('.trill-sign')).not.toBeNull();
    });

    // The wavy line itself needs real pixel geometry (remainingWidth traces
    // back to transcribeContainer.getBoundingClientRect(), always a zero rect
    // in jsdom) — see trill.browser-test.ts for line-presence/geometry
    // coverage. What's reliable here: the sign still renders on the tied
    // pair's own notes (element-local, no staff geometry needed), and the
    // pass runs without throwing.
    it('renders the trill sign on a tied pair without a matching notch', () => {
      const staff = makeTrillStaff();
      const start = makeQuarterNote('start');
      start.setAttribute('trill', '');
      const end = makeQuarterNote('end');

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => [start, end];
      slot.dispatchEvent(new Event('slotchange'));

      expect(start.shadowRoot.querySelector('.trill-sign')).not.toBeNull();
      expect(
        staff.shadowRoot.querySelector('.trill-lines-container .trill-notch')
      ).toBeNull();
    });

    it('draws a notch at an explicit trill-stop, even mid tie-chain', () => {
      const staff = makeTrillStaff();
      const start = makeQuarterNote('start');
      start.setAttribute('trill', '');
      const stop = makeQuarterNote('start');
      stop.setAttribute('trill-stop', '');
      const end = makeQuarterNote('end');

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => [start, stop, end];
      slot.dispatchEvent(new Event('slotchange'));

      expect(
        staff.shadowRoot.querySelectorAll('.trill-lines-container .trill-notch')
          .length
      ).toBe(1);
    });

    it('redraws the trill sign when trill is toggled after the initial render, without a full re-render', () => {
      const staff = makeTrillStaff();
      const start = makeQuarterNote('start');
      const end = makeQuarterNote('end');
      staff.appendChild(start);
      staff.appendChild(end);

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => [start, end];
      slot.dispatchEvent(new Event('slotchange'));

      expect(start.shadowRoot.querySelector('.trill-sign')).toBeNull();

      start.trill = true;

      expect(start.shadowRoot.querySelector('.trill-sign')).not.toBeNull();
      // A light TRILL_ATTRIBUTE_CHANGE redraw, not a full #renderNotes() —
      // the untouched second note keeps its own tie attribute intact.
      expect(end.tie).toBe('end');
    });

    it('resolves the trilling pitch as the diatonic upper neighbor, modified by the key signature', () => {
      const staff = makeTrillStaff();
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'G');
      const note = document.createElement(MUSIC_NOTE) as any;
      note.setAttribute('duration', 'quarter');
      note.setAttribute('note', 'E');
      note.setAttribute('octave', `${4 satisfies Octave}`);
      note.setAttribute('trill', '');

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => [note];
      slot.dispatchEvent(new Event('slotchange'));

      // G major (F# in the signature): trill on E implies F#, not F natural.
      expect(note.resolvedTrillPitch).toMatchObject({
        letter: 'F',
        accidental: 'sharp',
        written: false,
      });
    });

    it('an explicit trill-accidental overrides only the accidental, not the letter', () => {
      const staff = makeTrillStaff();
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'G');
      const note = document.createElement(MUSIC_NOTE) as any;
      note.setAttribute('duration', 'quarter');
      note.setAttribute('note', 'E');
      note.setAttribute('octave', `${4 satisfies Octave}`);
      note.setAttribute('trill', '');
      note.setAttribute('trill-accidental', 'natural');

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => [note];
      slot.dispatchEvent(new Event('slotchange'));

      expect(note.resolvedTrillPitch).toMatchObject({
        letter: 'F',
        accidental: 'natural',
        written: false,
      });
    });

    it('re-resolves the trilling pitch when trill-accidental is toggled after the initial render', () => {
      const staff = makeTrillStaff();
      const note = makeQuarterNote();
      note.setAttribute('trill', '');
      staff.appendChild(note);

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => [note];
      slot.dispatchEvent(new Event('slotchange'));

      // C major: trill on C implies D, unaltered.
      expect(note.resolvedTrillPitch).toMatchObject({
        letter: 'D',
        accidental: null,
      });

      note.trillAccidental = 'double-sharp';

      expect(note.resolvedTrillPitch).toMatchObject({
        letter: 'D',
        accidental: 'double-sharp',
      });
    });

    it('resolves a chord’s trilling pitch from its topmost note', () => {
      const staff = makeTrillStaff();
      staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'F');
      const chord = document.createElement(MUSIC_CHORD) as ChordElementType;
      chord.setAttribute('duration', 'quarter');
      chord.trill = true;
      const low = document.createElement(MUSIC_NOTE) as any;
      low.setAttribute('note', 'C');
      low.setAttribute('octave', '4');
      const high = document.createElement(MUSIC_NOTE) as any;
      high.setAttribute('note', 'A');
      high.setAttribute('octave', '4');
      chord.append(low, high);

      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => [chord];
      slot.dispatchEvent(new Event('slotchange'));

      // F major (Bb in the signature): the chord's topmost note is A4, whose
      // upper neighbor B is flatted by the key signature.
      expect(chord.resolvedTrillPitch).toMatchObject({
        letter: 'B',
        accidental: 'flat',
        written: false,
      });
    });

    describe('trill-note (written trilling notehead)', () => {
      it('resolves in written mode with the named letter/accidental', () => {
        const staff = makeTrillStaff();
        const note = makeQuarterNote();
        note.setAttribute('trill', '');
        note.setAttribute('trill-note', 'F#');

        const slot = staff.shadowRoot.querySelector('slot');
        slot.assignedElements = () => [note];
        slot.dispatchEvent(new Event('slotchange'));

        expect(note.resolvedTrillPitch).toMatchObject({
          letter: 'F',
          accidental: 'sharp',
          written: true,
          octave: 4,
        });
      });

      it('renders the written notehead in the trill-lines overlay', () => {
        const staff = makeTrillStaff();
        const note = makeQuarterNote();
        note.setAttribute('trill', '');
        note.setAttribute('trill-note', 'F#');

        const slot = staff.shadowRoot.querySelector('slot');
        slot.assignedElements = () => [note];
        slot.dispatchEvent(new Event('slotchange'));

        expect(
          staff.shadowRoot.querySelector(
            '.trill-lines-container .trill-written-note'
          )
        ).not.toBeNull();
      });

      it('pushes the next entry rightward to make room for the written notehead', () => {
        // A short duration keeps the natural beat-proportional gap after the
        // trilled note small, so the written notehead's fixed rightward
        // footprint is guaranteed to exceed it and force the clamp — a long
        // duration's much larger natural gap can already fit the footprint
        // without needing to push anything.
        const staff = makeTrillStaff();
        const trilled = makeQuarterNote();
        trilled.setAttribute('duration', 'sixtyfourth');
        trilled.setAttribute('trill', '');
        trilled.setAttribute('trill-note', 'F#');
        const plain = makeQuarterNote();
        const withTrillNote = [trilled, plain];

        const withoutTrillStaff = makeTrillStaff();
        const untrilled = makeQuarterNote();
        untrilled.setAttribute('duration', 'sixtyfourth');
        const plainToo = makeQuarterNote();

        const slot = staff.shadowRoot.querySelector('slot');
        slot.assignedElements = () => withTrillNote;
        slot.dispatchEvent(new Event('slotchange'));

        const otherSlot = withoutTrillStaff.shadowRoot.querySelector('slot');
        otherSlot.assignedElements = () => [untrilled, plainToo];
        otherSlot.dispatchEvent(new Event('slotchange'));

        const trilledX = parseFloat(trilled.style.left);
        const plainX = parseFloat(plain.style.left);
        const untrilledX = parseFloat(untrilled.style.left);
        const plainTooX = parseFloat(plainToo.style.left);

        // Both staves start their first note at the same X (same describe
        // area); only the trill-note staff needs extra room before its
        // second entry.
        expect(trilledX).toBeCloseTo(untrilledX, 5);
        expect(plainX - trilledX).toBeGreaterThan(plainTooX - untrilledX);
      });

      it('warns when trill-note and trill-accidental are both set, and trill-note wins', () => {
        const consoleSpy = jest
          .spyOn(console, 'warn')
          .mockImplementation(() => {});
        const staff = makeTrillStaff();
        const note = makeQuarterNote();
        note.setAttribute('trill', '');
        note.setAttribute('trill-accidental', 'natural');
        // attributeChangedCallback's warning check requires the element to be
        // connected — append before the second (conflicting) attribute.
        staff.appendChild(note);
        note.setAttribute('trill-note', 'G');

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('trill-accidental is ignored')
        );

        const slot = staff.shadowRoot.querySelector('slot');
        slot.assignedElements = () => [note];
        slot.dispatchEvent(new Event('slotchange'));

        expect(note.resolvedTrillPitch).toMatchObject({
          letter: 'G',
          written: true,
        });

        consoleSpy.mockRestore();
      });
    });

    describe('trill-finish (grace notes after the main note)', () => {
      it('pushes the next entry rightward to make room for the finishing grace note(s)', () => {
        // A short duration keeps the natural beat-proportional gap after the
        // finishing note small, so the grace note(s)' fixed rightward
        // footprint is guaranteed to exceed it and force the clamp.
        const staff = makeTrillStaff();
        const finishing = makeQuarterNote();
        finishing.setAttribute('duration', 'sixtyfourth');
        finishing.setAttribute('trill-finish', 'D');
        const plain = makeQuarterNote();

        const plainStaff = makeTrillStaff();
        const untrilled = makeQuarterNote();
        untrilled.setAttribute('duration', 'sixtyfourth');
        const plainToo = makeQuarterNote();

        const slot = staff.shadowRoot.querySelector('slot');
        slot.assignedElements = () => [finishing, plain];
        slot.dispatchEvent(new Event('slotchange'));

        const otherSlot = plainStaff.shadowRoot.querySelector('slot');
        otherSlot.assignedElements = () => [untrilled, plainToo];
        otherSlot.dispatchEvent(new Event('slotchange'));

        const finishingX = parseFloat(finishing.style.left);
        const plainX = parseFloat(plain.style.left);
        const untrilledX = parseFloat(untrilled.style.left);
        const plainTooX = parseFloat(plainToo.style.left);

        expect(finishingX).toBeCloseTo(untrilledX, 5);
        expect(plainX - finishingX).toBeGreaterThan(plainTooX - untrilledX);
      });

      it('resolves resolvedTrillFinishAccidentals against the key signature', () => {
        const staff = makeTrillStaff();
        staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'G');
        const note = makeQuarterNote();
        note.setAttribute('trill-finish', 'F');

        const slot = staff.shadowRoot.querySelector('slot');
        slot.assignedElements = () => [note];
        slot.dispatchEvent(new Event('slotchange'));

        // G major implies F#; a plain F cancels it with a natural.
        expect(note.resolvedTrillFinishAccidentals).toEqual(['natural']);
      });

      it('draws a to-next slur in the trill-lines overlay when trill-finish-slur is to-next', () => {
        const staff = makeTrillStaff();
        const finishing = makeQuarterNote();
        finishing.setAttribute('trill-finish', 'D');
        finishing.setAttribute('trill-finish-slur', 'to-next');
        const next = makeQuarterNote();

        const slot = staff.shadowRoot.querySelector('slot');
        slot.assignedElements = () => [finishing, next];
        slot.dispatchEvent(new Event('slotchange'));

        expect(
          staff.shadowRoot.querySelector(
            '.trill-lines-container .trill-finish-slur'
          )
        ).not.toBeNull();
      });

      it('draws no to-next slur when trill-finish-slur is to-main (the default)', () => {
        const staff = makeTrillStaff();
        const finishing = makeQuarterNote();
        finishing.setAttribute('trill-finish', 'D');
        const next = makeQuarterNote();

        const slot = staff.shadowRoot.querySelector('slot');
        slot.assignedElements = () => [finishing, next];
        slot.dispatchEvent(new Event('slotchange'));

        expect(
          staff.shadowRoot.querySelector(
            '.trill-lines-container .trill-finish-slur'
          )
        ).toBeNull();
      });

      it('draws no to-next slur when there is no following entry', () => {
        const staff = makeTrillStaff();
        const finishing = makeQuarterNote();
        finishing.setAttribute('trill-finish', 'D');
        finishing.setAttribute('trill-finish-slur', 'to-next');

        const slot = staff.shadowRoot.querySelector('slot');
        slot.assignedElements = () => [finishing];
        slot.dispatchEvent(new Event('slotchange'));

        expect(
          staff.shadowRoot.querySelector(
            '.trill-lines-container .trill-finish-slur'
          )
        ).toBeNull();
      });
    });
  });
});

describe('staffNotationBase triangle noteheads', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    document.body.innerHTML = '';
    await Promise.resolve();
    jest.restoreAllMocks();
  });

  const renderStaff = (
    entries: Record<string, string>[],
    clef = 'treble',
    time = '4/4'
  ) => {
    const staff = document.createElement(MUSIC_STAFF) as any;
    staff.setAttribute(COMMON_ATTRIBUTES.TIME, time);
    staff.setAttribute('clef', clef);
    document.body.appendChild(staff);
    const elements = entries.map((attrs) => {
      const { tag = MUSIC_NOTE, ...rest } = attrs;
      const element = document.createElement(tag) as any;
      for (const [name, value] of Object.entries(rest)) {
        element.setAttribute(name, value);
      }
      return element;
    });
    staff.append(...elements);
    const slot = staff.shadowRoot.querySelector('slot');
    slot.assignedElements = () => elements;
    slot.dispatchEvent(new Event('slotchange'));
    return elements;
  };

  it('places an isolated triangle outside the stave, stem pointing away', () => {
    const [up] = renderStaff([
      { duration: 'quarter', notehead: 'triangle-up' },
    ]);
    expect(up.staffY).toBe(STAFF_TOP_LINE_Y - TRIANGLE_OUTSIDE_STAFF_PX);
    expect(up.stemUp).toBe(false);

    document.body.innerHTML = '';
    const [down] = renderStaff(
      [{ duration: 'quarter', notehead: 'triangle-down' }],
      'bass'
    );
    expect(down.staffY).toBe(STAFF_BOTTOM_LINE_Y + TRIANGLE_OUTSIDE_STAFF_PX);
    expect(down.stemUp).toBe(true);
  });

  it('places a triangle beyond the run it follows', () => {
    const elements = renderStaff(
      [
        { note: 'A', octave: '5', duration: 'sixteenth' },
        { note: 'F', octave: '6', duration: 'sixteenth' },
        { duration: 'sixteenth', notehead: 'triangle-up' },
        { tag: MUSIC_REST, duration: 'sixteenth' },
      ],
      'treble',
      '1/4'
    );
    const runTop = Math.min(elements[0].staffY, elements[1].staffY);
    expect(elements[2].staffY).toBeLessThanOrEqual(
      runTop - TRIANGLE_RUN_CLEARANCE_PX
    );
  });

  it('never beams a triangle, so it keeps its own flag', () => {
    const elements = renderStaff(
      [
        { note: 'A', octave: '5', duration: 'eighth' },
        { duration: 'eighth', notehead: 'triangle-up' },
      ],
      'treble',
      '1/4'
    );
    expect(elements[1].noFlags).toBe(false);
  });

  it('extends a triangle stem to reach the middle line', () => {
    const [up] = renderStaff([
      { duration: 'quarter', notehead: 'triangle-up' },
    ]);
    expect(up.stemExtension).toBeCloseTo(
      MIDDLE_STAFF_Y - (up.staffY + BASE_STEM_LENGTH_PX)
    );
  });

  it('ties a triangle to the previous triangle at the same height', () => {
    const elements = renderStaff([
      { note: 'C', octave: '6', duration: 'quarter' },
      { duration: 'quarter', notehead: 'triangle-up', tie: 'start' },
      { duration: 'half', notehead: 'triangle-up', tie: 'end' },
    ]);
    expect(elements[2].staffY).toBe(elements[1].staffY);
  });

  it('shows no accidental on a triangle and lets the staff overrule stem-direction', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const [note] = renderStaff([
      {
        note: 'F#',
        duration: 'quarter',
        notehead: 'triangle-up',
        'stem-direction': 'up',
      },
    ]);
    expect(note.showAccidental).toBeNull();
    expect(note.stemUp).toBe(false);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('stem-direction="up" is ignored')
    );
  });

  describe('clearing the real stems of a run', () => {
    const renderVoices = (voices: Record<string, string>[][]) => {
      const staff = document.createElement(MUSIC_STAFF) as any;
      staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
      document.body.appendChild(staff);
      const wrappers = voices.map(() => document.createElement('music-voice'));
      const elements = voices.map((entries, v) =>
        entries.map((attrs) => {
          const note = document.createElement(MUSIC_NOTE) as any;
          for (const [name, value] of Object.entries(attrs)) {
            note.setAttribute(name, value);
          }
          wrappers[v].appendChild(note);
          return note;
        })
      );
      const slot = staff.shadowRoot.querySelector('slot');
      slot.assignedElements = () => wrappers;
      slot.dispatchEvent(new Event('slotchange'));
      return elements;
    };

    it("clears a voice-1 stem the note's pitch alone wouldn't predict", () => {
      const [[f5, triangle]] = renderVoices([
        [
          { note: 'F', octave: '5', duration: 'quarter' },
          { duration: 'quarter', notehead: 'triangle-up' },
          { note: 'C', octave: '5', duration: 'half' },
        ],
        [{ note: 'C', octave: '4', duration: 'whole' }],
      ]);
      expect(f5.stemUp).toBe(true);
      expect(triangle.staffY).toBe(
        f5.staffY -
          BASE_STEM_LENGTH_PX -
          f5.stemExtension -
          TRIANGLE_RUN_CLEARANCE_PX
      );
    });

    it('clears a beam group stem that points against its own pitch', () => {
      const [g4, a5, triangle] = renderStaff(
        [
          { note: 'G', octave: '4', duration: 'eighth' },
          { note: 'A', octave: '5', duration: 'eighth' },
          { duration: 'quarter', notehead: 'triangle-down' },
        ],
        'treble',
        '2/4'
      );
      // On its own the G4 would stem up, but the A5 sets the beam's direction.
      expect(g4.stemUp).toBe(false);
      expect(a5.stemUp).toBe(false);
      expect(triangle.staffY).toBeCloseTo(
        g4.staffY +
          BASE_STEM_LENGTH_PX +
          g4.stemExtension +
          TRIANGLE_RUN_CLEARANCE_PX
      );
    });

    it("includes a sixteenth's longer stem", () => {
      const [sixteenth, triangle] = renderStaff(
        [
          {
            note: 'A',
            octave: '5',
            duration: 'sixteenth',
            'stem-direction': 'up',
          },
          { duration: 'sixteenth', notehead: 'triangle-up' },
        ],
        'treble',
        '1/8'
      );
      expect(triangle.staffY).toBeCloseTo(
        sixteenth.staffY -
          BASE_STEM_LENGTH_PX -
          sixteenth.stemExtension -
          flagStemExtensionPx(2) -
          TRIANGLE_RUN_CLEARANCE_PX
      );
    });

    it("includes a chord's spread", () => {
      const [chord, triangle] = renderStaff(
        [
          {
            tag: MUSIC_CHORD,
            chord: 'C',
            duration: 'quarter',
            'stem-direction': 'up',
          },
          { duration: 'quarter', notehead: 'triangle-up' },
        ],
        'treble',
        '2/4'
      );
      const top = Math.min(...chord.staffYCoordinates);
      expect(triangle.staffY).toBe(
        top - BASE_STEM_LENGTH_PX - TRIANGLE_RUN_CLEARANCE_PX
      );
    });
  });

  it('resolves grace and finishing accidentals on a triangle without letting its pitch change the measure', () => {
    const elements = renderStaff([
      { note: 'F#', octave: '4', duration: 'quarter' },
      {
        note: 'C#',
        duration: 'quarter',
        notehead: 'triangle-up',
        grace: 'F',
        'grace-octave': '4',
      },
      { note: 'C', octave: '4', duration: 'quarter' },
    ]);
    expect(elements[1].resolvedGraceAccidentals).toEqual(['natural']);
    expect(elements[1].showAccidental).toBeNull();
    // C# on the triangle never entered the measure's state.
    expect(elements[2].showAccidental).toBeNull();
  });

  it('draws a triangle ornament at its real pitch', () => {
    // Staff-relative Y of a host's ornament: everything in its transform that
    // depends on where the host's head is drawn cancels out against staffY.
    const ornamentY = (host: any, selector: string): number => {
      const transform = host.shadowRoot
        .querySelector(`${selector} .grace-note`)
        .getAttribute('transform');
      const translateY = Number(transform.match(/translate\(\S+ (\S+)\)/)[1]);
      const { cy } = noteHeadCenter(host.stemUp, host.duration, host.noFlags);
      return host.staffY + translateY - cy * NOTE_SCALE;
    };
    const ornaments = {
      grace: 'F',
      'grace-octave': '5',
      'trill-finish': 'E',
      'trill-finish-octave': '5',
    };
    const [triangle, normal] = renderStaff([
      { duration: 'quarter', notehead: 'triangle-up', ...ornaments },
      { note: 'C', octave: '4', duration: 'quarter', ...ornaments },
    ]);
    expect(triangle.staffY).not.toBe(normal.staffY);
    expect(triangle.nominalStaffY).toBe(normal.staffY);
    expect(normal.nominalStaffY).toBeNull();
    expect(ornamentY(triangle, '.grace-notes')).toBeCloseTo(
      ornamentY(normal, '.grace-notes')
    );
    expect(ornamentY(triangle, '.trill-finish-notes')).toBeCloseTo(
      ornamentY(normal, '.trill-finish-notes')
    );
  });

  it('keeps two chords with a triangle value beamed, drawn with normal heads', () => {
    const [first, second] = renderStaff(
      [
        {
          tag: MUSIC_CHORD,
          chord: 'C',
          duration: 'eighth',
          notehead: 'triangle-up',
        },
        {
          tag: MUSIC_CHORD,
          chord: 'C',
          duration: 'eighth',
          notehead: 'triangle-up',
        },
      ],
      'treble',
      '1/4'
    );
    expect(first.noFlags).toBe(true);
    expect(second.noFlags).toBe(true);
    expect(first.toneNoteheads).toEqual(['normal', 'normal', 'normal']);
  });

  it('never beams a triangle that names a beam-group', () => {
    const [triangle] = renderStaff([
      {
        duration: 'eighth',
        notehead: 'triangle-up',
        'beam-group': 'a',
      },
    ]);
    expect(triangle.noFlags).toBe(false);
    expect(triangle.stemExtension).toBeCloseTo(
      MIDDLE_STAFF_Y - (triangle.staffY + BASE_STEM_LENGTH_PX)
    );
  });
});

describe('staffNotationBase strut min width', () => {
  const ACCIDENTAL_NOTES = ['F#', 'G#', 'A#', 'C#'];

  it.each<[string, (index: number) => Record<string, string>]>([
    ['an accidental', (index) => ({ note: ACCIDENTAL_NOTES[index] })],
    ['grace notes', () => ({ note: 'G', grace: 'A,B' })],
    [
      'a written trilling notehead',
      () => ({ note: 'G', trill: '', 'trill-note': 'A' }),
    ],
  ])('fits later entries carrying %s', (_, attributesAt) => {
    const staff = document.createElement(MUSIC_STAFF) as any;
    staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
    document.body.appendChild(staff);
    const notes = ACCIDENTAL_NOTES.map((__, index) => {
      const note = document.createElement(MUSIC_NOTE) as any;
      note.setAttribute('octave', `${4 satisfies Octave}`);
      note.setAttribute('duration', 'sixteenth');
      for (const [name, value] of Object.entries(attributesAt(index))) {
        note.setAttribute(name, value);
      }
      return note;
    });
    const plainLastNote = document.createElement(MUSIC_NOTE) as any;
    plainLastNote.setAttribute('note', 'G');
    plainLastNote.setAttribute('octave', `${4 satisfies Octave}`);
    plainLastNote.setAttribute('duration', 'sixteenth');
    const elements = [...notes, plainLastNote];
    staff.append(...elements);

    let minWidth = 0;
    staff.addEventListener(STAFF_EVENTS.STAFF_MIN_WIDTH, (event: Event) => {
      minWidth = (event as CustomEvent).detail.minWidth;
    });
    const slot = staff.shadowRoot.querySelector('slot');
    slot.assignedElements = () => elements;
    slot.dispatchEvent(new Event('slotchange'));

    expect(minWidth).toBeCloseTo(
      parseFloat(plainLastNote.style.left) + MIN_NOTE_WIDTH,
      5
    );
  });
});

describe('staffNotationBase breath marks', () => {
  function renderStaff(markup: string): { staff: any; minWidth: number } {
    const staff = document.createElement(MUSIC_STAFF) as any;
    staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
    staff.innerHTML = markup;
    document.body.appendChild(staff);
    let minWidth = 0;
    staff.addEventListener(STAFF_EVENTS.STAFF_MIN_WIDTH, (event: Event) => {
      minWidth = (event as CustomEvent).detail.minWidth;
    });
    const slot = staff.shadowRoot.querySelector('slot');
    slot.assignedElements = () => Array.from(staff.children);
    slot.dispatchEvent(new Event('slotchange'));
    return { staff, minWidth };
  }

  const quarters = (breathMark: string | null) =>
    ['E', 'F', 'G', 'A']
      .map(
        (note, index) =>
          `<music-note note="${note}" octave="4" duration="quarter"${
            index === 1 && breathMark !== null
              ? ` breath-mark="${breathMark}"`
              : ''
          }></music-note>`
      )
      .join('');

  it('keeps a column free after a note with a breath mark', () => {
    const plain = renderStaff(quarters(null)).minWidth;
    document.body.innerHTML = '';
    const marked = renderStaff(quarters('tick')).minWidth;
    expect(marked).toBeGreaterThan(plain);
  });

  it('draws one glyph per mark, above the stave', () => {
    const { staff } = renderStaff(quarters('comma'));
    const marks = staff.shadowRoot.querySelectorAll(
      '.breath-marks-container .breath-mark'
    );
    expect(marks).toHaveLength(1);
    expect(marks[0].classList.contains('breath-mark-comma')).toBe(true);
  });

  it('draws a combined-voices chord’s breath mark once, from the staff', () => {
    const { staff } = renderStaff(`
      <music-voice>
        <music-note note="E" octave="5" duration="half" breath-mark="tick"></music-note>
        <music-note note="F" octave="5" duration="half"></music-note>
      </music-voice>
      <music-voice>
        <music-note note="C" octave="5" duration="half" breath-mark="tick"></music-note>
        <music-note note="A" octave="4" duration="half"></music-note>
      </music-voice>`);
    const staffMarks = staff.shadowRoot.querySelectorAll(
      '.breath-marks-container .breath-mark'
    );
    const chordMarks = Array.from<Element>(
      staff.shadowRoot.querySelectorAll(MUSIC_CHORD)
    ).flatMap((chord) =>
      Array.from(chord.shadowRoot?.querySelectorAll('.breath-mark') ?? [])
    );
    expect(staffMarks).toHaveLength(1);
    expect(chordMarks).toHaveLength(0);
  });
});

describe('staffNotationBase swells', () => {
  function renderStaff(markup: string): { staff: any; minWidth: number } {
    const staff = document.createElement(MUSIC_STAFF) as any;
    staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
    staff.innerHTML = markup;
    document.body.appendChild(staff);
    let minWidth = 0;
    staff.addEventListener(STAFF_EVENTS.STAFF_MIN_WIDTH, (event: Event) => {
      minWidth = (event as CustomEvent).detail.minWidth;
    });
    const slot = staff.shadowRoot.querySelector('slot');
    slot.assignedElements = () => Array.from(staff.children);
    slot.dispatchEvent(new Event('slotchange'));
    return { staff, minWidth };
  }

  const swells = (staff: any) =>
    staff.shadowRoot.querySelectorAll('.dynamics-container .swell');

  it('keeps room after a short note for its swell', () => {
    const plain = renderStaff(
      '<music-note note="E" octave="4" duration="eighth"></music-note>'.repeat(
        8
      )
    ).minWidth;
    document.body.innerHTML = '';
    const swelled = renderStaff(
      '<music-note note="E" octave="4" duration="eighth" swell></music-note>' +
        '<music-note note="E" octave="4" duration="eighth"></music-note>'.repeat(
          7
        )
    ).minWidth;
    expect(swelled).toBeGreaterThan(plain);
  });

  it('gives way to a hairpin on the same note, with one warning', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { staff } = renderStaff(`
      <music-note note="E" octave="4" duration="half" swell crescendo="start"></music-note>
      <music-note note="F" octave="4" duration="half" crescendo="end"></music-note>`);
    expect(swells(staff)).toHaveLength(0);
    expect(staff.shadowRoot.querySelectorAll('.hairpin')).toHaveLength(1);
    staff.onStaffResize();
    const swellWarnings = warn.mock.calls.filter(([message]) =>
      String(message).includes('swell is not drawn')
    );
    expect(swellWarnings).toHaveLength(1);
    warn.mockRestore();
  });
});

describe('staffNotationBase strut min width with tuplets', () => {
  const makeNote = (duration: DurationType) => {
    const note = document.createElement(MUSIC_NOTE) as any;
    note.setAttribute('note', 'G');
    note.setAttribute('octave', `${4 satisfies Octave}`);
    note.setAttribute('duration', duration);
    return note;
  };
  const makeTuplet = (ratio: string, content: Element[]) => {
    const tuplet = document.createElement(MUSIC_TUPLET);
    tuplet.setAttribute('ratio', ratio);
    tuplet.append(...content);
    return tuplet;
  };

  it.each<[string, () => { entries: Element[]; last: HTMLElement }]>([
    [
      'a triplet',
      () => {
        const notes = [
          makeNote('eighth'),
          makeNote('eighth'),
          makeNote('eighth'),
        ];
        return {
          entries: [makeNote('quarter'), makeTuplet('3', notes)],
          last: notes[2],
        };
      },
    ],
    [
      'a quintuplet',
      () => {
        const notes = Array.from({ length: 5 }, () => makeNote('sixteenth'));
        return { entries: [makeTuplet('5', notes)], last: notes[4] };
      },
    ],
    [
      'a nested tuplet',
      () => {
        const inner = [
          makeNote('sixteenth'),
          makeNote('sixteenth'),
          makeNote('sixteenth'),
        ];
        return {
          entries: [
            makeTuplet('3', [makeNote('eighth'), makeTuplet('3', inner)]),
          ],
          last: inner[2],
        };
      },
    ],
  ])('fits every entry of %s', (_, build) => {
    const staff = document.createElement(MUSIC_STAFF) as any;
    staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
    document.body.appendChild(staff);
    const { entries, last } = build();
    staff.append(...entries);

    let minWidth = 0;
    staff.addEventListener(STAFF_EVENTS.STAFF_MIN_WIDTH, (event: Event) => {
      minWidth = (event as CustomEvent).detail.minWidth;
    });
    const slot = staff.shadowRoot.querySelector('slot');
    slot.assignedElements = () => entries;
    slot.dispatchEvent(new Event('slotchange'));

    expect(minWidth).toBeCloseTo(
      parseFloat(last.style.left) + MIN_NOTE_WIDTH,
      5
    );
  });
});

describe('staffNotationBase stems', () => {
  const renderStaff = (entries: Record<string, string>[], time = '4/4') => {
    const staff = document.createElement(MUSIC_STAFF) as any;
    staff.setAttribute(COMMON_ATTRIBUTES.TIME, time);
    staff.setAttribute('clef', 'treble');
    document.body.appendChild(staff);
    const elements = entries.map((attrs) => {
      const { tag = MUSIC_NOTE, ...rest } = attrs;
      const element = document.createElement(tag) as any;
      for (const [name, value] of Object.entries(rest)) {
        element.setAttribute(name, value);
      }
      return element;
    });
    staff.append(...elements);
    const slot = staff.shadowRoot.querySelector('slot');
    slot.assignedElements = () => elements;
    slot.dispatchEvent(new Event('slotchange'));
    return elements;
  };
  const quarter = (note: string, octave: string) => ({
    note,
    octave,
    duration: 'quarter',
  });

  it('continues surrounding stems on a centre-line note', () => {
    const [, b4] = renderStaff([
      quarter('G', '4'),
      quarter('B', '4'),
      quarter('A', '4'),
    ]);
    expect(b4.stemUp).toBe(true);
  });

  it('keeps a down-stem on a centre-line note among down-stems', () => {
    const [, b4] = renderStaff([
      quarter('D', '5'),
      quarter('B', '4'),
      quarter('C', '5'),
    ]);
    expect(b4.stemUp).toBe(false);
  });

  it('treats a neighbouring stem-direction as context', () => {
    const [, b4] = renderStaff([
      { ...quarter('G', '4'), 'stem-direction': 'down' },
      quarter('B', '4'),
    ]);
    expect(b4.stemUp).toBe(false);
  });

  it("lets a centre-line note's own stem-direction win over context", () => {
    const [, b4] = renderStaff([
      quarter('G', '4'),
      { ...quarter('B', '4'), 'stem-direction': 'down' },
      quarter('A', '4'),
    ]);
    expect(b4.stemUp).toBe(false);
  });

  it('extends a stem to the middle line past the first ledger line', () => {
    const [a5, c6, c4, a3] = renderStaff([
      quarter('A', '5'),
      quarter('C', '6'),
      quarter('C', '4'),
      quarter('A', '3'),
    ]);
    expect(a5.stemExtension).toBe(0);
    expect(c6.stemExtension).toBe(
      MIDDLE_STAFF_Y - c6.staffY - BASE_STEM_LENGTH_PX
    );
    expect(c4.stemExtension).toBe(0);
    expect(a3.stemExtension).toBe(
      a3.staffY - MIDDLE_STAFF_Y - BASE_STEM_LENGTH_PX
    );
  });

  it('shortens a stem forced out of the stave, down to the minimum', () => {
    const [c5, f5] = renderStaff([
      { ...quarter('C', '5'), 'stem-direction': 'up' },
      { ...quarter('F', '5'), 'stem-direction': 'up' },
    ]);
    expect(BASE_STEM_LENGTH_PX + c5.stemExtension).toBe(STAFF_LINE_SPACING * 3);
    expect(BASE_STEM_LENGTH_PX + f5.stemExtension).toBe(MIN_STEM_LENGTH_PX);
  });

  it('leaves a stemless note with no extension', () => {
    const [c6] = renderStaff([{ note: 'C', octave: '6', duration: 'whole' }]);
    expect(c6.stemExtension).toBe(0);
  });

  it('measures a chord stem from the head nearest the open end', () => {
    const [chord] = renderStaff([
      {
        tag: MUSIC_CHORD,
        chord: 'C',
        duration: 'quarter',
        'stem-direction': 'down',
      },
    ]);
    const lowestHead = Math.max(...chord.staffYCoordinates);
    expect(lowestHead).toBeGreaterThan(MIDDLE_STAFF_Y);
    expect(BASE_STEM_LENGTH_PX + chord.stemExtension).toBe(MIN_STEM_LENGTH_PX);
  });

  it.each([
    ['B', '3', true, NOTE_STEM_X_OFFSET + TAIL_UP_WIDTH_PX],
    ['C', '5', false, NOTE_STEM_X_OFFSET_STEM_DOWN + TAIL_DOWN_WIDTH_PX],
  ])(
    'clears a hundredtwentyeighth rest from the tails of %s%s',
    (note, octave, stemUp, tailRightEdgePx) => {
      const [noteElement, rest] = renderStaff([
        { note, octave, duration: 'hundredtwentyeighth' },
        { tag: MUSIC_REST, duration: 'hundredtwentyeighth' },
      ]);
      expect(noteElement.stemUp).toBe(stemUp);
      const restBallLeftEdgesPx = Array.from(
        rest.shadowRoot.querySelectorAll('circle') as NodeListOf<SVGElement>
      ).map(
        (ball) =>
          (Number(ball.getAttribute('cx')) - Number(ball.getAttribute('r'))) *
          NOTE_SCALE
      );
      expect(restBallLeftEdgesPx.length).toBeGreaterThan(0);
      const advancePx =
        parseFloat(rest.style.left) - parseFloat(noteElement.style.left);
      expect(advancePx + Math.min(...restBallLeftEdgesPx)).toBeGreaterThan(
        tailRightEdgePx
      );
    }
  );
});

describe('tremolo labels and numerals', () => {
  // The note Y map maps onto the staff's overlay containers this way.
  const containerY = (staffY: number) =>
    STAFF_Y_PADDING + staffY - NOTE_HEAD_Y_OFFSET_CORRECTION;

  function renderStaff(time: string, content: Element[]): StaffElementType {
    const staff = document.createElement(MUSIC_STAFF) as StaffElementType;
    staff.setAttribute(COMMON_ATTRIBUTES.TIME, time);
    staff.append(...content);
    document.body.appendChild(staff);
    const slot = staff.shadowRoot!.querySelector('slot') as any;
    slot.assignedElements = () => content;
    slot.dispatchEvent(new Event('slotchange'));
    return staff;
  }

  function note(attributes: Record<string, string>): HTMLElement {
    const element = document.createElement(MUSIC_NOTE);
    for (const [name, value] of Object.entries({
      note: 'C',
      octave: '5',
      duration: 'quarter',
      ...attributes,
    })) {
      element.setAttribute(name, value);
    }
    return element;
  }

  const labels = (staff: StaffElementType) =>
    Array.from(
      staff.shadowRoot!.querySelectorAll(
        '.tremolo-labels-container .tremolo-label'
      )
    );

  it('draws a label above the stave', () => {
    const staff = renderStaff('4/4', [note({ 'tremolo-label': 'trem' })]);
    const [label] = labels(staff);
    expect(label.textContent).toBe('trem.');
    expect(Number(label.getAttribute('y'))).toBeLessThanOrEqual(
      containerY(STAFF_TOP_LINE_Y) - TREMOLO_LABEL_GAP_PX
    );
  });

  it('puts a label above a trill sign over its note', () => {
    const staff = renderStaff('4/4', [
      note({ 'tremolo-label': 'non-trem', trill: '' }),
    ]);
    const [label] = labels(staff);
    expect(Number(label.getAttribute('y'))).toBeLessThanOrEqual(
      containerY(STAFF_TOP_LINE_Y) -
        TRILL_ABOVE_STAFF_GAP_PX -
        TRILL_SIGN_HEIGHT_PX -
        TREMOLO_LABEL_GAP_PX
    );
  });

  it('stacks labels from two voices on one beat', () => {
    // Different rhythms, so the voices don't combine onto one stem.
    const voice1 = document.createElement(MUSIC_VOICE);
    voice1.append(
      note({ 'tremolo-label': 'trem', duration: 'half' }),
      note({ duration: 'half' })
    );
    const voice2 = document.createElement(MUSIC_VOICE);
    voice2.append(
      note({
        'tremolo-label': 'trem',
        note: 'A',
        octave: '4',
        duration: 'whole',
      })
    );
    const staff = renderStaff('4/4', [voice1, voice2]);
    const ys = labels(staff)
      .map((label) => Number(label.getAttribute('y')))
      .sort((a, b) => a - b);
    expect(ys).toHaveLength(2);
    expect(ys[1] - ys[0]).toBeGreaterThanOrEqual(TREMOLO_LABEL_FONT_SIZE_PX);
  });

  it('draws no label inside the note on a staff', () => {
    const labelled = note({ 'tremolo-label': 'trem' });
    renderStaff('4/4', [labelled]);
    expect(labelled.shadowRoot!.querySelector('.tremolo-label')).toBeNull();
  });

  it('keeps a tuplet bracket clear of tremolo numerals', () => {
    const bracketTop = (numerals: boolean) => {
      const tuplet = document.createElement(MUSIC_TUPLET);
      tuplet.setAttribute('ratio', '3');
      for (let i = 0; i < 3; i++) {
        tuplet.append(
          note({
            note: 'E',
            octave: '4',
            tremolo: '1',
            ...(numerals ? { 'tremolo-tuplet': '3' } : {}),
          })
        );
      }
      const staff = renderStaff('2/4', [tuplet]);
      const ys = Array.from(
        staff.shadowRoot!.querySelectorAll('.tuplet-bracket')
      ).flatMap((line) => [
        Number(line.getAttribute('y1')),
        Number(line.getAttribute('y2')),
      ]);
      document.body.innerHTML = '';
      return Math.min(...ys);
    };
    expect(bracketTop(true)).toBeLessThan(bracketTop(false));
  });
});

describe('key changes and end-of-measure warnings', () => {
  const D_TO_C = {
    from: { keySig: 'D', mode: 'major' },
    to: { keySig: 'C', mode: 'major' },
  } as const;
  const BB_TO_D = {
    from: { keySig: 'Bb', mode: 'major' },
    to: { keySig: 'D', mode: 'major' },
  } as const;

  function renderStaff(width = 400) {
    const staff = document.createElement(MUSIC_STAFF) as any;
    staff.setAttribute(COMMON_ATTRIBUTES.TIME, '4/4');
    document.body.appendChild(staff);
    staff.shadowRoot.querySelector(
      '.transcribe-container'
    ).getBoundingClientRect = () => ({
      width,
      left: 0,
      right: width,
      top: 0,
      bottom: 0,
      height: 0,
    });
    const notes = ['C', 'D', 'E', 'F'].map((name) => {
      const note = document.createElement(MUSIC_NOTE) as any;
      note.setAttribute('note', name);
      note.setAttribute('octave', `${4 satisfies Octave}`);
      note.setAttribute('duration', 'quarter');
      return note;
    });
    staff.append(...notes);
    const widths = { minWidth: 0, naturalWidth: 0 };
    staff.addEventListener(STAFF_EVENTS.STAFF_MIN_WIDTH, (event: Event) => {
      Object.assign(widths, (event as CustomEvent).detail);
    });
    const slot = staff.shadowRoot.querySelector('slot');
    slot.assignedElements = () => notes;
    slot.dispatchEvent(new Event('slotchange'));
    return { staff, notes, widths };
  }

  it('draws the naturals, then the new key, at a barline mid-row', () => {
    const { staff } = renderStaff();
    staff.showDescribe = false;
    staff.keyChangeAtBoundary = BB_TO_D;

    const glyphs = Array.from(
      staff.shadowRoot.querySelectorAll('.describe-container .key-change svg')
    ) as Element[];
    expect(
      glyphs.map((glyph) =>
        glyph.classList.contains('cancellation-natural') ? 'natural' : 'key'
      )
    ).toEqual(['natural', 'natural', 'key', 'key']);
  });

  it('draws only the new key at a row start', () => {
    const { staff } = renderStaff();
    staff.setAttribute(COMMON_ATTRIBUTES.KEY_SIG, 'C');
    staff.keyChangeAtBoundary = D_TO_C;

    expect(staff.shadowRoot.querySelector('.cancellation-natural')).toBeNull();
  });

  it('draws the warnings before the end barline, clef first', () => {
    const { staff } = renderStaff();
    staff.endWarnings = {
      clef: 'bass',
      key: D_TO_C,
      time: '3/4',
      reservesWidth: false,
    };

    const area = staff.shadowRoot.querySelector('.end-warnings-container');
    expect(
      Array.from(area.children).map((child: any) =>
        child.classList.contains('courtesy-clef')
          ? 'clef'
          : child.querySelector('.key-change')
          ? 'key'
          : 'time'
      )
    ).toEqual(['time', 'key', 'clef']);
    expect(area.querySelectorAll('.cancellation-natural')).toHaveLength(2);

    staff.endWarnings = null;
    expect(area.children).toHaveLength(0);
  });

  it('spaces the notes short of a courtesy without reserving width for it', () => {
    const { staff, notes, widths } = renderStaff();
    const lastX = parseFloat(notes[3].style.left);
    const { minWidth, naturalWidth } = widths;

    staff.endWarnings = {
      clef: 'bass',
      key: null,
      time: null,
      reservesWidth: false,
    };

    expect(parseFloat(notes[3].style.left)).toBeLessThan(lastX);
    expect(widths.minWidth).toBe(minWidth);
    expect(widths.naturalWidth).toBe(naturalWidth);
  });

  it('reserves width for warnings that ask for it', () => {
    const { staff, widths } = renderStaff();
    const { minWidth, naturalWidth } = widths;

    staff.endWarnings = {
      clef: 'bass',
      key: null,
      time: null,
      reservesWidth: true,
    };

    expect(widths.minWidth).toBeCloseTo(
      minWidth + staff.ownEndWarningSpace.width
    );
    expect(widths.naturalWidth).toBeCloseTo(
      naturalWidth + staff.ownEndWarningSpace.width
    );
  });
});

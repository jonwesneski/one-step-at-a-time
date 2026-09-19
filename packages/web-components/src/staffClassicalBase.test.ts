/**
 * @jest-environment jsdom
 */
import './index';
import { ChordElementType } from './types/elements';
import type { Chord, Octave } from './types/theory';
import {
  COMMON_ATTRIBUTES,
  MUSIC_CHORD,
  MUSIC_MEASURE,
  MUSIC_NOTE,
  MUSIC_REST,
  MUSIC_STAFF,
  MUSIC_TUPLET,
} from './utils/consts';

afterEach(() => {
  document.body.innerHTML = '';
});

// I'm using <music-staff /> (default clef="treble") to test staffClassicalBase specific scenarios
describe('staffClassicalBase', () => {
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
      const voice1Notes = ['C', 'D'].map(makeQuarterNote);
      const voice2Notes = ['E', 'F'].map((pitch) => {
        const note = document.createElement(MUSIC_NOTE) as any;
        note.setAttribute('duration', 'half');
        note.setAttribute('note', pitch);
        note.setAttribute('octave', `${4 satisfies Octave}`);
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

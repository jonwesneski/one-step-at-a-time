/**
 * @jest-environment jsdom
 */
import './index';
import { ChordElementType } from './types/elements';
import type { Chord, Octave } from './types/theory';
import {
  COMMON_ATTRIBUTES,
  MUSIC_CHORD,
  MUSIC_NOTE,
  MUSIC_STAFF_TREBLE,
} from './utils/consts';

afterEach(() => {
  document.body.innerHTML = '';
});

// I'm using <music-staff-treble /> to test staffClassicalBase specific scenarios
describe('staffClassicalBase', () => {
  it('logs a warning when adding another note on a filled measure', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const staffTreble = document.createElement(MUSIC_STAFF_TREBLE) as any;
    staffTreble.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
    document.body.appendChild(staffTreble);

    const notes = Array.from({ length: 5 }, () => {
      const note = document.createElement(MUSIC_NOTE) as any;
      note.setAttribute('duration', 'quarter');
      note.setAttribute('note', 'C');
      note.setAttribute('octave', `${4 satisfies Octave}`);
      return note;
    });

    const slot = staffTreble.shadowRoot.querySelector('slot');
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

    const staffTreble = document.createElement(MUSIC_STAFF_TREBLE) as any;
    staffTreble.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
    document.body.appendChild(staffTreble);

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

    const slot = staffTreble.shadowRoot.querySelector('slot');
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
    const staff = document.createElement(MUSIC_STAFF_TREBLE) as any;
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

      const staff = document.createElement(MUSIC_STAFF_TREBLE) as any;
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
      const staff = document.createElement(MUSIC_STAFF_TREBLE) as any;
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
      const staff = document.createElement(MUSIC_STAFF_TREBLE) as any;
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
      const staff = document.createElement(MUSIC_STAFF_TREBLE) as any;
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
});

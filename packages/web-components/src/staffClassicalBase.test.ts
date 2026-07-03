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
  it('logs an error when adding another note on a filled measure', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const el = document.createElement(MUSIC_STAFF_TREBLE) as any;
    el.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
    document.body.appendChild(el);

    const notes = Array.from({ length: 5 }, () => {
      const note = document.createElement(MUSIC_NOTE) as any;
      note.setAttribute('duration', 'quarter');
      note.setAttribute('note', 'C');
      note.setAttribute('octave', `${4 satisfies Octave}`);
      return note;
    });

    const slot = el.shadowRoot.querySelector('slot');
    slot.assignedElements = () => notes;
    slot.dispatchEvent(new Event('slotchange'));

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('no more room for note(s)')
    );

    errorSpy.mockRestore();
  });

  it('logs an error when adding a note that partially exceeds the remaining available space in measure', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const el = document.createElement(MUSIC_STAFF_TREBLE) as any;
    el.setAttribute(COMMON_ATTRIBUTES.TIME_SIG, '4/4');
    document.body.appendChild(el);

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

    const slot = el.shadowRoot.querySelector('slot');
    slot.assignedElements = () => notes;
    slot.dispatchEvent(new Event('slotchange'));

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('no more room for note(s)')
    );

    errorSpy.mockRestore();
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
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

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

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('overlaps a dynamic marking')
      );

      warnSpy.mockRestore();
    });
  });
});

/**
 * @jest-environment jsdom
 */
import { ChordElementType } from './types/elements';
import './index';

afterEach(() => {
  document.body.innerHTML = '';
});

// I'm using <music-staff-treble /> to test staffClassicalBase specific scenarios
describe('staffClassicalBase', () => {
  it('logs an error when adding another note on a filled measure', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const el = document.createElement('music-staff-treble') as any;
    el.setAttribute('time', '4/4');
    document.body.appendChild(el);

    const notes = Array.from({ length: 5 }, () => {
      const note = document.createElement('music-note') as any;
      note.setAttribute('duration', 'quarter');
      note.setAttribute('note', 'C4');
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

    const el = document.createElement('music-staff-treble') as any;
    el.setAttribute('time', '4/4');
    document.body.appendChild(el);

    const notes = [
      ...Array.from({ length: 3 }, () => {
        const note = document.createElement('music-note') as any;
        note.setAttribute('duration', 'quarter');
        note.setAttribute('note', 'C4');
        return note;
      }),
      (() => {
        const note = document.createElement('music-note') as any;
        note.setAttribute('duration', 'half');
        note.setAttribute('note', 'C4');
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

  it('assigns ascending pitch Y coordinates to a chord driven by the chord attribute', () => {
    const staff = document.createElement('music-staff-treble') as any;
    document.body.appendChild(staff);

    const chord = document.createElement('music-chord') as ChordElementType;
    chord.setAttribute('chord', 'Bmaj');
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
});

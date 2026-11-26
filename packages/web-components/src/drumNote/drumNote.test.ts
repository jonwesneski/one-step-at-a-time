/**
 * @jest-environment jsdom
 */
import '../index';
import { NoteElement } from '../note/note';
import {
  DRUM_NOTE_ATTRIBUTES,
  PITCH_ONLY_NOTE_ATTRIBUTES,
} from '../rules/percussionRules';
import type { DrumNoteElementType } from '../types/elements';
import { MUSIC_DRUM_NOTE, NOTE_EVENTS } from '../utils/consts';

afterEach(() => {
  document.body.innerHTML = '';
  jest.restoreAllMocks();
});

const makeDrumNote = (
  attributes: Record<string, string>
): DrumNoteElementType => {
  const note = document.createElement(MUSIC_DRUM_NOTE) as DrumNoteElementType;
  for (const [name, value] of Object.entries(attributes)) {
    note.setAttribute(name, value);
  }
  document.body.appendChild(note);
  return note;
};

describe(MUSIC_DRUM_NOTE, () => {
  it("takes its position and notehead from the instrument's drum-key entry", () => {
    const note = makeDrumNote({ instrument: 'ride' });
    expect(note.instrument).toBe('ride');
    expect(note.note).toBe('F');
    expect(note.octave).toBe(5);
    expect(note.notehead).toBe('x');
  });

  it('honours an explicit notehead', () => {
    const note = makeDrumNote({ instrument: 'snare', notehead: 'x' });
    expect(note.notehead).toBe('x');
    expect(note.note).toBe('C');
  });

  it('ignores pitch-dependent attributes, with one warning naming them', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const note = makeDrumNote({
      instrument: 'snare',
      note: 'G',
      octave: '4',
      trill: '',
      'octave-shift': '8va',
      grace: 'C',
    });
    expect(note.note).toBe('C');
    expect(note.octave).toBe(5);
    expect(note.trill).toBe(false);
    expect(note.octaveShift).toBeNull();
    expect(note.grace).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'ignoring note, octave, trill, octave-shift, grace'
      )
    );
  });

  it('takes technique and dynamic text', () => {
    const note = makeDrumNote({
      instrument: 'snare',
      'technique-text': 'rim',
      'technique-text-placement': 'below',
      dynamic: 'p',
      'dynamic-text': 'sub.',
    });
    expect(note.techniqueText).toBe('rim');
    expect(note.techniqueTextPlacement).toBe('below');
    expect(note.dynamicText).toBe('sub.');
  });

  it('ignores an unknown instrument', () => {
    const note = makeDrumNote({ instrument: 'cowbell' });
    expect(note.instrument).toBeNull();
    expect(note.octave).toBeNull();
    expect(note.ownNotehead).toBeNull();
  });

  it('redraws standalone when its instrument changes', () => {
    const note = makeDrumNote({ instrument: 'snare' });
    const headTag = () => note.shadowRoot!.querySelector('.head')?.tagName;
    expect(headTag()).toBe('ellipse');
    note.instrument = 'crash';
    expect(headTag()).toBe('path');
    note.instrument = null;
    expect(headTag()).toBe('ellipse');
  });

  it('dispatches NOTE_Y_CHANGE when its instrument changes', () => {
    const note = makeDrumNote({ instrument: 'snare' });
    const handler = jest.fn();
    note.addEventListener(NOTE_EVENTS.NOTE_Y_CHANGE, handler);
    note.instrument = 'kick';
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('drum note attribute lists', () => {
  it('classify every <music-note> attribute exactly once', () => {
    const drum = DRUM_NOTE_ATTRIBUTES.filter((name) => name !== 'instrument');
    const classified = [...drum, ...PITCH_ONLY_NOTE_ATTRIBUTES];
    expect(new Set(classified).size).toBe(classified.length);
    expect([...classified].sort()).toEqual(
      [...NoteElement.observedAttributes].sort()
    );
  });
});

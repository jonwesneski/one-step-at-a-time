/**
 * @jest-environment jsdom
 */
import { ChordElement } from '../chord/chord';
import '../index';
import {
  DRUM_CHORD_ATTRIBUTES,
  PITCH_ONLY_CHORD_ATTRIBUTES,
} from '../rules/percussionRules';
import type { ChordElementType } from '../types/elements';
import { MUSIC_DRUM_CHORD, MUSIC_DRUM_NOTE, MUSIC_NOTE } from '../utils/consts';

afterEach(() => {
  document.body.innerHTML = '';
  jest.restoreAllMocks();
});

const makeDrumChord = (markup: string, attributes = ''): ChordElementType => {
  document.body.innerHTML = `<${MUSIC_DRUM_CHORD} duration="quarter" ${attributes}>${markup}</${MUSIC_DRUM_CHORD}>`;
  return document.body.querySelector(MUSIC_DRUM_CHORD) as ChordElementType;
};

describe(MUSIC_DRUM_CHORD, () => {
  it('stacks its drum notes at their drum-key positions with their noteheads', () => {
    const chord = makeDrumChord(
      `<${MUSIC_DRUM_NOTE} instrument="hi-hat"></${MUSIC_DRUM_NOTE}>` +
        `<${MUSIC_DRUM_NOTE} instrument="kick"></${MUSIC_DRUM_NOTE}>`
    );
    expect(chord.notes).toEqual([
      { value: 'G', octave: 5 },
      { value: 'F', octave: 4 },
    ]);
    expect(chord.toneNoteheads).toEqual(['x', 'normal']);
  });

  it('ignores <music-note> children, with a warning', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const chord = makeDrumChord(
      `<${MUSIC_DRUM_NOTE} instrument="snare"></${MUSIC_DRUM_NOTE}>` +
        `<${MUSIC_NOTE} note="E" octave="4"></${MUSIC_NOTE}>`
    );
    expect(chord.notes).toEqual([{ value: 'C', octave: 5 }]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(`<${MUSIC_NOTE}> child`)
    );
  });

  it('ignores a chord symbol and other pitch-dependent attributes', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const chord = makeDrumChord('', 'chord="Cmaj7" arpeggio="up"');
    expect(chord.notes).toEqual([]);
    expect(chord.arpeggio).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('ignoring chord, arpeggio')
    );
  });
});

describe('drum chord attribute lists', () => {
  it('classify every <music-chord> attribute exactly once', () => {
    const classified = [
      ...DRUM_CHORD_ATTRIBUTES,
      ...PITCH_ONLY_CHORD_ATTRIBUTES,
    ];
    expect(new Set(classified).size).toBe(classified.length);
    expect([...classified].sort()).toEqual(
      [...ChordElement.observedAttributes].sort()
    );
  });
});

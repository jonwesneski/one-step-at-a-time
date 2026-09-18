/**
 * @jest-environment jsdom
 */
import '../note/index';
import { VoiceElementType } from '../types/elements';
import {
  MUSIC_CHORD,
  MUSIC_CLEF,
  MUSIC_NOTE,
  MUSIC_REST,
  MUSIC_VOICE,
} from '../utils/consts';
import './index';

afterEach(() => {
  document.body.innerHTML = '';
});

function note(pitch = 'C'): HTMLElement {
  const el = document.createElement(MUSIC_NOTE);
  el.setAttribute('note', pitch);
  el.setAttribute('duration', 'quarter');
  return el;
}

describe(MUSIC_VOICE, () => {
  it('registers as a custom element', () => {
    const element = document.createElement(MUSIC_VOICE);
    document.body.appendChild(element);

    expect(customElements.get(MUSIC_VOICE)).toBeDefined();
  });

  it('has no shadow root (pure grouping wrapper, no self-rendering)', () => {
    const element = document.createElement(MUSIC_VOICE) as VoiceElementType;
    document.body.appendChild(element);

    expect(element.shadowRoot).toBeNull();
  });

  it('has no observed attributes', () => {
    expect(
      (
        customElements.get(MUSIC_VOICE) as typeof HTMLElement & {
          observedAttributes?: string[];
        }
      )?.observedAttributes
    ).toEqual([]);
  });

  it('flatElements returns empty array when no children', () => {
    const element = document.createElement(MUSIC_VOICE) as VoiceElementType;
    document.body.appendChild(element);

    expect(element.flatElements).toHaveLength(0);
  });

  it('flatElements returns direct note/chord/rest children', () => {
    const element = document.createElement(MUSIC_VOICE) as VoiceElementType;
    element.appendChild(note('C'));
    element.appendChild(document.createElement(MUSIC_CHORD));
    element.appendChild(document.createElement(MUSIC_REST));
    document.body.appendChild(element);

    expect(element.flatElements).toHaveLength(3);
  });

  it('does not warn for a <music-clef> nested inside <music-voice> (a mid-stream clef change is authored in the first voice)', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const element = document.createElement(MUSIC_VOICE) as VoiceElementType;
    element.appendChild(document.createElement(MUSIC_CLEF));
    document.body.appendChild(element);

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('warns when a <music-voice> is nested inside another <music-voice>', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const outer = document.createElement(MUSIC_VOICE) as VoiceElementType;
    outer.appendChild(document.createElement(MUSIC_VOICE));
    document.body.appendChild(outer);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('cannot nest inside another <music-voice>')
    );
    warn.mockRestore();
  });

  it('warns on re-validation when children mutate after connecting', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const element = document.createElement(MUSIC_VOICE) as VoiceElementType;
    document.body.appendChild(element);
    warn.mockClear();

    element.appendChild(document.createElement(MUSIC_VOICE));

    return Promise.resolve().then(() => {
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('cannot nest inside another <music-voice>')
      );
      warn.mockRestore();
    });
  });
});

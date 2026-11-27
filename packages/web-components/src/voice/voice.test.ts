/**
 * @jest-environment jsdom
 */
import '../note/index';
import { MUSIC_CLEF, MUSIC_VOICE, NOTE_EVENTS } from '../utils/consts';
import './index';

afterEach(() => {
  document.body.innerHTML = '';
});

describe(MUSIC_VOICE, () => {
  it('registers as a custom element', () => {
    const element = document.createElement(MUSIC_VOICE);
    document.body.appendChild(element);

    expect(customElements.get(MUSIC_VOICE)).toBeDefined();
  });

  it('has no shadow root (pure grouping wrapper, no self-rendering)', () => {
    const element = document.createElement(MUSIC_VOICE);
    document.body.appendChild(element);

    expect(element.shadowRoot).toBeNull();
  });

  it('does not warn for a <music-clef> nested inside <music-voice> (a mid-stream clef change is authored in the first voice)', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const element = document.createElement(MUSIC_VOICE);
    element.appendChild(document.createElement(MUSIC_CLEF));
    document.body.appendChild(element);

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('warns when a <music-voice> is nested inside another <music-voice>', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const outer = document.createElement(MUSIC_VOICE);
    outer.appendChild(document.createElement(MUSIC_VOICE));
    document.body.appendChild(outer);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('cannot nest inside another <music-voice>')
    );
    warn.mockRestore();
  });

  it('warns on re-validation when children mutate after connecting', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const element = document.createElement(MUSIC_VOICE);
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

describe('barline inside a voice', () => {
  it('is accepted without a warning', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    document.body.innerHTML = `
      <music-voice>
        <music-note note="C" octave="5" duration="quarter"></music-note>
        <music-barline></music-barline>
      </music-voice>`;
    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining('is not allowed inside <music-voice>')
    );
    warn.mockRestore();
  });
});

describe(`${MUSIC_VOICE} size`, () => {
  it('re-lays out its staff when its size changes', () => {
    const voice = document.createElement(MUSIC_VOICE);
    document.body.appendChild(voice);
    const handler = jest.fn();
    voice.addEventListener(NOTE_EVENTS.NOTE_Y_CHANGE, handler);
    voice.setAttribute('size', 'cue');
    voice.removeAttribute('size');
    expect(handler).toHaveBeenCalledTimes(2);
  });
});

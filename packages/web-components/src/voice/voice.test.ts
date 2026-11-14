/**
 * @jest-environment jsdom
 */
import '../note/index';
import { MUSIC_CLEF, MUSIC_VOICE } from '../utils/consts';
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

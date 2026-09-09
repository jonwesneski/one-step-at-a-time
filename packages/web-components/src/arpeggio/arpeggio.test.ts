/**
 * @jest-environment jsdom
 */
import '../chord/index';
import '../note/index';
import type { ArpeggioElementType } from '../types/elements';
import type { Chord, DurationType, Note } from '../types/theory';
import {
  MUSIC_ARPEGGIO,
  MUSIC_CHORD,
  MUSIC_NOTE,
  NOTE_EVENTS,
} from '../utils/consts';
import './index';

afterEach(() => {
  document.body.innerHTML = '';
});

function makeArpeggio(
  runPitches: Note[],
  targetChord: Chord = 'Cmaj'
): ArpeggioElementType {
  const wrapper = document.createElement(MUSIC_ARPEGGIO) as ArpeggioElementType;
  for (const pitch of runPitches) {
    const note = document.createElement(MUSIC_NOTE);
    note.setAttribute('note', pitch);
    note.setAttribute('octave', '4');
    wrapper.appendChild(note);
  }
  const chord = document.createElement(MUSIC_CHORD);
  chord.setAttribute('chord', targetChord);
  chord.setAttribute('duration', 'quarter' satisfies DurationType);
  wrapper.appendChild(chord);
  document.body.appendChild(wrapper);
  return wrapper;
}

describe('music-arpeggio', () => {
  it('registers and satisfies its interface', () => {
    const wrapper = makeArpeggio(['C', 'E', 'G']);
    expect(wrapper.runDuration).toBe('thirtysecond');
    expect(wrapper.unmatched).toBe('lv');
    expect(wrapper.runElements.length).toBe(3);
    expect(wrapper.targetElement?.nodeName).toBe(MUSIC_CHORD.toUpperCase());
    expect(wrapper.flatElements.length).toBe(4);
  });

  it('writes the default run duration onto run notes that lack one', () => {
    const wrapper = makeArpeggio(['C', 'E', 'G']);
    for (const note of wrapper.runElements) {
      expect(note.getAttribute('duration')).toBe('thirtysecond');
      expect(note.hasAttribute('data-arpeggio-run')).toBe(true);
    }
    expect(wrapper.targetElement?.hasAttribute('data-arpeggio-target')).toBe(
      true
    );
  });

  it('respects a duration authored on a run note before connect', () => {
    const wrapper = document.createElement(
      MUSIC_ARPEGGIO
    ) as ArpeggioElementType;
    const authored = document.createElement(MUSIC_NOTE);
    authored.setAttribute('note', 'C' satisfies Note);
    authored.setAttribute('duration', 'sixteenth' satisfies DurationType);
    const plain = document.createElement(MUSIC_NOTE);
    plain.setAttribute('note', 'E' satisfies Note);
    const chord = document.createElement(MUSIC_CHORD);
    chord.setAttribute('chord', 'Cmaj' satisfies Chord);
    chord.setAttribute('duration', 'quarter' satisfies DurationType);
    wrapper.append(authored, plain, chord);
    document.body.appendChild(wrapper);

    expect(authored.getAttribute('duration')).toBe('sixteenth');
    expect(plain.getAttribute('duration')).toBe('thirtysecond');
  });

  it('re-applies run-duration to wrapper-owned run notes when it changes', () => {
    const wrapper = makeArpeggio(['C', 'E', 'G']);
    expect(wrapper.runElements[1].getAttribute('duration')).toBe(
      'thirtysecond'
    );

    wrapper.setAttribute('run-duration', 'sixtyfourth' satisfies DurationType);
    expect(wrapper.runElements[1].getAttribute('duration')).toBe('sixtyfourth');
  });

  it('dispatches connector-attribute-change when children change', () => {
    const wrapper = makeArpeggio(['C', 'E', 'G']);
    let fired = 0;
    wrapper.addEventListener(NOTE_EVENTS.CONNECTOR_ATTRIBUTE_CHANGE, () => {
      fired++;
    });
    const extra = document.createElement(MUSIC_NOTE);
    extra.setAttribute('note', 'B' satisfies Note);
    wrapper.insertBefore(extra, wrapper.lastElementChild);
    // MutationObserver is async; flush a microtask.
    return Promise.resolve().then(() => {
      expect(fired).toBeGreaterThanOrEqual(1);
    });
  });

  it('warns when malformed', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const lonely = document.createElement(MUSIC_ARPEGGIO);
    const note = document.createElement(MUSIC_NOTE);
    note.setAttribute('note', 'C' satisfies Note);
    lonely.appendChild(note);
    document.body.appendChild(lonely);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('at least a run note')
    );
    warn.mockRestore();
  });
});

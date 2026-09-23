/**
 * @jest-environment jsdom
 */
import '../rest/index';
import { NoteChordOrRestElementType, RestElementType } from '../types/elements';
import { VoiceNumber } from '../types/theory';
import { MUSIC_REST } from '../utils/consts';
import {
  detectSharedWholeMeasureRest,
  sharedRestGlyphX,
} from './voiceRestRules';

afterEach(() => {
  document.body.innerHTML = '';
});

function rest(duration: string): RestElementType {
  const el = document.createElement(MUSIC_REST) as RestElementType;
  el.setAttribute('duration', duration);
  document.body.appendChild(el);
  return el;
}

function voices(
  map: Record<number, string[]>
): ReadonlyMap<VoiceNumber, readonly NoteChordOrRestElementType[]> {
  return new Map(
    Object.entries(map).map(([voiceNumber, durations]) => [
      Number(voiceNumber) as VoiceNumber,
      durations.map(rest) as never,
    ])
  );
}

describe('detectSharedWholeMeasureRest', () => {
  it('fires for a fully empty 4/4 measure across two voices', () => {
    expect(
      detectSharedWholeMeasureRest(
        voices({ 1: ['whole'], 2: ['whole'] }),
        [4, 4]
      )
    ).toBe('whole');
  });

  it('fires when a voice splits its silence into multiple rests summing to the full measure', () => {
    expect(
      detectSharedWholeMeasureRest(
        voices({ 1: ['half', 'half'], 2: ['whole'] }),
        [4, 4]
      )
    ).toBe('whole');
  });

  it('returns null when any voice has a note, not just rests', () => {
    const note = document.createElement('music-note');
    note.setAttribute('note', 'C');
    note.setAttribute('duration', 'whole');
    document.body.appendChild(note);
    const map = new Map<VoiceNumber, readonly NoteChordOrRestElementType[]>([
      [1, [note as never]],
      [2, [rest('whole')]],
    ]);
    expect(detectSharedWholeMeasureRest(map, [4, 4])).toBeNull();
  });

  it('returns null when a voice is not fully silent for the whole measure', () => {
    expect(
      detectSharedWholeMeasureRest(
        voices({ 1: ['quarter'], 2: ['whole'] }),
        [4, 4]
      )
    ).toBeNull();
  });

  it('returns null for an empty voice array (nothing, not "all rests")', () => {
    const map = new Map<VoiceNumber, readonly NoteChordOrRestElementType[]>([
      [1, []],
      [2, [rest('whole')]],
    ]);
    expect(detectSharedWholeMeasureRest(map, [4, 4])).toBeNull();
  });

  it('returns "double-whole" for a 2-beat-capacity meter (4/2) fully empty', () => {
    expect(
      detectSharedWholeMeasureRest(voices({ 1: ['whole', 'whole'] }), [4, 2])
    ).toBe('double-whole');
  });

  it('returns null for a fully empty measure in a meter with capacity > 2 (no larger whole-bar-rest glyph convention)', () => {
    expect(
      detectSharedWholeMeasureRest(
        voices({ 1: ['whole', 'whole', 'whole'] }),
        [9, 4]
      )
    ).toBeNull();
  });

  it('returns null when no voices are present', () => {
    expect(detectSharedWholeMeasureRest(new Map(), [4, 4])).toBeNull();
  });
});

describe('sharedRestGlyphX', () => {
  it('centers the glyph within the remaining width', () => {
    expect(sharedRestGlyphX(100, 200, 20)).toBe(100 + (200 - 20) / 2);
  });
});

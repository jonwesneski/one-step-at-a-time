/**
 * @jest-environment jsdom
 */
import '@/src/index';

import { makeChord, makeNote } from '../test-fixtures/unitHelpers';
import {
  ACCIDENTAL_REMINDER_PAREN_WIDTH_PX,
  ACCIDENTAL_SYMBOL_WIDTH,
} from '../utils/notationDimensions';
import {
  accidentalSymbolWidth,
  computeInterNoteSpacing,
  computeNoteAccidentals,
  getKeySignatureAccidentals,
  parseAccidentalSuffix,
  resolveAccidental,
  suffixToType,
} from './accidentalRules';

describe('parseAccidentalSuffix', () => {
  it('returns empty string for natural notes', () => {
    expect(parseAccidentalSuffix('C')).toBe('');
    expect(parseAccidentalSuffix('F')).toBe('');
  });

  it('returns # for sharps', () => {
    expect(parseAccidentalSuffix('F#')).toBe('#');
    expect(parseAccidentalSuffix('A#')).toBe('#');
  });

  it('returns b for flats', () => {
    expect(parseAccidentalSuffix('Bb')).toBe('b');
    expect(parseAccidentalSuffix('Eb')).toBe('b');
  });

  it('returns ## for double sharps', () => {
    expect(parseAccidentalSuffix('C##')).toBe('##');
    expect(parseAccidentalSuffix('F##')).toBe('##');
  });

  it('returns bb for double flats', () => {
    expect(parseAccidentalSuffix('Bbb')).toBe('bb');
    expect(parseAccidentalSuffix('Abb')).toBe('bb');
  });
});

describe('suffixToType', () => {
  it('returns null for natural', () => {
    expect(suffixToType('')).toBeNull();
  });

  it('maps # to sharp', () => {
    expect(suffixToType('#')).toBe('sharp');
  });

  it('maps b to flat', () => {
    expect(suffixToType('b')).toBe('flat');
  });

  it('maps ## to double-sharp', () => {
    expect(suffixToType('##')).toBe('double-sharp');
  });

  it('maps bb to double-flat', () => {
    expect(suffixToType('bb')).toBe('double-flat');
  });
});

describe('getKeySignatureAccidentals', () => {
  it('C major — no accidentals', () => {
    expect(getKeySignatureAccidentals('C', 'major').size).toBe(0);
  });

  it('G major — F sharp', () => {
    const map = getKeySignatureAccidentals('G', 'major');
    expect(map.size).toBe(1);
    expect(map.get('F')).toBe('sharp');
  });

  it('D major — F and C sharp', () => {
    const map = getKeySignatureAccidentals('D', 'major');
    expect(map.size).toBe(2);
    expect(map.get('F')).toBe('sharp');
    expect(map.get('C')).toBe('sharp');
  });

  it('Bb major — B and E flat', () => {
    const map = getKeySignatureAccidentals('Bb', 'major');
    expect(map.size).toBe(2);
    expect(map.get('B')).toBe('flat');
    expect(map.get('E')).toBe('flat');
  });

  it('F major — B flat', () => {
    const map = getKeySignatureAccidentals('F', 'major');
    expect(map.size).toBe(1);
    expect(map.get('B')).toBe('flat');
  });

  it('A minor — same as C major', () => {
    expect(getKeySignatureAccidentals('A', 'minor').size).toBe(0);
  });

  it('E minor — same as G major', () => {
    const map = getKeySignatureAccidentals('E', 'minor');
    expect(map.size).toBe(1);
    expect(map.get('F')).toBe('sharp');
  });
});

describe('resolveAccidental', () => {
  it('suppresses when note matches effective state', () => {
    expect(resolveAccidental('sharp', 'sharp')).toBeNull();
    expect(resolveAccidental(null, null)).toBeNull();
    expect(resolveAccidental('flat', 'flat')).toBeNull();
  });

  it('shows the accidental when different from effective state', () => {
    expect(resolveAccidental('sharp', null)).toBe('sharp');
    expect(resolveAccidental('flat', 'sharp')).toBe('flat');
    expect(resolveAccidental('double-sharp', 'sharp')).toBe('double-sharp');
  });

  it('shows natural when note is natural but state has accidental', () => {
    expect(resolveAccidental(null, 'sharp')).toBe('natural');
    expect(resolveAccidental(null, 'flat')).toBe('natural');
    expect(resolveAccidental(null, 'double-flat')).toBe('natural');
  });

  it('contemporary: double-sharp to sharp shows sharp, no natural needed', () => {
    expect(resolveAccidental('sharp', 'double-sharp')).toBe('sharp');
  });

  it('contemporary: double-flat to flat shows flat, no natural needed', () => {
    expect(resolveAccidental('flat', 'double-flat')).toBe('flat');
  });
});

describe('computeInterNoteSpacing', () => {
  it('returns xPosition unchanged when accidentalWidth is zero', () => {
    expect(computeInterNoteSpacing(100, 0, 80)).toBe(100);
  });

  it('returns xPosition unchanged when accidental clears previous right edge', () => {
    // xPosition=100, accidentalWidth=10 → accidental left-edge=90, previousRightEdge=80 → no overlap
    expect(computeInterNoteSpacing(100, 10, 80)).toBe(100);
  });

  it('nudges xPosition right when accidental would overlap previous notehead', () => {
    // xPosition=100, accidentalWidth=10, previousRightEdge=95 → overlap by 5
    // nudged to 95 + 10 = 105
    expect(computeInterNoteSpacing(100, 10, 95)).toBe(105);
  });

  it('handles double-flat width (18px)', () => {
    // xPosition=100, accidentalWidth=18, previousRightEdge=110 → nudge to 128
    expect(computeInterNoteSpacing(100, 18, 110)).toBe(128);
  });

  it('returns xPosition unchanged when negative accidentalWidth is passed', () => {
    expect(computeInterNoteSpacing(100, -1, 80)).toBe(100);
  });
});

describe('computeNoteAccidentals — tie-over-barline suppression', () => {
  it('suppresses accidental on a note with tie="end"', () => {
    // F# in G major would normally be suppressed by key sig — use C major so F# requires explicit accidental
    const tiedEnd = makeNote({
      note: 'F#',
      octave: 4,
      duration: 'quarter',
      tie: 'end',
    });
    const { noteShowAccidentals } = computeNoteAccidentals(
      [tiedEnd],
      'C',
      'major'
    );
    expect(noteShowAccidentals.get(tiedEnd)).toBeNull();
  });

  it('shows the accidental again on a dotted tie’s end across a barline', () => {
    const tiedEnd = makeNote({
      note: 'F#',
      octave: 4,
      duration: 'quarter',
      tie: 'end',
    });
    tiedEnd.dottedTieAcrossBarline = true;
    const next = makeNote({ note: 'F#', octave: 4, duration: 'quarter' });
    const { noteShowAccidentals } = computeNoteAccidentals(
      [tiedEnd, next],
      'C',
      'major'
    );
    expect(noteShowAccidentals.get(tiedEnd)).toBe('sharp');
    expect(noteShowAccidentals.get(next)).toBeNull();
  });

  it('shows a chord’s accidentals again on a dotted tie’s end across a barline', () => {
    const tiedChord = makeChord({
      notes: [
        { note: 'F#', octave: 4 },
        { note: 'A', octave: 4 },
      ],
      tie: 'end',
    });
    tiedChord.dottedTieAcrossBarline = true;
    const { chordNoteAccidentals } = computeNoteAccidentals(
      [tiedChord],
      'C',
      'major'
    );
    expect(chordNoteAccidentals.get(tiedChord)).toEqual(['sharp', null]);
  });

  it('note after a tied-end is evaluated normally against key signature', () => {
    const tiedEnd = makeNote({
      note: 'F#',
      octave: 4,
      duration: 'quarter',
      tie: 'end',
    });
    const next = makeNote({ note: 'F#', octave: 4, duration: 'quarter' });
    const { noteShowAccidentals } = computeNoteAccidentals(
      [tiedEnd, next],
      'C',
      'major'
    );
    // tiedEnd is suppressed; next still needs the sharp since inMeasureState was not updated by tiedEnd
    expect(noteShowAccidentals.get(tiedEnd)).toBeNull();
    expect(noteShowAccidentals.get(next)).toBe('sharp');
  });

  it('suppresses all note accidentals on a chord with tie="end"', () => {
    const tiedChord = makeChord({
      notes: [
        { note: 'F', octave: 4 },
        { note: 'A', octave: 4 },
        { note: 'C#', octave: 5 },
      ],
      duration: 'quarter',
      tie: 'end',
    });
    const { chordNoteAccidentals } = computeNoteAccidentals(
      [tiedChord],
      'C',
      'major'
    );
    const accidentals = chordNoteAccidentals.get(tiedChord);
    expect(accidentals).toBeDefined();
    expect(accidentals?.every((a) => a === null)).toBe(true);
  });
});

describe('computeNoteAccidentals — trill-finish accidentals', () => {
  it('resolves a finishing grace note against the key signature, sounding after the host note', () => {
    // G major implies F#; a finishing grace of plain F should show a natural
    // since it cancels the key signature.
    const host = makeNote({ note: 'G', octave: 4, duration: 'quarter' });
    host.trillFinish = ['F'];
    const { trillFinishShowAccidentals } = computeNoteAccidentals(
      [host],
      'G',
      'major'
    );
    expect(trillFinishShowAccidentals.get(host)).toEqual(['natural']);
  });

  it('a finishing accidental carries into in-measure state for the following note', () => {
    const host = makeNote({ note: 'C', octave: 4, duration: 'quarter' });
    host.trillFinish = ['F#'];
    const next = makeNote({ note: 'F', octave: 4, duration: 'quarter' });
    const { noteShowAccidentals } = computeNoteAccidentals(
      [host, next],
      'C',
      'major'
    );
    // The finishing F# already raised F within the measure, so the
    // following plain F needs an explicit natural to cancel it.
    expect(noteShowAccidentals.get(next)).toBe('natural');
  });

  it('still resolves on a tied="end" host, since finishing notes are independent of whether the host re-sounds', () => {
    const host = makeNote({
      note: 'C',
      octave: 4,
      duration: 'quarter',
      tie: 'end',
    });
    host.trillFinish = ['F#'];
    const { trillFinishShowAccidentals } = computeNoteAccidentals(
      [host],
      'C',
      'major'
    );
    expect(trillFinishShowAccidentals.get(host)).toEqual(['sharp']);
  });

  it('resolves per-tone on a chord host', () => {
    const host = makeChord({
      notes: [
        { note: 'C', octave: 4 },
        { note: 'E', octave: 4 },
      ],
      duration: 'quarter',
    });
    host.trillFinish = ['F#', 'G'];
    const { trillFinishShowAccidentals } = computeNoteAccidentals(
      [host],
      'C',
      'major'
    );
    expect(trillFinishShowAccidentals.get(host)).toEqual(['sharp', null]);
  });

  it('is absent from the map when trillFinish is unset', () => {
    const host = makeNote({ note: 'C', octave: 4, duration: 'quarter' });
    const { trillFinishShowAccidentals } = computeNoteAccidentals(
      [host],
      'C',
      'major'
    );
    expect(trillFinishShowAccidentals.has(host)).toBe(false);
  });

  it('normal note without tie still shows accidental', () => {
    const note = makeNote({ note: 'F#', octave: 4, duration: 'quarter' });
    const { noteShowAccidentals } = computeNoteAccidentals(
      [note],
      'C',
      'major'
    );
    expect(noteShowAccidentals.get(note)).toBe('sharp');
  });
});

describe('computeNoteAccidentals with a triangle', () => {
  it('resolves its grace notes but ignores its own nominal pitch', () => {
    const before = makeNote({ note: 'F#' });
    const triangle = makeNote({ note: 'C#' });
    triangle.setAttribute('notehead', 'triangle-up');
    triangle.setAttribute('grace', 'F');
    const after = makeNote({ note: 'C' });
    const later = makeNote({ note: 'F' });

    const { noteShowAccidentals, graceShowAccidentals } =
      computeNoteAccidentals([before, triangle, after, later], 'C', 'major');

    expect(graceShowAccidentals.get(triangle)).toEqual(['natural']);
    expect(noteShowAccidentals.get(triangle)).toBeNull();
    // The C# never entered the state, and the grace F did.
    expect(noteShowAccidentals.get(after)).toBeNull();
    expect(noteShowAccidentals.get(later)).toBeNull();
  });

  it('resolves its finishing notes', () => {
    const before = makeNote({ note: 'F#' });
    const triangle = makeNote({ note: 'C' });
    triangle.setAttribute('notehead', 'triangle-up');
    triangle.setAttribute('trill-finish', 'F');

    const { trillFinishShowAccidentals } = computeNoteAccidentals(
      [before, triangle],
      'C',
      'major'
    );
    expect(trillFinishShowAccidentals.get(triangle)).toEqual(['natural']);
  });
});

describe('computeNoteAccidentals — reminder accidentals', () => {
  it('shows a hidden natural in parentheses', () => {
    const note = makeNote({ note: 'B', octave: 4, duration: 'quarter' });
    note.setAttribute('accidental-reminder', '');
    const { noteShowAccidentals, parenthesizedAccidentals } =
      computeNoteAccidentals([note], 'C', 'major');
    expect(noteShowAccidentals.get(note)).toBe('natural');
    expect(parenthesizedAccidentals.has(note)).toBe(true);
  });

  it('shows the key’s own accidental in parentheses', () => {
    const note = makeNote({ note: 'Bb', octave: 4, duration: 'quarter' });
    note.setAttribute('accidental-reminder', '');
    const { noteShowAccidentals, parenthesizedAccidentals } =
      computeNoteAccidentals([note], 'F', 'major');
    expect(noteShowAccidentals.get(note)).toBe('flat');
    expect(parenthesizedAccidentals.has(note)).toBe(true);
  });

  it('draws an accidental that is required anyway plainly', () => {
    const note = makeNote({ note: 'B', octave: 4, duration: 'quarter' });
    note.setAttribute('accidental-reminder', '');
    const { noteShowAccidentals, parenthesizedAccidentals } =
      computeNoteAccidentals([note], 'F', 'major');
    expect(noteShowAccidentals.get(note)).toBe('natural');
    expect(parenthesizedAccidentals.has(note)).toBe(false);
  });

  it('brackets only the chord tone whose own note asks for it', () => {
    const chord = makeChord({
      notes: [
        { note: 'C', octave: 4 },
        { note: 'E', octave: 4 },
      ],
    });
    chord
      .querySelectorAll('music-note')[1]
      .setAttribute('accidental-reminder', '');
    const { chordNoteAccidentals, chordParenthesizedAccidentals } =
      computeNoteAccidentals([chord], 'C', 'major');
    expect(chordNoteAccidentals.get(chord)).toEqual([null, 'natural']);
    expect(chordParenthesizedAccidentals.get(chord)).toEqual([false, true]);
  });
});

describe('accidentalSymbolWidth', () => {
  it('adds both parentheses for a reminder', () => {
    expect(accidentalSymbolWidth('natural', true)).toBeCloseTo(
      ACCIDENTAL_SYMBOL_WIDTH.natural + ACCIDENTAL_REMINDER_PAREN_WIDTH_PX * 2
    );
    expect(accidentalSymbolWidth('natural')).toBe(
      ACCIDENTAL_SYMBOL_WIDTH.natural
    );
  });
});

describe('computeNoteAccidentals — a natural earlier in the bar', () => {
  it('holds for the rest of the bar against the key', () => {
    const first = makeNote({ note: 'B', octave: 4, duration: 'quarter' });
    const second = makeNote({ note: 'B', octave: 4, duration: 'quarter' });
    const flat = makeNote({ note: 'Bb', octave: 4, duration: 'quarter' });
    const { noteShowAccidentals } = computeNoteAccidentals(
      [first, second, flat],
      'F',
      'major'
    );
    expect(noteShowAccidentals.get(first)).toBe('natural');
    expect(noteShowAccidentals.get(second)).toBeNull();
    expect(noteShowAccidentals.get(flat)).toBe('flat');
  });

  it('holds across a chord tone too', () => {
    const note = makeNote({ note: 'B', octave: 4, duration: 'quarter' });
    const chord = makeChord({
      notes: [
        { note: 'D', octave: 4 },
        { note: 'B', octave: 4 },
      ],
    });
    const { chordNoteAccidentals } = computeNoteAccidentals(
      [note, chord],
      'F',
      'major'
    );
    expect(chordNoteAccidentals.get(chord)).toEqual([null, null]);
  });

  it('lets a reminder bracket the repeated natural', () => {
    const first = makeNote({ note: 'B', octave: 4, duration: 'quarter' });
    const reminder = makeNote({ note: 'B', octave: 4, duration: 'quarter' });
    reminder.setAttribute('accidental-reminder', '');
    const { noteShowAccidentals, parenthesizedAccidentals } =
      computeNoteAccidentals([first, reminder], 'F', 'major');
    expect(noteShowAccidentals.get(reminder)).toBe('natural');
    expect(parenthesizedAccidentals.has(reminder)).toBe(true);
  });
});

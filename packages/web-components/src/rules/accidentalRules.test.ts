/**
 * @jest-environment jsdom
 */
import '@/src/index';

import { makeChord, makeNote } from '../test-fixtures/unitHelpers';
import type { Note, QuarterTone } from '../types/theory';
import {
  ACCIDENTAL_REMINDER_PAREN_WIDTH_PX,
  ACCIDENTAL_SYMBOL_HEIGHT,
  ACCIDENTAL_SYMBOL_WIDTH,
} from '../utils/notationDimensions';
import {
  accidentalArrowOverhangs,
  accidentalInkRect,
  accidentalPitchOffset,
  accidentalReach,
  accidentalReminderParenCenter,
  accidentalReminderParenHeight,
  accidentalSuffix,
  accidentalSymbolHeight,
  accidentalSymbolWidth,
  accidentalVerticalExtent,
  baseAccidental,
  computeChordAccidentalPlacements,
  computeInterNoteSpacing,
  computeNoteAccidentals,
  getKeySignatureAccidentals,
  parseAccidentalSuffix,
  pitchAccidental,
  quarterToneOf,
  resolveAccidental,
  suffixToType,
  totalChordAccidentalWidth,
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

describe('accidentalSymbolHeight', () => {
  it('grows to the parentheses when they are taller than the glyph', () => {
    expect(accidentalSymbolHeight('double-sharp')).toBe(
      ACCIDENTAL_SYMBOL_HEIGHT['double-sharp']
    );
    expect(accidentalSymbolHeight('double-sharp', true)).toBe(
      accidentalReminderParenHeight('double-sharp')
    );
    expect(accidentalSymbolHeight('double-sharp', true)).toBeGreaterThan(
      ACCIDENTAL_SYMBOL_HEIGHT['double-sharp']
    );
  });
});

describe('computeChordAccidentalPlacements — reminders', () => {
  const pair = (parenthesized: boolean) =>
    computeChordAccidentalPlacements([
      {
        noteIndex: 0,
        accidental: 'double-sharp',
        yPixel: 100,
        parenthesized,
      },
      {
        noteIndex: 1,
        accidental: 'double-sharp',
        yPixel: 110,
        parenthesized,
      },
    ]);

  it('keeps close double-sharps in one column', () => {
    const [a, b] = pair(false);
    expect(a.xOffset).toBe(b.xOffset);
  });

  it('puts close double-sharp reminders in separate columns', () => {
    const [a, b] = pair(true);
    expect(a.xOffset).not.toBe(b.xOffset);
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

describe('pitchAccidental', () => {
  it('puts the arrow on the written accidental, or on a natural', () => {
    expect(pitchAccidental('G#', 'up')).toBe('sharp-up');
    expect(pitchAccidental('G', 'up')).toBe('natural-up');
    expect(pitchAccidental('Bb', 'down')).toBe('flat-down');
    expect(pitchAccidental('F##', 'down')).toBe('double-sharp-down');
    expect(pitchAccidental('Bbb', 'up')).toBe('double-flat-up');
    expect(pitchAccidental('G#')).toBe('sharp');
    expect(pitchAccidental('G', null)).toBeNull();
  });

  it('comes apart into the base accidental, the arrow and the suffix', () => {
    expect(baseAccidental('double-sharp-down')).toBe('double-sharp');
    expect(baseAccidental('natural')).toBe('natural');
    expect(quarterToneOf('flat-up')).toBe('up');
    expect(quarterToneOf('flat-down')).toBe('down');
    expect(quarterToneOf('flat')).toBeNull();
    expect(accidentalSuffix('double-flat-up')).toBe('bb');
    expect(accidentalSuffix('natural-up')).toBe('');
    expect(accidentalSuffix(null)).toBe('');
  });
});

describe('computeNoteAccidentals — quarter-tones', () => {
  type Pitch = [Note, QuarterTone?];
  const build = ([note, quarterTone]: Pitch) => {
    const element = makeNote({ note, octave: 4, duration: 'quarter' });
    element.quarterTone = quarterTone ?? null;
    return element;
  };
  const shown = (pitches: Pitch[], keySig: Note = 'C') => {
    const elements = pitches.map(build);
    const { noteShowAccidentals } = computeNoteAccidentals(
      elements,
      keySig,
      'major'
    );
    return elements.map((element) => noteShowAccidentals.get(element));
  };

  it('cancels a quarter-tone with an ordinary accidental', () => {
    expect(shown([['D'], ['D', 'up'], ['D']])).toEqual([
      null,
      'natural-up',
      'natural',
    ]);
    expect(shown([['B', 'down'], ['B'], ['B', 'up'], ['B']])).toEqual([
      'natural-down',
      'natural',
      'natural-up',
      'natural',
    ]);
  });

  it('keeps a quarter-tone in force for the rest of the bar', () => {
    expect(
      shown([
        ['B', 'down'],
        ['B', 'down'],
        ['B', 'up'],
        ['B', 'up'],
      ])
    ).toEqual(['natural-down', null, 'natural-up', null]);
  });

  it('confirms or cancels an accidental before it', () => {
    expect(shown([['C#'], ['C#', 'down']])).toEqual(['sharp', 'sharp-down']);
    expect(shown([['C#'], ['C', 'down']])).toEqual(['sharp', 'natural-down']);
  });

  it('applies to the spelling, not to the key signature', () => {
    expect(shown([['F#'], ['F#', 'up'], ['F#'], ['F', 'up']], 'D')).toEqual([
      null,
      'sharp-up',
      'sharp',
      'natural-up',
    ]);
  });

  it('resolves each chord tone with its own quarter-tone', () => {
    const chord = makeChord({
      notes: [
        { note: 'C', octave: 4 },
        { note: 'G#', octave: 4 },
      ],
    });
    chord.querySelectorAll('music-note')[1].setAttribute('quarter-tone', 'up');
    const { chordNoteAccidentals } = computeNoteAccidentals(
      [chord],
      'C',
      'major'
    );
    expect(chordNoteAccidentals.get(chord)).toEqual([null, 'sharp-up']);
  });

  it('resolves grace and finishing notes slot by slot', () => {
    const host = build(['A']);
    host.grace = ['F#', 'G', 'G'];
    host.graceQuarterTone = ['up', null, 'down'];
    host.trillFinish = ['G', 'A'];
    host.trillFinishQuarterTone = 'down';
    const { graceShowAccidentals, trillFinishShowAccidentals } =
      computeNoteAccidentals([host], 'C', 'major');
    expect(graceShowAccidentals.get(host)).toEqual([
      'sharp-up',
      null,
      'natural-down',
    ]);
    // The grace notes' G quarter-tone flat still holds.
    expect(trillFinishShowAccidentals.get(host)).toEqual([null, null]);
  });

  it('brackets the arrowed accidental of a reminder', () => {
    const first = build(['Bb', 'up']);
    const reminder = build(['Bb', 'up']);
    reminder.setAttribute('accidental-reminder', '');
    const { noteShowAccidentals, parenthesizedAccidentals } =
      computeNoteAccidentals([first, reminder], 'C', 'major');
    expect(noteShowAccidentals.get(reminder)).toBe('flat-up');
    expect(parenthesizedAccidentals.has(reminder)).toBe(true);
  });

  it('hides it on a note tied from the same pitch', () => {
    const start = build(['D', 'up']);
    const end = build(['D', 'up']);
    end.setAttribute('tie', 'end');
    const { noteShowAccidentals } = computeNoteAccidentals(
      [start, end],
      'C',
      'major'
    );
    expect(noteShowAccidentals.get(end)).toBeNull();
  });
});

describe('accidental extents with an arrow', () => {
  it('reaches above or below the plain glyph, whose box is unchanged', () => {
    expect(accidentalSymbolWidth('flat-up')).toBe(ACCIDENTAL_SYMBOL_WIDTH.flat);
    expect(accidentalSymbolHeight('flat-up')).toBe(
      ACCIDENTAL_SYMBOL_HEIGHT.flat
    );
    const up = accidentalArrowOverhangs('flat-up');
    const down = accidentalArrowOverhangs('flat-down');
    expect(up.above).toBeGreaterThan(0);
    expect(up.below).toBe(0);
    expect(down.below).toBeGreaterThan(0);
    expect(down.above).toBe(0);
    expect(accidentalArrowOverhangs('flat')).toEqual({
      left: 0,
      right: 0,
      above: 0,
      below: 0,
    });
  });

  it('reaches further left when the head leans out of the box', () => {
    expect(accidentalReach('flat')).toBe(ACCIDENTAL_SYMBOL_WIDTH.flat);
    expect(accidentalReach('flat-up')).toBeGreaterThan(accidentalReach('flat'));
    expect(accidentalReach('sharp-up')).toBe(accidentalReach('sharp'));
  });
});

describe('computeChordAccidentalPlacements — arrows', () => {
  const columns = (upper: 'flat' | 'flat-down', lower: 'flat' | 'flat-up') => {
    const placements = computeChordAccidentalPlacements([
      { noteIndex: 0, accidental: upper, yPixel: 40 },
      { noteIndex: 1, accidental: lower, yPixel: 70 },
    ]);
    return placements.map(({ xOffset }) => xOffset);
  };

  it('separates accidentals whose arrows face each other', () => {
    const [plainUpper, plainLower] = columns('flat', 'flat');
    expect(plainUpper).toBe(plainLower);
    const [upper, lower] = columns('flat-down', 'flat-up');
    expect(upper).not.toBe(lower);
  });

  it('ignores arrows that point away from each other', () => {
    const placements = computeChordAccidentalPlacements([
      { noteIndex: 0, accidental: 'flat-up', yPixel: 40 },
      { noteIndex: 1, accidental: 'flat-down', yPixel: 70 },
    ]);
    expect(placements[0].xOffset).toBe(placements[1].xOffset);
  });

  it('counts an arrow head that leans left in the column width', () => {
    expect(totalChordAccidentalWidth(['flat-up'], [40])).toBeGreaterThan(
      totalChordAccidentalWidth(['flat'], [40])
    );
  });
});

describe('where an accidental sits on its pitch', () => {
  it("centres a flat's bowl on the pitch and the other signs themselves", () => {
    expect(accidentalPitchOffset('flat')).toBeGreaterThan(
      ACCIDENTAL_SYMBOL_HEIGHT.flat / 2
    );
    expect(accidentalPitchOffset('double-flat')).toBe(
      accidentalPitchOffset('flat')
    );
    for (const accidental of ['sharp', 'natural', 'double-sharp'] as const) {
      expect(accidentalPitchOffset(accidental)).toBe(
        ACCIDENTAL_SYMBOL_HEIGHT[accidental] / 2
      );
    }
  });

  it('reaches further above the pitch than below for a flat', () => {
    const { above, below } = accidentalVerticalExtent('flat');
    expect(above).toBeGreaterThan(below);
    expect(above + below).toBe(ACCIDENTAL_SYMBOL_HEIGHT.flat);
  });

  it("adds an arrow's overshoot to the side it points to", () => {
    const plain = accidentalVerticalExtent('flat');
    const up = accidentalVerticalExtent('flat-up');
    const down = accidentalVerticalExtent('flat-down');
    expect(up.above).toBeGreaterThan(plain.above);
    expect(up.below).toBe(plain.below);
    expect(down.below).toBeGreaterThan(plain.below);
    expect(down.above).toBe(plain.above);
  });

  it("brackets a flat reminder between the glyph's middle and its bowl's", () => {
    const center = accidentalReminderParenCenter('flat');
    expect(center).toBeGreaterThan(ACCIDENTAL_SYMBOL_HEIGHT.flat / 2);
    expect(center).toBeLessThan(accidentalPitchOffset('flat'));
    expect(accidentalReminderParenCenter('natural')).toBe(
      ACCIDENTAL_SYMBOL_HEIGHT.natural / 2
    );
  });

  it('boxes the ink around the pitch at the given scale', () => {
    expect(accidentalInkRect('sharp', 10, 50, { scale: 0.5 })).toEqual({
      left: 10,
      right: 10 + ACCIDENTAL_SYMBOL_WIDTH.sharp / 2,
      top: 50 - ACCIDENTAL_SYMBOL_HEIGHT.sharp / 4,
      bottom: 50 + ACCIDENTAL_SYMBOL_HEIGHT.sharp / 4,
    });
  });
});

describe('computeChordAccidentalPlacements — flats', () => {
  type Plain = 'flat' | 'natural' | 'sharp';
  const sharesColumn = (upper: Plain, lower: Plain, distancePx: number) => {
    const [a, b] = computeChordAccidentalPlacements([
      { noteIndex: 0, accidental: upper, yPixel: 40 },
      { noteIndex: 1, accidental: lower, yPixel: 40 + distancePx },
    ]);
    return a.xOffset === b.xOffset;
  };
  const FIFTH = 20;
  const SIXTH = 25;
  const SEVENTH = 30;

  it('aligns a flat with a sharp or natural a sixth below it', () => {
    expect(sharesColumn('flat', 'sharp', SIXTH)).toBe(true);
    expect(sharesColumn('flat', 'natural', SIXTH)).toBe(true);
    expect(sharesColumn('flat', 'sharp', FIFTH)).toBe(false);
    expect(sharesColumn('flat', 'natural', FIFTH)).toBe(false);
  });

  it('aligns two flats, or a natural above a flat, from a seventh', () => {
    expect(sharesColumn('flat', 'flat', SIXTH)).toBe(false);
    expect(sharesColumn('flat', 'flat', SEVENTH)).toBe(true);
    expect(sharesColumn('natural', 'flat', SIXTH)).toBe(false);
    expect(sharesColumn('natural', 'flat', SEVENTH)).toBe(true);
  });

  it('separates a sharp from the flat whose stem would meet it a seventh below', () => {
    expect(sharesColumn('sharp', 'flat', SEVENTH)).toBe(false);
  });
});

describe('computeNoteAccidentals — bend targets', () => {
  const bending = (note: Note, bendTo: Note, quarterTone?: QuarterTone) => {
    const element = makeNote({ note });
    element.setAttribute('bend-to', bendTo);
    if (quarterTone) {
      element.setAttribute('bend-to-quarter-tone', quarterTone);
    }
    return element;
  };

  it("draws a target's own accidental, and a natural against one in force", () => {
    const plain = bending('B', 'C');
    const arrowed = bending('B', 'C', 'up');
    const inKey = bending('E', 'F');
    const afterFlat = bending('A', 'B');
    const { bendTargetAccidentals } = computeNoteAccidentals(
      [plain, arrowed, inKey, makeNote({ note: 'Bb' }), afterFlat],
      'G',
      'major'
    );
    expect(bendTargetAccidentals.get(plain)).toBeNull();
    expect(bendTargetAccidentals.get(arrowed)).toBe('natural-up');
    expect(bendTargetAccidentals.get(inKey)).toBe('natural');
    expect(bendTargetAccidentals.get(afterFlat)).toBe('natural');
  });

  it('resolves the target of each tone of a chord', () => {
    const chord = makeChord({
      notes: [
        { note: 'C', octave: 4 },
        { note: 'E', octave: 4 },
      ],
    });
    chord.querySelectorAll('music-note')[1].setAttribute('bend-to', 'F');
    document.body.appendChild(chord);
    const { chordBendTargetAccidentals } = computeNoteAccidentals(
      [chord],
      'G',
      'major'
    );
    expect(chordBendTargetAccidentals.get(chord)).toEqual([null, 'natural']);
  });

  it('never changes the rest of the bar', () => {
    const after = makeNote({ note: 'C' });
    const { noteShowAccidentals } = computeNoteAccidentals(
      [bending('B', 'C#'), after],
      'C',
      'major'
    );
    expect(noteShowAccidentals.get(after)).toBeNull();
  });
});

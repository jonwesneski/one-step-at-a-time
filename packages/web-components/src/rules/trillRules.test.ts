/**
 * @jest-environment jsdom
 */
import '../chord/index';
import '../note/index';
import '../rest/index';
import type {
  ChordElementType,
  NoteChordOrRestElementType,
  NoteElementType,
  RestElementType,
} from '../types/elements';
import { MUSIC_CHORD, MUSIC_NOTE, MUSIC_REST } from '../utils/consts';
import {
  resolveTrillContinuationSegments,
  resolveTrillPitch,
  resolveTrillSpans,
  type TrillMeasureBoundary,
} from './trillRules';

const note = (over: Partial<NoteElementType> = {}): NoteElementType => {
  const el = document.createElement(MUSIC_NOTE) as NoteElementType;
  Object.assign(el, over);
  return el;
};

const chord = (over: Partial<ChordElementType> = {}): ChordElementType => {
  const el = document.createElement(MUSIC_CHORD) as ChordElementType;
  Object.assign(el, over);
  return el;
};

const rest = (): RestElementType =>
  document.createElement(MUSIC_REST) as RestElementType;

describe('resolveTrillSpans', () => {
  it('returns nothing when no element is trill-marked', () => {
    const elements: NoteChordOrRestElementType[] = [note(), note(), rest()];
    expect(resolveTrillSpans(elements)).toEqual([]);
  });

  it('an untied single note-value trill draws a line by default (matches standard practice)', () => {
    const elements = [note({ trill: true }), note()];
    const [span] = resolveTrillSpans(elements);
    expect(span).toMatchObject({
      startIndex: 0,
      lastTiedIndex: 0,
      hasLine: true,
      stopped: false,
      endBeforeIndex: 1,
    });
  });

  it('`trill-line="none"` suppresses the line, even on a tied chain', () => {
    const elements = [
      note({ trill: true, tie: 'start', trillLine: 'none' }),
      note({ tie: 'end' }),
    ];
    const [span] = resolveTrillSpans(elements);
    expect(span.hasLine).toBe(false);
  });

  it('extends through a tie chain to the last tied element', () => {
    const elements = [
      note({ trill: true, tie: 'start' }),
      note({ tie: 'end' }),
      note(),
    ];
    const [span] = resolveTrillSpans(elements);
    expect(span).toMatchObject({
      startIndex: 0,
      lastTiedIndex: 1,
      hasLine: true,
      stopped: false,
      endBeforeIndex: 2,
    });
  });

  it('extends through a multi-note tie chain', () => {
    const elements = [
      note({ trill: true, tie: 'start' }),
      note({ tie: 'start' }),
      note({ tie: 'end' }),
      note(),
    ];
    const [span] = resolveTrillSpans(elements);
    expect(span.lastTiedIndex).toBe(2);
    expect(span.endBeforeIndex).toBe(3);
  });

  it('runs to the measure end when the tie chain reaches the last element', () => {
    const elements = [
      note({ trill: true, tie: 'start' }),
      note({ tie: 'end' }),
    ];
    const [span] = resolveTrillSpans(elements);
    expect(span.lastTiedIndex).toBe(1);
    expect(span.endBeforeIndex).toBeNull();
  });

  it('a rest breaks the tie chain', () => {
    const elements = [note({ trill: true, tie: 'start' }), rest(), note()];
    const [span] = resolveTrillSpans(elements);
    expect(span.lastTiedIndex).toBe(0);
    expect(span.endBeforeIndex).toBe(1);
  });

  it('an explicit trill-stop cuts the span short, even mid-chain', () => {
    const elements = [
      note({ trill: true, tie: 'start' }),
      note({ tie: 'start', trillStop: true }),
      note({ tie: 'end' }),
      note(),
    ];
    const [span] = resolveTrillSpans(elements);
    expect(span).toMatchObject({
      lastTiedIndex: 1,
      hasLine: true,
      stopped: true,
      endBeforeIndex: 2,
    });
  });

  it('trill-stop on the starting element itself still draws a line (for the notch)', () => {
    const elements = [note({ trill: true, trillStop: true }), note()];
    const [span] = resolveTrillSpans(elements);
    expect(span).toMatchObject({
      lastTiedIndex: 0,
      hasLine: true,
      stopped: true,
    });
  });

  it('resolves independent re-articulated (discontinuous) trills as separate spans', () => {
    const elements = [
      note({ trill: true }),
      note({ trill: true }),
      note({ trill: true }),
    ];
    const spans = resolveTrillSpans(elements);
    expect(spans).toHaveLength(3);
    expect(spans.map((s) => s.startIndex)).toEqual([0, 1, 2]);
    // Each re-articulated trill still draws its own short line by default.
    expect(spans.every((s) => s.hasLine)).toBe(true);
  });

  it('works on a <music-chord> the same way as a <music-note>', () => {
    const elements = [
      chord({ trill: true, tie: 'start' }),
      chord({ tie: 'end' }),
    ];
    const [span] = resolveTrillSpans(elements);
    expect(span.lastTiedIndex).toBe(1);
    expect(span.hasLine).toBe(true);
  });

  describe('writtenNoteAnchorIndex', () => {
    it('anchors at the trill-start note itself when untied', () => {
      const elements = [note({ trill: true, duration: 'quarter' }), note()];
      const [span] = resolveTrillSpans(elements);
      expect(span.writtenNoteAnchorIndex).toBe(0);
    });

    it('anchors at the trill-start note when its duration is not short, even when tied', () => {
      const elements = [
        note({ trill: true, duration: 'quarter', tie: 'start' }),
        note({ duration: 'quarter', tie: 'end' }),
      ];
      const [span] = resolveTrillSpans(elements);
      expect(span.writtenNoteAnchorIndex).toBe(0);
    });

    it('defers to the second tied note when the start note is a short value', () => {
      const elements = [
        note({ trill: true, duration: 'eighth', tie: 'start' }),
        note({ duration: 'eighth', tie: 'end' }),
      ];
      const [span] = resolveTrillSpans(elements);
      expect(span.writtenNoteAnchorIndex).toBe(1);
    });

    it('anchors at the trill-start note when short but untied (no second note to defer to)', () => {
      const elements = [
        note({ trill: true, duration: 'eighth' }),
        note({ duration: 'eighth' }),
      ];
      const [span] = resolveTrillSpans(elements);
      expect(span.writtenNoteAnchorIndex).toBe(0);
    });
  });
});

describe('resolveTrillContinuationSegments', () => {
  const boundariesFor = (...counts: number[]): TrillMeasureBoundary[] => {
    const boundaries: TrillMeasureBoundary[] = [];
    let start = 0;
    for (const count of counts) {
      boundaries.push({ startIndex: start, endIndex: start + count });
      start += count;
    }
    return boundaries;
  };

  it('returns nothing for a span that never leaves its starting measure', () => {
    const elements = [
      note({ trill: true, tie: 'start' }),
      note({ tie: 'end' }),
      note(),
    ];
    const boundaries = boundariesFor(3);
    const [span] = resolveTrillSpans(elements);
    expect(
      resolveTrillContinuationSegments(elements, boundaries, span)
    ).toEqual([]);
  });

  it('adds one segment when the tie chain carries the span into the very next measure and stops there', () => {
    const elements = [
      note({ trill: true, tie: 'start' }), // measure 0, index 0
      note({ tie: 'end' }), // measure 1, index 1 (global) — last tied note
      note(), // measure 1, index 2 — the span stops short of this one
    ];
    const boundaries = boundariesFor(1, 2);
    const [span] = resolveTrillSpans(elements);
    expect(span).toMatchObject({ startIndex: 0, lastTiedIndex: 1 });
    expect(
      resolveTrillContinuationSegments(elements, boundaries, span)
    ).toEqual([
      { measureIndex: 1, endBeforeLocalIndex: 1, stopAtLocalIndex: null },
    ]);
  });

  it('runs to the measure edge for every fully-crossed measure, drawing the stop only in the measure it actually happens in', () => {
    const elements = [
      note({ trill: true, tie: 'start' }), // measure 0
      note({ tie: 'start' }), // measure 1
      note({ tie: 'start', trillStop: true }), // measure 2 — stops here
      note(), // measure 2
    ];
    const boundaries = boundariesFor(1, 1, 2);
    const [span] = resolveTrillSpans(elements);
    expect(span.stopped).toBe(true);
    expect(span.lastTiedIndex).toBe(2);
    expect(
      resolveTrillContinuationSegments(elements, boundaries, span)
    ).toEqual([
      { measureIndex: 1, endBeforeLocalIndex: null, stopAtLocalIndex: null },
      { measureIndex: 2, endBeforeLocalIndex: null, stopAtLocalIndex: 0 },
    ]);
  });

  it("runs to the last measure's own right edge when the tie chain continues all the way to the end of the track", () => {
    const elements = [
      note({ trill: true, tie: 'start' }), // measure 0
      note({ tie: 'start' }), // measure 1 — no further note, so the chain simply runs out
    ];
    const boundaries = boundariesFor(1, 1);
    const [span] = resolveTrillSpans(elements);
    expect(span.endBeforeIndex).toBeNull();
    expect(
      resolveTrillContinuationSegments(elements, boundaries, span)
    ).toEqual([
      { measureIndex: 1, endBeforeLocalIndex: null, stopAtLocalIndex: null },
    ]);
  });

  it('supports chords the same as notes', () => {
    const elements = [
      chord({ trill: true, tie: 'start' }),
      chord({ tie: 'end' }),
    ];
    const boundaries = boundariesFor(1, 1);
    const [span] = resolveTrillSpans(elements);
    expect(
      resolveTrillContinuationSegments(elements, boundaries, span)
    ).toEqual([
      { measureIndex: 1, endBeforeLocalIndex: null, stopAtLocalIndex: null },
    ]);
  });
});

describe('resolveTrillPitch', () => {
  it('defaults to the diatonic upper neighbor, unaltered in C major', () => {
    expect(resolveTrillPitch('C', 4, 'C', 'major', null)).toEqual({
      letter: 'D',
      accidental: null,
      written: false,
      octave: null,
    });
  });

  it('applies a sharp implied by the key signature (classic G-major E-trill example)', () => {
    // In G major (F# in the signature), a trill on E implies an F# upper
    // neighbor, not F natural.
    expect(resolveTrillPitch('E', 4, 'G', 'major', null)).toEqual({
      letter: 'F',
      accidental: 'sharp',
      written: false,
      octave: null,
    });
  });

  it('applies a flat implied by the key signature', () => {
    // F major (Bb in the signature): upper neighbor of A is Bb, not B natural.
    expect(resolveTrillPitch('A', 4, 'F', 'major', null)).toEqual({
      letter: 'B',
      accidental: 'flat',
      written: false,
      octave: null,
    });
  });

  it('wraps the letter from B to C', () => {
    // D major (F#, C#): upper neighbor of B is C#.
    expect(resolveTrillPitch('B', 4, 'D', 'major', null)).toEqual({
      letter: 'C',
      accidental: 'sharp',
      written: false,
      octave: null,
    });
  });

  it('resolves a minor key via its relative major', () => {
    // A minor shares C major's (empty) signature.
    expect(resolveTrillPitch('G', 4, 'A', 'minor', null)).toEqual({
      letter: 'A',
      accidental: null,
      written: false,
      octave: null,
    });
  });

  it('an explicit accidental override replaces only the accidental, never the letter', () => {
    // Overriding to natural cancels the G-major F# that would otherwise apply.
    expect(resolveTrillPitch('E', 4, 'G', 'major', 'natural')).toEqual({
      letter: 'F',
      accidental: 'natural',
      written: false,
      octave: null,
    });
  });

  it('ignores the written note’s own accidental suffix — only the letter matters', () => {
    expect(resolveTrillPitch('F#', 4, 'C', 'major', null)).toEqual({
      letter: 'G',
      accidental: null,
      written: false,
      octave: null,
    });
  });

  describe('trill-note (written override)', () => {
    it('takes precedence over the diatonic default and an accidental override', () => {
      expect(resolveTrillPitch('E', 4, 'G', 'major', 'natural', 'G#')).toEqual({
        letter: 'G',
        accidental: 'sharp',
        written: true,
        octave: 4,
      });
    });

    it('expresses a same-letter (chromatic) trilling note at the same octave', () => {
      // A trill between F and F# — same letter, only the accidental differs —
      // can only be expressed as a written note, never the accidental-only form.
      expect(resolveTrillPitch('F', 4, 'C', 'major', null, 'F#')).toEqual({
        letter: 'F',
        accidental: 'sharp',
        written: true,
        octave: 4,
      });
    });

    it('bumps the octave when the named letter would otherwise sit below the main note', () => {
      // Main note B4; trill note C — C4 would be below B4, so it resolves to C5.
      expect(resolveTrillPitch('B', 4, 'C', 'major', null, 'C')).toEqual({
        letter: 'C',
        accidental: null,
        written: true,
        octave: 5,
      });
    });

    it('keeps the same octave when the named letter is already above the main note', () => {
      expect(resolveTrillPitch('C', 4, 'C', 'major', null, 'G')).toEqual({
        letter: 'G',
        accidental: null,
        written: true,
        octave: 4,
      });
    });

    it('resolves a plain (unaltered) trill-note letter with a null accidental', () => {
      expect(resolveTrillPitch('C', 4, 'C', 'major', null, 'D')).toEqual({
        letter: 'D',
        accidental: null,
        written: true,
        octave: 4,
      });
    });
  });
});

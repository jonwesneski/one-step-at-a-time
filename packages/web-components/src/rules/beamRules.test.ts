/**
 * @jest-environment jsdom
 */
import '../chord/index';
import '../note/index';
import type {
  ChordElementType,
  NoteChordOrRestElementType,
  NoteElementType,
} from '../types/elements';
import type { DurationType } from '../types/theory';
import { MUSIC_CHORD, MUSIC_NOTE } from '../utils/consts';
import {
  BASE_STEM_LENGTH_PX,
  MIDDLE_STAFF_Y,
  STAFF_LINE_SPACING,
  STEM_OVERLAP_PX,
} from '../utils/notationDimensions';
import { buildBeamsRenderer } from './beamRules';

afterEach(() => {
  document.body.innerHTML = '';
});

// Below the middle line, so the pitch-driven default for these notes is
// stem up.
const LOW_STAFF_Y = 90;

function makeNote(duration: DurationType): NoteElementType {
  const note = document.createElement(MUSIC_NOTE) as NoteElementType;
  note.setAttribute('duration', duration);
  note.setAttribute('note', 'C');
  note.setAttribute('octave', '4');
  document.body.appendChild(note);
  return note;
}

function stemDirectionsFor(
  notes: NoteElementType[],
  overrides: ReadonlyMap<NoteChordOrRestElementType, boolean>
): boolean[] {
  return buildBeamsRenderer(
    notes,
    [4, 4],
    new Map(notes.map((note) => [note, LOW_STAFF_Y])),
    new Map(),
    new Map(),
    new Set(),
    undefined,
    undefined,
    undefined,
    overrides
  ).stemDirections;
}

describe('buildBeamsRenderer stem overrides', () => {
  it('applies a direction forced on one beamed note to its whole beam', () => {
    const notes = [makeNote('eighth'), makeNote('eighth')];

    expect(stemDirectionsFor(notes, new Map([[notes[0], false]]))).toEqual([
      false,
      false,
    ]);
  });

  it('warns on conflicting forced directions within one beam and uses the first', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleSpy.mockClear();
    const notes = [makeNote('eighth'), makeNote('eighth')];

    const directions = stemDirectionsFor(
      notes,
      new Map([
        [notes[0], false],
        [notes[1], true],
      ])
    );

    expect(directions).toEqual([false, false]);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('conflicting stem directions')
    );
    consoleSpy.mockRestore();
  });

  it('keeps a forced direction on an unbeamed note to that note', () => {
    const notes = [makeNote('quarter'), makeNote('quarter')];

    expect(stemDirectionsFor(notes, new Map([[notes[0], false]]))).toEqual([
      false,
      true,
    ]);
  });
});

describe('buildBeamsRenderer beamed chords', () => {
  it('fits the beam to the head nearest it, so a chord keeps its spread on top of that stem', () => {
    const chords = [0, 1].map(() => {
      const chord = document.createElement(MUSIC_CHORD) as ChordElementType;
      chord.setAttribute('duration', 'eighth');
      document.body.appendChild(chord);
      return chord;
    });
    const topStaffY = 30;
    // A line: the beam straddles the line 3¼ spaces below rather than
    // leaving its second-beam position in a space.
    const bottomStaffY = 40;

    const { beamRenderer } = buildBeamsRenderer(
      chords,
      [4, 4],
      new Map(),
      new Map(chords.map((chord) => [chord, [bottomStaffY, topStaffY]])),
      new Map(),
      new Set(),
      undefined,
      [false, false]
    );

    for (const index of [0, 1]) {
      expect(beamRenderer.stemExtension(index)).toBeCloseTo(
        bottomStaffY - topStaffY - STAFF_LINE_SPACING / 4 - STEM_OVERLAP_PX
      );
    }
  });
});

describe('buildBeamsRenderer stem lengths', () => {
  const beamedNotes = (
    duration: DurationType,
    staffY: number,
    stemUp: boolean
  ) => {
    const notes = [0, 1].map(() => {
      const note = document.createElement(MUSIC_NOTE) as NoteElementType;
      note.setAttribute('duration', duration);
      document.body.appendChild(note);
      return note;
    });
    return buildBeamsRenderer(
      notes,
      [4, 4],
      new Map(notes.map((note) => [note, staffY])),
      new Map(),
      new Map(),
      new Set(),
      undefined,
      [stemUp, stemUp]
    ).beamRenderer;
  };
  const stemLength = (duration: DurationType, staffY: number, stemUp = true) =>
    BASE_STEM_LENGTH_PX +
    beamedNotes(duration, staffY, stemUp).stemExtension(0) +
    STEM_OVERLAP_PX;

  it('reaches the middle line from ledger-line notes', () => {
    expect(beamedNotes('eighth', 95, true).stemExtension(0)).toBeCloseTo(
      95 - MIDDLE_STAFF_Y - BASE_STEM_LENGTH_PX - STEM_OVERLAP_PX
    );
  });

  it('keeps 3½ spaces from a head in a space', () => {
    expect(stemLength('eighth', 65)).toBeCloseTo(BASE_STEM_LENGTH_PX);
    expect(stemLength('sixteenth', 65)).toBeCloseTo(BASE_STEM_LENGTH_PX);
  });

  it('shortens to 3¼ spaces from a head on a line', () => {
    expect(stemLength('eighth', 60)).toBeCloseTo(3.25 * STAFF_LINE_SPACING);
    expect(stemLength('sixteenth', 60)).toBeCloseTo(3.25 * STAFF_LINE_SPACING);
    expect(stemLength('eighth', 40, false)).toBeCloseTo(
      3.25 * STAFF_LINE_SPACING
    );
  });

  it('keeps 3½ spaces when the beams lie outside the stave', () => {
    expect(stemLength('eighth', 30)).toBeCloseTo(BASE_STEM_LENGTH_PX);
    expect(stemLength('sixteenth', 50)).toBeCloseTo(BASE_STEM_LENGTH_PX);
  });

  it('moves a three-beam stack out to the next line it can hang from', () => {
    expect(stemLength('thirtysecond', 75)).toBeCloseTo(
      4.5 * STAFF_LINE_SPACING
    );
  });
});

describe('buildBeamsRenderer kneed beams', () => {
  const directionsFor = (
    staffYs: number[],
    clefChangeBeatOffsets: number[] = []
  ) => {
    const notes = staffYs.map(() => makeNote('eighth'));
    return buildBeamsRenderer(
      notes,
      [4, 4],
      new Map(notes.map((note, i) => [note, staffYs[i]])),
      new Map(),
      new Map(),
      new Set(),
      undefined,
      undefined,
      undefined,
      undefined,
      clefChangeBeatOffsets
    ).stemDirections;
  };

  it('splits a wide-interval group into stems both ways', () => {
    // E4 and A5: one direction would need an 8-space stem.
    expect(directionsFor([70, 20])).toEqual([true, false]);
  });

  it('keeps one direction when a clef change falls inside the group', () => {
    expect(directionsFor([70, 20], [1 / 8])).toEqual([false, false]);
  });

  it('still knees when the clef change falls outside the group', () => {
    expect(directionsFor([70, 20], [1 / 4])).toEqual([true, false]);
  });

  it('keeps one direction when the interval leaves no room for a beam between', () => {
    expect(directionsFor([60, 20])).toEqual([false, false]);
  });

  it('keeps one direction when a member is forced', () => {
    const notes = [makeNote('eighth'), makeNote('eighth')];
    const { stemDirections } = buildBeamsRenderer(
      notes,
      [4, 4],
      new Map([
        [notes[0], 70],
        [notes[1], 20],
      ]),
      new Map(),
      new Map(),
      new Set(),
      undefined,
      undefined,
      undefined,
      new Map([[notes[1], false]])
    );
    expect(stemDirections).toEqual([false, false]);
  });
});

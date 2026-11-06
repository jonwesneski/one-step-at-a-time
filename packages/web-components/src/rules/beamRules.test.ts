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
  BEAM_GAP_PX,
  BEAM_THICKNESS_PX,
  MIDDLE_STAFF_Y,
  MIN_STEM_LENGTH_PX,
  OUTWARD_STEM_LENGTH_AT_MIDDLE_PX,
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
  it('fits the beam to a full stem beyond the notehead nearest it, so a chord keeps its whole stem length', () => {
    const chords = [0, 1].map(() => {
      const chord = document.createElement(MUSIC_CHORD) as ChordElementType;
      chord.setAttribute('duration', 'eighth');
      document.body.appendChild(chord);
      return chord;
    });
    const topStaffY = 30;
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
        bottomStaffY - topStaffY - STEM_OVERLAP_PX
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

  it('reaches the middle line from ledger-line notes', () => {
    expect(beamedNotes('eighth', 95, true).stemExtension(0)).toBeCloseTo(
      95 - MIDDLE_STAFF_Y - BASE_STEM_LENGTH_PX - STEM_OVERLAP_PX
    );
  });

  it('never shortens a one-beam stem below the minimum', () => {
    expect(
      BASE_STEM_LENGTH_PX + beamedNotes('eighth', 30, true).stemExtension(0)
    ).toBeCloseTo(MIN_STEM_LENGTH_PX);
  });

  it('lengthens a minimum-length stem for its second beam', () => {
    expect(
      BASE_STEM_LENGTH_PX + beamedNotes('sixteenth', 30, true).stemExtension(0)
    ).toBeCloseTo(MIN_STEM_LENGTH_PX + BEAM_THICKNESS_PX + BEAM_GAP_PX);
  });

  it('shortens an outward beamed stem partway', () => {
    expect(beamedNotes('eighth', 50, true).stemExtension(0)).toBeCloseTo(
      OUTWARD_STEM_LENGTH_AT_MIDDLE_PX - BASE_STEM_LENGTH_PX - STEM_OVERLAP_PX
    );
  });
});

import {
  calculateGuitarTabBusynessScore,
  calculateStaffBusynessScore,
  calculateStaffVocalBusynessScore,
  LYRIC_CHAR_SATURATION,
  scoreToFlexGrow,
} from './busynessScore';
import {
  GuitarNoteElementType,
  NoteOrChordElementType,
} from '../types/elements';
import { MIN_FLEX_GROW, SCORED_MIN_FLEX_GROW } from './notationDimensions';
import { DurationType, LetterOctave } from '../types/theory';

function makeNote(
  duration: DurationType,
  value: LetterOctave = 'C4'
): NoteOrChordElementType {
  return {
    nodeName: 'MUSIC-NOTE',
    duration,
    value,
  } as unknown as NoteOrChordElementType;
}

function makeChord(
  duration: DurationType,
  noteValues: LetterOctave[]
): NoteOrChordElementType {
  return {
    nodeName: 'MUSIC-CHORD',
    duration,
    notes: noteValues.map((v) => ({ value: v, duration })),
  } as unknown as NoteOrChordElementType;
}

function makeGuitarNote(duration: DurationType): GuitarNoteElementType {
  return {
    duration,
    string: 1,
    fret: 0,
  } as unknown as GuitarNoteElementType;
}

describe('calculateStaffBusynessScore', () => {
  it('returns 1 for empty elements', () => {
    expect(calculateStaffBusynessScore([])).toBe(1);
  });

  it('returns 1 for a single whole note', () => {
    expect(calculateStaffBusynessScore([makeNote('whole')])).toBe(1);
  });

  it('returns higher score for sixteenth notes than quarter notes', () => {
    const sixteenthScore = calculateStaffBusynessScore([makeNote('sixteenth')]);
    const quarterScore = calculateStaffBusynessScore([makeNote('quarter')]);
    expect(sixteenthScore).toBeGreaterThan(quarterScore);
  });

  it('sixteenth note scores at least 2', () => {
    expect(
      calculateStaffBusynessScore([makeNote('sixteenth')])
    ).toBeGreaterThanOrEqual(2);
  });

  it('32nd note scores higher than sixteenth note', () => {
    const score32nd = calculateStaffBusynessScore([makeNote('thirtysecond')]);
    const score16th = calculateStaffBusynessScore([makeNote('sixteenth')]);
    expect(score32nd).toBeGreaterThanOrEqual(score16th);
  });

  it('chord with many notes increases score', () => {
    const singleNoteScore = calculateStaffBusynessScore([makeNote('quarter')]);
    const bigChordScore = calculateStaffBusynessScore([
      makeChord('quarter', ['C4', 'E4', 'G4', 'B4', 'D5']),
    ]);
    expect(bigChordScore).toBeGreaterThan(singleNoteScore);
  });

  it('score is clamped between 1 and 5', () => {
    const score = calculateStaffBusynessScore([
      makeNote('hundredtwentyeighth'),
    ]);
    expect(score).toBeGreaterThanOrEqual(1);
    expect(score).toBeLessThanOrEqual(5);
  });
});

describe('calculateStaffVocalBusynessScore', () => {
  it('returns 1 for empty elements', () => {
    expect(calculateStaffVocalBusynessScore([], 0)).toBe(1);
  });

  it('returns higher score than classical when lyrics are present', () => {
    const classicalScore = calculateStaffBusynessScore([makeNote('quarter')]);
    const vocalScore = calculateStaffVocalBusynessScore(
      [makeNote('quarter')],
      LYRIC_CHAR_SATURATION
    );
    expect(vocalScore).toBeGreaterThan(classicalScore);
  });

  it('lyric saturation with fast notes and large chord pushes score to 5', () => {
    expect(
      calculateStaffVocalBusynessScore(
        [makeChord('hundredtwentyeighth', ['C4', 'E4', 'G4', 'B4', 'D5'])],
        LYRIC_CHAR_SATURATION
      )
    ).toBe(5);
  });

  it('score is clamped between 1 and 5', () => {
    const score = calculateStaffVocalBusynessScore(
      [makeNote('hundredtwentyeighth')],
      LYRIC_CHAR_SATURATION * 2
    );
    expect(score).toBeGreaterThanOrEqual(1);
    expect(score).toBeLessThanOrEqual(5);
  });
});

describe('calculateGuitarTabBusynessScore', () => {
  it('returns 1 for empty elements', () => {
    expect(calculateGuitarTabBusynessScore([])).toBe(1);
  });

  it('returns 1 for whole note', () => {
    expect(calculateGuitarTabBusynessScore([makeGuitarNote('whole')])).toBe(1);
  });

  it('returns higher score for sixteenth than quarter', () => {
    const sixteenthScore = calculateGuitarTabBusynessScore([
      makeGuitarNote('sixteenth'),
    ]);
    const quarterScore = calculateGuitarTabBusynessScore([
      makeGuitarNote('quarter'),
    ]);
    expect(sixteenthScore).toBeGreaterThan(quarterScore);
  });

  it('score is clamped between 1 and 5', () => {
    const score = calculateGuitarTabBusynessScore([
      makeGuitarNote('hundredtwentyeighth'),
    ]);
    expect(score).toBeGreaterThanOrEqual(1);
    expect(score).toBeLessThanOrEqual(5);
  });
});

describe('scoreToFlexGrow', () => {
  it('score 1 returns SCORED_MIN_FLEX_GROW', () => {
    expect(scoreToFlexGrow(1)).toBeCloseTo(SCORED_MIN_FLEX_GROW);
  });

  it('score 5 returns 1.0', () => {
    expect(scoreToFlexGrow(5)).toBeCloseTo(1.0);
  });

  it('score 3 is between MIN_FLEX_GROW and 1.0', () => {
    const value = scoreToFlexGrow(3);
    expect(value).toBeGreaterThan(MIN_FLEX_GROW);
    expect(value).toBeLessThan(1.0);
  });

  it('flex-grow increases monotonically with score', () => {
    const values = [1, 2, 3, 4, 5].map(scoreToFlexGrow);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });
});

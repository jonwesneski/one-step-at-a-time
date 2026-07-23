import {
  KeySignatureYCoordinates,
  NoteLetterOctave,
  YCoordinates,
} from '../types/elements';
import { ClefType, Note, Octave } from '../types/theory';
import {
  createBassClefSvg,
  createTrebleClefSvg,
} from '../utils/svgCreator/clefs';
import {
  generateKeySignatureYCoordinates,
  generateMinorKeySignatureYCoordinates,
  generateYCoordinates,
} from './theoryHelpers';

export type ClefDefinition = {
  highestNote: NoteLetterOctave;
  lowestNote: NoteLetterOctave;
  octaves: Octave[];
  sharpAccidentalNotes: NoteLetterOctave[];
  flatAccidentalNotes: NoteLetterOctave[];
  clefSvgFactory: () => string;
};

// Circle-of-fifths key counts, shared across every clef — only the Y
// coordinates the accidentals land on differ per clef.
const MAJOR_SHARP_KEY_COUNTS: Partial<{ [key in Note]: number }> = {
  G: 1,
  D: 2,
  A: 3,
  E: 4,
  B: 5,
  'F#': 6,
  'C#': 7,
};
const MAJOR_FLAT_KEY_COUNTS: Partial<{ [key in Note]: number }> = {
  F: 1,
  Bb: 2,
  Eb: 3,
  Ab: 4,
  Db: 5,
  Gb: 6,
  Cb: 7,
};

export const CLEF_DEFINITIONS: Record<ClefType, ClefDefinition> = {
  treble: {
    highestNote: 'C6',
    lowestNote: 'C4',
    octaves: [4, 5, 6],
    sharpAccidentalNotes: ['F5', 'C5', 'G5', 'D5', 'A4', 'E5', 'B4'],
    flatAccidentalNotes: ['B4', 'E5', 'A4', 'D5', 'G4', 'C5', 'F4'],
    clefSvgFactory: createTrebleClefSvg,
  },
  bass: {
    highestNote: 'E4',
    lowestNote: 'E2',
    octaves: [2, 3, 4],
    sharpAccidentalNotes: ['F3', 'C3', 'G3', 'D3', 'A2', 'E3', 'B2'],
    flatAccidentalNotes: ['B2', 'E3', 'A2', 'D3', 'G2', 'C3', 'F2'],
    clefSvgFactory: createBassClefSvg,
  },
};

export type ClefRenderData = {
  yCoordinates: YCoordinates;
  octaves: Octave[];
  majorSharpYCoordinates: KeySignatureYCoordinates;
  minorSharpYCoordinates: KeySignatureYCoordinates;
  majorFlatYCoordinates: KeySignatureYCoordinates;
  minorFlatYCoordinates: KeySignatureYCoordinates;
  clefSvg: string;
};

const renderDataCache = new Map<ClefType, ClefRenderData>();

export function getClefRenderData(clef: ClefType): ClefRenderData {
  const cached = renderDataCache.get(clef);
  if (cached) {
    return cached;
  }

  const definition = CLEF_DEFINITIONS[clef];
  const yCoordinates = generateYCoordinates(
    definition.highestNote,
    definition.lowestNote
  );
  const majorSharpYCoordinates = generateKeySignatureYCoordinates(
    MAJOR_SHARP_KEY_COUNTS,
    definition.sharpAccidentalNotes,
    yCoordinates
  );
  const majorFlatYCoordinates = generateKeySignatureYCoordinates(
    MAJOR_FLAT_KEY_COUNTS,
    definition.flatAccidentalNotes,
    yCoordinates
  );
  const renderData: ClefRenderData = {
    yCoordinates,
    octaves: definition.octaves,
    majorSharpYCoordinates,
    minorSharpYCoordinates: generateMinorKeySignatureYCoordinates(
      majorSharpYCoordinates
    ),
    majorFlatYCoordinates,
    minorFlatYCoordinates: generateMinorKeySignatureYCoordinates(
      majorFlatYCoordinates
    ),
    clefSvg: definition.clefSvgFactory(),
  };

  renderDataCache.set(clef, renderData);
  return renderData;
}

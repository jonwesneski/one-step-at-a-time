import { AccidentalType, Note, NoteLetter, Octave } from '../types/theory';
import {
  ACCIDENTAL_NOTE_GAP,
  ACCIDENTAL_SYMBOL_WIDTH,
  GRACE_MAIN_GAP_PX,
  GRACE_MIN_STEM_LENGTH_PX,
  GRACE_NOTE_ADVANCE_PX,
  GRACE_SCALE,
  GRACE_STEM_LENGTH_PX,
} from '../utils/notationDimensions';
import { parseAccidentalSuffix, suffixToType } from './accidentalRules';

export type GraceNoteDescriptor = {
  // Diatonic steps from the reference (main) pitch; positive = higher.
  // One step equals STAFF_Y_STEP pixels in every classical yCoordinates map,
  // so grace heads can be placed relative to the main head's pixel center
  // identically in standalone and in-staff rendering.
  relativeStaffSteps: number;
  accidental: AccidentalType | null;
};

export type GraceLayout = {
  // X center of each grace head, relative to the group's left edge (0).
  headXCenters: number[];
  // Full width of the group including per-grace accidental columns.
  totalWidth: number;
};

const LETTER_ORDER: NoteLetter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export function diatonicStepsBetween(
  referenceLetter: NoteLetter,
  referenceOctave: Octave,
  letter: NoteLetter,
  octave: Octave
): number {
  return (
    (octave - referenceOctave) * LETTER_ORDER.length +
    (LETTER_ORDER.indexOf(letter) - LETTER_ORDER.indexOf(referenceLetter))
  );
}

export function graceAccidentalFromNote(note: Note): AccidentalType | null {
  return suffixToType(parseAccidentalSuffix(note));
}

// Missing or invalid octave slots (graceOctaves[i] is null, or the array is
// shorter than graceNotes) default to the reference (main element's) octave.
export function buildGraceNoteDescriptors(
  graceNotes: Note[],
  graceOctaves: (Octave | null)[],
  referenceLetter: NoteLetter,
  referenceOctave: Octave
): GraceNoteDescriptor[] {
  return graceNotes.map((graceNote, i) => {
    const letter = graceNote[0] as NoteLetter;
    const octave = graceOctaves[i] ?? referenceOctave;
    return {
      relativeStaffSteps: diatonicStepsBetween(
        referenceLetter,
        referenceOctave,
        letter,
        octave
      ),
      accidental: graceAccidentalFromNote(graceNote),
    };
  });
}

// Overrides the suffix-derived accidentals with the staff's key-signature
// resolution when one is available for every grace note.
export function applyResolvedGraceAccidentals(
  graceNotes: GraceNoteDescriptor[],
  resolvedAccidentals: (AccidentalType | null)[] | null
): void {
  if (
    resolvedAccidentals === null ||
    resolvedAccidentals.length !== graceNotes.length
  ) {
    return;
  }
  for (let i = 0; i < graceNotes.length; i++) {
    graceNotes[i].accidental = resolvedAccidentals[i];
  }
}

// Width (px) an accidental column adds in front of a grace head, at grace scale.
function graceAccidentalWidth(accidental: AccidentalType): number {
  return (
    GRACE_SCALE * (ACCIDENTAL_SYMBOL_WIDTH[accidental] + ACCIDENTAL_NOTE_GAP)
  );
}

// Left-to-right column layout: each grace head advances GRACE_NOTE_ADVANCE_PX,
// plus a scaled accidental column when that grace carries an accidental.
export function computeGraceLayout(
  graceNotes: GraceNoteDescriptor[]
): GraceLayout {
  const headXCenters: number[] = [];
  let runningX = 0;
  for (const graceNote of graceNotes) {
    if (graceNote.accidental !== null) {
      runningX += graceAccidentalWidth(graceNote.accidental);
    }
    headXCenters.push(runningX + GRACE_NOTE_ADVANCE_PX / 2);
    runningX += GRACE_NOTE_ADVANCE_PX;
  }
  return { headXCenters, totalWidth: runningX };
}

// The leftward horizontal footprint (px) the staff must reserve for a grace
// group, in addition to the main element's own accidental footprint. Uses the
// suffix-derived accidentals — resolved (key-signature-aware) accidentals can
// only shrink the width, so spacing stays safe.
export function computeGraceFootprintWidth(graceNotes: Note[] | null): number {
  if (graceNotes === null || graceNotes.length === 0) {
    return 0;
  }
  let width = GRACE_MAIN_GAP_PX;
  for (const graceNote of graceNotes) {
    const accidental = graceAccidentalFromNote(graceNote);
    if (accidental !== null) {
      width += graceAccidentalWidth(accidental);
    }
    width += GRACE_NOTE_ADVANCE_PX;
  }
  return width;
}

// Beam-surface Y for each stem of a grace group. The beam line runs through
// the first and last stem tips (head Y minus GRACE_STEM_LENGTH_PX), then is
// raised uniformly so no interior stem falls below the minimum length.
export function computeGraceBeamYs(
  headXs: number[],
  headYs: number[]
): number[] {
  const firstTipY = headYs[0] - GRACE_STEM_LENGTH_PX;
  const lastTipY = headYs[headYs.length - 1] - GRACE_STEM_LENGTH_PX;
  const spanX = headXs[headXs.length - 1] - headXs[0];
  const slope = spanX === 0 ? 0 : (lastTipY - firstTipY) / spanX;

  const lineYs = headXs.map((headX) => firstTipY + (headX - headXs[0]) * slope);

  // Y grows downward: a stem is too short when the beam line sits below
  // (greater than) headY - minimum length.
  let raise = 0;
  for (let i = 0; i < lineYs.length; i++) {
    const lowestAllowedY = headYs[i] - GRACE_MIN_STEM_LENGTH_PX;
    if (lineYs[i] > lowestAllowedY) {
      raise = Math.max(raise, lineYs[i] - lowestAllowedY);
    }
  }

  return lineYs.map((lineY) => lineY - raise);
}

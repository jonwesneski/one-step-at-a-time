import type { ConnectorRole, TieValue } from '../types/elements';
import type {
  AccidentalType,
  ArpeggioType,
  ArticulationType,
  ClefType,
  DynamicMarking,
  GlissandoHint,
  GraceDuration,
  GraceSlur,
  GraceType,
  HairpinKind,
  HairpinRole,
  MeasureNumberDisplay,
  Note,
  Octave,
  OctaveContinuationMode,
  OctaveDisplayMode,
  OctaveShiftAmount,
  RestStaffSide,
  StaffGroupType,
  StressType,
  TrillContinuationMode,
  TrillFinishSlur,
  TrillLineMode,
} from '../types/theory';
import {
  ACCIDENTAL_TYPES,
  ARPEGGIOS,
  ARTICULATIONS,
  CLEFS,
  DYNAMICS,
  GLISSANDO_HINTS,
  GRACE_DURATIONS,
  GRACE_SLURS,
  GRACE_TYPES,
  MEASURE_NUMBER_DISPLAYS,
  OCTAVE_CONTINUATION_MODES,
  OCTAVE_DISPLAY_MODES,
  OCTAVE_SHIFT_AMOUNTS,
  OCTAVES,
  REST_STAFF_SIDES,
  STAFF_GROUPS,
  STRESSES,
  TRILL_CONTINUATION_MODES,
  TRILL_FINISH_SLURS,
  TRILL_LINE_MODES,
} from './consts';

const VALID_ACCIDENTAL_TYPES = new Set<string>(ACCIDENTAL_TYPES);
const VALID_DYNAMICS = new Set<string>(DYNAMICS);
const VALID_ARTICULATIONS = new Set<string>(ARTICULATIONS);
const VALID_STRESSES = new Set<string>(STRESSES);
const VALID_ARPEGGIOS = new Set<string>(ARPEGGIOS);
const VALID_GRACE_TYPES = new Set<string>(GRACE_TYPES);
const VALID_GRACE_DURATIONS = new Set<string>(GRACE_DURATIONS);
const VALID_GRACE_SLURS = new Set<string>(GRACE_SLURS);
const VALID_OCTAVES = new Set<number>(OCTAVES);
const VALID_CLEFS = new Set<string>(CLEFS);
const VALID_STAFF_GROUPS = new Set<string>(STAFF_GROUPS);
const VALID_TRILL_LINE_MODES = new Set<string>(TRILL_LINE_MODES);
const VALID_TRILL_CONTINUATION_MODES = new Set<string>(
  TRILL_CONTINUATION_MODES
);
const VALID_TRILL_FINISH_SLURS = new Set<string>(TRILL_FINISH_SLURS);
const VALID_OCTAVE_SHIFT_AMOUNTS = new Set<string>(OCTAVE_SHIFT_AMOUNTS);
const VALID_OCTAVE_DISPLAY_MODES = new Set<string>(OCTAVE_DISPLAY_MODES);
const VALID_REST_STAFF_SIDES = new Set<string>(REST_STAFF_SIDES);
const VALID_OCTAVE_CONTINUATION_MODES = new Set<string>(
  OCTAVE_CONTINUATION_MODES
);
const VALID_GLISSANDO_HINTS = new Set<string>(GLISSANDO_HINTS);
const VALID_MEASURE_NUMBER_DISPLAYS = new Set<string>(MEASURE_NUMBER_DISPLAYS);

// Letter A–G, optional accidental suffix — e.g. 'F#', no octave.
const GRACE_NOTE_PATTERN = /^[A-G](##|bb|#|b)?$/;

export const parseConnectorRole = (
  value: string | null
): ConnectorRole | HairpinRole | null => {
  if (value === 'start' || value === 'end') {
    return value;
  }
  return null;
};

// `arpeggio-hairpin` accepts `crescendo` / `decrescendo`, plus `diminuendo` as
// an alias for `decrescendo` (mirrors the note/chord hairpin attributes).
export const parseHairpinKind = (value: string | null): HairpinKind | null => {
  if (value === 'crescendo') {
    return 'crescendo';
  }
  if (value === 'decrescendo' || value === 'diminuendo') {
    return 'decrescendo';
  }
  return null;
};

// `tie` accepts `start` / `end` plus `laissez-vibrer` (alias `lv`).
export const parseTieValue = (value: string | null): TieValue | null => {
  if (value === 'start' || value === 'end' || value === 'laissez-vibrer') {
    return value;
  }
  if (value === 'lv') {
    return 'laissez-vibrer';
  }
  return null;
};

export const parseDynamicMarking = (
  value: string | null
): DynamicMarking | null => {
  if (value !== null && VALID_DYNAMICS.has(value)) {
    return value as DynamicMarking;
  }
  return null;
};

export const parseArticulation = (
  value: string | null
): ArticulationType | null => {
  if (value !== null && VALID_ARTICULATIONS.has(value)) {
    return value as ArticulationType;
  }
  return null;
};

export const parseClef = (value: string | null): ClefType | null => {
  if (value !== null && VALID_CLEFS.has(value)) {
    return value as ClefType;
  }
  return null;
};

export const parseStaffGroup = (
  value: string | null
): StaffGroupType | null => {
  if (value !== null && VALID_STAFF_GROUPS.has(value)) {
    return value as StaffGroupType;
  }
  return null;
};

export const parseGlissandoHint = (
  value: string | null
): GlissandoHint | null => {
  if (value !== null && VALID_GLISSANDO_HINTS.has(value)) {
    return value as GlissandoHint;
  }
  return null;
};

export const parseMeasureNumberDisplay = (
  value: string | null
): MeasureNumberDisplay | null => {
  if (value !== null && VALID_MEASURE_NUMBER_DISPLAYS.has(value)) {
    return value as MeasureNumberDisplay;
  }
  return null;
};

export const parseStress = (value: string | null): StressType | null => {
  if (value !== null && VALID_STRESSES.has(value)) {
    return value as StressType;
  }
  return null;
};

export const parseArpeggio = (value: string | null): ArpeggioType | null => {
  if (value !== null && VALID_ARPEGGIOS.has(value)) {
    return value as ArpeggioType;
  }
  return null;
};

export const parseAccidentalType = (
  value: string | null
): AccidentalType | null => {
  if (value !== null && VALID_ACCIDENTAL_TYPES.has(value)) {
    return value as AccidentalType;
  }
  return null;
};

export const parseTrillLineMode = (value: string | null): TrillLineMode => {
  if (value !== null && VALID_TRILL_LINE_MODES.has(value)) {
    return value as TrillLineMode;
  }
  return 'auto';
};

export const parseTrillContinuationMode = (
  value: string | null
): TrillContinuationMode => {
  if (value !== null && VALID_TRILL_CONTINUATION_MODES.has(value)) {
    return value as TrillContinuationMode;
  }
  return 'bracketed';
};

export const parseTrillFinishSlur = (value: string | null): TrillFinishSlur => {
  if (value !== null && VALID_TRILL_FINISH_SLURS.has(value)) {
    return value as TrillFinishSlur;
  }
  return 'to-main';
};

// No default: unlike parseTrillLineMode's 'auto', there is no sensible
// fallback amount for an unset/invalid octave-shift value.
export const parseOctaveShiftAmount = (
  value: string | null
): OctaveShiftAmount | null => {
  if (value !== null && VALID_OCTAVE_SHIFT_AMOUNTS.has(value)) {
    return value as OctaveShiftAmount;
  }
  return null;
};

// No default: the 'sign' fallback is applied at span-open time in
// rules/octaveRules.ts, not here — an element with no octaveShift of its own
// has no span to default the mode of.
export const parseOctaveDisplayMode = (
  value: string | null
): OctaveDisplayMode | null => {
  if (value !== null && VALID_OCTAVE_DISPLAY_MODES.has(value)) {
    return value as OctaveDisplayMode;
  }
  return null;
};

// No default: null means "no author override," resolved separately by the
// ancestor <music-measure> auto-classifying by beat position when this rest
// is a member of an active beam-group (see rules/doubleStemmedBeamRules.ts).
export const parseRestStaffSide = (
  value: string | null
): RestStaffSide | null => {
  if (value !== null && VALID_REST_STAFF_SIDES.has(value)) {
    return value as RestStaffSide;
  }
  return null;
};

export const parseOctaveContinuationMode = (
  value: string | null
): OctaveContinuationMode => {
  if (value !== null && VALID_OCTAVE_CONTINUATION_MODES.has(value)) {
    return value as OctaveContinuationMode;
  }
  return 'bracketed';
};

export const parseGraceType = (value: string | null): GraceType | null => {
  if (value !== null && VALID_GRACE_TYPES.has(value)) {
    return value as GraceType;
  }
  return null;
};

export const parseGraceDuration = (
  value: string | null
): GraceDuration | null => {
  if (value !== null && VALID_GRACE_DURATIONS.has(value)) {
    return value as GraceDuration;
  }
  return null;
};

export const parseGraceSlur = (value: string | null): GraceSlur | null => {
  if (value !== null && VALID_GRACE_SLURS.has(value)) {
    return value as GraceSlur;
  }
  return null;
};

// Parses a comma-separated grace note-letter list (e.g. "F#,G"). Any invalid
// token rejects the entire list — rendering a partial grace run would be more
// misleading than rendering none.
export const parseGraceNotes = (value: string | null): Note[] | null => {
  if (value === null) {
    return null;
  }
  const tokens = value
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return null;
  }
  for (const token of tokens) {
    if (!GRACE_NOTE_PATTERN.test(token)) {
      console.warn(
        `invalid grace note "${token}" — expected letter A-G with an optional accidental (e.g. "F#")`
      );
      return null;
    }
  }
  return tokens as Note[];
};

// Parses a comma-separated grace octave list (e.g. "4,4,5"). Unlike
// parseGraceNotes, an invalid or missing token does not reject the whole
// list — it resolves to null for that position, and callers fall back to the
// main element's own octave.
export const parseGraceOctaves = (
  value: string | null
): (Octave | null)[] | null => {
  if (value === null) {
    return null;
  }
  const tokens = value.split(',').map((token) => token.trim());
  return tokens.map((token) => {
    const parsed = Number(token) as Octave;
    return VALID_OCTAVES.has(parsed) ? parsed : null;
  });
};

// Parses a comma-separated per-grace-note articulation list (e.g.
// "staccato,,accent"). Like parseGraceOctaves (and unlike parseGraceNotes),
// an invalid or missing token does not reject the whole list — it resolves
// to null for that position, so the other grace notes in the group keep
// their own marks.
export const parseGraceArticulations = (
  value: string | null
): (ArticulationType | null)[] | null => {
  if (value === null) {
    return null;
  }
  const tokens = value.split(',').map((token) => token.trim());
  return tokens.map((token) =>
    VALID_ARTICULATIONS.has(token) ? (token as ArticulationType) : null
  );
};

// Shared setter body for the array-valued grace properties (`grace`,
// `graceOctave`, `graceArticulation`). The matching attribute is always a
// comma-separated string, but the property accepts either that string (React
// sets the JSX prop as a property; Storybook `control: 'text'` does too) or the
// rich array (vanilla JS). Returns the attribute string to write, or null to
// remove the attribute. A string is first routed through the element's own
// parser so an invalid list is rejected the same way as one set via
// `setAttribute`.
export const graceListToAttr = (
  value: readonly (string | number | null)[] | string | null,
  parse: (value: string | null) => readonly (string | number | null)[] | null
): string | null => {
  const list = typeof value === 'string' ? parse(value) : value;
  if (list === null || list.length === 0) {
    return null;
  }
  return list.map((entry) => entry ?? '').join(',');
};

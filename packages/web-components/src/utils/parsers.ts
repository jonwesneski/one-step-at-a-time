import type { ConnectorRole } from '../types/elements';
import type {
  ArticulationType,
  ClefType,
  DynamicMarking,
  GraceDuration,
  GraceSlur,
  GraceType,
  HairpinRole,
  Note,
  Octave,
  StaffGroupType,
  StressType,
} from '../types/theory';
import {
  ARTICULATIONS,
  CLEFS,
  DYNAMICS,
  GRACE_DURATIONS,
  GRACE_SLURS,
  GRACE_TYPES,
  OCTAVES,
  STAFF_GROUPS,
  STRESSES,
} from './consts';

const VALID_DYNAMICS = new Set<string>(DYNAMICS);
const VALID_ARTICULATIONS = new Set<string>(ARTICULATIONS);
const VALID_STRESSES = new Set<string>(STRESSES);
const VALID_GRACE_TYPES = new Set<string>(GRACE_TYPES);
const VALID_GRACE_DURATIONS = new Set<string>(GRACE_DURATIONS);
const VALID_GRACE_SLURS = new Set<string>(GRACE_SLURS);
const VALID_OCTAVES = new Set<number>(OCTAVES);
const VALID_CLEFS = new Set<string>(CLEFS);
const VALID_STAFF_GROUPS = new Set<string>(STAFF_GROUPS);

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

export const parseStress = (value: string | null): StressType | null => {
  if (value !== null && VALID_STRESSES.has(value)) {
    return value as StressType;
  }
  return null;
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

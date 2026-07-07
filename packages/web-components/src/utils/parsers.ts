import type { ConnectorRole } from '../types/elements';
import type {
  AccentType,
  ArticulationType,
  DynamicMarking,
  HairpinRole,
  StressType,
} from '../types/theory';
import { ACCENTS, ARTICULATIONS, DYNAMICS, STRESSES } from './consts';

const VALID_DYNAMICS = new Set<string>(DYNAMICS);
const VALID_ACCENTS = new Set<string>(ACCENTS);
const VALID_ARTICULATIONS = new Set<string>(ARTICULATIONS);
const VALID_STRESSES = new Set<string>(STRESSES);

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

// Each articulation family is validated independently. An unrecognized string
// resolves to null (silently ignored), matching the library's existing
// non-throwing validation convention.
export const parseAccent = (value: string | null): AccentType | null => {
  if (value !== null && VALID_ACCENTS.has(value)) {
    return value as AccentType;
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

export const parseStress = (value: string | null): StressType | null => {
  if (value !== null && VALID_STRESSES.has(value)) {
    return value as StressType;
  }
  return null;
};

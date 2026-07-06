import type { ConnectorRole } from '../types/elements';
import type { DynamicMarking, HairpinRole } from '../types/theory';
import { DYNAMICS } from './consts';

const VALID_DYNAMICS = new Set<string>(DYNAMICS);

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

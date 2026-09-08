import './chord';
import './clef';
import './composition';
import './measure';
import './staff'; // order of import matters for some reason, otherwise <note> can't find gYCoordinate()
import './staffGuitarTab';
import './staffVocal';
import './tuplet';
import './arpeggio';

import './guitarNote';
import './note';
import './rest';

export { durationToFactor } from './rules/theoryConsts';
export { parseTupletRatio } from './rules/tupletRules';
export type { ParsedTupletRatio } from './rules/tupletRules';
export type {
  ConnectorRole,
  GraceArticulationsType,
  GraceNotesType,
  GraceOctavesType,
  GuitarFret,
  TieValue,
} from './types/elements';
export * from './types/theory';

/**
 * Allowed-value arrays for the enumerated attributes, re-exported so app code can
 * build pickers/controls without importing from deep paths.
 */
export {
  ARPEGGIOS,
  ARTICULATIONS,
  CLEFS,
  DURATIONS,
  DYNAMICS,
  GRACE_DURATIONS,
  GRACE_SLURS,
  GRACE_TYPES,
  MODES,
  NOTES,
  OCTAVES,
  STAFF_GROUPS,
  STRESSES,
  TIMES,
  TUPLET_RATIOS,
  VOICES,
} from './utils/consts';

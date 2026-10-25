import './arpeggio';
import './chord';
import './clef';
import './composition';
import './measure';
import './staff'; // order of import matters for some reason, otherwise <note> can't find gYCoordinate()
import './staffGuitarTab';
import './staffVocal';
import './tuplet';
import './voice';

import './guitarNote';
import './note';
import './rest';

export { durationToFactor } from './rules/theoryConsts';
export { parseTupletRatio } from './rules/tupletRules';
export type { ParsedTupletRatio } from './rules/tupletRules';
export type {
  ConnectorRole,
  GraceArticulationsType,
  GraceNoteheadsType,
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
  NOTEHEADS,
  NOTES,
  OCTAVE_CONTINUATION_MODES,
  OCTAVE_DISPLAY_MODES,
  OCTAVE_SHIFT_AMOUNTS,
  OCTAVES,
  REST_STAFF_SIDES,
  STAFF_GROUPS,
  STEM_DIRECTIONS,
  STRESSES,
  TIMES,
  TUPLET_PLACEMENTS,
  TUPLET_RATIOS,
  VOICES,
} from './utils/consts';

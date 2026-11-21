import './arpeggio';
import './barline';
import './chord';
import './clef';
import './composition';
import './measure';
import './staff'; // order of import matters for some reason, otherwise <note> can't find gYCoordinate()
import './staffGuitarTab';
import './staffVocal';
import './tremolo';
import './tuplet';
import './voice';

import './guitarNote';
import './note';
import './rest';

export { repeatPickupWarning, resolveRepeatSpans } from './rules/barlineRules';
export type { RepeatEvent, RepeatSpan } from './rules/barlineRules';
export {
  endingNumeralLabel,
  resolveEndingNumberLabels,
  resolveEndings,
} from './rules/endingRules';
export type {
  Ending,
  EndingGroup,
  EndingMeasureInput,
} from './rules/endingRules';
export {
  durationToBase,
  durationToDotCount,
  durationToFactor,
} from './rules/theoryConsts';
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
  ACCIDENTAL_TYPES,
  ARPEGGIO_UNMATCHED_MODES,
  ARPEGGIOS,
  ARTICULATIONS,
  BARLINE_TYPES,
  BASE_DURATIONS,
  CLEFS,
  DURATIONS,
  DYNAMICS,
  ENDING_NUMBERINGS,
  GLISSANDO_HINTS,
  GRACE_DURATIONS,
  GRACE_SLURS,
  GRACE_TYPES,
  MEASURE_END_BARLINES,
  MEASURE_NUMBER_DISPLAYS,
  MODES,
  NOTEHEADS,
  NOTES,
  OCTAVE_CONTINUATION_MODES,
  OCTAVE_DISPLAY_MODES,
  OCTAVE_SHIFT_AMOUNTS,
  OCTAVES,
  PITCH_NOTES,
  REST_STAFF_SIDES,
  STAFF_GROUPS,
  STEM_DIRECTIONS,
  STRESSES,
  TIE_STYLES,
  TIE_VALUES,
  TIMES,
  TREMOLO_BEAM_ATTACHES,
  TREMOLO_BEAM_POSITIONS,
  TREMOLO_LABELS,
  TREMOLO_STROKE_COUNTS,
  TREMOLO_VALUES,
  TRILL_CONTINUATION_MODES,
  TRILL_FINISH_SLURS,
  TRILL_LINE_MODES,
  TUPLET_PLACEMENTS,
  TUPLET_RATIOS,
  VOICES,
} from './utils/consts';

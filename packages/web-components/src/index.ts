import './arpeggio';
import './barline';
import './chord';
import './clef';
import './composition';
import './drumChord';
import './drumNote';
import './guitarNote';
import './measure';
import './note';
import './rest';
import './staff';
import './staffGuitarTab';
import './staffPercussion';
import './staffVocal';
import './tremolo';
import './tuplet';
import './voice';

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
  GraceQuarterTonesType,
  GuitarFret,
  TieValue,
} from './types/elements';
export * from './types/theory';

/**
 * Allowed-value arrays for the enumerated attributes, re-exported so app code can
 * build pickers/controls without importing from deep paths.
 */
export {
  ACCIDENTAL_REMINDERS,
  ACCIDENTAL_TYPES,
  ARPEGGIOS,
  ARPEGGIO_UNMATCHED_MODES,
  ARTICULATIONS,
  BARLINE_TYPES,
  BASE_DURATIONS,
  BEND_SHAPES,
  BREATH_MARKS,
  CLEFS,
  DURATIONS,
  DYNAMICS,
  ENDING_NUMBERINGS,
  GLISSANDO_HINTS,
  GLISSANDO_LABELS,
  GLISSANDO_SHAPES,
  GRACE_DURATIONS,
  GRACE_SLURS,
  GRACE_TYPES,
  MEASURE_END_BARLINES,
  MEASURE_NUMBER_DISPLAYS,
  MODES,
  NOTEHEADS,
  NOTES,
  NOTE_SIZES,
  OCTAVES,
  OCTAVE_CONTINUATION_MODES,
  OCTAVE_DISPLAY_MODES,
  OCTAVE_SHIFT_AMOUNTS,
  PERCUSSION_INSTRUMENTS,
  PITCH_NOTES,
  QUARTER_TONES,
  REST_STAFF_SIDES,
  SLUR_STYLES,
  STAFF_GROUPS,
  STEM_DIRECTIONS,
  STEM_MARKS,
  STRESSES,
  SWELL_SHAPES,
  TEXT_PLACEMENTS,
  TEXT_STYLES,
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
  UNPITCHED_PLACEMENTS,
  VOICES,
} from './utils/consts';

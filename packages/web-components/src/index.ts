import './chord';
import './composition';
import './measure';
import './staffBass';
import './staffGuitarTab';
import './staffTreble'; // order of import matters for some reason, otherwise <note> can't find gYCoordinate()
import './staffVocal';

import './guitarNote';
import './note';
import './rest';

export { durationToFactor } from './rules/theoryConsts';
export type { NoteLetterOctave as LetterOctave } from './types/elements';
export type { DurationType, Mode, Note } from './types/theory';
export type { PitchChangeDetail } from './utils/pitchDragHandler';

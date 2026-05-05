import './chord';
import './composition';
import './measure';
import './staffBass';
import './staffGuitarTab';
import './staffTreble'; // order of import matters for some reason, otherwise <note> can't find gYCoordinate()
import './staffVocal';

import './note';
import './guitarNote';

export type { DurationType, LetterNote, Mode, Note } from './types/theory';
export type { LetterOctave } from './types/elements';
export type { PitchChangeDetail } from './utils/pitchDragHandler';
export { durationToFactor } from './utils/theoryConsts';

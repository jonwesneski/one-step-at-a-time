import './chord';
import './composition';
import './measure';
import './staffBass';
import './staffGuitarTab';
import './staffTreble'; // order of import matters for some reason, otherwise <note> can't find gYCoordinate()
import './staffVocal';

import './note';

export type { DurationType, LetterNote, LetterOctave, Mode, Note } from './types/theory';
export type { PitchChangeDetail } from './utils/pitchDragHandler';
export { durationToFactor } from './utils/consts';

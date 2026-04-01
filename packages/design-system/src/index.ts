import './chord';
import './composition';
import './measure';
import './staffBass';
import './staffGuitarTab';
import './staffTreble'; // order of import matters for some reason, otherwise <note> can't find gYCoordinate()
import './staffVocal';

import './note';

export type { DurationType, LetterOctave, Note } from './types/theory';
export type { PitchChangeDetail } from './utils/pitchDragHandler';

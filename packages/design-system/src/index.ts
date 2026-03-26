import './chord/chord';
import './composition/composition';
import './measure/measure';
import './staffBass/staffBass';
import './staffGuitarTab/staffGuitarTab';
import './staffTreble/staffTreble'; // order of import matters for some reason, otherwise <note> can't find gYCoordinate()

import './note/note';

export type { DurationType, Note, LetterOctave } from './types/theory';
export type { PitchChangeDetail } from './utils/pitchDragHandler';

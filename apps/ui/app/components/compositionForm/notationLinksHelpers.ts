import { pruneInvalidBeamGroups } from './beamGroupHelpers';
import { pruneInvalidSharedStems } from './crossStaffHelpers';
import { pruneInvalidOctaveSpans } from './octaveHelpers';
import { pruneInvalidPhraseSlurs } from './phraseSlurHelpers';
import { pruneInvalidCrossStaffTuplets } from './tupletsHelpers';
import type { CompositionStructure } from './types';

// The one repair pass for every cross-entry notation link the library
// resolves with warn-and-drop rules (octave spans, and the cross-staff groups
// alongside them). Every mutation that can move, delete, or re-time entries
// calls it last, so the editor never stores a link the renderer would
// silently ignore. Mirrors pruneBrokenTies' role for ties.
export function pruneInvalidNotationLinks(
  structure: CompositionStructure
): CompositionStructure {
  return [
    pruneInvalidOctaveSpans,
    pruneInvalidCrossStaffTuplets,
    pruneInvalidBeamGroups,
    pruneInvalidSharedStems,
    pruneInvalidPhraseSlurs,
  ].reduce((next, prune) => prune(next), structure);
}

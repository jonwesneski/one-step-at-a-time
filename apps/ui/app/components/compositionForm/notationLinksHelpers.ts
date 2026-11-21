import { pruneInvalidArpeggios } from './arpeggiosHelpers';
import { pruneInvalidBeamGroups } from './beamGroupHelpers';
import { pruneLaissezVibrerOnTies } from './connectorsHelpers';
import { pruneInvalidCrossStaffArpeggios } from './crossStaffArpeggioHelpers';
import { pruneInvalidSharedStems } from './crossStaffHelpers';
import { sanitizeEntryMarkings } from './markingsHelpers';
import { pruneInvalidOctaveSpans } from './octaveHelpers';
import { pruneInvalidPhraseSlurs } from './phraseSlurHelpers';
import { pruneInvalidTabLinks } from './staffSettingsHelpers';
import { pruneInvalidTremolos } from './tremolosHelpers';
import { pruneInvalidCrossStaffTuplets } from './tupletsHelpers';
import type { CompositionStructure } from './types';

// The one repair pass for every cross-entry notation link the library
// resolves with warn-and-drop rules (octave spans, and the cross-staff groups
// alongside them), plus the per-entry markings an edit can invalidate. Every mutation that can move, delete, or re-time entries
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
    // After beam groups and tuplets settle, both of which can disqualify a
    // tremolo or arpeggio member.
    pruneInvalidTremolos,
    pruneInvalidArpeggios,
    // After beam groups settle (a triangle can't sit in one); before the
    // arpeggio links, which need a rolled sign to survive.
    sanitizeEntryMarkings,
    pruneInvalidCrossStaffArpeggios,
    pruneLaissezVibrerOnTies,
    pruneInvalidTabLinks,
  ].reduce((next, prune) => prune(next), structure);
}

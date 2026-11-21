import { entryOnset } from './crossStaffHelpers';
import { staffOfEntry } from './entryLocationHelpers';
import { isRolledArpeggio } from './markingsHelpers';
import { CAPACITY_EPSILON } from './measureCapacityHelpers';
import type {
  ChordEntry,
  CompositionStructure,
  NoteEntry,
  Selection,
} from './types';

// One unbroken arpeggio line through a chord on each of two staves
// (`arpeggio-for`). Mirrors the library's rules/arpeggioRules.ts
// #resolveArpeggioSpans: the lower entry names the upper one, the two sit on
// different staves of one measure, each is in at most one pair, and at least
// one end is a rolled (wavy) sign. The library doesn't require a shared beat;
// the editor does, since the line joins one rolled chord.

export type CrossStaffArpeggioPair = {
  measureId: string;
  upperEntryId: string;
  lowerEntryId: string;
};

function noteOrChord(
  structure: CompositionStructure,
  entryId: string
): NoteEntry | ChordEntry | null {
  const entry = structure.entriesById[entryId];
  return entry?.type === 'note' || entry?.type === 'chord' ? entry : null;
}

function arpeggioPartnerIds(
  structure: CompositionStructure,
  entryId: string
): string[] {
  const own = noteOrChord(structure, entryId)?.arpeggioWithEntryId;
  const pointingHere = Object.values(structure.entriesById)
    .filter(
      (entry) =>
        (entry.type === 'note' || entry.type === 'chord') &&
        entry.arpeggioWithEntryId === entryId
    )
    .map((entry) => entry.id);
  return own ? [own, ...pointingHere] : pointingHere;
}

// Two note/chord entries on different staves of one measure, ordered top to
// bottom — or null for any other selection.
export function crossStaffArpeggioCandidate(
  selection: Selection,
  structure: CompositionStructure
): CrossStaffArpeggioPair | null {
  if (
    selection.entryIds.length !== 2 ||
    selection.measureIds.length > 0 ||
    selection.staffIds.length > 0
  ) {
    return null;
  }
  const [a, b] = selection.entryIds;
  const contextA = staffOfEntry(structure, a);
  const contextB = staffOfEntry(structure, b);
  if (
    !contextA ||
    !contextB ||
    contextA.measureId !== contextB.measureId ||
    contextA.staffId === contextB.staffId ||
    !noteOrChord(structure, a) ||
    !noteOrChord(structure, b)
  ) {
    return null;
  }
  const aIsUpper = contextA.staffIndex < contextB.staffIndex;
  return {
    measureId: contextA.measureId,
    upperEntryId: aIsUpper ? a : b,
    lowerEntryId: aIsUpper ? b : a,
  };
}

// Why the pair can't share one arpeggio line, or null if it can. A missing
// rolled sign isn't a problem: joining adds one.
export function crossStaffArpeggioProblem(
  structure: CompositionStructure,
  { upperEntryId, lowerEntryId }: Omit<CrossStaffArpeggioPair, 'measureId'>
): string | null {
  const upper = noteOrChord(structure, upperEntryId);
  const lower = noteOrChord(structure, lowerEntryId);
  if (!upper || !lower) {
    return 'Only notes and chords can share an arpeggio.';
  }
  const upperContext = staffOfEntry(structure, upperEntryId);
  const lowerContext = staffOfEntry(structure, lowerEntryId);
  if (
    !upperContext ||
    !lowerContext ||
    upperContext.measureId !== lowerContext.measureId ||
    upperContext.staffIndex >= lowerContext.staffIndex
  ) {
    return 'They must be on two staves of the same measure.';
  }
  const upperOnset = entryOnset(structure, upperEntryId);
  const lowerOnset = entryOnset(structure, lowerEntryId);
  if (
    upperOnset === null ||
    lowerOnset === null ||
    Math.abs(upperOnset - lowerOnset) > CAPACITY_EPSILON
  ) {
    return 'They must start on the same beat.';
  }
  const pairedElsewhere = (id: string, partner: string) =>
    arpeggioPartnerIds(structure, id).some((other) => other !== partner);
  if (
    pairedElsewhere(upperEntryId, lowerEntryId) ||
    pairedElsewhere(lowerEntryId, upperEntryId)
  ) {
    return 'One of them already shares an arpeggio with another chord.';
  }
  return null;
}

export function isCrossStaffArpeggio(
  structure: CompositionStructure,
  { upperEntryId, lowerEntryId }: Omit<CrossStaffArpeggioPair, 'measureId'>
): boolean {
  return (
    noteOrChord(structure, lowerEntryId)?.arpeggioWithEntryId === upperEntryId
  );
}

// Joining gives the line a rolled sign if neither end has one.
export function setCrossStaffArpeggio(
  structure: CompositionStructure,
  pair: Omit<CrossStaffArpeggioPair, 'measureId'>,
  joined: boolean
): CompositionStructure {
  const lower = noteOrChord(structure, pair.lowerEntryId);
  const upper = noteOrChord(structure, pair.upperEntryId);
  if (
    !lower ||
    !upper ||
    (joined && crossStaffArpeggioProblem(structure, pair) !== null)
  ) {
    return structure;
  }
  const arpeggioWithEntryId = joined ? pair.upperEntryId : null;
  if ((lower.arpeggioWithEntryId ?? null) === arpeggioWithEntryId) {
    return structure;
  }
  const needsSign =
    joined &&
    !isRolledArpeggio(lower.arpeggio) &&
    !isRolledArpeggio(upper.arpeggio);
  return {
    ...structure,
    entriesById: {
      ...structure.entriesById,
      [lower.id]: {
        ...lower,
        arpeggioWithEntryId,
        ...(needsSign ? { arpeggio: 'up' as const } : {}),
      },
    },
  };
}

// Clears every link that no longer holds: the pair moved apart, or neither
// end still has a rolled sign.
export function pruneInvalidCrossStaffArpeggios(
  structure: CompositionStructure
): CompositionStructure {
  let next = structure;
  for (const entry of Object.values(structure.entriesById)) {
    if (
      (entry.type !== 'note' && entry.type !== 'chord') ||
      !entry.arpeggioWithEntryId
    ) {
      continue;
    }
    const pair = {
      upperEntryId: entry.arpeggioWithEntryId,
      lowerEntryId: entry.id,
    };
    const upper = noteOrChord(next, pair.upperEntryId);
    const stillValid =
      upper !== null &&
      crossStaffArpeggioProblem(next, pair) === null &&
      (isRolledArpeggio(entry.arpeggio) || isRolledArpeggio(upper.arpeggio));
    if (!stillValid) {
      next = {
        ...next,
        entriesById: {
          ...next.entriesById,
          [entry.id]: { ...entry, arpeggioWithEntryId: null },
        },
      };
    }
  }
  return next;
}

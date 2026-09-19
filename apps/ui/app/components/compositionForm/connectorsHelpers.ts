import { effectiveClefOfEntry, resolveEntryOctaves } from './clefsHelpers';
import type {
  ChordNote,
  CompositionStructure,
  ConnectorKind,
  ConnectorRole,
  NormalizedConnector,
  NormalizedStaff,
  Selection,
  StaffType,
} from './types';

// Every entry in `staff`, in voice order — inlined rather than imported from
// voiceHelpers.ts (which itself needs pruneBrokenTies below for its own
// cascade cleanup) to keep that dependency one-directional.
function staffEntryIds(staff: NormalizedStaff): string[] {
  return staff.voiceOrder.flatMap((id) => staff.voicesById[id].entryIds);
}

// Tie/slur resolution for the composition form. Mirrors the pairing rules of
// packages/web-components' connectorsBuilder (pairConnectors): connectors are
// matched in document order, a note carries a single `tie`/`slur` attribute, and
// interleaving same-kind spans are disambiguated with `id` on the start element
// and `for="<id>"` on the end. This app is the sole writer of that data, so the
// helpers here only ever produce well-formed output.

export type ConnectorEndpoints = { startEntryId: string; endEntryId: string };

export type ConnectorEntryAttributes = {
  tie?: ConnectorRole;
  slur?: ConnectorRole;
  crescendo?: ConnectorRole;
  decrescendo?: ConnectorRole;
  id?: string;
  for?: string;
};

// tie/slur use the id/for LIFO-stack disambiguation; hairpins are paired by the
// library's nearest-end rule and take only the role attribute.
const HAIRPIN_KINDS: ConnectorKind[] = ['crescendo', 'decrescendo'];
export function isHairpinKind(kind: ConnectorKind): boolean {
  return HAIRPIN_KINDS.includes(kind);
}

type EntryStaffContext = {
  measureId: string;
  measureIndex: number;
  staffId: string;
  staffIndex: number;
  staffType: StaffType;
  voiceId: string;
  voiceIndex: number;
};

// All entry ids in the order packages/web-components sees them — measure, then
// staff, then entry — i.e. the order a `querySelectorAll` over the rendered tree
// returns, which is what connector pairing keys off.
export function flattenEntryOrder(structure: CompositionStructure): string[] {
  const order: string[] = [];
  for (const measureId of structure.measureOrder) {
    const measure = structure.measuresById[measureId];
    if (!measure) {
      continue;
    }
    for (const staffId of measure.staffIds) {
      const staff = structure.stavesById[staffId];
      if (!staff) {
        continue;
      }
      order.push(...staffEntryIds(staff));
    }
  }
  return order;
}

export function staffOfEntry(
  structure: CompositionStructure,
  entryId: string
): EntryStaffContext | null {
  for (
    let measureIndex = 0;
    measureIndex < structure.measureOrder.length;
    measureIndex++
  ) {
    const measureId = structure.measureOrder[measureIndex];
    const measure = structure.measuresById[measureId];
    if (!measure) {
      continue;
    }
    for (
      let staffIndex = 0;
      staffIndex < measure.staffIds.length;
      staffIndex++
    ) {
      const staffId = measure.staffIds[staffIndex];
      const staff = structure.stavesById[staffId];
      if (!staff) {
        continue;
      }
      const voiceIndex = staff.voiceOrder.findIndex((voiceId) =>
        staff.voicesById[voiceId].entryIds.includes(entryId)
      );
      if (voiceIndex !== -1) {
        return {
          measureId,
          measureIndex,
          staffId,
          staffIndex,
          staffType: staff.type,
          voiceId: staff.voiceOrder[voiceIndex],
          voiceIndex,
        };
      }
    }
  }
  return null;
}

// Interprets a selection as a tie/slur candidate. Returns the ordered outer
// endpoints, or null when the selection can't carry a connector: fewer than two
// note/chord entries, a rest in the mix, a measure/staff also selected, or
// endpoints that are neither in the same staff nor the same voice (same staff
// index + type) of an earlier and a later measure.
export function isConnectableSelection(
  selection: Selection,
  structure: CompositionStructure
): ConnectorEndpoints | null {
  if (selection.measureIds.length > 0 || selection.staffIds.length > 0) {
    return null;
  }
  if (selection.entryIds.length < 2) {
    return null;
  }

  const entries = selection.entryIds.map((id) => structure.entriesById[id]);
  if (
    entries.some(
      (entry) => !entry || entry.type === 'rest' || entry.type === 'clef'
    )
  ) {
    return null;
  }

  const flat = flattenEntryOrder(structure);
  const ordered = selection.entryIds
    .map((id) => ({ id, index: flat.indexOf(id) }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index);
  if (ordered.length < 2) {
    return null;
  }

  const startEntryId = ordered[0].id;
  const endEntryId = ordered[ordered.length - 1].id;

  const startContext = staffOfEntry(structure, startEntryId);
  const endContext = staffOfEntry(structure, endEntryId);
  if (!startContext || !endContext) {
    return null;
  }

  const sameStaff =
    startContext.staffId === endContext.staffId &&
    startContext.voiceIndex === endContext.voiceIndex;
  const sameVoiceAcrossMeasures =
    startContext.staffIndex === endContext.staffIndex &&
    startContext.staffType === endContext.staffType &&
    startContext.voiceIndex === endContext.voiceIndex &&
    startContext.measureIndex < endContext.measureIndex;

  if (!sameStaff && !sameVoiceAcrossMeasures) {
    return null;
  }

  return { startEntryId, endEntryId };
}

export function connectorBetween(
  structure: CompositionStructure,
  startEntryId: string,
  endEntryId: string,
  kinds?: ConnectorKind[]
): NormalizedConnector | null {
  return (
    structure.connectorOrder
      .map((id) => structure.connectorsById[id])
      .find(
        (connector) =>
          connector &&
          connector.startEntryId === startEntryId &&
          connector.endEntryId === endEntryId &&
          (kinds === undefined || kinds.includes(connector.kind))
      ) ?? null
  );
}

// True when a tie (a single sustained pitch) is musically valid between the
// endpoints: same pitch(es), and the two entries are immediately consecutive —
// within one staff, or the last note of one staff and the first note of the
// same voice in the very next measure.
export function canTie(
  structure: CompositionStructure,
  endpoints: ConnectorEndpoints
): boolean {
  const start = structure.entriesById[endpoints.startEntryId];
  const end = structure.entriesById[endpoints.endEntryId];
  if (!start || !end) {
    return false;
  }
  if (start.type === 'rest' || start.type === 'clef') {
    return false;
  }
  if (start.type !== end.type) {
    return false;
  }
  if (start.type === 'note' && end.type === 'note') {
    const startClef = effectiveClefOfEntry(structure, endpoints.startEntryId);
    const endClef = effectiveClefOfEntry(structure, endpoints.endEntryId);
    if (
      start.value !== end.value ||
      resolveEntryOctaves(startClef, [start])[0] !==
        resolveEntryOctaves(endClef, [end])[0]
    ) {
      return false;
    }
  }
  if (start.type === 'chord' && end.type === 'chord') {
    const key = (notes: ChordNote[], entryId: string) => {
      const octaves = resolveEntryOctaves(
        effectiveClefOfEntry(structure, entryId),
        notes
      );
      return notes
        .map((n, i) => `${n.value}${octaves[i]}`)
        .sort()
        .join(',');
    };
    if (
      key(start.notes, endpoints.startEntryId) !==
      key(end.notes, endpoints.endEntryId)
    ) {
      return false;
    }
  }

  const startContext = staffOfEntry(structure, endpoints.startEntryId);
  const endContext = staffOfEntry(structure, endpoints.endEntryId);
  if (!startContext || !endContext) {
    return false;
  }

  if (
    startContext.staffId === endContext.staffId &&
    startContext.voiceId === endContext.voiceId
  ) {
    const entryIds =
      structure.stavesById[startContext.staffId].voicesById[
        startContext.voiceId
      ].entryIds;
    return (
      entryIds.indexOf(endpoints.endEntryId) -
        entryIds.indexOf(endpoints.startEntryId) ===
      1
    );
  }

  const startVoiceEntryIds =
    structure.stavesById[startContext.staffId].voicesById[startContext.voiceId]
      .entryIds;
  const endVoiceEntryIds =
    structure.stavesById[endContext.staffId].voicesById[endContext.voiceId]
      .entryIds;
  return (
    startContext.voiceIndex === endContext.voiceIndex &&
    startVoiceEntryIds[startVoiceEntryIds.length - 1] ===
      endpoints.startEntryId &&
    endVoiceEntryIds[0] === endpoints.endEntryId &&
    endContext.measureIndex - startContext.measureIndex === 1
  );
}

// Per-entry tie/slur/id/for attributes for the whole composition.
export function resolveConnectorAttributes(
  structure: CompositionStructure
): Map<string, ConnectorEntryAttributes> {
  const flat = flattenEntryOrder(structure);
  const indexOf = new Map(flat.map((id, index) => [id, index]));

  type Span = {
    connector: NormalizedConnector;
    startIndex: number;
    endIndex: number;
  };

  const spans: Span[] = [];
  for (const connectorId of structure.connectorOrder) {
    const connector = structure.connectorsById[connectorId];
    if (!connector) {
      continue;
    }
    const startIndex = indexOf.get(connector.startEntryId);
    const endIndex = indexOf.get(connector.endEntryId);
    if (
      startIndex === undefined ||
      endIndex === undefined ||
      startIndex >= endIndex
    ) {
      continue;
    }
    spans.push({ connector, startIndex, endIndex });
  }

  const result = new Map<string, ConnectorEntryAttributes>();
  const patch = (entryId: string, next: ConnectorEntryAttributes) => {
    result.set(entryId, { ...result.get(entryId), ...next });
  };

  const interleaves = (a: Span, b: Span) =>
    a.startIndex < b.startIndex &&
    b.startIndex < a.endIndex &&
    a.endIndex < b.endIndex;

  for (const span of spans) {
    const { connector } = span;
    const role = (value: ConnectorRole): ConnectorEntryAttributes => ({
      [connector.kind]: value,
    });

    patch(connector.startEntryId, role('start'));
    patch(connector.endEntryId, role('end'));

    // Hairpins take only the role attribute: tie/slur get the id/for LIFO-stack
    // disambiguation, hairpins rely on the library's nearest-end rule. That rule
    // can't resolve two overlapping same-kind hairpins, so `upsertConnector`
    // guarantees they never coexist.
    if (isHairpinKind(connector.kind)) {
      continue;
    }
    const needsExplicitPairing = spans.some(
      (other) =>
        other !== span &&
        other.connector.kind === connector.kind &&
        (interleaves(span, other) || interleaves(other, span))
    );
    if (needsExplicitPairing) {
      patch(connector.startEntryId, { id: connector.startEntryId });
      patch(connector.endEntryId, { for: connector.startEntryId });
    }
  }

  return result;
}

// Adds a connector between the endpoints, replacing any existing connector of
// the same family (tie/slur, or hairpin) on the same endpoints — so a slur and
// a crescendo can coexist over one pair, but not a tie and a slur — and
// dropping any other same-kind connector that already starts at startEntryId or
// ends at endEntryId, since the renderer allows only one role of each kind per
// element. For hairpins it goes further and drops any same-kind hairpin whose
// span overlaps the new one: the library's nearest-end pairing can't resolve
// two overlapping same-kind hairpins (see resolveConnectorAttributes).
export function upsertConnector(
  structure: CompositionStructure,
  startEntryId: string,
  endEntryId: string,
  kind: ConnectorKind
): CompositionStructure {
  const sameFamily = (other: ConnectorKind) =>
    isHairpinKind(other) === isHairpinKind(kind);

  const flat = flattenEntryOrder(structure);
  const indexOf = new Map(flat.map((id, index) => [id, index]));
  const newStart = indexOf.get(startEntryId);
  const newEnd = indexOf.get(endEntryId);

  const overlapsNewHairpinSpan = (connector: NormalizedConnector) => {
    if (!isHairpinKind(kind) || connector.kind !== kind) {
      return false;
    }
    const otherStart = indexOf.get(connector.startEntryId);
    const otherEnd = indexOf.get(connector.endEntryId);
    if (
      newStart === undefined ||
      newEnd === undefined ||
      otherStart === undefined ||
      otherEnd === undefined
    ) {
      return false;
    }
    return !(otherEnd < newStart || newEnd < otherStart);
  };

  const removed = new Set<string>();
  for (const [id, connector] of Object.entries(structure.connectorsById)) {
    const samePair =
      sameFamily(connector.kind) &&
      connector.startEntryId === startEntryId &&
      connector.endEntryId === endEntryId;
    const sameKindEndpointClash =
      connector.kind === kind &&
      (connector.startEntryId === startEntryId ||
        connector.endEntryId === endEntryId);
    if (
      samePair ||
      sameKindEndpointClash ||
      overlapsNewHairpinSpan(connector)
    ) {
      removed.add(id);
    }
  }

  const newId = crypto.randomUUID();
  const connectorsById: Record<string, NormalizedConnector> = {};
  for (const [id, connector] of Object.entries(structure.connectorsById)) {
    if (!removed.has(id)) {
      connectorsById[id] = connector;
    }
  }
  connectorsById[newId] = { id: newId, kind, startEntryId, endEntryId };

  return {
    ...structure,
    connectorsById,
    connectorOrder: [
      ...structure.connectorOrder.filter((id) => !removed.has(id)),
      newId,
    ],
  };
}

// Drops every tie whose endpoints no longer join a single sustained pitch, using
// `canTie` as the authority — an entry edit (`applyEntryUpdate`) can change a
// tied note's pitch/octave, a tied chord's notes, or a `<music-clef>` marker that
// shifts a downstream tie's octave resolution, none of which the editor blocks.
// A full scan (not just ties touching the edited entry) because a clef edit
// invalidates ties it doesn't share an endpoint with. Slurs and hairpins carry
// no pitch constraint and are left alone. Chosen over blocking the edit in
// `EntryEditInput` to match the delete cascade in `deleteSelectionHelpers.ts` —
// repair dangling references rather than prevent the mutation.
export function pruneBrokenTies(
  structure: CompositionStructure
): CompositionStructure {
  const broken = new Set<string>();
  for (const id of structure.connectorOrder) {
    const connector = structure.connectorsById[id];
    if (
      connector?.kind === 'tie' &&
      !canTie(structure, {
        startEntryId: connector.startEntryId,
        endEntryId: connector.endEntryId,
      })
    ) {
      broken.add(id);
    }
  }
  if (broken.size === 0) {
    return structure;
  }

  const connectorsById: Record<string, NormalizedConnector> = {};
  for (const [id, connector] of Object.entries(structure.connectorsById)) {
    if (!broken.has(id)) {
      connectorsById[id] = connector;
    }
  }
  return {
    ...structure,
    connectorsById,
    connectorOrder: structure.connectorOrder.filter((id) => !broken.has(id)),
  };
}

export function removeConnector(
  structure: CompositionStructure,
  connectorId: string
): CompositionStructure {
  if (!structure.connectorsById[connectorId]) {
    return structure;
  }
  const connectorsById = { ...structure.connectorsById };
  delete connectorsById[connectorId];
  return {
    ...structure,
    connectorsById,
    connectorOrder: structure.connectorOrder.filter((id) => id !== connectorId),
  };
}

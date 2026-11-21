import type {
  GlissandoHint,
  TieStyle,
} from '@one-step-at-a-time/web-components';
import { effectiveClefOfEntry, resolveEntryOctaves } from './clefsHelpers';
import { flattenEntryOrder, staffOfEntry } from './entryLocationHelpers';
import { soundingOctaveShift } from './octaveHelpers';
import type {
  ChordNote,
  CompositionStructure,
  ConnectorKind,
  ConnectorRole,
  NormalizedConnector,
  Selection,
} from './types';
import { isMarkerEntry } from './types';

// Tie/slur/glissando resolution for the composition form. Mirrors the pairing rules of
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
  glissando?: ConnectorRole;
  'hammer-on'?: ConnectorRole;
  'pull-off'?: ConnectorRole;
  slide?: ConnectorRole;
  'tie-style'?: TieStyle;
  'glissando-hint'?: GlissandoHint;
  id?: string;
  for?: string;
};

// tie/slur use the id/for LIFO-stack disambiguation; hairpins are paired by the
// library's nearest-end rule and take only the role attribute.
const HAIRPIN_KINDS: ConnectorKind[] = ['crescendo', 'decrescendo'];
export function isHairpinKind(kind: ConnectorKind): boolean {
  return HAIRPIN_KINDS.includes(kind);
}

// Kinds that replace each other on one pair of endpoints: tie/slur, the two
// hairpins, and glissando on its own.
export const TECHNIQUE_KINDS: ConnectorKind[] = [
  'hammer-on',
  'pull-off',
  'slide',
];

function connectorFamily(
  kind: ConnectorKind
): 'tie-slur' | 'hairpin' | 'glissando' | 'technique' {
  if (isHairpinKind(kind)) {
    return 'hairpin';
  }
  if (TECHNIQUE_KINDS.includes(kind)) {
    return 'technique';
  }
  return kind === 'glissando' ? 'glissando' : 'tie-slur';
}

export function isTieEndpoint(
  structure: CompositionStructure,
  entryId: string
): boolean {
  return Object.values(structure.connectorsById).some(
    (connector) =>
      connector.kind === 'tie' &&
      (connector.startEntryId === entryId || connector.endEntryId === entryId)
  );
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
      (entry) => !entry || entry.type === 'rest' || isMarkerEntry(entry)
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
// endpoints: same sounding pitch(es) — so a tie across an octave line's edge
// joins different written octaves — and the two entries are immediately
// consecutive — within one staff, or the last note of one staff and the first
// note of the same voice in the very next measure.
export function canTie(
  structure: CompositionStructure,
  endpoints: ConnectorEndpoints
): boolean {
  const start = structure.entriesById[endpoints.startEntryId];
  const end = structure.entriesById[endpoints.endEntryId];
  if (!start || !end) {
    return false;
  }
  if (start.type === 'rest' || isMarkerEntry(start)) {
    return false;
  }
  if (start.type !== end.type) {
    return false;
  }
  if (
    (start.type === 'note' || start.type === 'chord') &&
    (start.laissezVibrer ||
      ((end.type === 'note' || end.type === 'chord') && end.laissezVibrer))
  ) {
    return false;
  }
  const soundingOctaves = (notes: ChordNote[], entryId: string) => {
    const shift = soundingOctaveShift(structure, entryId);
    return resolveEntryOctaves(
      effectiveClefOfEntry(structure, entryId),
      notes
    ).map((octave) => octave + shift);
  };
  if (start.type === 'guitar-note' && end.type === 'guitar-note') {
    if (start.fret !== end.fret || start.string !== end.string) {
      return false;
    }
  }
  if (start.type === 'note' && end.type === 'note') {
    if (
      start.value !== end.value ||
      soundingOctaves([start], endpoints.startEntryId)[0] !==
        soundingOctaves([end], endpoints.endEntryId)[0]
    ) {
      return false;
    }
  }
  if (start.type === 'chord' && end.type === 'chord') {
    const key = (notes: ChordNote[], entryId: string) => {
      const octaves = soundingOctaves(notes, entryId);
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

// Per-entry connector role, style and id/for attributes for the whole
// composition. One `for` serves every kind an element ends; the library falls
// back to the most recent open start of a kind whose `for` doesn't match.
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
    if (connector.kind === 'tie' && connector.style) {
      patch(connector.startEntryId, { 'tie-style': connector.style });
    }
    if (connector.kind === 'glissando' && connector.hint) {
      patch(connector.startEntryId, { 'glissando-hint': connector.hint });
    }

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

// Adds a connector, replacing one of the same family (tie/slur, or hairpin) on
// the same endpoints, and dropping same-kind connectors already starting or
// ending there (one role of each kind per element). Overlapping same-kind
// hairpins are dropped too, since the renderer can't pair them.
export function upsertConnector(
  structure: CompositionStructure,
  startEntryId: string,
  endEntryId: string,
  kind: ConnectorKind
): CompositionStructure {
  const sameFamily = (other: ConnectorKind) =>
    connectorFamily(other) === connectorFamily(kind);

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
// A full scan, since a clef edit breaks ties it doesn't touch. Slurs and
// hairpins carry no pitch constraint and are left alone.
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

// Drops every connector of any kind whose start or end entry id is in
// `entryIds`: gone, or moved to another voice (connectors pair per voice).
export function pruneConnectorsForEntries(
  structure: CompositionStructure,
  entryIds: ReadonlySet<string>
): CompositionStructure {
  if (entryIds.size === 0) {
    return structure;
  }
  const broken = new Set(
    Object.entries(structure.connectorsById)
      .filter(
        ([, connector]) =>
          entryIds.has(connector.startEntryId) ||
          entryIds.has(connector.endEntryId)
      )
      .map(([id]) => id)
  );
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

// Sets a tie's style or a glissando's hint; unchanged when it already has it.
export function setConnectorOptions(
  structure: CompositionStructure,
  connectorId: string,
  options: Pick<NormalizedConnector, 'style' | 'hint'>
): CompositionStructure {
  const connector = structure.connectorsById[connectorId];
  if (!connector) {
    return structure;
  }
  const next = { ...connector, ...options };
  if (
    (next.style ?? null) === (connector.style ?? null) &&
    (next.hint ?? null) === (connector.hint ?? null)
  ) {
    return structure;
  }
  return {
    ...structure,
    connectorsById: { ...structure.connectorsById, [connectorId]: next },
  };
}

// An entry that ends up a tie endpoint (a rebar split, say) drops its
// laissez-vibrer: both would need the element's one `tie` attribute.
export function pruneLaissezVibrerOnTies(
  structure: CompositionStructure
): CompositionStructure {
  let entriesById: CompositionStructure['entriesById'] | null = null;
  for (const entry of Object.values(structure.entriesById)) {
    if (
      (entry.type === 'note' || entry.type === 'chord') &&
      entry.laissezVibrer &&
      isTieEndpoint(structure, entry.id)
    ) {
      entriesById ??= { ...structure.entriesById };
      entriesById[entry.id] = { ...entry, laissezVibrer: null };
    }
  }
  return entriesById ? { ...structure, entriesById } : structure;
}

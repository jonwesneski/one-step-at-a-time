import type { DurationType } from '@one-step-at-a-time/web-components';
import { durationToFactor } from '@one-step-at-a-time/web-components';
import { decomposeToDurations } from './durationHelpers';
import {
  CAPACITY_EPSILON,
  entryFactor,
  measureDuration,
} from './measureCapacityHelpers';
import {
  effectiveTimeSignatures,
  timeSignatureRegionAt,
} from './timeSignaturesHelpers';
import { resolveTupletRuns } from './tupletsHelpers';
import type {
  CompositionStructure,
  MusicEntry,
  NormalizedConnector,
  NormalizedMeasure,
  NormalizedStaff,
  NormalizedVoice,
  PitchedEntry,
} from './types';
import { isPitchedEntry } from './types';

// Re-flows one time signature region into measures of its (already-updated) time
// signature: the note stream of each staff index is concatenated and re-sliced,
// notes that cross a new barline are split into a tie chain, and measures are
// minted or dropped to fit. Measures outside the region are untouched — a later
// explicit `measure.time` is a fixed point. Parts are matched by staff index,
// mirroring `connectorsHelpers.ts`'s "same voice = same staff index".
//
// Alternatives rejected: padding every region tail with rests (MuseScore's
// full-measure invariant) — this app already renders under-full measures, so a
// short final measure is left as-is; and splitting tuplet runs at a barline —
// a run moves whole instead, since `<music-tuplet>` can't span a measure.
export function rebar(
  structure: CompositionStructure,
  fromMeasureIndex: number
): CompositionStructure {
  const order = structure.measureOrder;
  if (order.length === 0) {
    return structure;
  }
  const idx = Math.max(0, Math.min(fromMeasureIndex, order.length - 1));
  const { startIndex, endIndex } = timeSignatureRegionAt(structure, idx);
  const timeSignature = effectiveTimeSignatures(structure)[startIndex];
  const capacity = measureDuration(timeSignature);

  const regionMeasureIds = order.slice(startIndex, endIndex);
  const regionMeasureIdSet = new Set(regionMeasureIds);
  const regionMeasures = regionMeasureIds.map(
    (id) => structure.measuresById[id]
  );

  const staffCount = Math.max(
    0,
    ...regionMeasures.map((m) => m.staffIds.length)
  );
  if (staffCount === 0) {
    return structure;
  }

  // A staff's voice count must stay identical across every measure in the
  // region — mirrors the library's own documented "inconsistent staff/voice
  // count across measures is not supported" constraint. Warn and no-op
  // (rather than silently guessing which measure's voice count is "right")
  // when it differs, same as the staffCount===0 no-op above.
  const staffTemplate: {
    type: NormalizedStaff['type'];
    group: NormalizedStaff['group'];
    groupId: NormalizedStaff['groupId'];
    voiceCount: number;
  }[] = [];
  for (let si = 0; si < staffCount; si++) {
    const staffCandidates = regionMeasures
      .map((m) => structure.stavesById[m.staffIds[si]])
      .filter((s): s is NormalizedStaff => Boolean(s));
    const voiceCounts = new Set(
      staffCandidates.map((s) => s.voiceOrder.length)
    );
    if (voiceCounts.size > 1) {
      console.warn(
        `[rebarHelpers] staff index ${si}'s voice count is inconsistent across this region's measures; skipping rebar`
      );
      return structure;
    }
    const src = staffCandidates[0];
    staffTemplate.push({
      type: src?.type ?? 'treble',
      group: src?.group ?? null,
      groupId: src?.groupId ?? null,
      voiceCount: src?.voiceOrder.length ?? 1,
    });
  }

  const entriesById: Record<string, MusicEntry> = { ...structure.entriesById };
  const newTies: NormalizedConnector[] = [];
  const tieReanchor = new Map<string, string>();

  // Each staff's voices reflow independently — a voice is its own rhythmic
  // stream, same as a staff index is its own "part" (see collectStream).
  const perStaffVoiceMeasures = staffTemplate.map((tpl, si) =>
    Array.from({ length: tpl.voiceCount }, (_, vi) =>
      reflowStaff(
        collectStream(structure, regionMeasures, si, vi),
        capacity,
        structure,
        entriesById,
        newTies,
        tieReanchor
      )
    )
  );

  const regionHasContent = perStaffVoiceMeasures.some((voices) =>
    voices.some((ms) => ms.some((entries) => entries.length > 0))
  );
  const newMeasureCount = Math.max(
    regionHasContent ? 1 : regionMeasureIds.length,
    ...perStaffVoiceMeasures.flatMap((voices) => voices.map((ms) => ms.length))
  );

  const newMeasuresById: Record<string, NormalizedMeasure> = {};
  const newStavesById: Record<string, NormalizedStaff> = {};
  const newMeasureIds: string[] = [];
  for (let mi = 0; mi < newMeasureCount; mi++) {
    const measureId = crypto.randomUUID();
    newMeasureIds.push(measureId);
    const staffIds = staffTemplate.map((tpl, si) => {
      const staffId = crypto.randomUUID();
      const voiceOrder: string[] = [];
      const voicesById: Record<string, NormalizedVoice> = {};
      for (let vi = 0; vi < tpl.voiceCount; vi++) {
        const voiceId = crypto.randomUUID();
        voiceOrder.push(voiceId);
        voicesById[voiceId] = {
          id: voiceId,
          entryIds: perStaffVoiceMeasures[si][vi][mi] ?? [],
        };
      }
      newStavesById[staffId] = {
        id: staffId,
        type: tpl.type,
        group: tpl.group,
        groupId: tpl.groupId,
        voiceOrder,
        voicesById,
      };
      return staffId;
    });
    newMeasuresById[measureId] = {
      id: measureId,
      staffIds,
      time: mi === 0 && startIndex > 0 ? timeSignature : null,
    };
  }

  const measureOrder = [
    ...order.slice(0, startIndex),
    ...newMeasureIds,
    ...order.slice(endIndex),
  ];

  const measuresById: Record<string, NormalizedMeasure> = {
    ...newMeasuresById,
  };
  for (const [id, measure] of Object.entries(structure.measuresById)) {
    if (!regionMeasureIdSet.has(id)) {
      measuresById[id] = measure;
    }
  }

  const oldRegionStaffIds = new Set(regionMeasures.flatMap((m) => m.staffIds));
  const stavesById: Record<string, NormalizedStaff> = { ...newStavesById };
  for (const [id, staff] of Object.entries(structure.stavesById)) {
    if (!oldRegionStaffIds.has(id)) {
      stavesById[id] = staff;
    }
  }

  const connectorsById: Record<string, NormalizedConnector> = {};
  for (const [id, connector] of Object.entries(structure.connectorsById)) {
    const reanchored = tieReanchor.get(connector.startEntryId);
    connectorsById[id] =
      reanchored && connector.kind === 'tie'
        ? { ...connector, startEntryId: reanchored }
        : connector;
  }
  const connectorOrder = [...structure.connectorOrder];
  for (const tie of newTies) {
    connectorsById[tie.id] = tie;
    connectorOrder.push(tie.id);
  }

  return {
    ...structure,
    measureOrder,
    measuresById,
    stavesById,
    entriesById,
    connectorsById,
    connectorOrder,
  };
}

function collectStream(
  structure: CompositionStructure,
  regionMeasures: NormalizedMeasure[],
  staffIndex: number,
  voiceIndex: number
): string[] {
  const ids: string[] = [];
  for (const measure of regionMeasures) {
    const staff = structure.stavesById[measure.staffIds[staffIndex]];
    const voiceId = staff?.voiceOrder[voiceIndex];
    const voice = voiceId ? staff.voicesById[voiceId] : undefined;
    if (voice) {
      ids.push(...voice.entryIds);
    }
  }
  return ids;
}

function reflowStaff(
  stream: string[],
  capacity: number,
  structure: CompositionStructure,
  entriesById: Record<string, MusicEntry>,
  newTies: NormalizedConnector[],
  tieReanchor: Map<string, string>
): string[][] {
  const measures: string[][] = [[]];
  let offset = 0;
  const current = () => measures[measures.length - 1];
  const flush = () => {
    measures.push([]);
    offset = 0;
  };

  for (const run of resolveTupletRuns(stream, structure.entriesById)) {
    if (run.tupletId !== null) {
      const runFactor = run.entries.reduce(
        (sum, entry) => sum + entryFactor(entry, structure.tupletsById),
        0
      );
      if (
        offset > CAPACITY_EPSILON &&
        offset + runFactor > capacity + CAPACITY_EPSILON
      ) {
        flush();
      }
      for (const entry of run.entries) {
        current().push(entry.id);
      }
      offset += runFactor;
      if (offset >= capacity - CAPACITY_EPSILON) {
        flush();
      }
      continue;
    }

    const entry = run.entries[0];
    if (!isPitchedEntry(entry)) {
      current().push(entry.id);
      continue;
    }

    const factor = durationToFactor[entry.duration];
    if (offset + factor <= capacity + CAPACITY_EPSILON) {
      current().push(entry.id);
      offset += factor;
      if (offset >= capacity - CAPACITY_EPSILON) {
        flush();
      }
      continue;
    }

    const segmentIds: string[] = [];
    let remaining = factor;
    while (remaining > CAPACITY_EPSILON) {
      const take = Math.min(remaining, capacity - offset);
      for (const duration of decomposeToDurations(take)) {
        const id = segmentIds.length === 0 ? entry.id : crypto.randomUUID();
        entriesById[id] =
          id === entry.id
            ? { ...entry, duration, tupletId: null }
            : bareSegment(entry, duration, id);
        segmentIds.push(id);
        current().push(id);
        offset += durationToFactor[duration];
      }
      remaining -= take;
      if (remaining > CAPACITY_EPSILON) {
        flush();
      }
    }
    for (let i = 1; i < segmentIds.length; i++) {
      newTies.push({
        id: crypto.randomUUID(),
        kind: 'tie',
        startEntryId: segmentIds[i - 1],
        endEntryId: segmentIds[i],
      });
    }
    if (segmentIds.length > 1) {
      tieReanchor.set(entry.id, segmentIds[segmentIds.length - 1]);
    }
    if (offset >= capacity - CAPACITY_EPSILON) {
      flush();
    }
  }

  if (measures.length > 1 && measures[measures.length - 1].length === 0) {
    measures.pop();
  }
  return measures;
}

function bareSegment(
  entry: PitchedEntry,
  duration: DurationType,
  id: string
): MusicEntry {
  if (entry.type === 'note') {
    return {
      id,
      type: 'note',
      value: entry.value,
      octave: entry.octave,
      duration,
    };
  }
  if (entry.type === 'chord') {
    return {
      id,
      type: 'chord',
      notes: entry.notes.map((note) => ({ ...note })),
      duration,
    };
  }
  return { id, type: 'rest', duration };
}

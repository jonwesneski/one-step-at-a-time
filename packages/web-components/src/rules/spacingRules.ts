import { DurationType } from '../types/theory';
import {
  LAST_ENTRY_GAP_PX,
  MIN_NOTE_WIDTH,
  PIXELS_PER_BEAT,
} from '../utils/notationDimensions';
import {
  type MarkerBeat,
  markerWidthReached,
  totalMarkerWidth,
} from './streamMarkerRules';
import { durationToFactor } from './theoryConsts';

/**
 * Three separate concerns:
 * 1. Position (`computeMeasureProportionalOffsets`): an entry's beat-offset
 *    over the measure's fixed beat capacity, scaled by the available width.
 * 2. Room for the rest of the bar (`computeRoomAfterEntries`): how far from
 *    the end of the notes area an entry must stay for what follows it to fit.
 * 3. Sizing preference (`computeSpacingWeights`): how wide a measure would
 *    like to be given how busy it is; it doesn't move entries.
 */

// ─── Position ───────────────────────────────────────────────────────────────

/** The furthest offset (px) the entries on a beat may take. */
export type OffsetLimit = { beat: number; offset: number };

/**
 * Per-entry x-offset (px): `beatOffsets[i] / measureCapacity ×
 * availableWidth`. Neither depends on entry count, so appending never moves an
 * earlier entry. Where that passes a limit, the beats before it are squeezed
 * together in proportion and the ones after it spread (the convex curve under
 * the limits), so it is the same curve for every staff given the same limits
 * and changes smoothly with the width. Callers layer collision clamps on top.
 */
export function computeMeasureProportionalOffsets(
  beatOffsets: readonly number[],
  measureCapacity: number,
  availableWidth: number,
  limits: readonly OffsetLimit[] = []
): number[] {
  if (measureCapacity <= 0) {
    return beatOffsets.map(() => 0);
  }
  const width = Math.max(0, availableWidth);
  const proportional = (beat: number): number =>
    (beat / measureCapacity) * width;
  const binding = limits.filter(
    ({ beat, offset }) =>
      beat > 0 && beat < measureCapacity && offset < proportional(beat)
  );
  if (binding.length === 0) {
    return beatOffsets.map(proportional);
  }
  const curve = lowerConvexHull([
    { beat: 0, offset: 0 },
    ...binding.map(({ beat, offset }) => ({
      beat,
      offset: Math.max(0, offset),
    })),
    { beat: measureCapacity, offset: width },
  ]);
  return beatOffsets.map((beat) => {
    const end = curve.findIndex((point) => point.beat >= beat);
    if (end < 0) {
      return proportional(beat);
    }
    if (end === 0) {
      return curve[0].offset;
    }
    const [from, to] = [curve[end - 1], curve[end]];
    return (
      from.offset +
      ((to.offset - from.offset) * (beat - from.beat)) / (to.beat - from.beat)
    );
  });
}

function lowerConvexHull(points: readonly OffsetLimit[]): OffsetLimit[] {
  const sorted = [...points].sort(
    (a, b) => a.beat - b.beat || a.offset - b.offset
  );
  const hull: OffsetLimit[] = [];
  for (const point of sorted) {
    if (hull.length > 0 && hull[hull.length - 1].beat === point.beat) {
      continue;
    }
    while (hull.length >= 2) {
      const [a, b] = hull.slice(-2);
      const turnsDown =
        (b.offset - a.offset) * (point.beat - a.beat) >=
        (point.offset - a.offset) * (b.beat - a.beat);
      if (!turnsDown) {
        break;
      }
      hull.pop();
    }
    hull.push(point);
  }
  return hull;
}

// ─── Room for the rest of the bar ───────────────────────────────────────────

/** Room (px) the entries from a beat on need before the end of the bar. */
export type ColumnRoom = { beat: number; roomAfter: number };

/** One voice's spacing needs, on any staff of the measure. */
export type VoiceRooms = {
  beatOffsets: readonly number[];
  /**
   * Least distance (px) from each entry to the next one, the last to the end
   * of the notes area.
   */
  rooms: readonly number[];
  /** Least distance (px) from the start of the notes area to the first entry. */
  lead: number;
};

const ROOM_BEAT_EPSILON = 1e-9;

/**
 * Each entry's room to the end of the notes area, per voice, and each beat's.
 * Entries sharing a beat share its room, so columns stay aligned. A run of
 * entries on one beat (an arpeggio's) takes the beat's room at its first.
 */
export function computeRoomAfterEntries(voices: readonly VoiceRooms[]): {
  roomAfter: number[][];
  columns: ColumnRoom[];
} {
  const roomAfter = voices.map(({ rooms }) => rooms.map(() => 0));
  const beats = columnBeats(voices).reverse();
  const columns: ColumnRoom[] = [];
  let later = 0;
  for (const beat of beats) {
    const firsts: { voice: number; index: number }[] = [];
    let column = later;
    voices.forEach(({ beatOffsets, rooms }, voice) => {
      for (let i = rooms.length - 1; i >= 0; i--) {
        if (Math.abs(beatOffsets[i] - beat) > ROOM_BEAT_EPSILON) {
          continue;
        }
        roomAfter[voice][i] = rooms[i] + (roomAfter[voice][i + 1] ?? 0);
        const isFirst =
          i === 0 || Math.abs(beatOffsets[i - 1] - beat) > ROOM_BEAT_EPSILON;
        if (isFirst) {
          firsts.push({ voice, index: i });
          column = Math.max(column, roomAfter[voice][i]);
        }
      }
    });
    for (const { voice, index } of firsts) {
      roomAfter[voice][index] = column;
    }
    later = column;
    columns.unshift({ beat, roomAfter: column });
  }
  return { roomAfter, columns };
}

function columnBeats(voices: readonly VoiceRooms[]): number[] {
  return [...new Set(voices.flatMap((voice) => [...voice.beatOffsets]))]
    .sort((a, b) => a - b)
    .filter((beat, i, all) => i === 0 || beat - all[i - 1] > ROOM_BEAT_EPSILON);
}

/** Where a beat's entries start, in px from the start of the notes area. */
export type ColumnOffset = { beat: number; offset: number };

/**
 * Each beat's place: the one `beatPlace` gives it, or later where any voice's
 * entry on it has to clear the one before.
 */
export function computeColumnOffsets(
  voices: readonly VoiceRooms[],
  beatPlace: (beat: number) => number
): ColumnOffset[] {
  const next = voices.map(({ lead }) => ({ index: 0, offset: lead }));
  return columnBeats(voices).map((beat) => {
    const onBeat = voices.flatMap(({ beatOffsets }, voice) =>
      Math.abs(beatOffsets[next[voice].index] - beat) <= ROOM_BEAT_EPSILON
        ? [voice]
        : []
    );
    const offset = Math.max(
      beatPlace(beat),
      ...onBeat.map((voice) => next[voice].offset)
    );
    for (const voice of onBeat) {
      const { beatOffsets, rooms } = voices[voice];
      const entry = next[voice];
      entry.offset = offset;
      while (Math.abs(beatOffsets[entry.index] - beat) <= ROOM_BEAT_EPSILON) {
        entry.offset += rooms[entry.index];
        entry.index++;
      }
    }
    return { beat, offset };
  });
}

/** A beat's place among computed columns. */
export function columnOffsetAt(
  columns: readonly ColumnOffset[],
  beat: number
): number {
  return (
    columns.find((column) => Math.abs(column.beat - beat) <= ROOM_BEAT_EPSILON)
      ?.offset ?? 0
  );
}

/**
 * Least width (px) of the notes area that holds every voice, given each
 * beat's room (from `computeRoomAfterEntries`).
 */
export function computeRequiredWidth(
  voices: readonly VoiceRooms[],
  columns: readonly ColumnRoom[]
): number {
  return voices.reduce((width, { beatOffsets, lead }) => {
    const column = columns.find(
      ({ beat }) => Math.abs(beat - beatOffsets[0]) <= ROOM_BEAT_EPSILON
    );
    return Math.max(width, lead + (column?.roomAfter ?? 0));
  }, 0);
}

/**
 * The width to share out by beat at which no beat's place is too late for the
 * room (px) needed after it.
 */
export function computeUncrowdedWidth(
  columns: readonly ColumnRoom[],
  measureCapacity: number
): number {
  return columns.reduce(
    (width, { beat, roomAfter }) =>
      beat < measureCapacity - ROOM_BEAT_EPSILON
        ? Math.max(width, roomAfter / (1 - beat / measureCapacity))
        : width,
    0
  );
}

// ─── The bar as a whole ─────────────────────────────────────────────────────

export type BarSpacing = {
  /** Per voice, in `voices` order. */
  roomAfter: number[][];
  /** A beat's place from its share of the bar, before any marker's room. */
  placeOf: (beat: number) => number;
  /** Where each beat's entries start, markers included. */
  columns: ColumnOffset[];
  /** Least notes-area width that holds the bar. */
  requiredWidth: number;
  /** Least notes-area width at which no beat is moved to fit what follows. */
  uncrowdedWidth: number;
};

/**
 * Lays out a bar's beats from every voice on every staff of the measure, so
 * each staff given the same voices puts them in the same places. Offsets and
 * widths are from the start of the notes area. The beats share all of it but
 * LAST_ENTRY_GAP_PX, kept whether or not the bar is full, so the last entry of
 * an evenly filled bar has its gap already and moves nothing.
 */
export function layOutBar(
  voices: readonly VoiceRooms[],
  markers: readonly MarkerBeat[],
  measureCapacity: number,
  notesWidth: number
): BarSpacing {
  const markersWidth = totalMarkerWidth(markers);
  const sharedWidth = notesWidth - markersWidth - LAST_ENTRY_GAP_PX;
  const { roomAfter, columns: rooms } = computeRoomAfterEntries(voices);
  const limits = rooms.map(({ beat, roomAfter: room }) => ({
    beat,
    offset: notesWidth - markerWidthReached(markers, beat) - room,
  }));
  const placeOf = (beat: number): number =>
    computeMeasureProportionalOffsets(
      [beat],
      measureCapacity,
      sharedWidth,
      limits
    )[0];
  return {
    roomAfter,
    placeOf,
    columns: computeColumnOffsets(
      voices,
      (beat) => markerWidthReached(markers, beat) + placeOf(beat)
    ),
    requiredWidth: computeRequiredWidth(voices, rooms),
    uncrowdedWidth:
      markersWidth +
      LAST_ENTRY_GAP_PX +
      computeUncrowdedWidth(
        rooms.map(({ beat, roomAfter: room }) => ({
          beat,
          roomAfter:
            room +
            markerWidthReached(markers, beat) -
            markersWidth -
            LAST_ENTRY_GAP_PX,
        })),
        measureCapacity
      ),
  };
}

// ─── Sizing preference ──────────────────────────────────────────────────────

export interface SpacingWeights {
  /**
   * Per-entry slack (px) beyond the MIN_NOTE_WIDTH strut, parallel to
   * `entries`, floored at 0. Excludes the strut, which staffWidth.ts adds.
   */
  weights: number[];
  /** Σ of `weights` — the measure's total slack beyond its strut. */
  totalWeight: number;
}

/**
 * Slack (px) beyond the MIN_NOTE_WIDTH strut for every entry: its own
 * duration × PIXELS_PER_BEAT minus the strut, scaled by
 * `tupletScaleByIndex.get(i)` (normal/actual) when tupleted, floored at 0.
 * Feeds only the measure's sizing *preference* (staffWidth.ts) — not entry
 * position, which is computeMeasureProportionalOffsets above.
 */
export function computeSpacingWeights(
  entries: ReadonlyArray<{ readonly duration: DurationType }>,
  tupletScaleByIndex: ReadonlyMap<number, number> = new Map()
): SpacingWeights {
  let totalWeight = 0;
  const weights = entries.map((entry, i) => {
    const factor = durationToFactor[entry.duration];
    const scale = tupletScaleByIndex.get(i) ?? 1;
    const weight =
      Math.max(0, factor * PIXELS_PER_BEAT - MIN_NOTE_WIDTH) * scale;
    totalWeight += weight;
    return weight;
  });
  return { weights, totalWeight };
}

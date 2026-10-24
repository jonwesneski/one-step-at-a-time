import type {
  Octave,
  OctaveContinuationMode,
  OctaveDisplayMode,
  OctaveShiftAmount,
} from '@one-step-at-a-time/web-components';
import { OCTAVES } from '@one-step-at-a-time/web-components';
import {
  effectiveClefOfEntry,
  resolveEntryOctaves,
  resolveNoteOctave,
} from './clefsHelpers';
import { flattenEntryOrder, staffOfEntry } from './entryLocationHelpers';
import type {
  CompositionStructure,
  MusicEntry,
  NormalizedOctaveSpan,
  OctaveSpanEnd,
  Selection,
} from './types';

// Octave-transposition spans for the composition form. Mirrors the library's
// rules/octaveRules.ts#resolveOctaveSpans: a span opens at the element
// carrying `octave-shift` and closes at the one carrying `octave-stop` (or
// `loco`), per voice, continuing across barlines along one staff track
// (composition.ts matches tracks by staff position, as here). This app is the
// sole writer, so it only emits non-overlapping, well-ordered spans.
//
// Pitches are stored as written. Applying a span keeps every member sounding
// where it was, so written octaves move opposite to the shift (8va: one octave
// down); removing it moves them back.

const SOUNDING_OCTAVES_ABOVE_WRITTEN: Record<OctaveShiftAmount, number> = {
  '8va': 1,
  '8vb': -1,
  '15ma': 2,
  '15mb': -2,
  '22ma': 3,
  '22mb': -3,
};

export type OctaveSpanRange = { startEntryId: string; endEntryId: string };

export type OctaveSpanSettings = {
  amount: OctaveShiftAmount;
  mode: OctaveDisplayMode;
  continuation: OctaveContinuationMode;
  end: OctaveSpanEnd;
};

export const DEFAULT_OCTAVE_SPAN_SETTINGS: Omit<OctaveSpanSettings, 'amount'> =
  { mode: 'sign', continuation: 'bracketed', end: 'stop' };

const isNoteOrChord = (entry: MusicEntry | undefined): boolean =>
  entry?.type === 'note' || entry?.type === 'chord';

// Every entry id from `startEntryId` to `endEntryId` inclusive along their
// shared staff track + voice, or null when they don't share one or are out of
// order.
export function octaveSpanMemberIds(
  structure: CompositionStructure,
  { startEntryId, endEntryId }: OctaveSpanRange
): string[] | null {
  const start = staffOfEntry(structure, startEntryId);
  const end = staffOfEntry(structure, endEntryId);
  if (
    !start ||
    !end ||
    start.staffIndex !== end.staffIndex ||
    start.voiceIndex !== end.voiceIndex ||
    start.measureIndex > end.measureIndex
  ) {
    return null;
  }
  const trackIds: string[] = [];
  for (let m = start.measureIndex; m <= end.measureIndex; m++) {
    const measure = structure.measuresById[structure.measureOrder[m]];
    const staff = structure.stavesById[measure?.staffIds[start.staffIndex]];
    const voiceId = staff?.voiceOrder[start.voiceIndex];
    if (voiceId) {
      trackIds.push(...staff.voicesById[voiceId].entryIds);
    }
  }
  const from = trackIds.indexOf(startEntryId);
  const to = trackIds.indexOf(endEntryId);
  if (from === -1 || to === -1 || from > to) {
    return null;
  }
  return trackIds.slice(from, to + 1);
}

// Interprets a selection as an octave-span range: one or more note/chord
// entries (rests may sit between them) on one staff track + voice. The
// endpoints are the first and last note/chord in document order.
export function octaveSpanCandidate(
  selection: Selection,
  structure: CompositionStructure
): OctaveSpanRange | null {
  if (
    selection.entryIds.length === 0 ||
    selection.measureIds.length > 0 ||
    selection.staffIds.length > 0
  ) {
    return null;
  }
  const selected = new Set(selection.entryIds);
  const ordered = flattenEntryOrder(structure).filter(
    (id) => selected.has(id) && isNoteOrChord(structure.entriesById[id])
  );
  if (ordered.length === 0) {
    return null;
  }
  const range = {
    startEntryId: ordered[0],
    endEntryId: ordered[ordered.length - 1],
  };
  const members = octaveSpanMemberIds(structure, range);
  if (!members || selection.entryIds.some((id) => !members.includes(id))) {
    return null;
  }
  return range;
}

function spanMembers(
  structure: CompositionStructure,
  span: OctaveSpanRange
): string[] {
  return octaveSpanMemberIds(structure, span) ?? [];
}

// The existing span covering every entry of `range`, if any — what the
// Octave panel edits when the selection sits inside a span.
export function octaveSpanContaining(
  structure: CompositionStructure,
  range: OctaveSpanRange
): NormalizedOctaveSpan | null {
  const wanted = octaveSpanMemberIds(structure, range) ?? [];
  return (
    Object.values(structure.octaveSpansById).find((span) => {
      const members = spanMembers(structure, span);
      return wanted.every((id) => members.includes(id));
    }) ?? null
  );
}

// How many octaves above its written pitch `entryId` sounds — what a pitch
// comparison across an octave line's edge (a tie) has to add back.
export function soundingOctaveShift(
  structure: CompositionStructure,
  entryId: string
): number {
  const span = Object.values(structure.octaveSpansById).find((candidate) =>
    spanMembers(structure, candidate).includes(entryId)
  );
  return span ? SOUNDING_OCTAVES_ABOVE_WRITTEN[span.amount] : 0;
}

function shiftOctave(octave: number, delta: number): Octave | null {
  const shifted = octave + delta;
  return (OCTAVES as number[]).includes(shifted) ? (shifted as Octave) : null;
}

// `entry` with every written octave (main pitch, chord notes, grace notes)
// moved by `delta`, materializing clef-default octaves first. Null when any
// octave would leave the supported range.
function transposeEntry(
  structure: CompositionStructure,
  entry: MusicEntry,
  delta: number
): MusicEntry | null {
  if (delta === 0 || (entry.type !== 'note' && entry.type !== 'chord')) {
    return entry;
  }
  const clef = effectiveClefOfEntry(structure, entry.id);

  let grace = entry.grace;
  if (grace && grace.notes.length > 0) {
    const octaves = grace.notes.map((value, i) =>
      shiftOctave(
        resolveNoteOctave(clef, value, grace?.octaves?.[i] ?? null),
        delta
      )
    );
    if (octaves.some((octave) => octave === null)) {
      return null;
    }
    grace = { ...grace, octaves: octaves as Octave[] };
  }

  if (entry.type === 'note') {
    const octave = shiftOctave(
      resolveNoteOctave(clef, entry.value, entry.octave),
      delta
    );
    return octave === null ? null : { ...entry, octave, grace };
  }

  const resolved = resolveEntryOctaves(clef, entry.notes);
  const notes = entry.notes.map((note, i) => ({
    ...note,
    octave: shiftOctave(resolved[i], delta),
  }));
  if (notes.some((note) => note.octave === null)) {
    return null;
  }
  return { ...entry, notes, grace };
}

function transposeMembers(
  structure: CompositionStructure,
  memberIds: string[],
  delta: number
): CompositionStructure | null {
  if (delta === 0) {
    return structure;
  }
  const entriesById = { ...structure.entriesById };
  for (const id of memberIds) {
    const transposed = transposeEntry(structure, entriesById[id], delta);
    if (transposed === null) {
      return null;
    }
    entriesById[id] = transposed;
  }
  return { ...structure, entriesById };
}

function withoutSpan(
  structure: CompositionStructure,
  spanId: string
): CompositionStructure {
  const octaveSpansById = { ...structure.octaveSpansById };
  delete octaveSpansById[spanId];
  return { ...structure, octaveSpansById };
}

// Removes `spanId`, moving its members' written octaves back so they keep
// sounding where they did under the span.
export function removeOctaveSpan(
  structure: CompositionStructure,
  spanId: string
): CompositionStructure | null {
  const span = structure.octaveSpansById[spanId];
  if (!span) {
    return structure;
  }
  const reverted = transposeMembers(
    structure,
    spanMembers(structure, span),
    SOUNDING_OCTAVES_ABOVE_WRITTEN[span.amount]
  );
  return reverted && withoutSpan(reverted, spanId);
}

// Creates or updates the span over `range`. Any other span sharing a member
// is removed first (one track can't nest or overlap octave lines). Returns
// null when a member's written octave would leave the supported range.
export function upsertOctaveSpan(
  structure: CompositionStructure,
  range: OctaveSpanRange,
  settings: OctaveSpanSettings,
  existingSpanId: string | null = null
): CompositionStructure | null {
  const memberIds = octaveSpanMemberIds(structure, range);
  if (!memberIds) {
    return null;
  }
  const existing = existingSpanId
    ? structure.octaveSpansById[existingSpanId]
    : undefined;

  let next: CompositionStructure | null = structure;
  for (const span of Object.values(structure.octaveSpansById)) {
    if (
      span.id !== existing?.id &&
      spanMembers(structure, span).some((id) => memberIds.includes(id))
    ) {
      next = next && removeOctaveSpan(next, span.id);
    }
  }
  if (!next) {
    return null;
  }

  const previousShift = existing
    ? SOUNDING_OCTAVES_ABOVE_WRITTEN[existing.amount]
    : 0;
  next = transposeMembers(
    next,
    memberIds,
    previousShift - SOUNDING_OCTAVES_ABOVE_WRITTEN[settings.amount]
  );
  if (!next) {
    return null;
  }

  const id = existing?.id ?? crypto.randomUUID();
  return {
    ...next,
    octaveSpansById: {
      ...next.octaveSpansById,
      [id]: { id, ...range, ...settings },
    },
  };
}

// Whether `amount` keeps every member of `range` within the supported octave
// range — filters the Amount picker, like tupletRatioFits does for ratios.
export function octaveAmountFits(
  structure: CompositionStructure,
  range: OctaveSpanRange,
  amount: OctaveShiftAmount,
  existingSpanId: string | null
): boolean {
  return (
    upsertOctaveSpan(
      structure,
      range,
      { amount, ...DEFAULT_OCTAVE_SPAN_SETTINGS },
      existingSpanId
    ) !== null
  );
}

// Called with the structure *before* `removedEntryIds` are deleted: each span
// shrinks to the note/chord members it keeps, so deleting the last note of an
// 8va passage leaves the line over the rest (and their written pitches still
// sound where they did). A span with no note/chord left is dropped.
export function octaveSpansWithoutEntries(
  structure: CompositionStructure,
  removedEntryIds: ReadonlySet<string>
): Record<string, NormalizedOctaveSpan> {
  const octaveSpansById: Record<string, NormalizedOctaveSpan> = {};
  for (const span of Object.values(structure.octaveSpansById)) {
    const remaining = spanMembers(structure, span).filter(
      (id) =>
        !removedEntryIds.has(id) && isNoteOrChord(structure.entriesById[id])
    );
    if (remaining.length > 0) {
      octaveSpansById[span.id] = {
        ...span,
        startEntryId: remaining[0],
        endEntryId: remaining[remaining.length - 1],
      };
    }
  }
  return octaveSpansById;
}

// Called with the structure before and after `movedEntryId` changes place in
// its voice. Every other member keeps its span. The moved entry joins the span
// it now sits inside — or stays in its own when it lands right at that span's
// edge — and is rewritten to keep sounding where it did. Null when that
// rewrite would leave the supported octave range.
export function octaveSpansAfterMove(
  before: CompositionStructure,
  after: CompositionStructure,
  movedEntryId: string
): CompositionStructure | null {
  if (!isNoteOrChord(before.entriesById[movedEntryId])) {
    return after;
  }
  const ownSpan = Object.values(before.octaveSpansById).find((span) =>
    spanMembers(before, span).includes(movedEntryId)
  );
  const octaveSpansById = octaveSpansWithoutEntries(
    before,
    new Set([movedEntryId])
  );
  const next = { ...after, octaveSpansById };

  const landedInside = Object.values(octaveSpansById).some((span) =>
    spanMembers(next, span).includes(movedEntryId)
  );
  if (!landedInside && ownSpan) {
    const remaining = octaveSpansById[ownSpan.id];
    if (!remaining) {
      octaveSpansById[ownSpan.id] = {
        ...ownSpan,
        startEntryId: movedEntryId,
        endEntryId: movedEntryId,
      };
    } else {
      const length = spanMembers(next, remaining).length;
      const leading = octaveSpanMemberIds(next, {
        startEntryId: movedEntryId,
        endEntryId: remaining.endEntryId,
      });
      const trailing = octaveSpanMemberIds(next, {
        startEntryId: remaining.startEntryId,
        endEntryId: movedEntryId,
      });
      if (leading?.length === length + 1) {
        octaveSpansById[ownSpan.id] = {
          ...remaining,
          startEntryId: movedEntryId,
        };
      } else if (trailing?.length === length + 1) {
        octaveSpansById[ownSpan.id] = {
          ...remaining,
          endEntryId: movedEntryId,
        };
      }
    }
  }

  return transposeMembers(
    next,
    [movedEntryId],
    soundingOctaveShift(before, movedEntryId) -
      soundingOctaveShift(next, movedEntryId)
  );
}

// Drops spans whose endpoints no longer share a track in order (a staff
// removed above them, a voice move), then any span sharing a member with one
// kept before it. No pitches move: there is no longer a well-defined member
// run to restore.
export function pruneInvalidOctaveSpans(
  structure: CompositionStructure
): CompositionStructure {
  let changed = false;
  const claimed = new Set<string>();
  const octaveSpansById: Record<string, NormalizedOctaveSpan> = {};
  for (const span of Object.values(structure.octaveSpansById)) {
    const members =
      isNoteOrChord(structure.entriesById[span.startEntryId]) &&
      isNoteOrChord(structure.entriesById[span.endEntryId])
        ? octaveSpanMemberIds(structure, span)
        : null;
    if (!members || members.some((id) => claimed.has(id))) {
      changed = true;
      continue;
    }
    for (const id of members) {
      claimed.add(id);
    }
    octaveSpansById[span.id] = span;
  }
  return changed ? { ...structure, octaveSpansById } : structure;
}

export type OctaveEntryAttributes = {
  'octave-shift'?: OctaveShiftAmount;
  'octave-mode'?: OctaveDisplayMode;
  'octave-continuation'?: OctaveContinuationMode;
  'octave-stop'?: boolean;
  loco?: boolean;
};

export function resolveOctaveAttributes(
  structure: CompositionStructure
): Map<string, OctaveEntryAttributes> {
  const result = new Map<string, OctaveEntryAttributes>();
  const patch = (entryId: string, next: OctaveEntryAttributes) => {
    result.set(entryId, { ...result.get(entryId), ...next });
  };
  for (const span of Object.values(structure.octaveSpansById)) {
    patch(span.startEntryId, {
      'octave-shift': span.amount,
      'octave-mode': span.mode,
      'octave-continuation': span.continuation,
    });
    patch(
      span.endEntryId,
      span.end === 'loco' ? { loco: true } : { 'octave-stop': true }
    );
  }
  // A standalone `loco` would close the line at that element, so only the
  // span's own end setting may label a member.
  const spanned = new Set(
    Object.values(structure.octaveSpansById).flatMap((span) =>
      spanMembers(structure, span)
    )
  );
  for (const entry of Object.values(structure.entriesById)) {
    if (
      (entry.type === 'note' || entry.type === 'chord') &&
      entry.loco &&
      !spanned.has(entry.id)
    ) {
      patch(entry.id, { loco: true });
    }
  }
  return result;
}

// Whether `entryId` sits under a span — the standalone-loco toggle is hidden
// there (see resolveOctaveAttributes).
export function isOctaveSpanMember(
  structure: CompositionStructure,
  entryId: string
): boolean {
  return Object.values(structure.octaveSpansById).some((span) =>
    spanMembers(structure, span).includes(entryId)
  );
}

import type { TupletRun } from './tupletsHelpers';
import { resolveTupletRuns } from './tupletsHelpers';
import type { CompositionStructure, MusicEntry } from './types';
import { isPitchedEntry } from './types';

// Runs inside a voice that render as one wrapper element: a <music-tremolo>
// (its members) or a <music-arpeggio> (its run notes plus their target). A
// tremolo may sit inside a tuplet, so these are found within tuplet runs.

export type WrapperRun = {
  kind: 'tremolo' | 'arpeggio' | null;
  id: string | null;
  entries: MusicEntry[];
};

function wrapperOf(
  entry: MusicEntry,
  targetToArpeggio: ReadonlyMap<string, string>
): Pick<WrapperRun, 'kind' | 'id'> {
  if (isPitchedEntry(entry) && entry.tremoloId) {
    return { kind: 'tremolo', id: entry.tremoloId };
  }
  if (entry.type === 'note' && entry.arpeggioId) {
    return { kind: 'arpeggio', id: entry.arpeggioId };
  }
  const targeted = targetToArpeggio.get(entry.id);
  return targeted
    ? { kind: 'arpeggio', id: targeted }
    : { kind: null, id: null };
}

export function resolveWrapperRuns(
  entries: readonly MusicEntry[],
  arpeggiosById: CompositionStructure['arpeggiosById']
): WrapperRun[] {
  const targetToArpeggio = new Map(
    Object.values(arpeggiosById).map((arpeggio) => [
      arpeggio.targetEntryId,
      arpeggio.id,
    ])
  );
  const runs: WrapperRun[] = [];
  for (const entry of entries) {
    const { kind, id } = wrapperOf(entry, targetToArpeggio);
    const last = runs[runs.length - 1];
    if (last && last.kind === kind && last.id === id) {
      last.entries.push(entry);
    } else {
      runs.push({ kind, id, entries: [entry] });
    }
  }
  return runs;
}

// resolveTupletRuns gives each loose entry its own run; wrappers group across
// loose entries, so consecutive loose runs are merged first.
export function resolveVoiceRuns(
  entryIds: string[],
  entriesById: CompositionStructure['entriesById']
): TupletRun[] {
  const runs: TupletRun[] = [];
  for (const run of resolveTupletRuns(entryIds, entriesById)) {
    const last = runs[runs.length - 1];
    if (run.tupletId === null && last && last.tupletId === null) {
      last.entries.push(...run.entries);
    } else {
      runs.push({ tupletId: run.tupletId, entries: [...run.entries] });
    }
  }
  return runs;
}

// The units rebar may not split across a barline: a whole tuplet, or a whole
// tremolo or arpeggio outside one. Everything else is one entry per unit.
export type AtomicRun = TupletRun & { atomic: boolean };

export function resolveAtomicRuns(
  entryIds: string[],
  structure: Pick<CompositionStructure, 'entriesById' | 'arpeggiosById'>
): AtomicRun[] {
  return resolveVoiceRuns(entryIds, structure.entriesById).flatMap(
    (run): AtomicRun[] =>
      run.tupletId !== null
        ? [{ ...run, atomic: true }]
        : resolveWrapperRuns(run.entries, structure.arpeggiosById).flatMap(
            (wrapper): AtomicRun[] =>
              wrapper.kind !== null
                ? [{ tupletId: null, entries: wrapper.entries, atomic: true }]
                : wrapper.entries.map((entry) => ({
                    tupletId: null,
                    entries: [entry],
                    atomic: false,
                  }))
          )
  );
}

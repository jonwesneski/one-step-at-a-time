import type {
  EndingNumbering,
  RepeatEvent,
} from '@one-step-at-a-time/web-components';
import {
  repeatPickupWarning,
  resolveEndingNumberLabels,
  resolveEndings,
  resolveRepeatSpans,
} from '@one-step-at-a-time/web-components';
import { entryOnset } from './crossStaffHelpers';
import { measureDuration } from './measureCapacityHelpers';
import { effectiveTimeSignatures } from './timeSignaturesHelpers';
import type { CompositionStructure, NormalizedMeasure } from './types';

// Repeats and endings. Validation runs the library's own pure rules
// (rules/endingRules.ts, rules/barlineRules.ts) over the same repeat events
// <music-composition> builds in #repeatEvents, so the editor shows exactly the
// warnings the renderer logs.

export type MeasureRepeatPatch = Partial<
  Pick<NormalizedMeasure, 'repeatStart' | 'barline' | 'ending' | 'endingLabel'>
>;

function normalizeEnding(ending: number[] | null | undefined): number[] | null {
  if (!ending) {
    return null;
  }
  const passes = [...new Set(ending)]
    .filter((pass) => Number.isInteger(pass) && pass > 0)
    .sort((a, b) => a - b);
  return passes.length > 0 ? passes : null;
}

export function setMeasureRepeat(
  structure: CompositionStructure,
  measureId: string,
  patch: MeasureRepeatPatch
): CompositionStructure {
  const measure = structure.measuresById[measureId];
  if (!measure) {
    return structure;
  }
  const next: NormalizedMeasure = { ...measure, ...patch };
  next.repeatStart = next.repeatStart || undefined;
  next.barline = next.barline ?? null;
  next.ending = normalizeEnding(next.ending);
  next.endingLabel =
    next.ending && next.endingLabel?.trim() ? next.endingLabel.trim() : null;
  const same =
    Boolean(next.repeatStart) === Boolean(measure.repeatStart) &&
    next.barline === (measure.barline ?? null) &&
    (next.ending?.join(',') ?? null) === (measure.ending?.join(',') ?? null) &&
    next.endingLabel === (measure.endingLabel ?? null);
  if (same) {
    return structure;
  }
  return {
    ...structure,
    measuresById: { ...structure.measuresById, [measureId]: next },
  };
}

export function hasRepeatData(measure: NormalizedMeasure | undefined): boolean {
  return Boolean(
    measure &&
      (measure.repeatStart || measure.barline || measure.ending?.length)
  );
}

// Every repeat and ending warning the composition would log, in its wording.
export function repeatWarnings(
  structure: CompositionStructure,
  numbering: EndingNumbering
): string[] {
  const measures = structure.measureOrder.map(
    (id) => structure.measuresById[id]
  );
  const endings = resolveEndings(
    measures.map((measure) => ({
      ending: measure?.ending ?? null,
      endBarline: measure?.barline ?? 'single',
    }))
  );
  const groupByMeasure = new Map<number, number>();
  for (const group of endings.groups) {
    for (const ending of group.endings) {
      for (let i = ending.firstMeasure; i <= ending.lastMeasure; i++) {
        groupByMeasure.set(i, group.id);
      }
    }
  }
  const timeSignatures = effectiveTimeSignatures(structure);
  const events: RepeatEvent[] = [];
  measures.forEach((measure, measureIndex) => {
    if (!measure) {
      return;
    }
    const base = {
      measureIndex,
      barCapacity: measureDuration(timeSignatures[measureIndex]),
      endingGroup: groupByMeasure.get(measureIndex) ?? null,
    };
    if (measure.repeatStart) {
      events.push({ ...base, kind: 'start', beatInBar: 0 });
    }
    for (const { beat, barlineType } of midBarBarlines(structure, measure)) {
      if (barlineType === 'repeat-end' || barlineType === 'repeat-both') {
        events.push({ ...base, kind: 'end', beatInBar: beat });
      }
      if (barlineType === 'repeat-start' || barlineType === 'repeat-both') {
        events.push({ ...base, kind: 'start', beatInBar: beat });
      }
    }
    if (measure.barline === 'repeat-end') {
      events.push({ ...base, kind: 'end', beatInBar: base.barCapacity });
    }
  });
  const { spans, warnings } = resolveRepeatSpans(events);
  const numberingWarnings = resolveEndingNumberLabels(
    measures.length,
    endings.groups,
    numbering
  ).warnings;
  return [
    ...new Set([
      ...warnings,
      ...endings.warnings,
      ...numberingWarnings,
      ...spans
        .map(repeatPickupWarning)
        .filter((warning): warning is string => warning !== null),
    ]),
  ];
}

// Mid-bar barlines on any staff of the measure, by beat, in beat order.
function midBarBarlines(
  structure: CompositionStructure,
  measure: NormalizedMeasure
) {
  const found: { beat: number; barlineType: string }[] = [];
  for (const staffId of measure.staffIds) {
    const staff = structure.stavesById[staffId];
    const voice1 = staff?.voicesById[staff.voiceOrder[0]];
    for (const entryId of voice1?.entryIds ?? []) {
      const entry = structure.entriesById[entryId];
      if (entry?.type === 'barline') {
        found.push({
          beat: entryOnset(structure, entryId) ?? 0,
          barlineType: entry.barlineType,
        });
      }
    }
  }
  return found.sort((a, b) => a.beat - b.beat);
}

// Whether a rewrite (rebar) of the measures in [startIndex, endIndex) would
// lose repeat structure: rebar keeps a region's first-bar repeat start and
// last-bar end barline, but has nowhere to put anything in between.
export function rebarWouldDropRepeats(
  structure: CompositionStructure,
  startIndex: number,
  endIndex: number
): boolean {
  const ids = structure.measureOrder.slice(startIndex, endIndex);
  return ids.some((id, i) => {
    const measure = structure.measuresById[id];
    if (!measure) {
      return false;
    }
    return (
      Boolean(measure.ending?.length) ||
      (i > 0 && measure.repeatStart) ||
      (i < ids.length - 1 && Boolean(measure.barline))
    );
  });
}

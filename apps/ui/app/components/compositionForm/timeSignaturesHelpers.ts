import type { TimeSignature } from '@one-step-at-a-time/web-components';
import type { CompositionStructure } from './types';
import { staffEntryIds } from './voiceHelpers';

// The time signature is a positional value: `structure.timeSig` is the
// composition (measure 1) time signature, and any later measure may carry a
// sparse `time` override that holds from that measure until the next override.
// This mirrors the library's staff → measure → composition `time` inheritance
// (`staffBase.ts` resolveInheritedValue), except the app resolves the effective
// time signature itself and writes it explicitly onto every `<music-measure>`, so
// there is no inheritance ambiguity and none of the measure-1-goes-stale runtime
// gap the library has when its composition `time` changes.

// Effective time signature of every measure, aligned with `structure.measureOrder`.
export function effectiveTimeSignatures(
  structure: CompositionStructure
): TimeSignature[] {
  let current = structure.timeSig;
  return structure.measureOrder.map((id) => {
    const override = structure.measuresById[id]?.time;
    if (override) {
      current = override;
    }
    return current;
  });
}

// The time signature of one measure by index (out-of-range → composition value).
export function timeSignatureAt(
  structure: CompositionStructure,
  measureIndex: number
): TimeSignature {
  return effectiveTimeSignatures(structure)[measureIndex] ?? structure.timeSig;
}

// The effective time signature of the measure that holds `entryId` (→ composition
// value when the entry isn't placed anywhere).
export function timeSignatureOfEntry(
  structure: CompositionStructure,
  entryId: string
): TimeSignature {
  const timeSignatures = effectiveTimeSignatures(structure);
  for (let i = 0; i < structure.measureOrder.length; i++) {
    const measure = structure.measuresById[structure.measureOrder[i]];
    const holdsEntry = measure?.staffIds.some((sid) => {
      const staff = structure.stavesById[sid];
      return staff ? staffEntryIds(staff).includes(entryId) : false;
    });
    if (holdsEntry) {
      return timeSignatures[i];
    }
  }
  return structure.timeSig;
}

// The time signature region containing `measureIndex`: the run of consecutive
// measures under one time signature. `startIndex` is that region's defining
// measure (an override, or measure 0); `endIndex` is exclusive — the next measure
// with its own override, or the end of the piece.
export function timeSignatureRegionAt(
  structure: CompositionStructure,
  measureIndex: number
): { startIndex: number; endIndex: number } {
  const order = structure.measureOrder;
  let startIndex = Math.max(0, Math.min(measureIndex, order.length - 1));
  while (startIndex > 0 && !structure.measuresById[order[startIndex]]?.time) {
    startIndex--;
  }
  let endIndex = measureIndex + 1;
  while (
    endIndex < order.length &&
    !structure.measuresById[order[endIndex]]?.time
  ) {
    endIndex++;
  }
  return { startIndex, endIndex };
}

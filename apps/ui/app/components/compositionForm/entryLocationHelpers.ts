import type { CompositionStructure, NormalizedStaff, StaffType } from './types';

// Inlined rather than imported from voiceHelpers.ts, which depends (through
// connectorsHelpers.ts) on this file.
function staffEntryIds(staff: NormalizedStaff): string[] {
  return staff.voiceOrder.flatMap((id) => staff.voicesById[id].entryIds);
}

export type EntryStaffContext = {
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

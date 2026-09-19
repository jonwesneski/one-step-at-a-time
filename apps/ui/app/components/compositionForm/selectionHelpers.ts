import type { CompositionStructure, Selection } from './types';
import { EMPTY_SELECTION } from './types';
import { staffEntryIds } from './voiceHelpers';

// Fraction of an element's own area that must fall inside the drag rect to
// count as "covered" by it.
export const COVERAGE_THRESHOLD = 0.5;

export type ElementRefMaps = {
  measures: Map<string, HTMLElement>;
  staves: Map<string, HTMLElement>;
  entries: Map<string, HTMLElement>;
};

export function intersects(a: DOMRect, b: DOMRect): boolean {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  );
}

export function coverageRatio(dragRect: DOMRect, elementRect: DOMRect): number {
  const elementArea = elementRect.width * elementRect.height;
  if (elementArea === 0) {
    return 0;
  }
  const left = Math.max(dragRect.left, elementRect.left);
  const right = Math.min(dragRect.right, elementRect.right);
  const top = Math.max(dragRect.top, elementRect.top);
  const bottom = Math.min(dragRect.bottom, elementRect.bottom);
  const intersectionWidth = Math.max(0, right - left);
  const intersectionHeight = Math.max(0, bottom - top);
  return (intersectionWidth * intersectionHeight) / elementArea;
}

export function computeBoxSelection(
  dragRect: DOMRect,
  structure: Pick<
    CompositionStructure,
    'measureOrder' | 'measuresById' | 'stavesById'
  >,
  refs: ElementRefMaps
): Selection {
  const measureIds: string[] = [];
  const staffIds: string[] = [];
  const entryIds: string[] = [];

  for (const measureId of structure.measureOrder) {
    const measureRect = refs.measures.get(measureId)?.getBoundingClientRect();
    if (!measureRect || !intersects(dragRect, measureRect)) {
      continue;
    }

    const measure = structure.measuresById[measureId];
    const canPromoteMeasure = structure.measureOrder.length >= 2;
    if (
      canPromoteMeasure &&
      coverageRatio(dragRect, measureRect) >= COVERAGE_THRESHOLD
    ) {
      measureIds.push(measureId);
      continue;
    }

    for (const staffId of measure.staffIds) {
      const staffRect = refs.staves.get(staffId)?.getBoundingClientRect();
      if (!staffRect || !intersects(dragRect, staffRect)) {
        continue;
      }

      const staff = structure.stavesById[staffId];
      const canPromoteStaff = measure.staffIds.length >= 2;
      if (
        canPromoteStaff &&
        coverageRatio(dragRect, staffRect) >= COVERAGE_THRESHOLD
      ) {
        staffIds.push(staffId);
        continue;
      }

      for (const entryId of staffEntryIds(staff)) {
        const entryRect = refs.entries.get(entryId)?.getBoundingClientRect();
        if (!entryRect || !intersects(dragRect, entryRect)) {
          continue;
        }
        if (coverageRatio(dragRect, entryRect) >= COVERAGE_THRESHOLD) {
          entryIds.push(entryId);
        }
      }
    }
  }

  if (
    measureIds.length === 0 &&
    staffIds.length === 0 &&
    entryIds.length === 0
  ) {
    return EMPTY_SELECTION;
  }
  return { measureIds, staffIds, entryIds };
}

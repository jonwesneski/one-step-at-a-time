import type { Note, Octave } from '@one-step-at-a-time/web-components';
import type { StaffRangeKey } from './clefsHelpers';
import { CLEF_RANGES, step, stepToPitch } from './clefsHelpers';

// Geometry for dragging notes in the composition editor. Pure and colocated with
// a test; the pointer state machine lives in useEntryDrag.ts.

// Pixels per diatonic staff step (one line ↔ adjacent space). Mirrors the
// library's notationDimensions.ts `STAFF_Y_STEP` (= STAFF_LINE_SPACING / 2). The
// staff renders vertical positions in raw CSS px — staff lines are `<div>`s
// positioned in px, notes with `style.top` in px, no SVG viewBox scaling — so
// one layout unit is one CSS px.
export const STAFF_Y_STEP = 5;

// Pointer travel (either axis) before a press on a note becomes a drag rather
// than a click. Matches DragSelectOverlay's DRAG_THRESHOLD_PX so both gestures
// agree on what counts as a plain click.
export const DRAG_THRESHOLD_PX = 4;

// True when a `composedPath()` passes through a notehead (`.head` /
// `.head-hit-zone`) rather than a stem/flag/body. The library renders both
// classes on every note SVG unconditionally.
export function isNoteheadPath(path: EventTarget[]): boolean {
  return path.some(
    (node) =>
      node instanceof Element &&
      (node.classList.contains('head') ||
        node.classList.contains('head-hit-zone'))
  );
}

// The natural pitch a notehead lands on after being dragged `deltaY` px
// vertically (negative = up = higher pitch). Snaps to the nearest diatonic staff
// step, clamps to the clef's range, and skips steps already taken by other notes
// of the same chord (`occupiedSteps`). Accidentals are not modelled — vertical
// position is diatonic, matching the removed library behaviour.
export function pitchAfterVerticalDrag(params: {
  value: Note;
  octave: Octave;
  clef: StaffRangeKey;
  deltaY: number;
  occupiedSteps?: number[];
}): { value: Note; octave: Octave } {
  const { value, octave, clef, deltaY, occupiedSteps = [] } = params;
  const range = CLEF_RANGES[clef];
  const fromStep = step(value[0].toUpperCase(), octave);
  const rawStep = fromStep - Math.round(deltaY / STAFF_Y_STEP);
  let target = Math.max(range.lowStep, Math.min(range.highStep, rawStep));

  if (target !== fromStep && occupiedSteps.includes(target)) {
    const direction = target > fromStep ? 1 : -1;
    let probe = target;
    while (
      probe >= range.lowStep &&
      probe <= range.highStep &&
      occupiedSteps.includes(probe)
    ) {
      probe += direction;
    }
    target =
      probe >= range.lowStep && probe <= range.highStep ? probe : fromStep;
  }

  return stepToPitch(target);
}

// The position in `siblings` (document order, with their rendered rects) where a
// horizontally-dragged entry should be inserted, given the pointer's X. Returns
// 0..siblings.length. The caller treats a result equal to the dragged entry's
// own index — or one past it — as "no move".
export function reorderTargetIndex(
  pointerX: number,
  siblings: { id: string; rect: DOMRect }[]
): number {
  for (let index = 0; index < siblings.length; index++) {
    const { left, width } = siblings[index].rect;
    if (pointerX < left + width / 2) {
      return index;
    }
  }
  return siblings.length;
}

import type {
  IChordElement,
  INoteElement,
  NoteChordOrRestElementType,
  NoteOrChordElementType,
} from '../types/elements';
import type { HairpinKind } from '../types/theory';
import { MUSIC_REST_NODE } from '../utils/consts';
import {
  DYNAMICS_CHAR_WIDTH_PX,
  HAIRPIN_DYNAMIC_GAP_PX,
} from '../utils/notationDimensions';
import { NOTE_SVG_WIDTH } from '../utils/svgCreator/note';

const ROW_TOLERANCE_PX = 5;

export type HairpinPair = {
  kind: HairpinKind;
  startElement: NoteOrChordElementType;
  endElement: NoteOrChordElementType;
  startX: number;
  endX: number;
  errors: string[];
};

type OpenHairpinStart = {
  element: NoteOrChordElementType;
  index: number;
};

/**
 * Walks a flat list of notes, chords, and rests and pairs each hairpin start
 * with its nearest matching end of the same kind. Unpaired starts are silently
 * dropped. Mirrors the pairConnectors() approach in connectorsBuilder.ts.
 *
 * Also computes each pair's rendered startX/endX, shrinking the span inward
 * when the start/end note itself carries a dynamic marking so the wedge
 * doesn't run under that text. errors collects a message for each problem
 * detected: the shrink inverting the span (endpoint collision), a note
 * strictly between start and end also carrying a dynamic (interim overlap),
 * or the start/end element actually being a rest (which should never happen —
 * see the defensive check in buildHairpinPair). In the endpoint-collision and
 * rest cases the bounds fall back to the raw note-edge positions so the
 * hairpin still renders.
 */
export function pairHairpins(
  elements: NoteChordOrRestElementType[],
  noteXPositions: ReadonlyMap<number, number>
): HairpinPair[] {
  const pairs: HairpinPair[] = [];
  const openStarts = new Map<HairpinKind, OpenHairpinStart>();

  elements.forEach((element, index) => {
    const noteOrChord = element as INoteElement | IChordElement;
    const crescendo = 'crescendo' in noteOrChord ? noteOrChord.crescendo : null;
    const decrescendo =
      'decrescendo' in noteOrChord ? noteOrChord.decrescendo : null;

    // A rest never has crescendo/decrescendo, so reaching either 'start'/'end'
    // branch below guarantees element is actually a note or chord.
    const noteOrChordElement = element as NoteOrChordElementType;

    if (crescendo === 'start') {
      openStarts.set('crescendo', { element: noteOrChordElement, index });
    } else if (crescendo === 'end') {
      const start = openStarts.get('crescendo');
      if (start !== undefined) {
        pairs.push(
          buildHairpinPair(
            'crescendo',
            start,
            { element: noteOrChordElement, index },
            elements,
            noteXPositions
          )
        );
        openStarts.delete('crescendo');
      }
    }

    if (decrescendo === 'start') {
      openStarts.set('decrescendo', { element: noteOrChordElement, index });
    } else if (decrescendo === 'end') {
      const start = openStarts.get('decrescendo');
      if (start !== undefined) {
        pairs.push(
          buildHairpinPair(
            'decrescendo',
            start,
            { element: noteOrChordElement, index },
            elements,
            noteXPositions
          )
        );
        openStarts.delete('decrescendo');
      }
    }
  });

  return pairs;
}

function buildHairpinPair(
  kind: HairpinKind,
  start: OpenHairpinStart,
  end: OpenHairpinStart,
  elements: NoteChordOrRestElementType[],
  noteXPositions: ReadonlyMap<number, number>
): HairpinPair {
  const errors: string[] = [];

  const rawStartX = noteXPositions.get(start.index) ?? 0;
  const rawEndX = (noteXPositions.get(end.index) ?? 0) + NOTE_SVG_WIDTH;

  // Defensive: a rest never has crescendo/decrescendo (see pairHairpins), so
  // this should never trigger — but if it ever did, skip the dynamic-shift
  // math entirely (a rest has no dynamic to clear) and flag it explicitly
  // rather than silently trusting the note/chord cast.
  const restDetected =
    start.element.nodeName === MUSIC_REST_NODE ||
    end.element.nodeName === MUSIC_REST_NODE;
  if (restDetected) {
    errors.push(
      `Hairpin (${kind}) references a rest element, which cannot carry a dynamic or hairpin marking.`
    );
    return {
      kind,
      startElement: start.element,
      endElement: end.element,
      startX: rawStartX,
      endX: rawEndX,
      errors,
    };
  }

  const startMarking = start.element.dynamic;
  const endMarking = end.element.dynamic;

  // Dynamic text is rendered centered at noteX + NOTE_SVG_WIDTH/2 (see
  // #renderDynamics' centerX) — the shift must clear that text's actual edge,
  // not the note's raw edge, or the hairpin still runs under the glyph.
  let startX = rawStartX;
  let endX = rawEndX;
  if (startMarking !== null) {
    const startTextCenterX = rawStartX + NOTE_SVG_WIDTH / 2;
    startX = Math.max(
      startX,
      startTextCenterX +
        (startMarking.length * DYNAMICS_CHAR_WIDTH_PX) / 2 +
        HAIRPIN_DYNAMIC_GAP_PX
    );
  }
  if (endMarking !== null) {
    const endTextCenterX =
      (noteXPositions.get(end.index) ?? 0) + NOTE_SVG_WIDTH / 2;
    endX = Math.min(
      endX,
      endTextCenterX -
        (endMarking.length * DYNAMICS_CHAR_WIDTH_PX) / 2 -
        HAIRPIN_DYNAMIC_GAP_PX
    );
  }

  const endpointCollision = endX <= startX;
  if (endpointCollision) {
    startX = rawStartX;
    endX = rawEndX;
    errors.push(
      `Hairpin (${kind}) overlaps a dynamic marking and cannot be cleanly positioned.`
    );
  }

  const hasInterimDynamic = elements
    .slice(start.index + 1, end.index)
    .some(
      (el) => (el as unknown as INoteElement | IChordElement).dynamic !== null
    );
  if (hasInterimDynamic) {
    errors.push(
      `Hairpin (${kind}) overlaps an interim dynamic marking between its start and end.`
    );
  }

  return {
    kind,
    startElement: start.element,
    endElement: end.element,
    startX,
    endX,
    errors,
  };
}

export type HairpinSegment = {
  kind: HairpinKind;
  startX: number;
  endX: number;
  centerY: number;
  openAtStart: boolean;
  openAtEnd: boolean;
};

type ElementBounds = { left: number; right: number; top: number };

/**
 * Given a cross-measure hairpin pair and the composition row geometry, returns
 * either one segment (same row) or two segments (cross-row split).
 *
 * Row detection uses the same 5 px tolerance as ties/slurs. When the pair spans
 * a system break:
 * - Segment 1 ends at the right row edge; for decrescendo it stays open there
 *   ("remains open at the end of a system").
 * - Segment 2 starts at the left row edge already open (openAtStart=true),
 *   signalling the dynamic change was in progress on the previous system.
 */
export function resolveHairpinSegments(
  pair: HairpinPair,
  startBounds: ElementBounds,
  endBounds: ElementBounds,
  startCenterY: number,
  endCenterY: number,
  rowLeft: number,
  rowRight: number
): HairpinSegment[] {
  const sameRow = Math.abs(startBounds.top - endBounds.top) <= ROW_TOLERANCE_PX;

  if (sameRow) {
    return [
      {
        kind: pair.kind,
        startX: startBounds.right,
        endX: endBounds.left,
        centerY: startCenterY,
        openAtStart: false,
        openAtEnd: false,
      },
    ];
  }

  return [
    {
      kind: pair.kind,
      startX: startBounds.right,
      endX: rowRight,
      centerY: startCenterY,
      openAtStart: false,
      openAtEnd: pair.kind === 'decrescendo',
    },
    {
      kind: pair.kind,
      startX: rowLeft,
      endX: endBounds.left,
      centerY: endCenterY,
      openAtStart: true,
      openAtEnd: false,
    },
  ];
}

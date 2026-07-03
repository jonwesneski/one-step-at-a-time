import {
  IChordElement,
  INoteElement,
  NoteChordOrRestElementType,
} from '../types/elements';
import { DynamicMarking, HairpinKind } from '../types/theory';
import {
  DYNAMICS_CHAR_WIDTH_PX,
  HAIRPIN_DYNAMIC_GAP_PX,
} from '../utils/notationDimensions';
import { NOTE_SVG_WIDTH } from '../utils/svgCreator/note';

const ROW_TOLERANCE_PX = 5;

export type HairpinPair = {
  kind: HairpinKind;
  startElement: NoteChordOrRestElementType;
  endElement: NoteChordOrRestElementType;
  startX: number;
  endX: number;
  hasOverlapWarning: boolean;
};

/**
 * Returns the dynamic marking on a note or chord element, or null if none is set.
 */
export function getNoteDynamic(
  element: INoteElement | IChordElement
): DynamicMarking | null {
  return element.dynamic;
}

type OpenHairpinStart = {
  element: NoteChordOrRestElementType;
  index: number;
};

/**
 * Walks a flat list of notes, chords, and rests and pairs each hairpin start
 * with its nearest matching end of the same kind. Unpaired starts are silently
 * dropped. Mirrors the pairConnectors() approach in connectorsBuilder.ts.
 *
 * Also computes each pair's rendered startX/endX, shrinking the span inward
 * when the start/end note itself carries a dynamic marking so the wedge
 * doesn't run under that text. hasOverlapWarning is set when that shrink
 * would invert the span (endpoint collision) or when a note strictly between
 * start and end also carries a dynamic (interim overlap) — in the endpoint
 * case the bounds fall back to the raw note-edge positions so the hairpin
 * still renders.
 */
export function pairHairpins(
  elements: NoteChordOrRestElementType[],
  noteXPositions: ReadonlyMap<number, number>
): HairpinPair[] {
  const pairs: HairpinPair[] = [];
  const openStarts = new Map<HairpinKind, OpenHairpinStart>();

  elements.forEach((element, index) => {
    const noteOrChord = element as unknown as INoteElement | IChordElement;
    const crescendo = 'crescendo' in noteOrChord ? noteOrChord.crescendo : null;
    const decrescendo =
      'decrescendo' in noteOrChord ? noteOrChord.decrescendo : null;

    if (crescendo === 'start') {
      openStarts.set('crescendo', { element, index });
    } else if (crescendo === 'end') {
      const start = openStarts.get('crescendo');
      if (start !== undefined) {
        pairs.push(
          buildHairpinPair(
            'crescendo',
            start,
            { element, index },
            elements,
            noteXPositions
          )
        );
        openStarts.delete('crescendo');
      }
    }

    if (decrescendo === 'start') {
      openStarts.set('decrescendo', { element, index });
    } else if (decrescendo === 'end') {
      const start = openStarts.get('decrescendo');
      if (start !== undefined) {
        pairs.push(
          buildHairpinPair(
            'decrescendo',
            start,
            { element, index },
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
  const rawStartX = noteXPositions.get(start.index) ?? 0;
  const rawEndX = (noteXPositions.get(end.index) ?? 0) + NOTE_SVG_WIDTH;

  const startMarking = getNoteDynamic(
    start.element as unknown as INoteElement | IChordElement
  );
  const endMarking = getNoteDynamic(
    end.element as unknown as INoteElement | IChordElement
  );

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
  }

  const hasInterimDynamic = elements
    .slice(start.index + 1, end.index)
    .some(
      (el) =>
        getNoteDynamic(el as unknown as INoteElement | IChordElement) !== null
    );

  return {
    kind,
    startElement: start.element,
    endElement: end.element,
    startX,
    endX,
    hasOverlapWarning: endpointCollision || hasInterimDynamic,
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

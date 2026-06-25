import {
  IChordElement,
  INoteElement,
  NoteChordOrRestElementType,
} from '../types/elements';
import { DynamicMarking, HairpinKind } from '../types/theory';

const ROW_TOLERANCE_PX = 5;

export type HairpinPair = {
  kind: HairpinKind;
  startElement: NoteChordOrRestElementType;
  endElement: NoteChordOrRestElementType;
};

/**
 * Returns the dynamic marking on a note or chord element, or null if none is set.
 */
export function getNoteDynamic(
  element: INoteElement | IChordElement
): DynamicMarking | null {
  return element.dynamic;
}

/**
 * Walks a flat list of notes, chords, and rests and pairs each hairpin start
 * with its nearest matching end of the same kind. Unpaired starts are silently
 * dropped. Mirrors the pairConnectors() approach in connectorsBuilder.ts.
 */
export function pairHairpins(
  elements: NoteChordOrRestElementType[]
): HairpinPair[] {
  const pairs: HairpinPair[] = [];
  const openStarts = new Map<HairpinKind, NoteChordOrRestElementType>();

  for (const element of elements) {
    const noteOrChord = element as unknown as INoteElement | IChordElement;
    const crescendo = 'crescendo' in noteOrChord ? noteOrChord.crescendo : null;
    const decrescendo =
      'decrescendo' in noteOrChord ? noteOrChord.decrescendo : null;

    if (crescendo === 'start') {
      openStarts.set('crescendo', element);
    } else if (crescendo === 'end') {
      const startElement = openStarts.get('crescendo');
      if (startElement !== undefined) {
        pairs.push({ kind: 'crescendo', startElement, endElement: element });
        openStarts.delete('crescendo');
      }
    }

    if (decrescendo === 'start') {
      openStarts.set('decrescendo', element);
    } else if (decrescendo === 'end') {
      const startElement = openStarts.get('decrescendo');
      if (startElement !== undefined) {
        pairs.push({ kind: 'decrescendo', startElement, endElement: element });
        openStarts.delete('decrescendo');
      }
    }
  }

  return pairs;
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

import {
  ClefElementType,
  ClefMarkerPlacement,
  NoteChordOrRestElementType,
  TupletElementType,
} from '../types/elements';
import {
  MUSIC_CHORD_NODE,
  MUSIC_CLEF_NODE,
  MUSIC_NOTE_NODE,
  MUSIC_REST_NODE,
  MUSIC_TUPLET_NODE,
} from './consts';

export function flattenSlotElements(assigned: Element[]): {
  flatElements: NoteChordOrRestElementType[];
  tupletsByIndex: Map<number, TupletElementType[]>;
  clefMarkers: ClefMarkerPlacement[];
} {
  const flatElements: NoteChordOrRestElementType[] = [];
  const tupletsByIndex = new Map<number, TupletElementType[]>();
  const clefMarkers: ClefMarkerPlacement[] = [];

  function flatten(
    element: Element,
    tupletAncestors: TupletElementType[]
  ): void {
    const tag = element.nodeName;
    if (
      tag === MUSIC_NOTE_NODE ||
      tag === MUSIC_CHORD_NODE ||
      tag === MUSIC_REST_NODE
    ) {
      if (tupletAncestors.length > 0) {
        tupletsByIndex.set(flatElements.length, [...tupletAncestors]);
      }
      flatElements.push(element as NoteChordOrRestElementType);
    } else if (tag === MUSIC_TUPLET_NODE) {
      for (const child of element.children) {
        flatten(child, [...tupletAncestors, element as TupletElementType]);
      }
    } else if (tag === MUSIC_CLEF_NODE) {
      if (tupletAncestors.length > 0) {
        console.warn(
          '[flattenSlotElements] <music-clef> inside <music-tuplet> is not supported; ignoring'
        );
        return;
      }
      clefMarkers.push({
        afterElementIndex: flatElements.length - 1,
        element: element as ClefElementType,
      });
    }
  }

  for (const element of assigned) {
    flatten(element, []);
  }

  return { flatElements, tupletsByIndex, clefMarkers };
}

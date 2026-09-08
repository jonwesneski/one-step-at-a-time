import {
  ArpeggioElementType,
  ArpeggioGroupPlacement,
  ClefElementType,
  ClefMarkerPlacement,
  NoteChordOrRestElementType,
  TupletElementType,
} from '../types/elements';
import {
  MUSIC_ARPEGGIO_NODE,
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
  arpeggioGroups: ArpeggioGroupPlacement[];
} {
  const flatElements: NoteChordOrRestElementType[] = [];
  const tupletsByIndex = new Map<number, TupletElementType[]>();
  const clefMarkers: ClefMarkerPlacement[] = [];
  const arpeggioGroups: ArpeggioGroupPlacement[] = [];

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
    } else if (tag === MUSIC_ARPEGGIO_NODE) {
      flattenArpeggio(element as ArpeggioElementType, tupletAncestors);
    } else if (tag === MUSIC_CLEF_NODE) {
      if (tupletAncestors.length > 0) {
        console.warn(
          '[flattenSlotElements] <music-clef> inside <music-tuplet> is not supported; ignoring'
        );
        return;
      }
      const anchorIndex = flatElements.length - 1;
      // Consecutive clef markers (no note/chord/rest between them) share one
      // anchor index and would be positioned on top of each other, so only
      // the first is honored.
      if (
        clefMarkers.length > 0 &&
        clefMarkers[clefMarkers.length - 1].afterElementIndex === anchorIndex
      ) {
        console.warn(
          '[flattenSlotElements] consecutive <music-clef> elements are not supported; ignoring all but the first'
        );
        (element as ClefElementType).style.display = 'none';
        return;
      }
      clefMarkers.push({
        afterElementIndex: anchorIndex,
        element: element as ClefElementType,
      });
    }
  }

  // A <music-arpeggio> flattens its children as ordinary elements (they beam,
  // space, and self-render normally) and records which flat indices are the
  // run notes and which is the target chord/note.
  function flattenArpeggio(
    element: ArpeggioElementType,
    tupletAncestors: TupletElementType[]
  ): void {
    if (tupletAncestors.length > 0) {
      console.warn(
        '[flattenSlotElements] <music-arpeggio> inside <music-tuplet> is not supported; flattening as plain notes'
      );
      for (const child of element.children) {
        flatten(child, tupletAncestors);
      }
      return;
    }
    const elementChildren = Array.from(element.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement
    );
    const acceptable = elementChildren.filter(
      (child) =>
        child.nodeName === MUSIC_NOTE_NODE ||
        child.nodeName === MUSIC_CHORD_NODE
    );
    if (acceptable.length < 2) {
      console.warn(
        '[flattenSlotElements] <music-arpeggio> needs at least a run note and a target chord/note; flattening as plain'
      );
      for (const child of acceptable) {
        flatten(child, []);
      }
      return;
    }
    const runIndices: number[] = [];
    let targetIndex = -1;
    acceptable.forEach((child, i) => {
      const flatIndex = flatElements.length;
      flatten(child, []);
      if (i === acceptable.length - 1) {
        targetIndex = flatIndex;
      } else {
        runIndices.push(flatIndex);
      }
    });
    arpeggioGroups.push({ runIndices, targetIndex, element });
  }

  for (const element of assigned) {
    if (element.nodeName === MUSIC_CLEF_NODE) {
      (element as ClefElementType).style.display = '';
    }
    flatten(element, []);
  }

  return { flatElements, tupletsByIndex, clefMarkers, arpeggioGroups };
}

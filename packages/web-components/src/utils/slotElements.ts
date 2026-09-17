import {
  ArpeggioElementType,
  ArpeggioGroupPlacement,
  ClefElementType,
  ClefMarkerPlacement,
  NoteChordOrRestElementType,
  TupletElementType,
} from '../types/elements';
import { VoiceNumber } from '../types/theory';
import {
  MAX_VOICES,
  MUSIC_ARPEGGIO_NODE,
  MUSIC_CHORD_NODE,
  MUSIC_CLEF_NODE,
  MUSIC_NOTE_NODE,
  MUSIC_REST_NODE,
  MUSIC_TUPLET_NODE,
  MUSIC_VOICE_NODE,
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

export type VoiceFlattenResult = {
  flatElements: NoteChordOrRestElementType[];
  tupletsByIndex: Map<number, TupletElementType[]>;
  arpeggioGroups: ArpeggioGroupPlacement[];
};

export type StaffFlattenResult = {
  // Ascending by voice number, always >=1 entry.
  voices: Map<VoiceNumber, VoiceFlattenResult>;
  clefMarkers: ClefMarkerPlacement[];
};

// Partitions a staff's slotted content into one or more independent voices.
// A staff is either wholly single-voice (zero <music-voice> children — the
// ordinary case, behaves byte-identical to flattenSlotElements()) or wholly
// multi-voice (every <music-voice> child's own subtree flattened
// independently, numbered by sibling order: the 1st is voice 1, the 2nd is
// voice 2, the 3rd is voice 3). Mixing bare top-level notes/chords/rests with
// one or more <music-voice> siblings is invalid — the bare content is
// discarded (not silently folded into voice 1) so a real authoring mistake
// doesn't render silently wrong. <music-clef> is exempt from that rule: a
// clef change is staff-wide, so it stays valid alongside <music-voice>
// siblings and is collected separately, never partitioned into a voice.
export function flattenStaffSlotElements(
  assigned: Element[]
): StaffFlattenResult {
  const voiceElements = assigned.filter(
    (element) => element.nodeName === MUSIC_VOICE_NODE
  );

  if (voiceElements.length === 0) {
    const { flatElements, tupletsByIndex, clefMarkers, arpeggioGroups } =
      flattenSlotElements(assigned);
    return {
      voices: new Map([[1, { flatElements, tupletsByIndex, arpeggioGroups }]]),
      clefMarkers,
    };
  }

  if (voiceElements.length > MAX_VOICES) {
    console.warn(
      `[flattenStaffSlotElements] a staff supports at most ${MAX_VOICES} <music-voice> siblings; ignoring the rest`
    );
  }

  for (const element of assigned) {
    if (
      element.nodeName !== MUSIC_VOICE_NODE &&
      element.nodeName !== MUSIC_CLEF_NODE
    ) {
      console.warn(
        `[flattenStaffSlotElements] a bare <${element.nodeName.toLowerCase()}> cannot appear alongside <music-voice> siblings; ignoring it — wrap every active voice, including voice 1, in its own <music-voice>`
      );
    }
  }

  const voices = new Map<VoiceNumber, VoiceFlattenResult>();
  voiceElements.slice(0, MAX_VOICES).forEach((voiceElement, i) => {
    const { flatElements, tupletsByIndex, arpeggioGroups } =
      flattenSlotElements(Array.from(voiceElement.children));
    voices.set((i + 1) as VoiceNumber, {
      flatElements,
      tupletsByIndex,
      arpeggioGroups,
    });
  });

  // A <music-voice> block is one contiguous unit in document order — it
  // can't be interleaved with a <music-clef> sibling the way individual
  // notes could be, so a real "this many voice-1 notes came before it"
  // index isn't expressible yet from top-level sibling position alone.
  // Every marker found here gets the "before any element" sentinel as a
  // placeholder: `#activeClefAt` still finds *a* clef (the last one
  // encountered wins as active throughout, which is wrong for more than
  // one distinct mid-stream change but never crashes), and Phase 3's
  // beat-offset anchoring replaces this with voice 1's real timeline
  // position. The consecutive-marker collision guard is skipped here since
  // every marker already shares this placeholder — applying it would
  // discard genuinely distinct markers rather than test anything real.
  const clefMarkers: ClefMarkerPlacement[] = [];
  for (const element of assigned) {
    if (element.nodeName === MUSIC_CLEF_NODE) {
      (element as ClefElementType).style.display = '';
      clefMarkers.push({
        afterElementIndex: -1,
        element: element as ClefElementType,
      });
    }
  }

  return { voices, clefMarkers };
}

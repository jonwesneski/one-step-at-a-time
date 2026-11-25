import {
  ArpeggioElementType,
  ArpeggioGroupPlacement,
  BarlineElementType,
  ClefElementType,
  NoteChordOrRestElementType,
  StreamMarkerPlacement,
  TremoloElementType,
  TremoloGroupPlacement,
  TupletElementType,
} from '../types/elements';
import { VoiceNumber } from '../types/theory';
import {
  isChordNodeName,
  isDrumNodeName,
  isNoteNodeName,
  MAX_VOICES,
  MUSIC_ARPEGGIO_NODE,
  MUSIC_BARLINE_NODE,
  MUSIC_CLEF_NODE,
  MUSIC_LYRICS_NODE,
  MUSIC_REST_NODE,
  MUSIC_TREMOLO_NODE,
  MUSIC_TUPLET_NODE,
  MUSIC_VOICE_NODE,
} from './consts';

/**
 * Which note and chord elements a staff takes: `'pitched'` (`<music-note>`,
 * `<music-chord>`) or `'drum'` (`<music-drum-note>`, `<music-drum-chord>`).
 */
export type NoteFamily = 'pitched' | 'drum';

export function flattenSlotElements(
  assigned: Element[],
  noteFamily: NoteFamily | null = null
): {
  flatElements: NoteChordOrRestElementType[];
  tupletsByIndex: Map<number, TupletElementType[]>;
  streamMarkers: StreamMarkerPlacement[];
  arpeggioGroups: ArpeggioGroupPlacement[];
  tremoloGroups: TremoloGroupPlacement[];
} {
  const flatElements: NoteChordOrRestElementType[] = [];
  const tupletsByIndex = new Map<number, TupletElementType[]>();
  const streamMarkers: StreamMarkerPlacement[] = [];
  const arpeggioGroups: ArpeggioGroupPlacement[] = [];
  const tremoloGroups: TremoloGroupPlacement[] = [];
  const rejected = new Set<Element>();

  // A note or chord of the other family is hidden and left out.
  function rejectsFamily(element: Element): boolean {
    const tag = element.nodeName;
    if (
      noteFamily === null ||
      !(isNoteNodeName(tag) || isChordNodeName(tag)) ||
      isDrumNodeName(tag) === (noteFamily === 'drum')
    ) {
      return false;
    }
    (element as HTMLElement).style.display = 'none';
    rejected.add(element);
    return true;
  }

  function flatten(
    element: Element,
    tupletAncestors: TupletElementType[]
  ): void {
    const tag = element.nodeName;
    if (rejectsFamily(element)) {
      return;
    }
    if (
      isNoteNodeName(tag) ||
      isChordNodeName(tag) ||
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
    } else if (tag === MUSIC_TREMOLO_NODE) {
      flattenTremolo(element as TremoloElementType, tupletAncestors);
    } else if (tag === MUSIC_CLEF_NODE || tag === MUSIC_BARLINE_NODE) {
      const kind = tag === MUSIC_CLEF_NODE ? 'clef' : 'barline';
      const name = `<music-${kind}>`;
      if (tupletAncestors.length > 0) {
        console.warn(
          `[flattenSlotElements] ${name} inside <music-tuplet> is not supported; ignoring`
        );
        (element as HTMLElement).style.display = 'none';
        return;
      }
      const anchorIndex = flatElements.length - 1;
      // Two markers of one kind with no note/chord/rest between them share
      // an anchor and would draw on top of each other, so only the first is
      // honored. A clef and a barline may share one, in stream order.
      if (
        streamMarkers.some(
          (marker) =>
            marker.kind === kind && marker.afterElementIndex === anchorIndex
        )
      ) {
        console.warn(
          `[flattenSlotElements] consecutive ${name} elements are not supported; ignoring all but the first`
        );
        (element as HTMLElement).style.display = 'none';
        return;
      }
      streamMarkers.push(
        kind === 'clef'
          ? {
              kind,
              afterElementIndex: anchorIndex,
              element: element as ClefElementType,
            }
          : {
              kind,
              afterElementIndex: anchorIndex,
              element: element as BarlineElementType,
            }
      );
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
        !rejectsFamily(child) &&
        (isNoteNodeName(child.nodeName) || isChordNodeName(child.nodeName))
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

  // A <music-tremolo> flattens its members as ordinary elements and records
  // their flat indices. Anything that can't make a tremolo warns and
  // flattens as plain notes, so the music still shows.
  function flattenTremolo(
    element: TremoloElementType,
    tupletAncestors: TupletElementType[]
  ): void {
    const children = Array.from(element.children);
    const grouped = element.hasAttribute('tremolo-group');
    const isMember = (child: Element): boolean =>
      ((isNoteNodeName(child.nodeName) || isChordNodeName(child.nodeName)) &&
        !rejectsFamily(child)) ||
      (grouped &&
        child.nodeName === MUSIC_REST_NODE &&
        child.hasAttribute('hidden'));
    const members = children.filter(isMember) as NoteChordOrRestElementType[];
    const notes = members.filter(
      (member) => member.nodeName !== MUSIC_REST_NODE
    );
    const problem = tremoloProblem(children, members, notes, grouped);
    if (problem !== null) {
      warnOncePerElement(element, `[music-tremolo] ${problem}`);
      for (const child of children) {
        if (child.nodeName === MUSIC_CLEF_NODE) {
          (child as ClefElementType).style.display = 'none';
          continue;
        }
        flatten(child, tupletAncestors);
      }
      return;
    }
    const memberWarnings = notes.flatMap((note) => [
      ...(note.hasAttribute('tremolo')
        ? [
            'a member’s own `tremolo` strokes are ignored inside a two-note tremolo',
          ]
        : []),
      ...(note.hasAttribute('beam-group') ||
      note.hasAttribute('shared-stem-for')
        ? [
            '`beam-group` and `shared-stem-for` are ignored on a two-note tremolo member',
          ]
        : []),
      ...(note.getAttribute('tie') === 'start' ||
      note.getAttribute('tie') === 'end'
        ? [
            'tying two-note tremolos is impractical; slur the whole figure instead',
          ]
        : []),
    ]);
    warnOncePerElement(
      element,
      memberWarnings.length > 0
        ? `[music-tremolo] ${[...new Set(memberWarnings)].join('; ')}`
        : null
    );
    const memberIndices: number[] = [];
    for (const member of members) {
      memberIndices.push(flatElements.length);
      flatten(member, tupletAncestors);
    }
    tremoloGroups.push({ memberIndices, element });
  }

  for (const element of assigned) {
    if (
      element.nodeName === MUSIC_CLEF_NODE ||
      element.nodeName === MUSIC_BARLINE_NODE
    ) {
      (element as HTMLElement).style.display = '';
    }
    flatten(element, []);
  }

  if (rejected.size > 0) {
    console.warn(
      noteFamily === 'drum'
        ? `[flattenSlotElements] a percussion staff takes only <music-drum-note> and <music-drum-chord>; ignoring ${rejected.size} element(s)`
        : `[flattenSlotElements] a pitched staff takes no <music-drum-note> or <music-drum-chord>; ignoring ${rejected.size} element(s)`
    );
  }

  return {
    flatElements,
    tupletsByIndex,
    streamMarkers,
    arpeggioGroups,
    tremoloGroups,
  };
}

// Why a <music-tremolo>'s children can't make a tremolo, or null when they
// can.
function tremoloProblem(
  children: readonly Element[],
  members: readonly NoteChordOrRestElementType[],
  notes: readonly NoteChordOrRestElementType[],
  grouped: boolean
): string | null {
  const stray = children.find(
    (child) => !members.includes(child as NoteChordOrRestElementType)
  );
  if (stray !== undefined) {
    const name = stray.nodeName.toLowerCase();
    return stray.nodeName === MUSIC_REST_NODE
      ? 'a visible <music-rest> can’t be part of a tremolo (a cross-staff tremolo-group takes <music-rest hidden> spacers); drawing the notes plainly'
      : `<${name}> can’t go inside <music-tremolo>; drawing the notes plainly`;
  }
  if (notes.length === 0 || members.length < 2) {
    return grouped
      ? 'a tremolo-group wrapper needs at least one note plus spacer rests; drawing the notes plainly'
      : 'a tremolo needs at least two notes or chords; drawing the notes plainly';
  }
  // Read from the attribute: flattening can run before members upgrade.
  const durations = members.map(
    (member) => member.getAttribute('duration') ?? 'quarter'
  );
  if (new Set(durations).size > 1) {
    return 'every note of a tremolo is written with the same duration; drawing the notes plainly';
  }
  return null;
}

// Flattening re-runs on every slot change, so a wrapper's warning is only
// repeated once its text changes.
const lastWarnings = new WeakMap<Element, string>();
function warnOncePerElement(element: Element, warning: string | null): void {
  if (warning === null) {
    lastWarnings.delete(element);
    return;
  }
  if (lastWarnings.get(element) === warning) {
    return;
  }
  lastWarnings.set(element, warning);
  console.warn(warning);
}

export type VoiceFlattenResult = {
  flatElements: NoteChordOrRestElementType[];
  tupletsByIndex: Map<number, TupletElementType[]>;
  arpeggioGroups: ArpeggioGroupPlacement[];
  tremoloGroups: TremoloGroupPlacement[];
};

export type StaffFlattenResult = {
  // Ascending by voice number, always >=1 entry.
  voices: Map<VoiceNumber, VoiceFlattenResult>;
  streamMarkers: StreamMarkerPlacement[];
};

// Partitions a staff's slotted content into voices: no <music-voice>
// children is one voice; otherwise each child is a voice, numbered by order.
// Bare entries beside <music-voice> siblings are discarded; <music-lyrics>
// belongs to the staff. A <music-clef> belongs inside the first <music-voice>.
export function flattenStaffSlotElements(
  assigned: Element[],
  noteFamily: NoteFamily | null = null
): StaffFlattenResult {
  const voiceElements = assigned.filter(
    (element) => element.nodeName === MUSIC_VOICE_NODE
  );

  if (voiceElements.length === 0) {
    const {
      flatElements,
      tupletsByIndex,
      streamMarkers,
      arpeggioGroups,
      tremoloGroups,
    } = flattenSlotElements(assigned, noteFamily);
    return {
      voices: new Map([
        [1, { flatElements, tupletsByIndex, arpeggioGroups, tremoloGroups }],
      ]),
      streamMarkers,
    };
  }

  if (voiceElements.length > MAX_VOICES) {
    console.warn(
      `[flattenStaffSlotElements] a staff supports at most ${MAX_VOICES} <music-voice> siblings; ignoring the rest`
    );
  }

  // Set every <music-voice> wrapper's visibility unconditionally on every
  // call, not just the newly-excluded ones — a wrapper hidden here on a
  // previous call (e.g. a since-removed earlier voice pushed it past
  // MAX_VOICES) must become visible again once it's back within range.
  voiceElements.forEach((voiceElement, i) => {
    (voiceElement as HTMLElement).style.display = i < MAX_VOICES ? '' : 'none';
  });

  // A bare top-level marker beside <music-voice> siblings can't mark a
  // mid-measure point; it belongs inside the first <music-voice>.
  for (const element of assigned) {
    if (
      element.nodeName !== MUSIC_VOICE_NODE &&
      element.nodeName !== MUSIC_LYRICS_NODE
    ) {
      if (
        element.nodeName === MUSIC_CLEF_NODE ||
        element.nodeName === MUSIC_BARLINE_NODE
      ) {
        console.warn(
          `[flattenStaffSlotElements] a <${element.nodeName.toLowerCase()}> directly under <music-staff> alongside <music-voice> siblings is not supported; nest it inside the first <music-voice> instead`
        );
        (element as HTMLElement).style.display = 'none';
      } else {
        console.warn(
          `[flattenStaffSlotElements] a bare <${element.nodeName.toLowerCase()}> cannot appear alongside <music-voice> siblings; hiding it — wrap every active voice, including voice 1, in its own <music-voice>`
        );
        (element as HTMLElement).style.display = 'none';
      }
    }
  }

  const voices = new Map<VoiceNumber, VoiceFlattenResult>();
  let streamMarkers: StreamMarkerPlacement[] = [];
  voiceElements.slice(0, MAX_VOICES).forEach((voiceElement, i) => {
    const {
      flatElements,
      tupletsByIndex,
      streamMarkers: voiceMarkers,
      arpeggioGroups,
      tremoloGroups,
    } = flattenSlotElements(Array.from(voiceElement.children), noteFamily);
    voices.set((i + 1) as VoiceNumber, {
      flatElements,
      tupletsByIndex,
      arpeggioGroups,
      tremoloGroups,
    });
    if (i === 0) {
      // A marker is staff-wide, but voice 1 is its canonical anchor —
      // flattenSlotElements() already collected these with a real,
      // index-based `afterElementIndex` relative to voice 1's own array,
      // exactly like the single-voice case. staffNotationBase.ts converts
      // that index into a beat-offset to apply it to every voice.
      streamMarkers = voiceMarkers;
    } else if (voiceMarkers.length > 0) {
      for (const kind of new Set(voiceMarkers.map((marker) => marker.kind))) {
        console.warn(
          `[flattenStaffSlotElements] <music-${kind}> is only supported inside the first <music-voice>; ignoring`
        );
      }
      for (const marker of voiceMarkers) {
        marker.element.style.display = 'none';
      }
    }
  });

  return { voices, streamMarkers };
}

import type {
  IChordElement,
  INoteElement,
  NoteChordOrRestElementType,
  NoteOrChordElementType,
} from '../types/elements';
import type { DynamicMarking, HairpinKind } from '../types/theory';
import { HAIRPIN_KINDS, MUSIC_REST_NODE } from '../utils/consts';
import {
  DYNAMICS_CHAR_WIDTH_PX,
  HAIRPIN_DYNAMIC_GAP_PX,
} from '../utils/notationDimensions';
import { NOTE_SVG_WIDTH } from '../utils/svgCreator/note';
import type { HairpinEndpointText } from './hairpinPlacementRules';

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

// Walks a flat list of notes/chords/rests and pairs each hairpin start with
// its nearest end of the same kind (unpaired starts are dropped); mirrors
// pairConnectors() in connectorsBuilder.ts. Also computes each pair's
// rendered startX/endX, shrinking inward past any dynamic-marking text at
// the endpoints — on a resulting collision or interim-dynamic overlap it
// falls back to the raw note-edge positions and records a message in errors.
export function pairHairpins(
  elements: NoteChordOrRestElementType[],
  noteXPositions: ReadonlyMap<number, number>
): HairpinPair[] {
  return pairHairpinsWithLeftovers(elements, noteXPositions).pairs;
}

export type HairpinEndpoint = {
  kind: HairpinKind;
  element: NoteOrChordElementType;
  index: number;
};

export type HairpinPairing = {
  pairs: HairpinPair[];
  unpairedStarts: HairpinEndpoint[];
  orphanEnds: HairpinEndpoint[];
};

// `warnOrphans: false` is for a caller that sees only part of the music — an
// end whose start sits on another staff or in another measure is expected
// there, and is paired by whichever ancestor sees both.
export function pairHairpinsWithLeftovers(
  elements: NoteChordOrRestElementType[],
  noteXPositions: ReadonlyMap<number, number>,
  { warnOrphans = true }: { warnOrphans?: boolean } = {}
): HairpinPairing {
  const pairs: HairpinPair[] = [];
  const orphanEnds: HairpinEndpoint[] = [];
  const openStarts = new Map<HairpinKind, OpenHairpinStart>();

  elements.forEach((element, index) => {
    const noteOrChord = element as INoteElement | IChordElement;
    // A rest never has crescendo/decrescendo, so reaching a 'start'/'end'
    // branch below guarantees element is actually a note or chord.
    const noteOrChordElement = element as NoteOrChordElementType;

    for (const kind of HAIRPIN_KINDS) {
      const role = kind in noteOrChord ? noteOrChord[kind] : null;
      if (role === 'start') {
        openHairpinStart(openStarts, kind, noteOrChordElement, index);
        continue;
      }
      if (role !== 'end') {
        continue;
      }
      const start = openStarts.get(kind);
      if (start !== undefined) {
        pairs.push(
          buildHairpinPair(
            kind,
            start,
            { element: noteOrChordElement, index },
            elements,
            noteXPositions
          )
        );
        openStarts.delete(kind);
        continue;
      }
      orphanEnds.push({ kind, element: noteOrChordElement, index });
      if (warnOrphans) {
        console.warn(`[dynamicsRules] orphan ${kind} end (no matching start)`);
      }
    }
  });

  const unpairedStarts = [...openStarts].map(([kind, start]) => ({
    kind,
    element: start.element,
    index: start.index,
  }));
  return { pairs, unpairedStarts, orphanEnds };
}

// Only one open start per kind is representable — the model has no explicit
// start/end pairing attribute (unlike pairConnectors' for="id"). A second
// same-kind start before the first closes drops the first, deterministically.
function openHairpinStart(
  openStarts: Map<HairpinKind, OpenHairpinStart>,
  kind: HairpinKind,
  element: NoteOrChordElementType,
  index: number
): void {
  if (openStarts.has(kind)) {
    console.warn(
      `[dynamicsRules] ${kind} start dropped: a second ${kind} started before the first closed`
    );
  }
  openStarts.set(kind, { element, index });
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

  // Dynamic text is rendered centered at noteX + NOTE_SVG_WIDTH/2 (see
  // #renderDynamics' centerX).
  const span = computeHairpinXSpan({
    rawStartX,
    rawEndX,
    startTextCenterX: rawStartX + NOTE_SVG_WIDTH / 2,
    endTextCenterX: (noteXPositions.get(end.index) ?? 0) + NOTE_SVG_WIDTH / 2,
    startMarking: start.element.dynamic,
    endMarking: end.element.dynamic,
  });
  if (span.collided) {
    errors.push(
      `Hairpin (${kind}) overlaps a dynamic marking and cannot be cleanly positioned.`
    );
  }

  const hasInterimDynamic = elements.slice(start.index + 1, end.index).some(
    (el) =>
      // a rest never carries a dynamic — not an error, just skip it
      el.nodeName !== MUSIC_REST_NODE &&
      (el as unknown as INoteElement | IChordElement).dynamic !== null
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
    startX: span.startX,
    endX: span.endX,
    errors,
  };
}

export type PositionedHairpinEndpoint = HairpinEndpoint & { x: number };

// Pairs a hairpin left open on one staff with an end left over on its
// partner staff — a shared (both-hands) hairpin starting in one hand and
// ending in the other. Each start, left to right, takes the nearest unused
// end of its kind at or after it.
export function pairSharedHairpinsAcrossStaves(
  starts: readonly PositionedHairpinEndpoint[],
  ends: readonly PositionedHairpinEndpoint[]
): { start: PositionedHairpinEndpoint; end: PositionedHairpinEndpoint }[] {
  const unused = new Set(ends);
  const pairs: {
    start: PositionedHairpinEndpoint;
    end: PositionedHairpinEndpoint;
  }[] = [];
  for (const start of [...starts].sort((a, b) => a.x - b.x)) {
    let nearest: PositionedHairpinEndpoint | null = null;
    for (const end of unused) {
      if (end.kind !== start.kind || end.x < start.x) {
        continue;
      }
      if (nearest === null || end.x < nearest.x) {
        nearest = end;
      }
    }
    if (nearest !== null) {
      unused.delete(nearest);
      pairs.push({ start, end: nearest });
    }
  }
  return pairs;
}

export type HairpinXSpanInput = {
  rawStartX: number;
  rawEndX: number;
  startTextCenterX: number;
  endTextCenterX: number;
  startMarking: DynamicMarking | null;
  endMarking: DynamicMarking | null;
};

// Pulls each end inward past its endpoint dynamic's estimated text edge, so
// the wedge never runs under the glyph. Works in any 1:1 px frame. On a
// resulting crossover it falls back to the raw ends and flags `collided`.
export function computeHairpinXSpan({
  rawStartX,
  rawEndX,
  startTextCenterX,
  endTextCenterX,
  startMarking,
  endMarking,
}: HairpinXSpanInput): { startX: number; endX: number; collided: boolean } {
  let startX = rawStartX;
  let endX = rawEndX;
  if (startMarking !== null) {
    startX = Math.max(
      startX,
      startTextCenterX +
        (startMarking.length * DYNAMICS_CHAR_WIDTH_PX) / 2 +
        HAIRPIN_DYNAMIC_GAP_PX
    );
  }
  if (endMarking !== null) {
    endX = Math.min(
      endX,
      endTextCenterX -
        (endMarking.length * DYNAMICS_CHAR_WIDTH_PX) / 2 -
        HAIRPIN_DYNAMIC_GAP_PX
    );
  }
  if (endX <= startX) {
    return { startX: rawStartX, endX: rawEndX, collided: true };
  }
  return { startX, endX, collided: false };
}

// Spans for hairpins linked end to start on one staff. `texts` holds one
// endpoint dynamic per chain element (hairpins + 1): element k ends hairpin
// k-1 and starts hairpin k, so a joint's dynamic is the same text for both.
export function resolveChainSpans(
  hairpins: readonly { rawStartX: number; rawEndX: number }[],
  texts: readonly (HairpinEndpointText | null)[]
): {
  startX: number;
  endX: number;
  startText: HairpinEndpointText | null;
  endText: HairpinEndpointText | null;
}[] {
  return hairpins.map((hairpin, index) => {
    const startText = texts[index] ?? null;
    const endText = texts[index + 1] ?? null;
    const span = computeHairpinXSpan({
      rawStartX: hairpin.rawStartX,
      rawEndX: hairpin.rawEndX,
      startTextCenterX: startText?.centerX ?? 0,
      endTextCenterX: endText?.centerX ?? 0,
      startMarking: startText?.marking ?? null,
      endMarking: endText?.marking ?? null,
    });
    return { startX: span.startX, endX: span.endX, startText, endText };
  });
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

// Given a cross-measure hairpin pair and the composition row geometry,
// returns one segment (same row) or two segments (cross-row split), using
// the same 5px row tolerance as ties/slurs. When the pair spans a system
// break: segment 1 ends at the right row edge (stays open there for a
// decrescendo); segment 2 starts at the left row edge already open
// (openAtStart=true), signalling the change was in progress on the
// previous system.
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

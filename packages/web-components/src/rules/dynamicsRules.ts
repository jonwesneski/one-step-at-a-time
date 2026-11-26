import type {
  IChordElement,
  INoteElement,
  NoteChordOrRestElementType,
  NoteOrChordElementType,
} from '../types/elements';
import type { DynamicMarking, HairpinKind, SwellShape } from '../types/theory';
import { HAIRPIN_KINDS, MUSIC_REST_NODE } from '../utils/consts';
import {
  DYNAMIC_END_BARLINE_GAP_PX,
  DYNAMIC_END_NEXT_GAP_PX,
  DYNAMIC_REMINDER_BRACKET_WIDTH_PX,
  DYNAMIC_TEXT_FONT_SIZE_PX,
  DYNAMIC_TEXT_GAP_PX,
  DYNAMIC_TEXT_PUNCTUATION_GAP_PX,
  DYNAMICS_ABOVE_BASELINE_Y,
  DYNAMICS_BASELINE_Y,
  DYNAMICS_CHAR_WIDTH_PX,
  DYNAMICS_FONT_SIZE,
  DYNAMICS_ROW_CURVE_GAP_PX,
  DYNAMICS_ROW_INK_GAP_PX,
  DYNAMICS_TEXT_ASCENT_RATIO,
  DYNAMICS_TEXT_DESCENT_RATIO,
  HAIRPIN_DYNAMIC_GAP_PX,
  HAIRPIN_JOINT_GAP_PX,
  SWELL_MID_GAP_PX,
  SWELL_MID_GAP_SHARE,
  SWELL_MIN_WEDGE_PX,
} from '../utils/notationDimensions';
import { parseDynamicMarking, parseSwellShape } from '../utils/parsers';
import {
  NOTE_SVG_WIDTH,
  noteHeadCenterShiftPx,
} from '../utils/svgCreator/note';
import type { HairpinEndpointText } from './hairpinPlacementRules';
import { estimateTextWidthPx } from './techniqueTextRules';
import { tiesOn } from './tieRules';

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

  separateHairpinsAtJoints(pairs, elements, noteXPositions);

  const unpairedStarts = [...openStarts].map(([kind, start]) => ({
    kind,
    element: start.element,
    index: start.index,
  }));
  return { pairs, unpairedStarts, orphanEnds };
}

/**
 * Two hairpins that meet on one note (one ends where the next starts) part at
 * the note's centre with HAIRPIN_JOINT_GAP_PX between them. Each is only cut
 * back, never lengthened, and a hairpin too short to cut keeps its span.
 */
export function splitHairpinsAtJoint(
  before: { startX: number; endX: number },
  after: { startX: number; endX: number },
  jointCenterX: number
): void {
  const beforeEndX = Math.min(
    before.endX,
    jointCenterX - HAIRPIN_JOINT_GAP_PX / 2
  );
  const afterStartX = Math.max(
    after.startX,
    jointCenterX + HAIRPIN_JOINT_GAP_PX / 2
  );
  if (beforeEndX > before.startX) {
    before.endX = beforeEndX;
  }
  if (afterStartX < after.endX) {
    after.startX = afterStartX;
  }
}

function separateHairpinsAtJoints(
  pairs: HairpinPair[],
  elements: readonly NoteChordOrRestElementType[],
  noteXPositions: ReadonlyMap<number, number>
): void {
  for (const before of pairs) {
    const after = pairs.find(
      (pair) => pair !== before && pair.startElement === before.endElement
    );
    if (after === undefined) {
      continue;
    }
    const jointIndex = elements.indexOf(before.endElement);
    splitHairpinsAtJoint(
      before,
      after,
      (noteXPositions.get(jointIndex) ?? 0) +
        NOTE_SVG_WIDTH / 2 +
        noteHeadCenterShiftPx(before.endElement.duration)
    );
  }
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
    startTextCenterX:
      rawStartX +
      NOTE_SVG_WIDTH / 2 +
      noteHeadCenterShiftPx(start.element.duration),
    endTextCenterX:
      (noteXPositions.get(end.index) ?? 0) +
      NOTE_SVG_WIDTH / 2 +
      noteHeadCenterShiftPx(end.element.duration),
    startMarking: start.element.dynamic,
    endMarking: end.element.dynamic,
    startBracketed: start.element.dynamicReminder,
    endBracketed: end.element.dynamicReminder,
    startDynamicText: start.element.dynamicText ?? null,
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

/**
 * How far (px) a `dynamic-text` reaches right of its dynamic's letters: a
 * gap, smaller before a comma or bracket, and the text. 0 with none.
 */
export function dynamicTextTrailingPx(text: string | null | undefined): number {
  if (text === null || text === undefined) {
    return 0;
  }
  return (
    dynamicTextGapPx(text) +
    estimateTextWidthPx(text, DYNAMIC_TEXT_FONT_SIZE_PX)
  );
}

/** The gap (px) between a dynamic's letters and its `dynamic-text`. */
export function dynamicTextGapPx(text: string): number {
  return /^[,([]/.test(text)
    ? DYNAMIC_TEXT_PUNCTUATION_GAP_PX
    : DYNAMIC_TEXT_GAP_PX;
}

/** Half the estimated width of a dynamic, with its brackets for a reminder. */
export function dynamicTextHalfWidth(
  marking: DynamicMarking,
  bracketed = false
): number {
  return (
    (marking.length * DYNAMICS_CHAR_WIDTH_PX +
      (bracketed ? DYNAMIC_REMINDER_BRACKET_WIDTH_PX * 2 : 0)) /
    2
  );
}

export type HairpinXSpanInput = {
  rawStartX: number;
  rawEndX: number;
  startTextCenterX: number;
  endTextCenterX: number;
  startMarking: DynamicMarking | null;
  endMarking: DynamicMarking | null;
  startBracketed?: boolean;
  endBracketed?: boolean;
  // The start dynamic's `dynamic-text`, which the wedge starts after.
  startDynamicText?: string | null;
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
  startBracketed = false,
  endBracketed = false,
  startDynamicText = null,
}: HairpinXSpanInput): { startX: number; endX: number; collided: boolean } {
  let startX = rawStartX;
  let endX = rawEndX;
  if (startMarking !== null) {
    startX = Math.max(
      startX,
      startTextCenterX +
        dynamicTextHalfWidth(startMarking, startBracketed) +
        dynamicTextTrailingPx(startDynamicText) +
        HAIRPIN_DYNAMIC_GAP_PX
    );
  }
  if (endMarking !== null) {
    endX = Math.min(
      endX,
      endTextCenterX -
        dynamicTextHalfWidth(endMarking, endBracketed) -
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
  texts: readonly (HairpinEndpointText | null)[],
  jointCenterXs: readonly number[] = []
): {
  startX: number;
  endX: number;
  startText: HairpinEndpointText | null;
  endText: HairpinEndpointText | null;
}[] {
  const spans = hairpins.map((hairpin, index) => {
    const startText = texts[index] ?? null;
    const endText = texts[index + 1] ?? null;
    const span = computeHairpinXSpan({
      rawStartX: hairpin.rawStartX,
      rawEndX: hairpin.rawEndX,
      startTextCenterX: startText?.centerX ?? 0,
      endTextCenterX: endText?.centerX ?? 0,
      startMarking: startText?.marking ?? null,
      endMarking: endText?.marking ?? null,
      startBracketed: startText?.bracketed,
      endBracketed: endText?.bracketed,
      startDynamicText: startText?.text,
    });
    return { startX: span.startX, endX: span.endX, startText, endText };
  });
  // jointCenterXs[k] is the centre of the note hairpin k ends and k+1 starts.
  for (let k = 0; k + 1 < spans.length; k++) {
    const jointCenterX = jointCenterXs[k];
    if (jointCenterX !== undefined) {
      splitHairpinsAtJoint(spans[k], spans[k + 1], jointCenterX);
    }
  }
  return spans;
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

/** What is wrong with a `swell` or `dynamic-end` value; null when nothing. */
export function swellAttributeWarning(
  name: string,
  value: string | null
): string | null {
  if (value === null) {
    return null;
  }
  if (name === 'swell' && parseSwellShape(value) === null) {
    return `swell="${value}" is not both, crescendo or diminuendo; ignoring it`;
  }
  if (name === 'dynamic-end' && parseDynamicMarking(value) === null) {
    return `dynamic-end="${value}" is not a dynamic marking; ignoring it`;
  }
  return null;
}

/**
 * The last entry of the tie chain from `index`: an entry whose tie runs on
 * (`start`, `continue`) holds through the next. A rest ends it.
 */
export function swellChain(
  elements: readonly NoteChordOrRestElementType[],
  index: number
): number {
  let last = index;
  while (
    last + 1 < elements.length &&
    elements[last].nodeName !== MUSIC_REST_NODE &&
    elements[last + 1].nodeName !== MUSIC_REST_NODE &&
    tiesOn((elements[last] as NoteOrChordElementType).tie)
  ) {
    last++;
  }
  return last;
}

export type SwellOwner = { index: number; lastIndex: number };

/**
 * Each swell with the entries it covers: its tie chain from itself on. A swell
 * on an entry an earlier one covers is `overridden`.
 */
export function resolveSwellOwners(
  elements: readonly NoteChordOrRestElementType[]
): { owners: SwellOwner[]; overridden: number[] } {
  const owners: SwellOwner[] = [];
  const overridden: number[] = [];
  elements.forEach((element, index) => {
    if (
      element.nodeName === MUSIC_REST_NODE ||
      ((element as NoteOrChordElementType).swell ?? null) === null
    ) {
      return;
    }
    const covering = owners[owners.length - 1];
    if (covering !== undefined && index <= covering.lastIndex) {
      overridden.push(index);
      return;
    }
    owners.push({ index, lastIndex: swellChain(elements, index) });
  });
  return { owners, overridden };
}

/** The gap (px) between a `< >` swell's wedges, for a swell `length` long. */
export function swellGapPx(length: number): number {
  return Math.max(SWELL_MID_GAP_PX, length * SWELL_MID_GAP_SHARE);
}

/**
 * One entry of a swell's chain: its beats and the x it is drawn over, in the
 * row (index) of its system it stands in.
 */
export type SwellPiece = {
  row: number;
  startBeat: number;
  endBeat: number;
  startX: number;
  endX: number;
};

/** Where the middle beat of a swell's chain is drawn. */
export function swellMidpoint(pieces: readonly SwellPiece[]): {
  row: number;
  x: number;
} {
  const first = pieces[0];
  const last = pieces[pieces.length - 1];
  const beat = (first.startBeat + last.endBeat) / 2;
  const piece = pieces.find((candidate) => beat < candidate.endBeat) ?? last;
  const share =
    piece.endBeat > piece.startBeat
      ? (beat - piece.startBeat) / (piece.endBeat - piece.startBeat)
      : 0;
  return {
    row: piece.row,
    x: piece.startX + share * (piece.endX - piece.startX),
  };
}

/** The stretch of a swell in one row of its system. */
export type SwellRow = { startX: number; endX: number; centerY: number };

/**
 * A swell's wedges as hairpin segments, one per wedge and row. `rows` run
 * from the drawn start (clear of the start's dynamic) to the drawn end; `mid`
 * is where its middle beat is drawn, where the gap of a `< >` is centred. A
 * wedge carried over a system break is open there, as a hairpin is. Null when
 * a wedge would be shorter than SWELL_MIN_WEDGE_PX.
 */
export function resolveSwellSegments(input: {
  shape: SwellShape;
  rows: readonly SwellRow[];
  mid: { row: number; x: number };
}): HairpinSegment[] | null {
  const { shape, rows, mid } = input;
  const lengths = rows.map((row) => Math.max(0, row.endX - row.startX));
  const offsets = lengths.map((_, index) =>
    lengths.slice(0, index).reduce((sum, length) => sum + length, 0)
  );
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (shape !== 'both') {
    if (total < SWELL_MIN_WEDGE_PX) {
      return null;
    }
    return wedgeSegments(
      shape === 'crescendo' ? 'crescendo' : 'decrescendo',
      0,
      total,
      rows,
      offsets,
      lengths
    );
  }
  const gap = swellGapPx(total);
  const lowest = SWELL_MIN_WEDGE_PX + gap / 2;
  const highest = total - SWELL_MIN_WEDGE_PX - gap / 2;
  if (highest < lowest) {
    return null;
  }
  const midRow = Math.min(Math.max(mid.row, 0), rows.length - 1);
  let center = Math.min(
    Math.max(offsets[midRow] + mid.x - rows[midRow].startX, lowest),
    highest
  );
  // The gap stays in one row: one straddling a break moves the shorter way.
  for (const boundary of offsets.slice(1)) {
    if (center - gap / 2 < boundary && boundary < center + gap / 2) {
      const before = boundary - gap / 2;
      const after = boundary + gap / 2;
      const candidates = [before, after]
        .filter((candidate) => candidate >= lowest && candidate <= highest)
        .sort((x, y) => Math.abs(x - center) - Math.abs(y - center));
      center = candidates[0] ?? center;
    }
  }
  return [
    ...wedgeSegments('crescendo', 0, center - gap / 2, rows, offsets, lengths),
    ...wedgeSegments(
      'decrescendo',
      center + gap / 2,
      total,
      rows,
      offsets,
      lengths
    ),
  ];
}

// One wedge from `from` to `to` along a swell's rows laid end to end.
function wedgeSegments(
  kind: HairpinKind,
  from: number,
  to: number,
  rows: readonly SwellRow[],
  offsets: readonly number[],
  lengths: readonly number[]
): HairpinSegment[] {
  return rows.flatMap((row, index) => {
    const start = Math.max(from, offsets[index]);
    const end = Math.min(to, offsets[index] + lengths[index]);
    if (end <= start) {
      return [];
    }
    return [
      {
        kind,
        startX: row.startX + start - offsets[index],
        endX: row.startX + end - offsets[index],
        centerY: row.centerY,
        openAtStart: start > from,
        openAtEnd: kind === 'decrescendo' && end < to,
      },
    ];
  });
}

/** A hairpin's start, clear of its start dynamic and that one's text. */
export function hairpinStartClearOf(
  rawStartX: number,
  text: HairpinEndpointText | null
): number {
  return text === null
    ? rawStartX
    : Math.max(
        rawStartX,
        text.centerX +
          dynamicTextHalfWidth(text.marking, text.bracketed) +
          dynamicTextTrailingPx(text.text) +
          HAIRPIN_DYNAMIC_GAP_PX
      );
}

/** A hairpin's end, short of its end dynamic. */
export function hairpinEndClearOf(
  rawEndX: number,
  text: HairpinEndpointText | null
): number {
  return text === null
    ? rawEndX
    : Math.min(
        rawEndX,
        text.centerX -
          dynamicTextHalfWidth(text.marking, text.bracketed) -
          HAIRPIN_DYNAMIC_GAP_PX
      );
}

/**
 * A swell within one row: from `rawStartX`, clear of its start dynamic, to
 * `endX`, its gap over `midX`. Null when it has no room.
 */
export function resolveSwellRow(input: {
  shape: SwellShape;
  rawStartX: number;
  endX: number;
  midX: number;
  centerY: number;
  startText: HairpinEndpointText | null;
}): HairpinSegment[] | null {
  const { shape, rawStartX, endX, midX, centerY, startText } = input;
  return resolveSwellSegments({
    shape,
    rows: [
      { startX: hairpinStartClearOf(rawStartX, startText), endX, centerY },
    ],
    mid: { row: 0, x: midX },
  });
}

/**
 * Centre x of a `dynamic-end`: its right edge half a space before the next
 * entry's ink and own dynamic, or 1.5 spaces before the barline with no next
 * entry. Never left of `minCenterX`.
 */
export function dynamicEndCenterX(input: {
  marking: DynamicMarking;
  nextInkLeftX: number | null;
  nextDynamicLeftX: number | null;
  barlineX: number;
  minCenterX: number;
}): number {
  const { marking, nextInkLeftX, nextDynamicLeftX, barlineX, minCenterX } =
    input;
  const right = Math.min(
    nextInkLeftX === null
      ? barlineX - DYNAMIC_END_BARLINE_GAP_PX
      : nextInkLeftX - DYNAMIC_END_NEXT_GAP_PX,
    nextDynamicLeftX === null
      ? Infinity
      : nextDynamicLeftX - DYNAMIC_END_NEXT_GAP_PX
  );
  return Math.max(minCenterX, right - dynamicTextHalfWidth(marking));
}

/**
 * Room (px) a `dynamic-end` needs after its head's centre: its letters and the
 * gap to the next entry.
 */
export function dynamicEndReachPx(marking: DynamicMarking): number {
  return 2 * dynamicTextHalfWidth(marking) + DYNAMIC_END_NEXT_GAP_PX;
}

/**
 * Swells that a hairpin also starts, ends or runs over somewhere in their
 * chain: the two would overlap, so the hairpin wins. `openEnds` are the
 * hairpin ends whose partner is outside `elements` (another staff or
 * measure).
 */
export function swellConflicts(
  elements: readonly NoteChordOrRestElementType[],
  owners: readonly SwellOwner[],
  pairs: readonly Pick<HairpinPair, 'startElement' | 'endElement'>[],
  openEnds: readonly Pick<HairpinEndpoint, 'element'>[] = []
): NoteOrChordElementType[] {
  const open = new Set<Element>(openEnds.map((end) => end.element));
  const spans = pairs.map((pair) => [
    elements.indexOf(pair.startElement),
    elements.indexOf(pair.endElement),
  ]);
  return owners.flatMap(({ index, lastIndex }) => {
    const covered = elements.slice(index, lastIndex + 1);
    return covered.some((element) => open.has(element)) ||
      spans.some(([start, end]) => start <= lastIndex && index <= end)
      ? [elements[index] as NoteOrChordElementType]
      : [];
  });
}

/**
 * The baseline of a row of dynamics (and the centre line of its hairpins) on
 * one side of the stave: its usual distance, or further out past the ink on
 * that side, a space clear of notes and half a space of `curveYs` (slurs, ties
 * and brackets, whose reach is an estimate).
 */
export function dynamicsRowY(input: {
  above: boolean;
  inkYs: readonly number[];
  curveYs: readonly number[];
}): number {
  const { above, inkYs, curveYs } = input;
  const clearOf = (ys: readonly number[], gap: number): number[] =>
    ys.map((y) =>
      above
        ? y - gap - DYNAMICS_FONT_SIZE * DYNAMICS_TEXT_DESCENT_RATIO
        : y + gap + DYNAMICS_FONT_SIZE * DYNAMICS_TEXT_ASCENT_RATIO
    );
  const rows = [
    above ? DYNAMICS_ABOVE_BASELINE_Y : DYNAMICS_BASELINE_Y,
    ...clearOf(inkYs, DYNAMICS_ROW_INK_GAP_PX),
    ...clearOf(curveYs, DYNAMICS_ROW_CURVE_GAP_PX),
  ];
  return above ? Math.min(...rows) : Math.max(...rows);
}

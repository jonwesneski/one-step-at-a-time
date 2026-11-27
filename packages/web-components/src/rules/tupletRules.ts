import {
  ChordElementType,
  NoteChordOrRestElementType,
  NoteElementType,
  TupletElementType,
} from '../types/elements';
import { DurationType, TupletPlacement, TupletRatio } from '../types/theory';
import {
  isNoteNodeName,
  MUSIC_REST_NODE,
  MUSIC_TUPLET_NODE,
} from '../utils/consts';
import {
  BEAM_THICKNESS_PX,
  STAFF_BOTTOM_LINE_Y,
  STAFF_TOP_LINE_Y,
  STAFF_Y_PADDING,
  TUPLET_HOOK_LENGTH_PX,
  TUPLET_LABEL_PADDING_PX,
  TUPLET_NOTE_VALUE_GAP_PX,
  TUPLET_NOTE_VALUE_SCALE,
  TUPLET_NUMERAL_BEAM_GAP_PX,
  TUPLET_NUMERAL_FONT_SIZE,
  TUPLET_NUMERAL_GAP_PX,
  TUPLET_STAFF_CLEARANCE_PX,
} from '../utils/notationDimensions';
import { parseDuration } from '../utils/parsers';
import {
  NOTE_HEAD_CX_STEM_DOWN_PX,
  NOTE_HEAD_CX_STEM_UP_PX,
  NOTE_HEAD_RADIUS_PX,
  NOTE_HEAD_Y_OFFSET_CORRECTION,
  NOTE_SCALE,
  NOTE_STEM_TIP_Y_OFFSET,
  NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN,
  NOTE_SVG_WIDTH,
  NOTE_Y_HEAD_OFFSET_STEM_DOWN,
  NOTE_Y_HEAD_OFFSET_STEM_UP,
  noteAugmentationDotLayout,
  noteHeadGeometry,
  stemTipPosition,
  upTailInk,
} from '../utils/svgCreator/note';
import { estimateTextWidthPx } from './techniqueTextRules';
import { durationToBase, isStemlessDuration } from './theoryConsts';

export type ParsedTupletRatio = {
  actual: number;
  normal: number;
  displayString: string;
};

export type TupletGroup = {
  element: TupletElementType;
  /** Flat indices into the flattened elements array (after expanding tuplets). */
  indices: number[];
  parsedRatio: ParsedTupletRatio;
  /** 0 = outermost (no parent tuplet), 1 = nested one level deep, etc. */
  nestingLevel: number;
};

export type TupletBracketGeometry = {
  group: TupletGroup;
  startX: number;
  endX: number;
  baseY: number;
  stemUp: boolean;
  angle: number;
  omitBracket: boolean;
  numeralX: number;
  numeralY: number;
  hookLength: number;
  /** Per-end hook direction (+1 down, -1 up), for a cross-staff bracket whose ends point at different staves. Defaults to toward the notes on the bracket's own side. */
  hookDirections?: { start: 1 | -1; end: 1 | -1 };
};

export function defaultNormalCount(actual: number): number {
  const map: Record<number, number> = {
    2: 3,
    3: 2,
    4: 3,
    5: 4,
    6: 4,
    7: 4,
    8: 6,
    9: 8,
  };
  return map[actual] ?? Math.ceil((actual * 2) / 3);
}

const TUPLET_RATIO_PATTERN = /^([1-9]\d*)(?::([1-9]\d*))?$/;

/**
 * Validates a tuplet ratio written as an attribute string: a positive count
 * (`3`) or `actual:normal` with both positive (`3:2`).
 */
export function isTupletRatio(value: string | null): value is TupletRatio {
  return value !== null && TUPLET_RATIO_PATTERN.test(value);
}

/**
 * Splits a tuplet ratio into its actual and normal counts. A malformed ratio
 * reads as a triplet, so one bad value can't turn a measure's beat offsets
 * into NaN.
 */
export function parseTupletRatio(ratioString: TupletRatio): ParsedTupletRatio {
  const match = TUPLET_RATIO_PATTERN.exec(ratioString);
  if (match === null) {
    return { actual: 3, normal: 2, displayString: '3' };
  }
  const actual = parseInt(match[1], 10);
  const normal =
    match[2] === undefined
      ? defaultNormalCount(actual)
      : parseInt(match[2], 10);
  return { actual, normal, displayString: ratioString };
}

/** A tuplet's `note-value`: any value from a double-whole to a sixty-fourth. */
export function parseTupletNoteValue(
  value: string | null
): DurationType | null {
  const duration = parseDuration(value);
  return duration === null || durationToBase[duration] === 'hundredtwentyeighth'
    ? null
    : duration;
}

/**
 * A tuplet label: the numeral, and with a note value `=` and an upright note
 * at TUPLET_NOTE_VALUE_SCALE, stem up. Horizontal values run from the label's
 * left edge; vertical ones from its centre line (the bracket line), +down.
 */
export type TupletDisplay = {
  numeral: string;
  noteValue: DurationType | null;
  /** The numeral's width, with its `=` when there is a note value. */
  textWidth: number;
  width: number;
  /** How far the label reaches above and below its centre line. */
  ascent: number;
  descent: number;
  /** Where the note's box goes; its head is centred on the centre line. */
  noteBoxX: number;
  noteBoxY: number;
};

// A stem-up note's ink in its own box (px, full size).
function noteValueInk(duration: DurationType): {
  headLeft: number;
  headCenterY: number;
  right: number;
  top: number;
  bottom: number;
} {
  const head = noteHeadGeometry(true, duration, false, 'normal');
  const headCenterY = head.cy * NOTE_SCALE;
  const headHalfHeight = head.halfHeight * NOTE_SCALE;
  const tail = upTailInk({
    duration,
    stemUp: true,
    noFlags: false,
    noStem: false,
    stemExtension: 0,
    tailRoomStemExtension: 0,
  });
  const dots = noteAugmentationDotLayout({
    duration,
    stemUp: true,
    noFlags: false,
    noStem: false,
    notehead: 'normal',
    stemExtension: 0,
    staffY: null,
  });
  return {
    headLeft: (head.cx - head.halfWidth) * NOTE_SCALE,
    headCenterY,
    right: Math.max(
      (head.cx + head.halfWidth) * NOTE_SCALE,
      tail?.rightX ?? -Infinity,
      dots?.rightEdgeX ?? -Infinity
    ),
    top: isStemlessDuration(duration)
      ? headCenterY - headHalfHeight
      : stemTipPosition(true, duration, false, 0).y * NOTE_SCALE,
    bottom: headCenterY + headHalfHeight,
  };
}

/** How a tuplet's ratio is shown, and how much room that takes. */
export function tupletDisplay(
  ratio: ParsedTupletRatio,
  noteValue: DurationType | null
): TupletDisplay {
  const numeral = ratio.displayString;
  const half = TUPLET_NUMERAL_FONT_SIZE / 2;
  const numeralWidth = estimateTextWidthPx(numeral, TUPLET_NUMERAL_FONT_SIZE);
  if (noteValue === null) {
    return {
      numeral,
      noteValue,
      textWidth: numeralWidth,
      width: numeralWidth,
      ascent: half,
      descent: half,
      noteBoxX: 0,
      noteBoxY: 0,
    };
  }
  const textWidth =
    numeralWidth + estimateTextWidthPx('=', TUPLET_NUMERAL_FONT_SIZE);
  const ink = noteValueInk(noteValue);
  const scale = TUPLET_NOTE_VALUE_SCALE;
  const noteLeft = textWidth + TUPLET_NOTE_VALUE_GAP_PX;
  return {
    numeral,
    noteValue,
    textWidth,
    width: noteLeft + scale * (ink.right - ink.headLeft),
    ascent: Math.max(half, scale * (ink.headCenterY - ink.top)),
    descent: Math.max(half, scale * (ink.bottom - ink.headCenterY)),
    noteBoxX: noteLeft - scale * ink.headLeft,
    noteBoxY: -scale * ink.headCenterY,
  };
}

/** A tuplet group's display, from its ratio and its element's note value. */
export function tupletDisplayOf(
  group: Pick<TupletGroup, 'element' | 'parsedRatio'>
): TupletDisplay {
  return tupletDisplay(group.parsedRatio, group.element.noteValue ?? null);
}

/** How far a label reaches toward (`near`) and away from its notes. */
export function tupletLabelExtents(
  display: TupletDisplay,
  above: boolean
): { near: number; far: number } {
  return above
    ? { near: display.descent, far: display.ascent }
    : { near: display.ascent, far: display.descent };
}

/** The gap a bracket leaves for its label. */
export function tupletLabelGapPx(display: TupletDisplay): number {
  return Math.max(
    TUPLET_NUMERAL_GAP_PX,
    display.width + 2 * TUPLET_LABEL_PADDING_PX
  );
}

export function resolveInnermostTuplet(
  tupletsByIndex: ReadonlyMap<number, TupletElementType[]>,
  index: number
): TupletElementType | undefined {
  const ancestors = tupletsByIndex.get(index);
  return ancestors !== undefined ? ancestors[ancestors.length - 1] : undefined;
}

/**
 * Maps each tupleted element index to its innermost ratio's normal/actual factor,
 * which scales that entry's spacing slack (computeSpacingWeights). Plain
 * elements are absent from the map — callers treat a missing index as factor 1.
 */
export function computeTupletScaleByIndex(
  elements: NoteChordOrRestElementType[],
  tupletsByIndex: ReadonlyMap<number, TupletElementType[]>
): Map<number, number> {
  const scaleByIndex = new Map<number, number>();
  for (let i = 0; i < elements.length; i++) {
    const innermostTuplet = resolveInnermostTuplet(tupletsByIndex, i);
    if (innermostTuplet !== undefined) {
      const { actual, normal } = parseTupletRatio(innermostTuplet.ratio);
      scaleByIndex.set(i, normal / actual);
    }
  }
  return scaleByIndex;
}

function computeNestingLevel(el: TupletElementType): number {
  let level = 0;
  let ancestor = el.parentElement;
  while (ancestor !== null) {
    if (ancestor.nodeName === MUSIC_TUPLET_NODE) {
      level++;
    }
    ancestor = ancestor.parentElement;
  }
  return level;
}

export function buildTupletGroups(
  elements: NoteChordOrRestElementType[],
  tupletsByIndex: ReadonlyMap<number, TupletElementType[]>
): TupletGroup[] {
  const tupletToIndices = new Map<TupletElementType, number[]>();

  for (let i = 0; i < elements.length; i++) {
    const ancestors = tupletsByIndex.get(i);
    if (ancestors === undefined) {
      continue;
    }
    for (const tupletElement of ancestors) {
      if (!tupletToIndices.has(tupletElement)) {
        tupletToIndices.set(tupletElement, []);
      }
      (tupletToIndices.get(tupletElement) as number[]).push(i);
    }
  }

  const groups: TupletGroup[] = [];
  for (const [tupletElement, indices] of tupletToIndices) {
    groups.push({
      element: tupletElement,
      indices,
      parsedRatio: parseTupletRatio(tupletElement.ratio),
      nestingLevel: computeNestingLevel(tupletElement),
    });
  }

  return groups;
}

export function getStaffYForIndex(
  index: number,
  elements: NoteChordOrRestElementType[],
  stemDirections: boolean[],
  noteStaffYCoords: ReadonlyMap<NoteElementType, number>,
  chordStaffYCoords: ReadonlyMap<ChordElementType, number[]>
): number | null {
  const el = elements[index];
  if (isNoteNodeName(el.nodeName)) {
    return noteStaffYCoords.get(el as NoteElementType) ?? null;
  }
  if (el.nodeName !== MUSIC_REST_NODE) {
    const ys = chordStaffYCoords.get(el as ChordElementType);
    if (ys && ys.length > 0) {
      return stemDirections[index] ? Math.max(...ys) : Math.min(...ys);
    }
  }
  return null;
}

/**
 * A note/chord's unbeamed stem-tip Y in staff space, from its own direction
 * (not the group's vote): `beamTipYForIndex`'s fallback, also used to apply
 * crossStaffTupletBeamY deltas.
 */
export function naturalStemTipY(
  index: number,
  elements: NoteChordOrRestElementType[],
  stemDirections: boolean[],
  noteStaffYCoords: ReadonlyMap<NoteElementType, number>,
  chordStaffYCoords: ReadonlyMap<ChordElementType, number[]>,
  stemExtensionPx = 0
): number | null {
  const staffY = getStaffYForIndex(
    index,
    elements,
    stemDirections,
    noteStaffYCoords,
    chordStaffYCoords
  );
  if (staffY === null) {
    return null;
  }
  return stemTipYFromStaffY(staffY, stemDirections[index], stemExtensionPx);
}

/**
 * A stem's tip Y in the staff's local coordinate space, from the staff-Y of the
 * head it starts at. `stemExtensionPx` is what it draws beyond the base length.
 */
export function stemTipYFromStaffY(
  staffY: number,
  stemUp: boolean,
  stemExtensionPx = 0
): number {
  const yHeadOffset = stemUp
    ? NOTE_Y_HEAD_OFFSET_STEM_UP
    : NOTE_Y_HEAD_OFFSET_STEM_DOWN;
  const stemTipOffset = stemUp
    ? NOTE_STEM_TIP_Y_OFFSET
    : NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN;
  return (
    STAFF_Y_PADDING +
    staffY -
    yHeadOffset +
    stemTipOffset +
    (stemUp ? -stemExtensionPx : stemExtensionPx)
  );
}

/**
 * Whether a tuplet's bracket/numeral sits above its notes: an explicit
 * `sideOverride` wins, otherwise the stems' majority vote (a tie goes up).
 */
export function resolveTupletBracketAbove(
  indices: readonly number[],
  stemDirections: readonly boolean[],
  sideOverride: TupletPlacement | null
): boolean {
  if (sideOverride !== null) {
    return sideOverride === 'above';
  }
  const upVotes = indices.filter((i) => stemDirections[i] === true).length;
  return upVotes >= indices.length / 2;
}

// The outer edge, toward `above`'s side, of this note/chord's outermost
// notehead on that side, in the staff's local coordinate space.
export function noteheadEdgeY(
  index: number,
  elements: NoteChordOrRestElementType[],
  noteStaffYCoords: ReadonlyMap<NoteElementType, number>,
  chordStaffYCoords: ReadonlyMap<ChordElementType, number[]>,
  above: boolean
): number | null {
  const element = elements[index];
  let staffY: number | undefined;
  if (isNoteNodeName(element.nodeName)) {
    staffY = noteStaffYCoords.get(element as NoteElementType);
  } else if (element.nodeName !== MUSIC_REST_NODE) {
    const ys = chordStaffYCoords.get(element as ChordElementType);
    if (ys && ys.length > 0) {
      staffY = above ? Math.min(...ys) : Math.max(...ys);
    }
  }
  if (staffY === undefined) {
    return null;
  }
  const centerY = STAFF_Y_PADDING + staffY - NOTE_HEAD_Y_OFFSET_CORRECTION;
  return above ? centerY - NOTE_HEAD_RADIUS_PX : centerY + NOTE_HEAD_RADIUS_PX;
}

/**
 * Computes the baseY for an outer bracket given the numeralY positions of its
 * inner child groups. The outer bracket is placed just beyond the furthest
 * inner numeral so it never overlaps any inner numeral.
 */
export function computeOuterBracketBaseY(
  innerNumeralYs: number[],
  stemUp: boolean
): number {
  const gap = TUPLET_NUMERAL_FONT_SIZE / 2 + TUPLET_NUMERAL_BEAM_GAP_PX;
  if (stemUp) {
    return Math.min(...innerNumeralYs) - gap;
  }
  return Math.max(...innerNumeralYs) + gap;
}

export function computeTupletBracketGeometry(
  group: TupletGroup,
  elements: NoteChordOrRestElementType[],
  noteXPositions: ReadonlyMap<number, number>,
  stemDirections: boolean[],
  beamedIndices: ReadonlySet<number>,
  noteStaffYCoords: ReadonlyMap<NoteElementType, number>,
  chordStaffYCoords: ReadonlyMap<ChordElementType, number[]>,
  outerBaseY: number | null,
  hasInnerGroups: boolean,
  // The outer edge, on the `above` side, of the beam stack at note `index`, as
  // the beam renderer actually drew it — null when that note is not beamed or
  // no renderer exists. The numeral/bracket sits clear of the beams, so it
  // reads the real stack rather than re-deriving it from staff coords (which
  // misses the beam's placement). Defaults to the staff-coord derivation.
  beamStackEdgeYForIndex: (
    index: number,
    above: boolean
  ) => number | null = () => null,
  // Forces the bracket's side regardless of the stem vote. A note whose
  // stem points away from the forced side is cleared by its notehead, not
  // by a stem tip on the bracket's side it doesn't have.
  sideOverride: TupletPlacement | null = null,
  // What an unbeamed note's stem draws beyond the base length, so the bracket
  // clears its real tip.
  stemExtensionPxForIndex: (index: number) => number = () => 0
): TupletBracketGeometry | null {
  if (group.indices.length < 2) {
    return null;
  }

  const firstIndex = group.indices[0];
  const lastIndex = group.indices[group.indices.length - 1];
  const firstX = noteXPositions.get(firstIndex);
  const lastX = noteXPositions.get(lastIndex);

  if (firstX === undefined || lastX === undefined) {
    return null;
  }

  const stemUp = resolveTupletBracketAbove(
    group.indices,
    stemDirections,
    sideOverride
  );

  const display = tupletDisplayOf(group);
  const label = tupletLabelExtents(display, stemUp);
  const forcedBracket = group.element.bracket === 'always';

  // Omit bracket when all notes are beamed and no rests are present, and this
  // group has no inner (child) tuplet groups that need an enclosing bracket.
  // A side forced onto the noteheads has no beam to sit beside, so it keeps
  // its bracket.
  const omitBracket =
    !forcedBracket &&
    !hasInnerGroups &&
    group.indices.every((i) => beamedIndices.has(i)) &&
    group.indices.every((i) => elements[i].nodeName !== MUSIC_REST_NODE) &&
    (sideOverride === null ||
      group.indices.every((i) => stemDirections[i] === stemUp));

  const startX = Math.max(0, firstX - NOTE_SVG_WIDTH / 2);
  const endX = lastX + NOTE_SVG_WIDTH / 2;

  // Compute bracket angle from slope of outer non-rest pitches
  const nonRestIndices = group.indices.filter(
    (i) => elements[i].nodeName !== MUSIC_REST_NODE
  );
  let angle = 0;
  if (nonRestIndices.length >= 2) {
    const firstNonRest = nonRestIndices[0];
    const lastNonRest = nonRestIndices[nonRestIndices.length - 1];
    const firstStaffY = getStaffYForIndex(
      firstNonRest,
      elements,
      stemDirections,
      noteStaffYCoords,
      chordStaffYCoords
    );
    const lastStaffY = getStaffYForIndex(
      lastNonRest,
      elements,
      stemDirections,
      noteStaffYCoords,
      chordStaffYCoords
    );
    const firstNoteX = noteXPositions.get(firstNonRest);
    const lastNoteX = noteXPositions.get(lastNonRest);
    if (
      firstStaffY !== null &&
      lastStaffY !== null &&
      firstNoteX !== undefined &&
      lastNoteX !== undefined
    ) {
      const run = lastNoteX - firstNoteX;
      if (run > 0) {
        const rawAngle = (lastStaffY - firstStaffY) / run;
        if (Math.abs(rawAngle) < 0.05) {
          angle = 0;
        } else {
          angle = Math.max(-0.15, Math.min(0.15, rawAngle));
        }
      }
    }
  }

  // baseY: staff-referenced default for groups with no outer context.
  // For bracket groups with inner children, the caller passes outerBaseY computed
  // dynamically from the actual inner numeralY positions.
  const staffTopInContainer = STAFF_TOP_LINE_Y - STAFF_Y_PADDING;
  const staffBottomInContainer = STAFF_BOTTOM_LINE_Y + STAFF_Y_PADDING;
  const staffBaseY = stemUp
    ? staffTopInContainer - TUPLET_STAFF_CLEARANCE_PX - TUPLET_HOOK_LENGTH_PX
    : staffBottomInContainer +
      TUPLET_STAFF_CLEARANCE_PX +
      TUPLET_HOOK_LENGTH_PX;
  let baseY = outerBaseY ?? staffBaseY;

  // The beam Y at note `idx` on the numeral's side: the renderer's actual beam
  // stack when available, else re-derived from the staff Y (which omits the
  // beam's placement — used only when there is no beam renderer, e.g. jsdom /
  // standalone).
  const beamTipYForIndex = (idx: number): number | null => {
    const fromRenderer = beamStackEdgeYForIndex(idx, stemUp);
    if (fromRenderer !== null) {
      return fromRenderer;
    }
    const staffY = getStaffYForIndex(
      idx,
      elements,
      stemDirections,
      noteStaffYCoords,
      chordStaffYCoords
    );
    if (staffY === null) {
      return null;
    }
    return stemTipYFromStaffY(
      staffY,
      stemUp,
      stemDirections[idx] === stemUp ? stemExtensionPxForIndex(idx) : 0
    );
  };

  // A bracket forced onto a beamed group runs along the beam.
  const beamEdgeAt = (i: number) => beamStackEdgeYForIndex(i, stemUp);
  const alongBeam =
    forcedBracket &&
    nonRestIndices.length >= 2 &&
    nonRestIndices.every(
      (i) =>
        beamedIndices.has(i) &&
        stemDirections[i] === stemUp &&
        beamEdgeAt(i) !== null
    );
  if (alongBeam) {
    const first = nonRestIndices[0];
    const last = nonRestIndices[nonRestIndices.length - 1];
    const run =
      (noteXPositions.get(last) ?? 0) - (noteXPositions.get(first) ?? 0);
    angle =
      run > 0
        ? ((beamEdgeAt(last) as number) - (beamEdgeAt(first) as number)) / run
        : 0;
  }

  // Push baseY past the extreme stem tip (or notehead) so the bracket clears
  // notes far outside the staff; only ever moves it outward. A label reaching
  // toward the notes past the hooks keeps its own gap.
  const nonRestIndicesForClamping = group.indices.filter(
    (i) => elements[i].nodeName !== MUSIC_REST_NODE
  );
  if (nonRestIndicesForClamping.length > 0) {
    const gap = Math.max(
      TUPLET_STAFF_CLEARANCE_PX + TUPLET_HOOK_LENGTH_PX,
      label.near + TUPLET_NUMERAL_BEAM_GAP_PX
    );

    const extremeStemTipY = nonRestIndicesForClamping.reduce(
      (worst, i) => {
        const awayFromSide = stemDirections[i] !== stemUp;
        const headEdge = () =>
          noteheadEdgeY(
            i,
            elements,
            noteStaffYCoords,
            chordStaffYCoords,
            stemUp
          );
        // A beamed note stemmed away from the bracket's side (a kneed beam)
        // has its head beyond the beams on that side.
        const candidates =
          sideOverride !== null && awayFromSide
            ? [headEdge()]
            : awayFromSide && beamStackEdgeYForIndex(i, stemUp) !== null
            ? [beamTipYForIndex(i), headEdge()]
            : [beamTipYForIndex(i)];
        return candidates.reduce<number>(
          (extreme, y) =>
            y === null
              ? extreme
              : stemUp
              ? Math.min(extreme, y)
              : Math.max(extreme, y),
          worst
        );
      },
      stemUp ? Infinity : -Infinity
    );

    if (alongBeam) {
      // Each tip, carried back along the bracket's slope to its start.
      const required = nonRestIndicesForClamping.map((i) => {
        const tip = beamTipYForIndex(i) ?? baseY;
        const x = (noteXPositions.get(i) ?? startX) + NOTE_SVG_WIDTH / 2;
        const atStart = tip - (x - startX) * angle;
        return stemUp ? atStart - gap : atStart + gap;
      });
      // Nowhere nearer the stave than an unbeamed bracket.
      const rise = (endX - startX) * angle;
      const staffAtStart = stemUp
        ? baseY - Math.max(0, rise)
        : baseY - Math.min(0, rise);
      baseY = stemUp
        ? Math.min(staffAtStart, ...required)
        : Math.max(staffAtStart, ...required);
    } else if (isFinite(extremeStemTipY)) {
      const requiredBaseY = stemUp
        ? extremeStemTipY - gap
        : extremeStemTipY + gap;
      baseY = stemUp
        ? Math.min(baseY, requiredBaseY)
        : Math.max(baseY, requiredBaseY);
    }
  }

  const noteheadCentreX = (idx: number): number => {
    const leftEdge = noteXPositions.get(idx) ?? 0;
    const headCx = stemDirections[idx]
      ? NOTE_HEAD_CX_STEM_UP_PX
      : NOTE_HEAD_CX_STEM_DOWN_PX;
    return leftEdge + headCx;
  };

  const count = group.indices.length;
  let numeralX: number;
  if (count % 2 === 1) {
    numeralX = noteheadCentreX(group.indices[Math.floor(count / 2)]);
  } else {
    const leftMid = noteheadCentreX(group.indices[count / 2 - 1]);
    const rightMid = noteheadCentreX(group.indices[count / 2]);
    numeralX = (leftMid + rightMid) / 2;
  }

  let numeralY: number;
  if (omitBracket) {
    // Place numeral purely from the drawn beam — outside the beam stack.
    // Take the primary beam's Y at the first and last notes, interpolate at numeralX.
    const firstNonRest = nonRestIndices[0];
    const lastNonRest = nonRestIndices[nonRestIndices.length - 1];
    const firstNoteX = noteheadCentreX(firstNonRest);
    const lastNoteX = noteheadCentreX(lastNonRest);
    const firstBeamY = beamTipYForIndex(firstNonRest) ?? staffBaseY;
    const lastBeamY = beamTipYForIndex(lastNonRest) ?? staffBaseY;
    const run = lastNoteX - firstNoteX;
    const beamYAtNumeralX =
      run > 0
        ? firstBeamY +
          ((numeralX - firstNoteX) / run) * (lastBeamY - firstBeamY)
        : firstBeamY;
    // beamYAtNumeralX is the primary (outermost) beam line. Its secondary beams
    // stack toward the noteheads, away from the numeral, so clearing one beam
    // thickness plus the gap positions the numeral just outside the stack.
    const numeralOffset =
      label.near + TUPLET_NUMERAL_BEAM_GAP_PX + BEAM_THICKNESS_PX;
    numeralY = stemUp
      ? beamYAtNumeralX - numeralOffset
      : beamYAtNumeralX + numeralOffset;
  } else {
    numeralY = baseY + (numeralX - startX) * angle;
  }

  return {
    group,
    startX,
    endX,
    baseY,
    stemUp,
    angle,
    omitBracket,
    numeralX,
    numeralY,
    hookLength: TUPLET_HOOK_LENGTH_PX,
  };
}

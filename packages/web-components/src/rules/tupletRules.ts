import {
  ChordElementType,
  NoteChordOrRestElementType,
  NoteElementType,
  TupletElementType,
} from '../types/elements';
import { TupletRatio } from '../types/theory';
import {
  MUSIC_NOTE_NODE,
  MUSIC_REST_NODE,
  MUSIC_TUPLET_NODE,
} from '../utils/consts';
import {
  BEAM_GAP_PX,
  BEAM_THICKNESS_PX,
  STAFF_BOTTOM_LINE_Y,
  STAFF_TOP_LINE_Y,
  STAFF_Y_PADDING,
  TUPLET_HOOK_LENGTH_PX,
  TUPLET_NUMERAL_BEAM_GAP_PX,
  TUPLET_NUMERAL_FONT_SIZE,
  TUPLET_STAFF_CLEARANCE_PX,
} from '../utils/notationDimensions';
import {
  flagStemExtensionPx,
  NOTE_HEAD_CX_STEM_DOWN_PX,
  NOTE_HEAD_CX_STEM_UP_PX,
  NOTE_STEM_TIP_Y_OFFSET,
  NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN,
  NOTE_SVG_WIDTH,
  NOTE_Y_HEAD_OFFSET_STEM_DOWN,
  NOTE_Y_HEAD_OFFSET_STEM_UP,
} from '../utils/svgCreator/note';
import { durationToFlagCountMap } from './theoryConsts';

export type ParsedTupletRatio = {
  actual: number;
  normal: number;
  displayString: string;
};

export type TupletGroup = {
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

export function parseTupletRatio(ratioString: TupletRatio): ParsedTupletRatio {
  if (ratioString.includes(':')) {
    const [left, right] = ratioString.split(':');
    const actual = parseInt(left, 10);
    const normal = parseInt(right, 10);
    return { actual, normal, displayString: ratioString };
  }
  const actual = parseInt(ratioString, 10);
  const normal = defaultNormalCount(actual);
  return { actual, normal, displayString: ratioString };
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
      tupletToIndices.get(tupletElement)!.push(i);
    }
  }

  const groups: TupletGroup[] = [];
  for (const [tupletElement, indices] of tupletToIndices) {
    groups.push({
      indices,
      parsedRatio: parseTupletRatio(tupletElement.ratio),
      nestingLevel: computeNestingLevel(tupletElement),
    });
  }

  return groups;
}

function getStaffYForIndex(
  index: number,
  elements: NoteChordOrRestElementType[],
  stemDirections: boolean[],
  noteStaffYCoords: ReadonlyMap<NoteElementType, number>,
  chordStaffYCoords: ReadonlyMap<ChordElementType, number[]>
): number | null {
  const el = elements[index];
  if (el.nodeName === MUSIC_NOTE_NODE) {
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
  outerBaseY: number | null
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

  // Majority vote for stem direction
  const upVotes = group.indices.filter(
    (i) => stemDirections[i] === true
  ).length;
  const stemUp = upVotes >= group.indices.length / 2;

  // Omit bracket when all notes are beamed and no rests are present.
  // The outermost bracket (nestingLevel 0) is always shown per notation convention.
  const omitBracket =
    group.nestingLevel > 0 &&
    group.indices.every((i) => beamedIndices.has(i)) &&
    group.indices.every((i) => elements[i].nodeName !== MUSIC_REST_NODE);

  const startX = firstX - NOTE_SVG_WIDTH / 2;
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
  const baseY = outerBaseY ?? staffBaseY;

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
    // Place numeral purely from beam geometry — outside the beam stack.
    // Compute stem-tip Y for the first and last notes, then interpolate at numeralX.
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
    const firstNoteX = noteheadCentreX(firstNonRest);
    const lastNoteX = noteheadCentreX(lastNonRest);
    const yHeadOffset = stemUp
      ? NOTE_Y_HEAD_OFFSET_STEM_UP
      : NOTE_Y_HEAD_OFFSET_STEM_DOWN;
    const stemTipOffset = stemUp
      ? NOTE_STEM_TIP_Y_OFFSET
      : NOTE_STEM_TIP_Y_OFFSET_STEM_DOWN;
    const flagCount =
      durationToFlagCountMap.get(elements[firstNonRest].duration) ?? 1;
    const flagExtension = stemUp ? 0 : flagStemExtensionPx(flagCount);
    const firstBeamY =
      firstStaffY !== null
        ? STAFF_Y_PADDING +
          firstStaffY -
          yHeadOffset +
          stemTipOffset +
          flagExtension
        : staffBaseY;
    const lastBeamY =
      lastStaffY !== null
        ? STAFF_Y_PADDING +
          lastStaffY -
          yHeadOffset +
          stemTipOffset +
          flagExtension
        : staffBaseY;
    const run = lastNoteX - firstNoteX;
    const beamYAtNumeralX =
      run > 0
        ? firstBeamY +
          ((numeralX - firstNoteX) / run) * (lastBeamY - firstBeamY)
        : firstBeamY;
    // beamYAtNumeralX is at the stem tip — the inner edge of the first beam.
    // The full beam stack = BEAM_THICKNESS_PX for the first beam plus
    // (BEAM_THICKNESS_PX + BEAM_GAP_PX) per additional beam layer.
    const beamStackOffset =
      BEAM_THICKNESS_PX + (flagCount - 1) * (BEAM_THICKNESS_PX + BEAM_GAP_PX);
    const numeralOffset =
      TUPLET_NUMERAL_FONT_SIZE / 2 +
      TUPLET_NUMERAL_BEAM_GAP_PX +
      beamStackOffset;
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

import {
  ChordElementType,
  NoteChordOrRestElementType,
  NoteElementType,
} from '../types/elements';
import type { DurationType } from '../types/theory';
import type { BeamsBuilder } from '../utils';
import { MUSIC_REST_NODE } from '../utils/consts';
import {
  BASE_STEM_LENGTH_PX,
  LEDGER_TAIL_CLEARANCE_PX,
  MIDDLE_STAFF_Y,
  MIN_STEM_LENGTH_PX,
  OUTWARD_STEM_LENGTH_AT_MIDDLE_PX,
  OUTWARD_STEM_SHORTENING_PER_STEP_PX,
  QUAVER_TAIL_LENGTH_PX,
  STAFF_BOTTOM_LINE_Y,
  STAFF_LINE_SPACING,
  STAFF_TOP_LINE_Y,
  STAFF_Y_STEP,
  TWO_TAILS_LENGTH_PX,
} from '../utils/notationDimensions';
import { getStaffYs } from './staffNoteRules';
import type { VoiceDirection } from './voiceRules';

const OFFSET_EPSILON = 1e-9;

export type StemContext = {
  timeSig: readonly [number, number];
  // Whole-note-fraction start and length of each element, index-aligned with
  // `elements`.
  beatOffsets: readonly number[];
  durations: readonly number[];
  // Directions already decided elsewhere (stem-direction, cross-staff roles,
  // triangles). A forced member fixes its whole beam group.
  forcedDirections?: ReadonlyMap<NoteChordOrRestElementType, boolean>;
};

type StemUnit = {
  indices: readonly number[];
  start: number;
  end: number;
  stemmed: boolean;
  // null is a neutral unit: no pitch decides its direction.
  stemUp: boolean | null;
};

/**
 * Pitch-driven stem direction for one bar: the head farthest from the middle
 * line decides, one direction per beam group. A centre-line or evenly balanced
 * unit then follows its surrounding stems (see resolveNeutralStemUp).
 */
export function determineStemDirections(
  elements: NoteChordOrRestElementType[],
  beamsBuilder: BeamsBuilder,
  noteStaffYCoords: ReadonlyMap<NoteElementType, number>,
  chordStaffYCoords: ReadonlyMap<ChordElementType, number[]>,
  context: StemContext
): boolean[] {
  const stemDirections = new Array<boolean>(elements.length).fill(true);
  const units = buildStemUnits(
    elements,
    beamsBuilder,
    noteStaffYCoords,
    chordStaffYCoords,
    context
  );
  const contextUnits = units.filter((unit) => unit.stemmed);

  for (const unit of units) {
    const stemUp =
      unit.stemUp ??
      (unit.stemmed
        ? resolveNeutralStemUp(unit, contextUnits, context.timeSig)
        : false);
    for (const index of unit.indices) {
      stemDirections[index] = stemUp;
    }
  }

  return stemDirections;
}

/**
 * Multi-voice stem direction: every note/chord in a voice gets the same
 * fixed direction (voice 1 always up, voice 2 always down — see
 * voiceRules.ts#resolveVoiceDirections), never pitch-driven. Unlike
 * determineStemDirections above, direction never varies within one voice's
 * whole stream, so this is a flat fill — no beam-group resolution needed.
 */
export function determineVoiceStemDirections(
  elements: NoteChordOrRestElementType[],
  voiceDirection: VoiceDirection
): boolean[] {
  return new Array(elements.length).fill(voiceDirection === 'up');
}

/**
 * Stem length (px) for a head as a lone note. A stem running toward the middle
 * line is 3½ spaces, or reaches the middle line when that falls short. A stem
 * running away from it shortens by ¼ space per step, never below 2½ spaces.
 */
export function stemLengthPx(headY: number, stemUp: boolean): number {
  const stepsOutward =
    (stemUp ? MIDDLE_STAFF_Y - headY : headY - MIDDLE_STAFF_Y) / STAFF_Y_STEP;
  if (stepsOutward < 0) {
    return Math.max(BASE_STEM_LENGTH_PX, Math.abs(headY - MIDDLE_STAFF_Y));
  }
  return Math.max(
    MIN_STEM_LENGTH_PX,
    OUTWARD_STEM_LENGTH_AT_MIDDLE_PX -
      OUTWARD_STEM_SHORTENING_PER_STEP_PX * stepsOutward
  );
}

/**
 * Difference (px) between a stem's rule length and the base length, measured
 * from the head nearest the open end of the stem. Positive lengthens, negative
 * shortens.
 */
export function stemLengthAdjustPx(
  headYs: readonly number[],
  stemUp: boolean
): number {
  if (headYs.length === 0) {
    return 0;
  }
  const headNearestOpenEnd = stemUp ? Math.min(...headYs) : Math.max(...headYs);
  return stemLengthPx(headNearestOpenEnd, stemUp) - BASE_STEM_LENGTH_PX;
}

/**
 * Stem extension (px) for an unbeamed note or chord. Two tails need a stem at
 * least as long as they are, and a stem from a ledger-line note back into the
 * stave grows so its tails stop short of the first ledger line. Both hold for
 * any tail count: the note SVG adds a step per tail past the second on its own.
 */
export function unbeamedStemExtensionPx(
  headYs: readonly number[],
  stemUp: boolean,
  flagCount: number,
  hasLedgerLines = true
): number {
  const adjust = stemLengthAdjustPx(headYs, stemUp);
  if (flagCount === 0 || headYs.length === 0) {
    return adjust;
  }
  const tailsLengthPx =
    flagCount >= 2 ? TWO_TAILS_LENGTH_PX : QUAVER_TAIL_LENGTH_PX;
  const ledgerFloorPx = hasLedgerLines
    ? ledgerTailStemFloorPx(headYs, stemUp, tailsLengthPx)
    : 0;
  const tailsFloorPx = flagCount >= 2 ? TWO_TAILS_LENGTH_PX : 0;
  return (
    Math.max(BASE_STEM_LENGTH_PX + adjust, tailsFloorPx, ledgerFloorPx) -
    BASE_STEM_LENGTH_PX
  );
}

function ledgerTailStemFloorPx(
  headYs: readonly number[],
  stemUp: boolean,
  tailsLengthPx: number
): number {
  const headNearestOpenEnd = stemUp ? Math.min(...headYs) : Math.max(...headYs);
  const headPastFirstLedgerPx = stemUp
    ? headNearestOpenEnd - (STAFF_BOTTOM_LINE_Y + STAFF_LINE_SPACING)
    : STAFF_TOP_LINE_Y - STAFF_LINE_SPACING - headNearestOpenEnd;
  return headPastFirstLedgerPx < 0
    ? 0
    : headPastFirstLedgerPx + LEDGER_TAIL_CLEARANCE_PX + tailsLengthPx;
}

function buildStemUnits(
  elements: NoteChordOrRestElementType[],
  beamsBuilder: BeamsBuilder,
  noteStaffYCoords: ReadonlyMap<NoteElementType, number>,
  chordStaffYCoords: ReadonlyMap<ChordElementType, number[]>,
  { beatOffsets, durations, forcedDirections }: StemContext
): StemUnit[] {
  const units: StemUnit[] = [];
  const processed = new Set<number>();

  for (let i = 0; i < elements.length; i++) {
    if (processed.has(i) || elements[i].nodeName === MUSIC_REST_NODE) {
      continue;
    }
    const indices = beamsBuilder.beamGroupFor(i) ?? [i];
    indices.forEach((index) => processed.add(index));
    const forced = indices
      .map((index) => forcedDirections?.get(elements[index]))
      .find((direction) => direction !== undefined);
    const last = indices[indices.length - 1];
    units.push({
      indices,
      start: beatOffsets[indices[0]],
      end: beatOffsets[last] + durations[last],
      stemmed: !isStemless(elements[i].duration),
      stemUp:
        forced ??
        stemUpFromPitch(
          indices.flatMap((index) =>
            getStaffYs(elements[index], noteStaffYCoords, chordStaffYCoords)
          )
        ),
    });
  }

  return units;
}

function isStemless(duration: DurationType): boolean {
  return duration === 'whole' || duration === 'double-whole';
}

function stemUpFromPitch(headYs: readonly number[]): boolean | null {
  if (headYs.length === 0) {
    return null;
  }
  const reachAbove = MIDDLE_STAFF_Y - Math.min(...headYs);
  const reachBelow = Math.max(...headYs) - MIDDLE_STAFF_Y;
  if (reachAbove === reachBelow) {
    return null;
  }
  return reachBelow > reachAbove;
}

// Context stops at the barline: the rule applies within a bar, and a staff
// holds exactly one. The order is surrounding stems, then the same beat, then
// the same half-bar, then the down-stem convention.
function resolveNeutralStemUp(
  unit: StemUnit,
  contextUnits: readonly StemUnit[],
  timeSig: readonly [number, number]
): boolean {
  const position = contextUnits.indexOf(unit);
  const previous = contextUnits
    .slice(0, position)
    .reverse()
    .find((candidate) => candidate.stemUp !== null);
  const next = contextUnits
    .slice(position + 1)
    .find((candidate) => candidate.stemUp !== null);

  if (previous === undefined && next === undefined) {
    return false;
  }
  if (previous === undefined || next === undefined) {
    return ((previous ?? next) as StemUnit).stemUp as boolean;
  }
  if (previous.stemUp === next.stemUp) {
    return previous.stemUp as boolean;
  }

  const beatWindow = beatWindowDuration(timeSig);
  const halfBarWindow = halfBarDuration(timeSig, beatWindow);
  for (const windowSize of [beatWindow, halfBarWindow]) {
    if (windowSize === null) {
      continue;
    }
    const agreed = agreedDirectionInWindow(unit, contextUnits, windowSize);
    if (agreed !== null) {
      return agreed;
    }
  }
  return false;
}

function beatWindowDuration([beats, beatType]: readonly [
  number,
  number
]): number {
  return beatType === 8 && beats % 3 === 0 ? 3 / 8 : 1 / beatType;
}

function halfBarDuration(
  [beats, beatType]: readonly [number, number],
  beatWindow: number
): number | null {
  const windowsInBar = Math.round(beats / beatType / beatWindow);
  return windowsInBar % 2 === 0 && windowsInBar > 2
    ? (windowsInBar / 2) * beatWindow
    : null;
}

function agreedDirectionInWindow(
  unit: StemUnit,
  contextUnits: readonly StemUnit[],
  windowSize: number
): boolean | null {
  const windowStart =
    Math.floor((unit.start + OFFSET_EPSILON) / windowSize) * windowSize;
  const windowEnd = windowStart + windowSize;
  const directions = new Set(
    contextUnits
      .filter(
        (candidate) =>
          candidate.stemUp !== null &&
          candidate.start < windowEnd - OFFSET_EPSILON &&
          (candidate.end > windowStart + OFFSET_EPSILON ||
            candidate.start >= windowStart - OFFSET_EPSILON)
      )
      .map((candidate) => candidate.stemUp as boolean)
  );
  return directions.size === 1 ? [...directions][0] : null;
}

import {
  BASE_STEM_LENGTH_PX,
  BEAM_MINORITY_FAR_THRESHOLD_PX,
  BEAM_SLOPE_PER_INTERVAL,
  BEAM_SLOPE_SECOND_SLIGHT_PX,
  BEAM_STEP_PX,
  BEAM_THICKNESS_PX,
  BEAMED_STEM_MIN_IN_STAVE_PX,
  CLOSE_BEAMED_NOTES_SPACING_PX,
  MAX_BEAM_SLOPE_LONG_GROUP_PX,
  MAX_BEAM_SLOPE_SHORT_GROUP_PX,
  MAX_BEAM_SLOPE_SLIGHT_PX,
  MIDDLE_STAFF_Y,
  MIN_STEM_LENGTH_PX,
  STAFF_BOTTOM_LINE_Y,
  STAFF_LINE_SPACING,
  STAFF_TOP_LINE_Y,
  STAFF_Y_STEP,
  WIDE_BEAM_STEP_PX,
} from '../utils/notationDimensions';
import { computeBeamLevelStructure } from './beamStructureRules';
import {
  type DoubleStemmedBeamMember,
  type DoubleStemmedBeamSegmentPosition,
  type DoubleStemmedBeamSegmentSide,
  resolveGroupSecondaryBeamSide,
  resolveSecondaryBeamVerticalSide,
} from './doubleStemmedBeamRules';

// Every value here is in the note Y-coordinate map: stave lines at
// STAFF_TOP_LINE_Y…STAFF_BOTTOM_LINE_Y, y growing downward.

const GRID_PX = STAFF_LINE_SPACING / 4;
const EPSILON = 1e-6;
const SEARCH_RANGE_PX = STAFF_LINE_SPACING * 6;
// Lengthening a stem costs slightly more than shortening it by the same
// amount, so a head on a line takes the shorter of two equally close stems.
const LENGTHEN_COST = 1.1;
const STAVE_LINES = [0, 1, 2, 3, 4].map(
  (line) => STAFF_TOP_LINE_Y + line * STAFF_LINE_SPACING
);

export type BeamPlacementNote = {
  /** Stem x (px); NaN before the notes are spaced. */
  x: number;
  /** The head nearest the beam. */
  nearestHeadY: number;
  beamCount: number;
};

export type BeamObstacle = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type BeamPlacement = {
  /** Top edge of the primary beam at the first and last stem. */
  primaryTopAtFirst: number;
  primaryTopAtLast: number;
  /** Signed distance from one beam level to the next (positive: downward). */
  levelOffset: number;
};

export type UniformBeamPlacement = BeamPlacement & {
  longestStemPx: number;
};

export type KneedBeamNote = {
  x: number;
  highestHeadY: number;
  lowestHeadY: number;
  beamCount: number;
};

export type KneedBeamPlacement = {
  placement: BeamPlacement;
  /** False when no layout keeps every stem long enough and the outer lines clear. */
  fits: boolean;
};

/**
 * True when the group takes a horizontal beam: its first and last notes match,
 * its pitches repeat a pattern, an inner note is closer to the beam than both
 * outer notes, or it holds two pitches only and the single odd note at one end
 * is the one farthest from the beam.
 */
export function isHorizontalBeamGroup(
  nearestHeadYs: readonly number[],
  stemUp: boolean
): boolean {
  const count = nearestHeadYs.length;
  if (count < 2) {
    return true;
  }
  const first = nearestHeadYs[0];
  const last = nearestHeadYs[count - 1];
  if (first === last) {
    return true;
  }
  // Closer to the beam: higher (smaller y) under an up-stem beam.
  const closeness = (y: number) => (stemUp ? -y : y);
  const nearerOuter = Math.max(closeness(first), closeness(last));
  if (
    nearestHeadYs.slice(1, -1).some((y) => closeness(y) > nearerOuter + EPSILON)
  ) {
    return true;
  }
  for (let period = 2; period * 2 <= count; period++) {
    if (
      nearestHeadYs.every(
        (y, i) => i < period || y === nearestHeadYs[i - period]
      )
    ) {
      return true;
    }
  }
  const distinct = [...new Set(nearestHeadYs)];
  if (count >= 3 && distinct.length === 2) {
    const oddValue = distinct.find(
      (value) => nearestHeadYs.filter((y) => y === value).length === 1
    );
    if (oddValue !== undefined) {
      const oddIndex = nearestHeadYs.indexOf(oddValue);
      const other = distinct.find((value) => value !== oddValue) as number;
      if (
        (oddIndex === 0 || oddIndex === count - 1) &&
        closeness(oddValue) < closeness(other)
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Slope (px, unsigned) a sloping beam aims for, and the steepest it may take:
 * half the outer interval, at most a space for two or three notes and two for
 * longer groups; closely spaced groups and groups lying wholly past the first
 * ledger line take only ¼ space for a 2nd and ½ space for anything wider.
 */
export function beamSlopeLimits(input: {
  intervalPx: number;
  noteCount: number;
  averageSpacingPx: number;
  allBeyondFirstLedger: boolean;
}): { ideal: number; max: number } {
  const { intervalPx, noteCount, averageSpacingPx, allBeyondFirstLedger } =
    input;
  if (intervalPx < EPSILON) {
    return { ideal: 0, max: 0 };
  }
  const closelySpaced =
    Number.isFinite(averageSpacingPx) &&
    averageSpacingPx < CLOSE_BEAMED_NOTES_SPACING_PX;
  if (allBeyondFirstLedger || closelySpaced) {
    const ideal =
      intervalPx <= STAFF_Y_STEP + EPSILON
        ? BEAM_SLOPE_SECOND_SLIGHT_PX
        : MAX_BEAM_SLOPE_SLIGHT_PX;
    return { ideal, max: MAX_BEAM_SLOPE_SLIGHT_PX };
  }
  const max =
    noteCount <= 3
      ? MAX_BEAM_SLOPE_SHORT_GROUP_PX
      : MAX_BEAM_SLOPE_LONG_GROUP_PX;
  return { ideal: Math.min(intervalPx * BEAM_SLOPE_PER_INTERVAL, max), max };
}

/**
 * Stem direction of a beamed group from each member's own preference (true:
 * up, false: down, null: on the middle line) and how far its farthest head
 * reaches from the middle line. Equal numbers each way: the farthest head
 * decides. Otherwise the majority decides, unless the minority reaches at
 * least BEAM_MINORITY_FAR_THRESHOLD_PX further. Null when nothing decides.
 */
export function beamedGroupStemUp(
  members: readonly { stemUp: boolean | null; reachPx: number }[]
): boolean | null {
  const upMembers = members.filter((member) => member.stemUp === true);
  const downMembers = members.filter((member) => member.stemUp === false);
  const farthest = (group: typeof members) =>
    Math.max(0, ...group.map((member) => member.reachPx));
  const farthestUp = farthest(upMembers);
  const farthestDown = farthest(downMembers);
  const byFarthest =
    farthestUp === farthestDown ? null : farthestUp > farthestDown;
  if (upMembers.length === downMembers.length) {
    return byFarthest;
  }
  const majorityUp = upMembers.length > downMembers.length;
  const majorityReach = majorityUp ? farthestUp : farthestDown;
  const minorityReach = majorityUp ? farthestDown : farthestUp;
  if (minorityReach - majorityReach >= BEAM_MINORITY_FAR_THRESHOLD_PX) {
    return !majorityUp;
  }
  return majorityUp;
}

/**
 * Places a one-direction beam. Every beam inside the stave hangs from, sits on
 * or straddles a line at both ends (with one or two beams, an up-stem beam
 * hangs or straddles and a down-stem beam sits or straddles, so an added beam
 * still lands on a line); stems stay as close to 3½ spaces as that allows,
 * never shorter than 3 spaces from a head in the stave or 2½ from one outside
 * it, and each beam past the second moves the stack a step further out.
 * Ledger-line notes keep one stave line clear between them and the innermost
 * beam. When no layout attaches every beam to a line (four or more beams
 * that can't spread), the attachment rule alone is dropped.
 */
export function resolveBeamPlacement(input: {
  notes: readonly BeamPlacementNote[];
  stemUp: boolean;
  obstacles?: readonly BeamObstacle[];
}): UniformBeamPlacement {
  const { notes, stemUp } = input;
  const maxBeamCount = Math.max(...notes.map((note) => note.beamCount));
  if (maxBeamCount >= 4) {
    const spread = solveUniform(input, WIDE_BEAM_STEP_PX, true);
    if (spread !== null && stackTouchesStave(spread, notes, stemUp)) {
      return spread;
    }
  }
  return (
    solveUniform(input, BEAM_STEP_PX, true) ??
    solveUniform(input, BEAM_STEP_PX, false) ??
    solveUniform({ notes, stemUp }, BEAM_STEP_PX, false) ??
    fallbackPlacement(notes, stemUp, BEAM_STEP_PX)
  );
}

function solveUniform(
  input: {
    notes: readonly BeamPlacementNote[];
    stemUp: boolean;
    obstacles?: readonly BeamObstacle[];
  },
  step: number,
  requireAttachment: boolean
): UniformBeamPlacement | null {
  const { notes, stemUp, obstacles = [] } = input;
  const count = notes.length;
  const first = notes[0];
  const last = notes[count - 1];
  const towardBeam = stemUp ? -1 : 1;
  const progress = progressFractions(notes);
  const nearestYs = notes.map((note) => note.nearestHeadY);
  const horizontal = isHorizontalBeamGroup(nearestYs, stemUp);
  const span = last.x - first.x;
  const slope = beamSlopeLimits({
    intervalPx: Math.abs(last.nearestHeadY - first.nearestHeadY),
    noteCount: count,
    averageSpacingPx: count > 1 ? span / (count - 1) : Number.NaN,
    allBeyondFirstLedger:
      nearestYs.every((y) => y <= STAFF_TOP_LINE_Y - STAFF_LINE_SPACING) ||
      nearestYs.every((y) => y >= STAFF_BOTTOM_LINE_Y + STAFF_LINE_SPACING),
  });
  const intervalSign = Math.sign(last.nearestHeadY - first.nearestHeadY);
  const maxSlopeSteps = horizontal ? 0 : Math.floor(slope.max / GRID_PX);
  const maxBeamCount = Math.max(...notes.map((note) => note.beamCount));
  const stackDepth = (maxBeamCount - 1) * step + BEAM_THICKNESS_PX;
  const idealStems = notes.map((note) => idealStemPx(note, stemUp, step));
  const minStems = notes.map((note) => minimumStemPx(note, step));

  // Wide enough that every note can reach both its ideal and its shortest
  // allowed stem, at any slope the group may take.
  const anchorEdges = notes.flatMap((note, i) => [
    note.nearestHeadY + towardBeam * idealStems[i],
    note.nearestHeadY + towardBeam * minStems[i],
  ]);
  const slopeReach = maxSlopeSteps * GRID_PX;
  const searchFrom = snapToGrid(
    Math.min(...anchorEdges) - slopeReach - SEARCH_RANGE_PX
  );
  const searchTo = Math.max(...anchorEdges) + slopeReach + SEARCH_RANGE_PX;
  let best: UniformBeamPlacement | null = null;
  let bestCost = Infinity;

  for (
    let outerFirst = searchFrom;
    outerFirst <= searchTo + EPSILON;
    outerFirst += GRID_PX
  ) {
    for (let slopeSteps = 0; slopeSteps <= maxSlopeSteps; slopeSteps++) {
      // The beam slopes with the outer interval, never against it.
      const rise = intervalSign * slopeSteps * GRID_PX;
      const outerAt = (i: number) => outerFirst + rise * progress[i];
      const stems = notes.map((note, i) =>
        stemUp ? note.nearestHeadY - outerAt(i) : outerAt(i) - note.nearestHeadY
      );
      if (stems.some((stem, i) => stem < minStems[i] - EPSILON)) {
        continue;
      }
      if (
        notes.some(
          (note, i) =>
            !innermostBeamClearsLedgerSide(note, stemUp, outerAt(i), step)
        )
      ) {
        continue;
      }
      if (
        requireAttachment &&
        !(
          endBeamsAttached(outerFirst, first.beamCount, stemUp, step) &&
          endBeamsAttached(outerAt(count - 1), last.beamCount, stemUp, step)
        )
      ) {
        continue;
      }
      if (
        obstacles.some((obstacle) =>
          stackHitsObstacle(
            obstacle,
            notes,
            (x) =>
              outerFirst + (span === 0 ? 0 : (rise * (x - first.x)) / span),
            stemUp,
            stackDepth
          )
        )
      ) {
        continue;
      }
      const cost =
        stemCost(stems[0], idealStems[0]) +
        stemCost(stems[count - 1], idealStems[count - 1]) +
        Math.abs(slopeSteps * GRID_PX - slope.ideal);
      if (cost < bestCost - EPSILON) {
        bestCost = cost;
        best = toPlacement(outerFirst, outerAt(count - 1), stemUp, step, stems);
      }
    }
  }
  return best;
}

// A level beam far enough out that every stem keeps its floor.
function fallbackPlacement(
  notes: readonly BeamPlacementNote[],
  stemUp: boolean,
  step: number
): UniformBeamPlacement {
  const towardBeam = stemUp ? -1 : 1;
  const outers = notes.map(
    (note) =>
      note.nearestHeadY +
      towardBeam * Math.max(BASE_STEM_LENGTH_PX, minimumStemPx(note, step))
  );
  const outer = stemUp ? Math.min(...outers) : Math.max(...outers);
  const stems = notes.map((note) => Math.abs(outer - note.nearestHeadY));
  return toPlacement(outer, outer, stemUp, step, stems);
}

function toPlacement(
  outerFirst: number,
  outerLast: number,
  stemUp: boolean,
  step: number,
  stems: readonly number[]
): UniformBeamPlacement {
  // An up-stem beam's outer edge is its top; a down-stem beam's is its bottom.
  const toTop = stemUp ? 0 : -BEAM_THICKNESS_PX;
  return {
    primaryTopAtFirst: outerFirst + toTop,
    primaryTopAtLast: outerLast + toTop,
    levelOffset: stemUp ? step : -step,
    longestStemPx: Math.max(...stems),
  };
}

function stemCost(stem: number, ideal: number): number {
  const difference = stem - ideal;
  return difference < 0 ? -difference : difference * LENGTHEN_COST;
}

function snapToGrid(y: number): number {
  return Math.round(y / GRID_PX) * GRID_PX;
}

function progressFractions(notes: readonly { x: number }[]): number[] {
  const count = notes.length;
  const firstX = notes[0].x;
  const span = notes[count - 1].x - firstX;
  return notes.map((note, i) => {
    if (count === 1) {
      return 0;
    }
    if (!Number.isFinite(span) || span === 0 || !Number.isFinite(note.x)) {
      return i / (count - 1);
    }
    return (note.x - firstX) / span;
  });
}

function headInStave(y: number): boolean {
  return y >= STAFF_TOP_LINE_Y - EPSILON && y <= STAFF_BOTTOM_LINE_Y + EPSILON;
}

// 3½ spaces, a step further for each beam past the second, and reaching the
// middle line from a head far enough out that 3½ spaces falls short.
function idealStemPx(
  note: BeamPlacementNote,
  stemUp: boolean,
  step: number
): number {
  const towardMiddle = stemUp
    ? note.nearestHeadY > MIDDLE_STAFF_Y
    : note.nearestHeadY < MIDDLE_STAFF_Y;
  const reachMiddle = towardMiddle
    ? Math.abs(note.nearestHeadY - MIDDLE_STAFF_Y)
    : 0;
  return Math.max(
    BASE_STEM_LENGTH_PX + Math.max(0, note.beamCount - 2) * step,
    reachMiddle
  );
}

function minimumStemPx(note: BeamPlacementNote, step: number): number {
  const base = headInStave(note.nearestHeadY)
    ? BEAMED_STEM_MIN_IN_STAVE_PX
    : MIN_STEM_LENGTH_PX;
  return Math.max(base, MIN_STEM_LENGTH_PX + (note.beamCount - 1) * step);
}

// Band [top, bottom] of beam `level`, counted from the outer edge toward the
// heads.
function levelBand(
  outer: number,
  level: number,
  stemUp: boolean,
  step: number
): [number, number] {
  if (stemUp) {
    const top = outer + level * step;
    return [top, top + BEAM_THICKNESS_PX];
  }
  const bottom = outer - level * step;
  return [bottom - BEAM_THICKNESS_PX, bottom];
}

function bandTouchesLine(top: number, bottom: number): boolean {
  return STAVE_LINES.some(
    (line) => line >= top - EPSILON && line <= bottom + EPSILON
  );
}

function bandInsideStaveArea(top: number, bottom: number): boolean {
  return (
    bottom >= STAFF_TOP_LINE_Y - EPSILON && top <= STAFF_BOTTOM_LINE_Y + EPSILON
  );
}

// Checks at least two levels so a single beam takes a position an added
// beam could share.
function endBeamsAttached(
  outer: number,
  beamCount: number,
  stemUp: boolean,
  step: number
): boolean {
  for (let level = 0; level < Math.max(beamCount, 2); level++) {
    const [top, bottom] = levelBand(outer, level, stemUp, step);
    if (bandInsideStaveArea(top, bottom) && !bandTouchesLine(top, bottom)) {
      return false;
    }
  }
  return true;
}

function innermostBeamClearsLedgerSide(
  note: BeamPlacementNote,
  stemUp: boolean,
  outer: number,
  step: number
): boolean {
  const [top, bottom] = levelBand(outer, note.beamCount - 1, stemUp, step);
  if (!stemUp && note.nearestHeadY <= STAFF_TOP_LINE_Y - STAFF_LINE_SPACING) {
    return top > STAFF_TOP_LINE_Y + EPSILON;
  }
  if (stemUp && note.nearestHeadY >= STAFF_BOTTOM_LINE_Y + STAFF_LINE_SPACING) {
    return bottom < STAFF_BOTTOM_LINE_Y - EPSILON;
  }
  return true;
}

function stackHitsObstacle(
  obstacle: BeamObstacle,
  notes: readonly { x: number }[],
  outerAtX: (x: number) => number,
  stemUp: boolean,
  stackDepth: number
): boolean {
  const left = Math.max(obstacle.left, notes[0].x);
  const right = Math.min(obstacle.right, notes[notes.length - 1].x);
  if (!(right > left)) {
    return false;
  }
  return [left, right].some((x) => {
    const outer = outerAtX(x);
    const top = stemUp ? outer : outer - stackDepth;
    const bottom = top + stackDepth;
    return top < obstacle.bottom && bottom > obstacle.top;
  });
}

function stackTouchesStave(
  placement: BeamPlacement,
  notes: readonly BeamPlacementNote[],
  stemUp: boolean
): boolean {
  const maxBeamCount = Math.max(...notes.map((note) => note.beamCount));
  const depth =
    (maxBeamCount - 1) * Math.abs(placement.levelOffset) + BEAM_THICKNESS_PX;
  return [placement.primaryTopAtFirst, placement.primaryTopAtLast].some(
    (primaryTop) => {
      const top = stemUp ? primaryTop : primaryTop + BEAM_THICKNESS_PX - depth;
      return bandInsideStaveArea(top, top + depth);
    }
  );
}

/**
 * For a wide-interval group, which notes stem down (above the beam) and which
 * stem up (below it): split at the widest vertical gap between notes. Null
 * when no gap separates them.
 */
export function resolveKneedBeamSplit(
  notes: readonly KneedBeamNote[]
): boolean[] | null {
  const order = notes
    .map((note, index) => ({
      index,
      middle: (note.highestHeadY + note.lowestHeadY) / 2,
    }))
    .sort((a, b) => a.middle - b.middle)
    .map(({ index }) => index);
  let bestGap = 0;
  let bestSplit = -1;
  for (let split = 1; split < order.length; split++) {
    const above = order.slice(0, split).map((index) => notes[index]);
    const below = order.slice(split).map((index) => notes[index]);
    const gap =
      Math.min(...below.map((note) => note.highestHeadY)) -
      Math.max(...above.map((note) => note.lowestHeadY));
    if (gap > bestGap) {
      bestGap = gap;
      bestSplit = split;
    }
  }
  if (bestSplit === -1) {
    return null;
  }
  const below = new Set(order.slice(bestSplit));
  return notes.map((_, index) => below.has(index));
}

/**
 * A beam centred between noteheads whose stems point both ways, sloped with
 * the outer interval. Fits when every stem is at least MIN_STEM_LENGTH_PX, the
 * beams keep clear of the top and bottom stave lines, and no beam crosses an
 * obstacle. With `anySpacing`, each inner note is checked at both ends of the
 * beam, so a fit holds wherever the notes end up being spaced.
 */
export function resolveKneedBeamPlacement(
  notes: readonly KneedBeamNote[],
  stemUps: readonly boolean[],
  options: {
    anySpacing?: boolean;
    obstacles?: readonly BeamObstacle[];
  } = {}
): KneedBeamPlacement {
  const { anySpacing = false, obstacles = [] } = options;
  const count = notes.length;
  const nearestYs = notes.map((note, i) =>
    stemUps[i] ? note.highestHeadY : note.lowestHeadY
  );
  const levelOffset =
    kneedSecondarySide(notes, stemUps, nearestYs) === 'top'
      ? -BEAM_STEP_PX
      : BEAM_STEP_PX;
  const maxBeamCount = Math.max(...notes.map((note) => note.beamCount));
  const stackAbove = Math.min(0, (maxBeamCount - 1) * levelOffset);
  const stackBelow =
    BEAM_THICKNESS_PX + Math.max(0, (maxBeamCount - 1) * levelOffset);
  const progress = progressFractions(notes);

  const aboveBottom = Math.max(
    ...notes.filter((_, i) => !stemUps[i]).map((note) => note.lowestHeadY)
  );
  const belowTop = Math.min(
    ...notes.filter((_, i) => stemUps[i]).map((note) => note.highestHeadY)
  );
  const gapMiddle = (aboveBottom + belowTop) / 2;
  const intervalSign = Math.sign(nearestYs[count - 1] - nearestYs[0]);
  const idealRise =
    intervalSign *
    Math.min(
      Math.abs(nearestYs[count - 1] - nearestYs[0]) * BEAM_SLOPE_PER_INTERVAL,
      MAX_BEAM_SLOPE_SHORT_GROUP_PX
    );
  const freeStemMin = MIN_STEM_LENGTH_PX - BEAM_THICKNESS_PX;

  let best: BeamPlacement | null = null;
  let bestCost = Infinity;
  const maxSteps = Math.round(Math.abs(idealRise) / GRID_PX);
  for (let slopeSteps = 0; slopeSteps <= maxSteps; slopeSteps++) {
    const rise = intervalSign * slopeSteps * GRID_PX;
    for (
      let primaryTop = STAFF_TOP_LINE_Y;
      primaryTop <= STAFF_BOTTOM_LINE_Y + EPSILON;
      primaryTop += GRID_PX
    ) {
      const topAt = (i: number) => primaryTop + rise * progress[i];
      const fitsAt = (note: KneedBeamNote, i: number, at: number) => {
        const stackTop = primaryTop + rise * at + stackAbove;
        const stackBottom = primaryTop + rise * at + stackBelow;
        if (
          stackTop <= STAFF_TOP_LINE_Y + EPSILON ||
          stackBottom >= STAFF_BOTTOM_LINE_Y - EPSILON
        ) {
          return false;
        }
        return stemUps[i]
          ? note.highestHeadY - stackBottom >= freeStemMin - EPSILON
          : stackTop - note.lowestHeadY >= freeStemMin - EPSILON;
      };
      const fits = notes.every((note, i) => {
        const inner = i > 0 && i < count - 1;
        const positions = anySpacing && inner ? [0, 1] : [progress[i]];
        return positions.every((at) => fitsAt(note, i, at));
      });
      if (!fits) {
        continue;
      }
      const span = notes[count - 1].x - notes[0].x;
      if (
        obstacles.some((obstacle) =>
          stackHitsObstacle(
            obstacle,
            notes,
            (x) =>
              primaryTop +
              (span === 0 ? 0 : (rise * (x - notes[0].x)) / span) +
              stackAbove,
            true,
            stackBelow - stackAbove
          )
        )
      ) {
        continue;
      }
      const middleAtCenter =
        primaryTop + rise / 2 + (stackAbove + stackBelow) / 2;
      const attached = [0, count - 1].every((i) =>
        kneedEndAttached(topAt(i), notes[i].beamCount, levelOffset)
      );
      const cost =
        Math.abs(middleAtCenter - gapMiddle) +
        Math.abs(rise - idealRise) / 2 +
        (attached ? 0 : STAFF_LINE_SPACING);
      if (cost < bestCost - EPSILON) {
        bestCost = cost;
        best = {
          primaryTopAtFirst: topAt(0),
          primaryTopAtLast: topAt(count - 1),
          levelOffset,
        };
      }
    }
  }
  if (best !== null) {
    return { placement: best, fits: true };
  }
  const centredTop = gapMiddle - (stackAbove + stackBelow) / 2;
  return {
    placement: {
      primaryTopAtFirst: centredTop,
      primaryTopAtLast: centredTop,
      levelOffset,
    },
    fits: false,
  };
}

function kneedEndAttached(
  primaryTop: number,
  beamCount: number,
  levelOffset: number
): boolean {
  for (let level = 0; level < beamCount; level++) {
    const top = primaryTop + level * levelOffset;
    if (!bandTouchesLine(top, top + BEAM_THICKNESS_PX)) {
      return false;
    }
  }
  return true;
}

// Secondary beams of a kneed group all stack on one side, chosen the way a
// cross-staff beam chooses (down-stem notes play the top staff's part).
function kneedSecondarySide(
  notes: readonly KneedBeamNote[],
  stemUps: readonly boolean[],
  nearestYs: readonly number[]
): DoubleStemmedBeamSegmentSide {
  const { secondaryBeams, fractionalBeams } = computeBeamLevelStructure(
    notes.map((note) => note.beamCount)
  );
  const members: DoubleStemmedBeamMember[] = stemUps.map((stemUp) => ({
    staffIndex: stemUp ? 1 : 0,
    entryIndex: 0,
    isRest: false,
  }));
  const lastIndex = notes.length - 1;
  const sides = [...secondaryBeams, ...fractionalBeams].map((segment) => {
    const position: DoubleStemmedBeamSegmentPosition =
      segment.fromNoteIndex === 0
        ? 'start'
        : segment.toNoteIndex === lastIndex
        ? 'end'
        : 'middle';
    return resolveSecondaryBeamVerticalSide(segment, members, 0, position);
  });
  const rising = nearestYs[lastIndex] < nearestYs[0];
  return resolveGroupSecondaryBeamSide(sides, rising ? 'top' : 'bottom');
}

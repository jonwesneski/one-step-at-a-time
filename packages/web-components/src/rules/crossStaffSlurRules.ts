import {
  CROSS_STAFF_SLUR_BULGE_SPAN_RATIO,
  SLUR_CONTROL_HEIGHT_MAX_RATIO,
  SLUR_OBSTACLE_CLEARANCE_PX,
  STAFF_LINE_SPACING,
} from '../utils/notationDimensions';
import type {
  CurvePoint,
  CurveSide,
  ObstacleRect,
} from './connectorPlacementRules';

/**
 * The shape of a slur between two staves, or over a beam they share.
 *
 * Two decisions, kept apart so the shape changes smoothly with the width:
 * 1. The route: which entries of the crossed staves the slur passes inside of
 *    and which outside. Decided on a copy of the passage at a standard
 *    spacing, so it is the same at any width.
 * 2. The curve: the flattest one along that route. Its control points sit at
 *    thirds of the chord, so at any x its height is linear in the two control
 *    heights: every obstacle is a linear bound, and the best pair is unique.
 *
 * Searching for the flattest curve clear of everything would instead switch
 * routes as entries move past it.
 */

/** Something a slur keeps clear of. */
export type SlurObstacle = {
  rect: ObstacleRect;
  /** The centre of the entry it belongs to; null for a beam, which stretches. */
  columnX: number | null;
  /** Null for a beam two staves share. */
  staffIndex: number | null;
};

export type CrossStaffSlurEnd = CurvePoint & { staffIndex: number };

export type CrossStaffSlurShape = {
  controlHeights: [number, number];
  /**
   * How far (px) it reaches into an obstacle's clearance along its route at
   * the standard spacing; 0 when it keeps clear.
   */
  overlap: number;
};

const STANDARD_COLUMN_SPACING_PX = STAFF_LINE_SPACING * 6;
const MIN_COLUMN_GAP_PX = STAFF_LINE_SPACING * 0.8;
const MIN_HEIGHT_PX = STAFF_LINE_SPACING * 0.9;
// A slur over a short span may still have to climb from one staff to the other.
const MAX_HEIGHT_FLOOR_PX = STAFF_LINE_SPACING * 16;
const BOUND_SAMPLE_PX = STAFF_LINE_SPACING;
// Next to an endpoint the heights barely move the curve, so a bound there
// counts for less, or it would distort the rest of it.
const FULL_INFLUENCE = 0.15;
// A soft bound gives way slightly, so each asks for a little more than it
// needs.
const CLEARANCE_PX = SLUR_OBSTACLE_CLEARANCE_PX + 1;

// Relative to the curve's own flatness (its mean height, squared).
const ASYMMETRY_WEIGHT = 0.1;
const CLEARANCE_WEIGHT = 200;
const CONVEX_WEIGHT = 60;
const MIN_HEIGHT_WEIGHT = 2;
const HEIGHT_LIMIT_WEIGHT = 2000;

/** `a·h1 + b·h2 + c ≥ 0`, softly. */
type Bound = { a: number; b: number; c: number; weight: number };

// Left to right, with the slur's side upward.
type Passage = {
  left: CurvePoint;
  right: CurvePoint;
  leftIsOuter: boolean;
  rightIsOuter: boolean;
  obstacles: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    columnX: number | null;
    isCrossed: boolean;
  }[];
};

/**
 * The entries of the crossed staves the slur passes outside of: from column
 * `first` up to, not including, column `end`.
 */
type Route = { first: number; end: number };

function toPassage(
  from: CrossStaffSlurEnd,
  to: CrossStaffSlurEnd,
  side: CurveSide,
  obstacles: readonly SlurObstacle[]
): Passage {
  const isAbove = side === 'above';
  const sign = isAbove ? 1 : -1;
  const [left, right] = from.x <= to.x ? [from, to] : [to, from];
  const top = Math.min(left.staffIndex, right.staffIndex);
  const bottom = Math.max(left.staffIndex, right.staffIndex);
  // Between two staves, those nearer the slur's side; on one staff, those
  // beyond it.
  const isCrossed = (staffIndex: number | null): boolean => {
    if (staffIndex === null) {
      return false;
    }
    if (top === bottom) {
      return isAbove ? staffIndex < top : staffIndex > bottom;
    }
    return isAbove ? staffIndex < bottom : staffIndex > top;
  };
  const spanned = obstacles
    .filter(
      ({ rect }) =>
        rect.right > left.x - CLEARANCE_PX && rect.left < right.x + CLEARANCE_PX
    )
    .map(({ rect, columnX, staffIndex }) => ({
      left: rect.left,
      right: rect.right,
      top: isAbove ? rect.top : -rect.bottom,
      bottom: isAbove ? rect.bottom : -rect.top,
      columnX,
      isCrossed: isCrossed(staffIndex),
    }));
  const outer = isAbove ? top : bottom;
  const isOuter = (end: CrossStaffSlurEnd): boolean =>
    top === bottom
      ? !spanned.some((obstacle) => obstacle.isCrossed)
      : end.staffIndex === outer;
  return {
    left: { x: left.x, y: sign * left.y },
    right: { x: right.x, y: sign * right.y },
    leftIsOuter: isOuter(left),
    rightIsOuter: isOuter(right),
    obstacles: spanned,
  };
}

function distinctColumns(xs: readonly number[]): number[] {
  const columns: number[] = [];
  for (const x of [...xs].sort((a, b) => a - b)) {
    if (
      columns.length === 0 ||
      x - columns[columns.length - 1] > MIN_COLUMN_GAP_PX
    ) {
      columns.push(x);
    }
  }
  return columns;
}

function crossedColumns({ obstacles }: Passage): number[] {
  return distinctColumns(
    obstacles.flatMap(({ columnX, isCrossed }) =>
      isCrossed && columnX !== null ? [columnX] : []
    )
  );
}

function atStandardSpacing(passage: Passage): Passage {
  const columns = distinctColumns(
    passage.obstacles.flatMap(({ columnX }) =>
      columnX === null ? [] : [columnX]
    )
  );
  const gaps = columns
    .slice(1)
    .map((x, i) => x - columns[i])
    .sort((a, b) => a - b);
  if (gaps.length === 0) {
    return passage;
  }
  const scale = STANDARD_COLUMN_SPACING_PX / gaps[Math.floor(gaps.length / 2)];
  const scaledX = (x: number): number =>
    passage.left.x + (x - passage.left.x) * scale;
  return {
    ...passage,
    right: { x: scaledX(passage.right.x), y: passage.right.y },
    obstacles: passage.obstacles.map((obstacle) => {
      const { columnX, left, right } = obstacle;
      if (columnX === null) {
        return { ...obstacle, left: scaledX(left), right: scaledX(right) };
      }
      const shift = scaledX(columnX) - columnX;
      return {
        ...obstacle,
        left: left + shift,
        right: right + shift,
        columnX: columnX + shift,
      };
    }),
  };
}

function possibleRoutes(
  { leftIsOuter, rightIsOuter }: Passage,
  columnCount: number
): Route[] {
  const routes: Route[] = [];
  for (let first = 0; first <= (leftIsOuter ? 0 : columnCount); first++) {
    const ends = rightIsOuter
      ? [columnCount]
      : Array.from({ length: columnCount + 1 - first }, (_, i) => first + i);
    routes.push(...ends.map((end) => ({ first, end })));
  }
  return routes;
}

function routeBounds(
  { left, right, leftIsOuter, rightIsOuter, obstacles }: Passage,
  columns: readonly number[],
  { first, end }: Route
): Bound[] {
  const boundary = (index: number): number =>
    ((columns[index - 1] ?? left.x) + (columns[index] ?? right.x)) / 2;
  const outsideFrom = leftIsOuter ? -Infinity : boundary(first);
  const outsideTo = rightIsOuter ? Infinity : boundary(end);
  const span = right.x - left.x;
  const bounds: Bound[] = [];
  for (const obstacle of obstacles) {
    const center = obstacle.columnX ?? (obstacle.left + obstacle.right) / 2;
    const isOutside =
      !obstacle.isCrossed || (center > outsideFrom && center < outsideTo);
    const fromX = Math.max(obstacle.left - CLEARANCE_PX, left.x);
    const toX = Math.min(obstacle.right + CLEARANCE_PX, right.x);
    const sampleCount = Math.max(1, Math.ceil((toX - fromX) / BOUND_SAMPLE_PX));
    for (let i = 0; i <= sampleCount; i++) {
      const t = (fromX + ((toX - fromX) * i) / sampleCount - left.x) / span;
      const a = 3 * (1 - t) * (1 - t) * t;
      const b = 3 * (1 - t) * t * t;
      const weight =
        CLEARANCE_WEIGHT * Math.min(1, (a + b) / FULL_INFLUENCE) ** 2;
      const chordY = left.y + (right.y - left.y) * t;
      bounds.push(
        isOutside
          ? {
              a,
              b,
              c: obstacle.top - CLEARANCE_PX - chordY,
              weight,
            }
          : {
              a: -a,
              b: -b,
              c: chordY - obstacle.bottom - CLEARANCE_PX,
              weight,
            }
      );
    }
  }
  return bounds;
}

function shapeBounds({ left, right }: Passage): Bound[] {
  const span = right.x - left.x;
  const minHeight = Math.max(
    MIN_HEIGHT_PX,
    span * CROSS_STAFF_SLUR_BULGE_SPAN_RATIO
  );
  const maxHeight = Math.max(
    span * SLUR_CONTROL_HEIGHT_MAX_RATIO,
    MAX_HEIGHT_FLOOR_PX
  );
  return [
    { a: 0.5, b: 0.5, c: -minHeight, weight: MIN_HEIGHT_WEIGHT },
    { a: -0.5, b: 1, c: 0, weight: CONVEX_WEIGHT },
    { a: 1, b: -0.5, c: 0, weight: CONVEX_WEIGHT },
    { a: 1, b: 0, c: 0, weight: CLEARANCE_WEIGHT },
    { a: 0, b: 1, c: 0, weight: CLEARANCE_WEIGHT },
    { a: -1, b: 0, c: maxHeight, weight: HEIGHT_LIMIT_WEIGHT },
    { a: 0, b: -1, c: maxHeight, weight: HEIGHT_LIMIT_WEIGHT },
  ];
}

const MAX_ITERATIONS = 40;
const MIN_STEP = 1e-4;
const COST_EPSILON = 1e-7;

// Newton's method on a convex, piecewise-quadratic cost, halving any step
// that overshoots.
function flattestHeights(bounds: readonly Bound[]): {
  heights: [number, number];
  cost: number;
} {
  const shortfall = ({ a, b, c }: Bound, h1: number, h2: number): number =>
    Math.max(0, -(a * h1 + b * h2 + c));
  const costOf = (h1: number, h2: number): number =>
    bounds.reduce(
      (sum, bound) => sum + bound.weight * shortfall(bound, h1, h2) ** 2,
      ((h1 + h2) / 2) ** 2 + ASYMMETRY_WEIGHT * (h1 - h2) ** 2
    );
  let h1 = MIN_HEIGHT_PX;
  let h2 = MIN_HEIGHT_PX;
  let cost = costOf(h1, h2);
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let d11 = 0.5 + 2 * ASYMMETRY_WEIGHT;
    let d12 = 0.5 - 2 * ASYMMETRY_WEIGHT;
    let d22 = d11;
    let g1 = (h1 + h2) / 2 + 2 * ASYMMETRY_WEIGHT * (h1 - h2);
    let g2 = (h1 + h2) / 2 - 2 * ASYMMETRY_WEIGHT * (h1 - h2);
    for (const bound of bounds) {
      const short = shortfall(bound, h1, h2);
      if (short > 0) {
        const { a, b, weight } = bound;
        d11 += 2 * weight * a * a;
        d12 += 2 * weight * a * b;
        d22 += 2 * weight * b * b;
        g1 -= 2 * weight * short * a;
        g2 -= 2 * weight * short * b;
      }
    }
    const determinant = d11 * d22 - d12 * d12;
    const step1 = -(d22 * g1 - d12 * g2) / determinant;
    const step2 = -(d11 * g2 - d12 * g1) / determinant;
    let step = 1;
    let nextCost = costOf(h1 + step1, h2 + step2);
    while (nextCost > cost && step > MIN_STEP) {
      step /= 2;
      nextCost = costOf(h1 + step * step1, h2 + step * step2);
    }
    if (nextCost >= cost - COST_EPSILON) {
      break;
    }
    h1 += step * step1;
    h2 += step * step2;
    cost = nextCost;
  }
  return { heights: [h1, h2], cost };
}

export function resolveCrossStaffSlurShape(
  from: CrossStaffSlurEnd,
  to: CrossStaffSlurEnd,
  side: CurveSide,
  obstacles: readonly SlurObstacle[]
): CrossStaffSlurShape {
  const passage = toPassage(from, to, side, obstacles);
  const columns = crossedColumns(passage);
  if (passage.right.x - passage.left.x < 1) {
    return { controlHeights: [MIN_HEIGHT_PX, MIN_HEIGHT_PX], overlap: 0 };
  }

  const standard = atStandardSpacing(passage);
  const standardColumns = crossedColumns(standard);
  const standardShape = shapeBounds(standard);
  let route: Route = { first: 0, end: columns.length };
  let overlap = 0;
  let leastCost = Infinity;
  for (const candidate of possibleRoutes(standard, standardColumns.length)) {
    const bounds = routeBounds(standard, standardColumns, candidate);
    const { heights, cost } = flattestHeights([...bounds, ...standardShape]);
    if (cost < leastCost) {
      leastCost = cost;
      route = candidate;
      overlap = Math.max(
        0,
        ...bounds.map(
          ({ a, b, c }) =>
            -(a * heights[0] + b * heights[1] + c) -
            (CLEARANCE_PX - SLUR_OBSTACLE_CLEARANCE_PX)
        )
      );
    }
  }

  const { heights } = flattestHeights([
    ...routeBounds(passage, columns, route),
    ...shapeBounds(passage),
  ]);
  return {
    controlHeights: from.x <= to.x ? heights : [heights[1], heights[0]],
    overlap,
  };
}

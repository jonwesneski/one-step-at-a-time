export type CurveSide = 'above' | 'below';

export type CurvePoint = { x: number; y: number };

export type ObstacleRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const sideSign = (side: CurveSide): number => (side === 'above' ? -1 : 1);

export const oppositeSide = (side: CurveSide): CurveSide =>
  side === 'above' ? 'below' : 'above';

// ─── Same-staff ties and slurs ───────────────────────────────────────────────

/** Ties and same-staff slurs curve away from the stem; tab has no stems. */
export function pickStemSide({
  stemUp,
  isGuitarNote,
}: {
  stemUp: boolean;
  isGuitarNote: boolean;
}): CurveSide {
  if (isGuitarNote) {
    return 'above';
  }
  return stemUp ? 'below' : 'above';
}

/**
 * A chord tie curves outward from the chord's vertical midpoint (top tones
 * above, bottom tones below) — position-based, not stem-based. A tone exactly
 * on the midpoint, or a single-tone chord, takes `fallbackSide`.
 */
export function pickChordToneSide(
  yCoords: readonly number[],
  index: number,
  fallbackSide: CurveSide
): CurveSide {
  if (yCoords.length <= 1) {
    return fallbackSide;
  }
  const midY = (Math.min(...yCoords) + Math.max(...yCoords)) / 2;
  if (yCoords[index] < midY) {
    return 'above';
  }
  if (yCoords[index] > midY) {
    return 'below';
  }
  return fallbackSide;
}

/**
 * Pairs each consecutive member of one `slur-group` phrase in measure order,
 * then real x order within a measure — the staff listed first in the DOM does
 * not always hold the temporally-first breakpoint, and x restarts on each
 * system.
 */
export function consecutivePhrasePairs<T>(
  members: readonly { item: T; measureIndex: number; x: number }[]
): [T, T][] {
  const ordered = [...members].sort(
    (a, b) => a.measureIndex - b.measureIndex || a.x - b.x
  );
  const pairs: [T, T][] = [];
  for (let i = 0; i < ordered.length - 1; i++) {
    pairs.push([ordered[i].item, ordered[i + 1].item]);
  }
  return pairs;
}

/** How many same-kind pairs each pair strictly encloses. */
export function computeNestingLevels(
  pairs: readonly { kind: string; startIndex: number; endIndex: number }[]
): number[] {
  return pairs.map(
    (pair) =>
      pairs.filter(
        (other) =>
          other !== pair &&
          other.kind === pair.kind &&
          other.startIndex > pair.startIndex &&
          other.endIndex < pair.endIndex
      ).length
  );
}

/** Voice 1 is a staff's outer voice; any later voice is inner. */
export function isInnerVoicePosition(
  voiceIndex: number,
  voiceCount: number
): boolean {
  return voiceCount > 1 && voiceIndex !== 0;
}

// The quadratic curve `createCurveSvg` draws by default: one control point at
// the horizontal midpoint, offset from the chord's midpoint by bulgeHeight.
// Reversing `from`/`to` yields the same curve.
const quadraticYAtT = (
  from: CurvePoint,
  to: CurvePoint,
  side: CurveSide,
  bulgeHeight: number,
  t: number
): number => {
  const midY = (from.y + to.y) / 2 + sideSign(side) * bulgeHeight;
  const mt = 1 - t;
  return mt * mt * from.y + 2 * mt * t * midY + t * t * to.y;
};

/** The quadratic curve's y at `x`, or null outside its open x-span. */
export function quadraticCurveYAtX(
  from: CurvePoint,
  to: CurvePoint,
  side: CurveSide,
  bulgeHeight: number,
  x: number
): number | null {
  const span = to.x - from.x;
  if (span === 0) {
    return null;
  }
  const t = (x - from.x) / span;
  if (t <= 0 || t >= 1) {
    return null;
  }
  return quadraticYAtT(from, to, side, bulgeHeight, t);
}

/**
 * True when any obstacle centre lies within `clearance` of the quadratic
 * curve at its own x — an arpeggio-run tie is then divided into two stubs.
 */
export function isCurveObscured(
  from: CurvePoint,
  to: CurvePoint,
  side: CurveSide,
  bulgeHeight: number,
  obstacles: readonly CurvePoint[],
  clearance: number
): boolean {
  return obstacles.some((obstacle) => {
    const curveY = quadraticCurveYAtX(from, to, side, bulgeHeight, obstacle.x);
    return curveY !== null && Math.abs(curveY - obstacle.y) <= clearance;
  });
}

// t at the quadratic's y-extremum, from dY/dt = 0 with the control point at
// (Y0+Y1)/2 + sign*bulgeHeight.
const quadraticExtremumT = (
  from: CurvePoint,
  to: CurvePoint,
  side: CurveSide,
  bulgeHeight: number
): number => 0.5 - (from.y - to.y) / (4 * sideSign(side) * bulgeHeight);

/**
 * True when the quadratic curve's y, anywhere its x-span overlaps `rect`,
 * falls inside the rect's y range. Exact: the curve is monotonic on either
 * side of its extremum, so the overlap's two ends plus the extremum cover
 * every point it could enter or leave the rect at.
 */
export function quadraticCrossesRect(
  from: CurvePoint,
  to: CurvePoint,
  side: CurveSide,
  bulgeHeight: number,
  rect: ObstacleRect
): boolean {
  const [left, right] = from.x <= to.x ? [from, to] : [to, from];
  const overlapMinX = Math.max(left.x, rect.left);
  const overlapMaxX = Math.min(right.x, rect.right);
  if (overlapMinX >= overlapMaxX || right.x === left.x) {
    return false;
  }
  const span = right.x - left.x;
  const breakpointTs = [
    (overlapMinX - left.x) / span,
    (overlapMaxX - left.x) / span,
  ];
  const extremumT = quadraticExtremumT(left, right, side, bulgeHeight);
  if (extremumT > breakpointTs[0] && extremumT < breakpointTs[1]) {
    breakpointTs.push(extremumT);
  }
  breakpointTs.sort((a, b) => a - b);
  for (let i = 0; i < breakpointTs.length - 1; i++) {
    const yA = quadraticYAtT(left, right, side, bulgeHeight, breakpointTs[i]);
    const yB = quadraticYAtT(
      left,
      right,
      side,
      bulgeHeight,
      breakpointTs[i + 1]
    );
    if (Math.max(yA, yB) >= rect.top && Math.min(yA, yB) <= rect.bottom) {
      return true;
    }
  }
  return false;
}

// Pushing the bulge only helps when both endpoints sit on the same side of
// the rect; endpoints straddling it force a crossing however far it's pushed.
const bulgeCouldClearRect = (
  from: CurvePoint,
  to: CurvePoint,
  rect: ObstacleRect
): boolean =>
  (from.y <= rect.top && to.y <= rect.top) ||
  (from.y >= rect.bottom && to.y >= rect.bottom);

/**
 * Pushes a same-staff slur's quadratic bulge out in `step` increments until it
 * clears every avoidable rect, giving up after `maxSteps`. Returns undefined
 * when no push is needed.
 */
export function resolveRectClearingBulgeHeight(
  from: CurvePoint,
  to: CurvePoint,
  side: CurveSide,
  baseBulgeHeight: number,
  rects: readonly ObstacleRect[],
  { step, maxSteps }: { step: number; maxSteps: number }
): number | undefined {
  const avoidableRects = rects.filter((rect) =>
    bulgeCouldClearRect(from, to, rect)
  );
  if (avoidableRects.length === 0) {
    return undefined;
  }
  let height = baseBulgeHeight;
  for (let attempt = 0; attempt <= maxSteps; attempt++) {
    const crosses = avoidableRects.some((rect) =>
      quadraticCrossesRect(from, to, side, height, rect)
    );
    if (!crosses) {
      return attempt === 0 ? undefined : height;
    }
    height += step;
  }
  return height;
}

// ─── Cross-staff slurs ───────────────────────────────────────────────────────

/**
 * A cross-staff slur sits on the side of the staff holding the majority of
 * its notes. An even split may go either way; above is preferred, matching
 * the mixed-stem default.
 */
export function pickCrossStaffSlurSide(
  topCount: number,
  bottomCount: number
): CurveSide {
  return bottomCount > topCount ? 'below' : 'above';
}

export type SlurAnchorKind = 'notehead' | 'beyond-stem' | 'stem-end';

/**
 * Where a cross-staff slur endpoint attaches so both ends sit on the slur's
 * side: the notehead when it faces that side, otherwise past the stem's own
 * beam or flag. An inner voice goes to its stem end instead, so the slur meets
 * the stem rather than cutting through the beam it shares with another voice.
 */
export function slurAnchorKind({
  stemUp,
  side,
  isInnerVoice,
  hasStem,
}: {
  stemUp: boolean;
  side: CurveSide;
  isInnerVoice: boolean;
  hasStem: boolean;
}): SlurAnchorKind {
  if (!hasStem) {
    return 'notehead';
  }
  if (isInnerVoice) {
    return 'stem-end';
  }
  const noteheadFacesSide = stemUp ? side === 'below' : side === 'above';
  return noteheadFacesSide ? 'notehead' : 'beyond-stem';
}

/**
 * The cross-staff slur's cubic control points at 1/3 and 2/3 of the chord,
 * each raised toward `side` by its own height — independent heights let one
 * end climb steeply past a nearby obstacle while the other stays low.
 */
export function cubicSlurControlPoints(
  from: CurvePoint,
  to: CurvePoint,
  side: CurveSide,
  controlHeights: readonly [number, number]
): [CurvePoint, CurvePoint] {
  const sign = sideSign(side);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return [
    { x: from.x + dx / 3, y: from.y + dy / 3 + sign * controlHeights[0] },
    {
      x: from.x + (2 * dx) / 3,
      y: from.y + (2 * dy) / 3 + sign * controlHeights[1],
    },
  ];
}

export function sampleCubicSlur(
  from: CurvePoint,
  to: CurvePoint,
  side: CurveSide,
  controlHeights: readonly [number, number],
  sampleCount: number
): CurvePoint[] {
  const [c1, c2] = cubicSlurControlPoints(from, to, side, controlHeights);
  const points: CurvePoint[] = [];
  for (let i = 0; i <= sampleCount; i++) {
    const t = i / sampleCount;
    const mt = 1 - t;
    const a = mt * mt * mt;
    const b = 3 * mt * mt * t;
    const c = 3 * mt * t * t;
    const d = t * t * t;
    points.push({
      x: a * from.x + b * c1.x + c * c2.x + d * to.x,
      y: a * from.y + b * c1.y + c * c2.y + d * to.y,
    });
  }
  return points;
}

/** Liang–Barsky: true when segment p→q touches `rect`. */
export function segmentIntersectsRect(
  p: CurvePoint,
  q: CurvePoint,
  rect: ObstacleRect
): boolean {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  let tMin = 0;
  let tMax = 1;
  const edges: [number, number][] = [
    [-dx, p.x - rect.left],
    [dx, rect.right - p.x],
    [-dy, p.y - rect.top],
    [dy, rect.bottom - p.y],
  ];
  for (const [direction, distance] of edges) {
    if (direction === 0) {
      if (distance < 0) {
        return false;
      }
      continue;
    }
    const t = distance / direction;
    if (direction < 0) {
      tMin = Math.max(tMin, t);
    } else {
      tMax = Math.min(tMax, t);
    }
    if (tMin > tMax) {
      return false;
    }
  }
  return true;
}

const countPolylineCollisions = (
  points: readonly CurvePoint[],
  rects: readonly ObstacleRect[]
): number => {
  let collisions = 0;
  for (let i = 0; i < points.length - 1; i++) {
    for (const rect of rects) {
      if (segmentIntersectsRect(points[i], points[i + 1], rect)) {
        collisions++;
      }
    }
  }
  return collisions;
};

export type SlurCurveSearchOptions = {
  /** Smallest height either control point may take. */
  minHeight: number;
  /** The taller control point is never below this. */
  floorHeight: number;
  maxHeight: number;
  /** Search granularity; coarsened so each control has at most ~25 values. */
  step: number;
  clearance: number;
  sampleCount?: number;
};

export type SlurCurveResolution = {
  controlHeights: [number, number];
  /** Polyline-segment × obstacle hits of the chosen shape; 0 when clear. */
  collisions: number;
};

const MAX_HEIGHTS_PER_CONTROL = 25;
const DEFAULT_SAMPLE_COUNT = 48;

/**
 * Finds the flattest, most symmetric cubic slur shape on `side` that keeps
 * `clearance` from every obstacle. Candidates are tried in order of their
 * taller control height, then their asymmetry; the first clear one wins.
 * When none is clear, the least-colliding candidate is returned so the caller
 * can compare it against the other side.
 */
export function resolveSlurCurve(
  from: CurvePoint,
  to: CurvePoint,
  side: CurveSide,
  obstacles: readonly ObstacleRect[],
  options: SlurCurveSearchOptions
): SlurCurveResolution {
  const {
    minHeight,
    floorHeight,
    clearance,
    sampleCount = DEFAULT_SAMPLE_COUNT,
  } = options;
  const maxHeight = Math.max(options.maxHeight, floorHeight);
  const step = Math.max(
    options.step,
    (maxHeight - minHeight) / (MAX_HEIGHTS_PER_CONTROL - 1)
  );

  const minX = Math.min(from.x, to.x) - clearance;
  const maxX = Math.max(from.x, to.x) + clearance;
  const paddedObstacles = obstacles
    .filter((rect) => rect.right >= minX && rect.left <= maxX)
    .map((rect) => ({
      left: rect.left - clearance,
      top: rect.top - clearance,
      right: rect.right + clearance,
      bottom: rect.bottom + clearance,
    }));

  const heights: number[] = [floorHeight];
  for (let height = minHeight; height <= maxHeight + 1e-6; height += step) {
    if (Math.abs(height - floorHeight) > 1e-6) {
      heights.push(height);
    }
  }
  heights.sort((a, b) => a - b);
  const candidates: [number, number][] = [];
  for (const h1 of heights) {
    for (const h2 of heights) {
      if (Math.max(h1, h2) >= floorHeight - 1e-6) {
        candidates.push([h1, h2]);
      }
    }
  }
  if (candidates.length === 0) {
    candidates.push([floorHeight, floorHeight]);
  }
  candidates.sort(
    (a, b) =>
      Math.max(...a) - Math.max(...b) ||
      Math.abs(a[0] - a[1]) - Math.abs(b[0] - b[1])
  );

  let best: SlurCurveResolution | null = null;
  for (const controlHeights of candidates) {
    const points = sampleCubicSlur(from, to, side, controlHeights, sampleCount);
    const collisions = countPolylineCollisions(points, paddedObstacles);
    if (collisions === 0) {
      return { controlHeights, collisions };
    }
    if (best === null || collisions < best.collisions) {
      best = { controlHeights, collisions };
    }
  }
  return best as SlurCurveResolution;
}

/**
 * Cuts a convex polygon into vertical slices of `sliceWidth`, each a rect
 * spanning the polygon's real y-extent over that slice — a sloped beam keeps
 * its outline instead of collapsing to its bounding box.
 */
export function sliceConvexPolygon(
  points: readonly CurvePoint[],
  sliceWidth: number
): ObstacleRect[] {
  if (points.length === 0) {
    return [];
  }
  const xs = points.map((point) => point.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const yExtentAt = (x: number): number[] => {
    const ys: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      const lo = Math.min(a.x, b.x);
      const hi = Math.max(a.x, b.x);
      if (x < lo || x > hi) {
        continue;
      }
      if (a.x === b.x) {
        ys.push(a.y, b.y);
      } else {
        ys.push(a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y));
      }
    }
    return ys;
  };

  if (maxX - minX <= sliceWidth) {
    const ys = points.map((point) => point.y);
    return [
      {
        left: minX,
        right: maxX,
        top: Math.min(...ys),
        bottom: Math.max(...ys),
      },
    ];
  }

  const slices: ObstacleRect[] = [];
  for (let left = minX; left < maxX; left += sliceWidth) {
    const right = Math.min(left + sliceWidth, maxX);
    const ys = [
      ...yExtentAt(left),
      ...yExtentAt(right),
      ...points
        .filter((point) => point.x > left && point.x < right)
        .map((point) => point.y),
    ];
    if (ys.length === 0) {
      continue;
    }
    slices.push({
      left,
      right,
      top: Math.min(...ys),
      bottom: Math.max(...ys),
    });
  }
  return slices;
}

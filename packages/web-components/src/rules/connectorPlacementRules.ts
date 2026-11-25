import type { ConnectorRole } from '../types/elements';
import type { SlurStyle } from '../types/theory';

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

export type SlurStem = { stemUp: boolean; beamed: boolean };

export function hasMixedStems(stems: readonly SlurStem[]): boolean {
  return stems.some(({ stemUp }) => stemUp !== stems[0].stemUp);
}

/**
 * The side of a slur over one staff's notes, first to last: opposite stems that
 * all agree, above the stave when they differ. A beam above either end pushes a
 * mixed slur below, unless a beam or a slur inside it (`nestedBelow`) is in the
 * way there too.
 */
export function pickSlurSide(
  stems: readonly SlurStem[],
  nestedBelow: boolean
): CurveSide {
  if (!hasMixedStems(stems)) {
    return pickStemSide({ stemUp: stems[0].stemUp, isGuitarNote: false });
  }
  const beamAboveEnd = [stems[0], stems[stems.length - 1]].some(
    ({ stemUp, beamed }) => stemUp && beamed
  );
  const beamBelow = stems.some(({ stemUp, beamed }) => !stemUp && beamed);
  return beamAboveEnd && !beamBelow && !nestedBelow ? 'below' : 'above';
}

/**
 * Where a slur end beside its stem goes when the other end is at a head, so
 * the slur doesn't tilt against the pitches: level with the other end at most,
 * and never nearer its own head than `headAnchorY`. Both `...AnchorY`s are the
 * ends' places at their heads.
 */
export function untiltedStemEndY(
  stemEndY: number,
  headAnchorY: number,
  otherHeadAnchorY: number,
  side: CurveSide
): number {
  const sign = sideSign(side);
  const headLeads = sign * (headAnchorY - otherHeadAnchorY) > 0;
  const endLeads = sign * (stemEndY - otherHeadAnchorY) > 0;
  return headLeads || !endLeads ? stemEndY : otherHeadAnchorY;
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

// ─── Slurs and articulation marks ────────────────────────────────────────────

/**
 * A slur encloses the marks at its ends: the endpoint moves past every mark
 * rect on the slur's side of it. Only rects spanning the anchor's x count,
 * which leaves a grace note's marks alone.
 */
export function anchorYClearOfRects(
  anchor: CurvePoint,
  side: CurveSide,
  rects: readonly ObstacleRect[],
  clearance: number
): number {
  let y = anchor.y;
  for (const rect of rects) {
    if (anchor.x < rect.left || anchor.x > rect.right) {
      continue;
    }
    y =
      side === 'below'
        ? Math.max(y, rect.bottom + clearance)
        : Math.min(y, rect.top - clearance);
  }
  return y;
}

/** Grows a rect by `clearance` on every side. */
export const inflateRect = (
  rect: ObstacleRect,
  clearance: number
): ObstacleRect => ({
  left: rect.left - clearance,
  top: rect.top - clearance,
  right: rect.right + clearance,
  bottom: rect.bottom + clearance,
});

// The arc's x runs linearly from `from` to `to`, so a sample's t follows from
// its x; samples this close to an end can't be cleared by any bulge.
const ENCLOSE_SAMPLE_COUNT = 5;
const ENCLOSE_MIN_T = 0.02;

/**
 * The quadratic bulge height that carries a slur outside every rect between
 * its ends (below a mark's bottom on a slur below, above its top on one
 * above), capped at `maxBulgeHeight`; undefined when `baseBulgeHeight`
 * already does. Unlike resolveRectClearingBulgeHeight, passing between a
 * mark and its note never counts as clear.
 */
export function bulgeHeightEnclosingRects(
  from: CurvePoint,
  to: CurvePoint,
  side: CurveSide,
  baseBulgeHeight: number,
  rects: readonly ObstacleRect[],
  maxBulgeHeight: number
): number | undefined {
  const [left, right] = from.x <= to.x ? [from, to] : [to, from];
  const span = right.x - left.x;
  if (span <= 0) {
    return undefined;
  }
  const sign = sideSign(side);
  let required = baseBulgeHeight;
  for (const rect of rects) {
    const minX = Math.max(left.x, rect.left);
    const maxX = Math.min(right.x, rect.right);
    if (minX > maxX) {
      continue;
    }
    const target = side === 'below' ? rect.bottom : rect.top;
    for (let k = 0; k < ENCLOSE_SAMPLE_COUNT; k++) {
      const x = minX + ((maxX - minX) * k) / (ENCLOSE_SAMPLE_COUNT - 1);
      const t = (x - left.x) / span;
      if (t < ENCLOSE_MIN_T || t > 1 - ENCLOSE_MIN_T) {
        continue;
      }
      // y(t) = chord(t) + 2t(1−t)·sign·h, so the arc reaches `target` at
      // h = sign·(target − chord(t)) / 2t(1−t).
      const chordY = left.y + (right.y - left.y) * t;
      required = Math.max(
        required,
        (sign * (target - chordY)) / (2 * t * (1 - t))
      );
    }
  }
  if (required <= baseBulgeHeight) {
    return undefined;
  }
  return Math.min(required, maxBulgeHeight);
}

export type DrawnArc = {
  from: CurvePoint;
  to: CurvePoint;
  side: CurveSide;
  bulgeHeight: number;
  /** Set for a cubic arc; overrides `bulgeHeight`. */
  controlHeights?: readonly [number, number];
};

const ARC_SAMPLE_COUNT = 16;

const sampleArc = (arc: DrawnArc): CurvePoint[] =>
  arc.controlHeights
    ? sampleCubicSlur(
        arc.from,
        arc.to,
        arc.side,
        arc.controlHeights,
        ARC_SAMPLE_COUNT
      )
    : Array.from({ length: ARC_SAMPLE_COUNT + 1 }, (_, k) => {
        const t = k / ARC_SAMPLE_COUNT;
        return {
          x: arc.from.x + (arc.to.x - arc.from.x) * t,
          y: quadraticYAtT(arc.from, arc.to, arc.side, arc.bulgeHeight, t),
        };
      });

/**
 * Points along a drawn arc as rects grown by `clearance`, so a slur around it
 * can be kept outside with resolveEnclosingArc.
 */
export function arcObstacleRects(
  arc: DrawnArc,
  clearance: number
): ObstacleRect[] {
  return sampleArc(arc).map(({ x, y }) => ({
    left: x - clearance,
    right: x + clearance,
    top: y - clearance,
    bottom: y + clearance,
  }));
}

/** True when `inner` lies within `outer`'s x-span, on the same side. */
export function arcEncloses(outer: DrawnArc, inner: DrawnArc): boolean {
  const outerLeft = Math.min(outer.from.x, outer.to.x);
  const outerRight = Math.max(outer.from.x, outer.to.x);
  return (
    outer.side === inner.side &&
    Math.min(inner.from.x, inner.to.x) >= outerLeft - 1 &&
    Math.max(inner.from.x, inner.to.x) <= outerRight + 1
  );
}

export type EnclosingArc = Pick<DrawnArc, 'bulgeHeight' | 'controlHeights'>;

const ENCLOSING_ARC_SEARCH_STEP_PX = 4;

/**
 * The arc that carries a slur outside every rect between its ends: the plain
 * quadratic, deeper where it must be. A rect close beside one end would bow
 * that past `maxBulgeHeight`, so a cubic, whose ends can climb at different
 * rates, is used there instead. `crossings` are what the cubic must not cut
 * through either. Undefined when the arc at `baseBulgeHeight` already clears.
 */
export function resolveEnclosingArc(
  from: CurvePoint,
  to: CurvePoint,
  side: CurveSide,
  baseBulgeHeight: number,
  rects: readonly ObstacleRect[],
  maxBulgeHeight: number,
  crossings: readonly ObstacleRect[] = []
): EnclosingArc | undefined {
  const bulgeHeight = bulgeHeightEnclosingRects(
    from,
    to,
    side,
    baseBulgeHeight,
    rects,
    Infinity
  );
  if (bulgeHeight === undefined) {
    return undefined;
  }
  if (bulgeHeight <= maxBulgeHeight) {
    return { bulgeHeight };
  }
  const left = Math.min(from.x, to.x);
  const right = Math.max(from.x, to.x);
  const between = rects.filter(
    (rect) => rect.right > left && rect.left < right
  );
  // Open-ended towards the notes: passing between a mark or an accidental and
  // its note never counts as clear.
  const walls = between.map((rect) =>
    side === 'below'
      ? { ...rect, top: -Infinity }
      : { ...rect, bottom: Infinity }
  );
  const { controlHeights } = resolveSlurCurve(
    from,
    to,
    side,
    [...walls, ...crossings],
    {
      minHeight: 0,
      floorHeight: (baseBulgeHeight * 2) / 3,
      maxHeight: bulgeHeight,
      step: ENCLOSING_ARC_SEARCH_STEP_PX,
    }
  );
  return { bulgeHeight: maxBulgeHeight, controlHeights };
}

export type SlurSpan = {
  startIndex: number;
  endIndex: number;
  nestingLevel: number;
};

/**
 * Same-staff slur spans from each entry's `slur` role, paired last-in
 * first-out. A start with no end runs to the last entry and an end with no
 * start from the first, since the slur continues past this list.
 */
export function slurSpans(
  roles: readonly (ConnectorRole | null)[]
): SlurSpan[] {
  const spans: Omit<SlurSpan, 'nestingLevel'>[] = [];
  const open: number[] = [];
  roles.forEach((role, index) => {
    if (role === 'start') {
      open.push(index);
      return;
    }
    if (role === 'end') {
      spans.push({ startIndex: open.pop() ?? 0, endIndex: index });
    }
  });
  for (const startIndex of open) {
    spans.push({ startIndex, endIndex: roles.length - 1 });
  }
  const levels = computeNestingLevels(
    spans.map((span) => ({ kind: 'slur', ...span }))
  );
  return spans.map((span, index) => ({
    ...span,
    nestingLevel: levels[index],
  }));
}

export type SlurReachEntry = {
  /** Y of the head centre nearest the slur's side. */
  headCenterY: number;
  /** How far marks on the slur's side reach past that centre; 0 for none. */
  markDepthPx: number;
  /** How far its stem reaches past that centre on the slur's side; 0 for none. */
  stemDepthPx: number;
  /** How far the head and accidentals reach past that centre. */
  inkDepthPx: number;
  /** Which of the voice's entries this is. */
  index: number;
};

// Only proportions matter to the arc an estimate draws, so entries stand a
// nominal distance apart, each as wide as a head and its accidental.
const ESTIMATE_ENTRY_SPACING_PX = 40;
const ESTIMATE_ENTRY_HALF_WIDTH_PX = 12;

/**
 * An upper bound on how far a same-staff slur over `entries` reaches on
 * `side`: past each head (or the marks it encloses) and then its arc, which
 * deepens around the notes inside it. Rows drawn before the slur stay clear of
 * it with this.
 */
export function estimatedSlurReachY({
  entries,
  side,
  nestingLevel,
  noteheadOffsetPx,
  markClearancePx,
  noteClearancePx,
  stemClearancePx,
  baseBulgePx,
  bulgeStepPx,
  maxExtraBulgePx,
  enclosedReachY = null,
  nestedGapPx = 0,
}: {
  entries: readonly SlurReachEntry[];
  side: CurveSide;
  nestingLevel: number;
  noteheadOffsetPx: number;
  markClearancePx: number;
  noteClearancePx: number;
  stemClearancePx: number;
  baseBulgePx: number;
  bulgeStepPx: number;
  maxExtraBulgePx: number;
  /** The outermost reach of the slurs nested inside this one, if any. */
  enclosedReachY?: number | null;
  /** How far past a nested slur this one stays. */
  nestedGapPx?: number;
}): number | null {
  if (entries.length === 0) {
    return null;
  }
  const sign = sideSign(side);
  const bulge = baseBulgePx + nestingLevel * bulgeStepPx;
  const markReachPx = ({ markDepthPx }: SlurReachEntry): number =>
    markDepthPx > 0 ? markDepthPx + markClearancePx : 0;
  const stemReachPx = ({ stemDepthPx }: SlurReachEntry): number =>
    stemDepthPx > 0 ? stemDepthPx + stemClearancePx : 0;
  const endAnchor = (entry: SlurReachEntry): CurvePoint => ({
    x: entry.index * ESTIMATE_ENTRY_SPACING_PX,
    y:
      entry.headCenterY +
      sign * Math.max(noteheadOffsetPx, markReachPx(entry), stemReachPx(entry)),
  });
  const reaches = entries.map((entry) => endAnchor(entry).y + sign * bulge);
  const from = endAnchor(entries[0]);
  const to = endAnchor(entries[entries.length - 1]);
  const shape = resolveEnclosingArc(
    from,
    to,
    side,
    bulge,
    entries.slice(1, -1).map((entry) => {
      const x = entry.index * ESTIMATE_ENTRY_SPACING_PX;
      const depth = Math.max(
        Math.max(entry.inkDepthPx, entry.stemDepthPx) + noteClearancePx,
        markReachPx(entry)
      );
      return {
        left: x - ESTIMATE_ENTRY_HALF_WIDTH_PX,
        right: x + ESTIMATE_ENTRY_HALF_WIDTH_PX,
        top: entry.headCenterY - (side === 'above' ? depth : 0),
        bottom: entry.headCenterY + (side === 'below' ? depth : 0),
      };
    }),
    bulge + maxExtraBulgePx
  );
  if (shape) {
    reaches.push(...sampleArc({ from, to, side, ...shape }).map(({ y }) => y));
  }
  if (enclosedReachY !== null) {
    reaches.push(enclosedReachY + sign * nestedGapPx);
  }
  return side === 'below' ? Math.max(...reaches) : Math.min(...reaches);
}

/** A dotted style is read only from the element a slur starts on. */
export function slurStyleWarning({
  slurStyle,
  slur,
  slurGroup,
}: {
  slurStyle: SlurStyle;
  slur: ConnectorRole | null;
  slurGroup: string | null;
}): string | null {
  if (slurStyle === 'solid' || slur === 'start' || slurGroup !== null) {
    return null;
  }
  return 'slur-style="dotted" is set but this element starts no slur; the style is read from the slur\'s start';
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
};

export type SlurCurveResolution = {
  controlHeights: [number, number];
  /** Polyline-segment × obstacle hits of the chosen shape; 0 when clear. */
  collisions: number;
};

const MAX_HEIGHTS_PER_CONTROL = 25;
const CURVE_SAMPLE_COUNT = 48;

/**
 * The shallowest convex cubic on `side` that touches no obstacle, or the
 * least-colliding one when none is clear.
 */
export function resolveSlurCurve(
  from: CurvePoint,
  to: CurvePoint,
  side: CurveSide,
  obstacles: readonly ObstacleRect[],
  options: SlurCurveSearchOptions
): SlurCurveResolution {
  const { minHeight, floorHeight } = options;
  const maxHeight = Math.max(options.maxHeight, floorHeight);
  const step = Math.max(
    options.step,
    (maxHeight - minHeight) / (MAX_HEIGHTS_PER_CONTROL - 1)
  );

  const minX = Math.min(from.x, to.x);
  const maxX = Math.max(from.x, to.x);
  const nearObstacles = obstacles.filter(
    (rect) => rect.right >= minX && rect.left <= maxX
  );

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
      const convex = h1 <= 2 * h2 && h2 <= 2 * h1;
      if (Math.max(h1, h2) >= floorHeight - 1e-6 && convex) {
        candidates.push([h1, h2]);
      }
    }
  }
  if (candidates.length === 0) {
    candidates.push([floorHeight, floorHeight]);
  }
  candidates.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));

  let best: SlurCurveResolution | null = null;
  for (const controlHeights of candidates) {
    const points = sampleCubicSlur(
      from,
      to,
      side,
      controlHeights,
      CURVE_SAMPLE_COUNT
    );
    const collisions = countPolylineCollisions(points, nearObstacles);
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

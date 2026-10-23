import type { NoteOrChordElementType } from '../types/elements';
import type { DynamicMarking, HairpinKind } from '../types/theory';
import {
  DYNAMICS_CHAR_WIDTH_PX,
  DYNAMICS_FONT_SIZE,
  DYNAMICS_TEXT_ASCENT_RATIO,
  DYNAMICS_TEXT_DESCENT_RATIO,
  HAIRPIN_BEAM_CLEARANCE_PX,
  HAIRPIN_MAX_ROUTE_SLANT_RADIANS,
  HAIRPIN_MIN_ROUTE_SLANT_RADIANS,
  HAIRPIN_NOTE_CLEARANCE_PX,
  HAIRPIN_PREFERRED_ROUTE_SLANT_RADIANS,
  HAIRPIN_ROUTE_MAX_SEARCH_STEPS,
  HAIRPIN_ROUTE_OUTSIDE_CLEARANCE_PX,
  HAIRPIN_ROUTE_SEARCH_STEP_PX,
} from '../utils/notationDimensions';
import {
  type ObstacleRect,
  segmentIntersectsRect,
} from './connectorPlacementRules';
import type { HairpinEndpoint } from './dynamicsRules';

export type HairpinPoint = { x: number; y: number };

export type HairpinEdge = [HairpinPoint, HairpinPoint];

export type HairpinWedgeEdges = [HairpinEdge, HairpinEdge];

// The wedge is rotated rigidly about its start → end axis, so each end's
// opening stays perpendicular to the axis; a horizontal axis reproduces the
// unrotated wedge exactly.
export function hairpinWedgeEdges(
  kind: HairpinKind,
  start: HairpinPoint,
  end: HairpinPoint,
  openHeight: number,
  openAtStart = false,
  openAtEnd = false
): HairpinWedgeEdges {
  const [startSpread, endSpread] = hairpinEndSpreads(
    kind,
    openHeight,
    openAtStart,
    openAtEnd
  );

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  const ux = length === 0 ? 1 : dx / length;
  const uy = length === 0 ? 0 : dy / length;
  const upX = uy;
  const upY = -ux;

  const offset = (point: HairpinPoint, spread: number): HairpinPoint => ({
    x: point.x + upX * spread,
    y: point.y + upY * spread,
  });

  return [
    [offset(start, startSpread), offset(end, endSpread)],
    [offset(start, -startSpread), offset(end, -endSpread)],
  ];
}

function hairpinEndSpreads(
  kind: HairpinKind,
  openHeight: number,
  openAtStart = false,
  openAtEnd = false
): [number, number] {
  const halfHeight = openHeight / 2;
  if (kind === 'crescendo') {
    return [openAtStart ? halfHeight / 2 : 0, halfHeight];
  }
  return [
    openAtStart ? halfHeight / 2 : halfHeight,
    openAtEnd ? halfHeight / 2 : 0,
  ];
}

export type DynamicsSide = 'above' | 'below';

// 'measure' means the ancestor measure draws it; 'above'/'below' force the
// staff's own row to that side of the stave.
export type DynamicsPlacement = DynamicsSide | 'measure';

// Keyed by element. `hairpin` applies to the hairpin this element starts;
// `marking` to its own dynamic. An element with an entry is never counted
// toward the staff's default dynamics row, even when both fields are null.
export type CrossStaffDynamicsOverride = {
  hairpin: DynamicsPlacement | null;
  marking: DynamicsPlacement | null;
};

export type StaffHairpinPlacement = {
  kind: HairpinKind;
  side: DynamicsSide;
  // Default baseline in viewport px, converted by the staff itself — its own
  // drawing origin can't be recovered from outside it.
  baselineClientY: number;
};

export type StaffHairpinDefaults = {
  pairs: (StaffHairpinPlacement & {
    startElement: NoteOrChordElementType;
    endElement: NoteOrChordElementType;
  })[];
  unpairedStarts: (HairpinEndpoint & StaffHairpinPlacement)[];
  orphanEnds: HairpinEndpoint[];
};

export type HairpinEndpointText = { marking: DynamicMarking; centerX: number };

// A dynamic's text baseline sits on the hairpin's own centre line, matching
// the staff's own placement where marking and hairpin share one baseline.
export function estimateDynamicTextBox(
  marking: DynamicMarking,
  centerX: number,
  baselineY: number
): ObstacleRect {
  const halfWidth = (marking.length * DYNAMICS_CHAR_WIDTH_PX) / 2;
  return {
    left: centerX - halfWidth,
    right: centerX + halfWidth,
    top: baselineY - DYNAMICS_FONT_SIZE * DYNAMICS_TEXT_ASCENT_RATIO,
    bottom: baselineY + DYNAMICS_FONT_SIZE * DYNAMICS_TEXT_DESCENT_RATIO,
  };
}

// A dynamic sits centred under its notehead unless a stem runs through the
// gap there; then it steps aside, away from its hairpin, past each such stem
// in turn, so no stem strikes through the text.
export function dynamicTextCenterClearOfStems(
  centerX: number,
  marking: DynamicMarking,
  stems: readonly ObstacleRect[],
  gap: { topGapEdgeY: number; bottomGapEdgeY: number },
  awayDirection: -1 | 1
): number {
  const halfWidth = (marking.length * DYNAMICS_CHAR_WIDTH_PX) / 2;
  const gapStems = stems
    .filter(
      (stem) => stem.bottom > gap.topGapEdgeY && stem.top < gap.bottomGapEdgeY
    )
    .map((stem) => ({
      left: stem.left - HAIRPIN_NOTE_CLEARANCE_PX,
      right: stem.right + HAIRPIN_NOTE_CLEARANCE_PX,
    }));
  let x = centerX;
  for (let step = 0; step <= gapStems.length; step++) {
    const blocking = gapStems.find(
      (stem) => x + halfWidth > stem.left && x - halfWidth < stem.right
    );
    if (blocking === undefined) {
      return x;
    }
    x =
      awayDirection < 0
        ? blocking.left - halfWidth
        : blocking.right + halfWidth;
  }
  return x;
}

const padRect = (rect: ObstacleRect, padding: number): ObstacleRect => ({
  left: rect.left - padding,
  right: rect.right + padding,
  top: rect.top - padding,
  bottom: rect.bottom + padding,
});

const rectsOverlap = (a: ObstacleRect, b: ObstacleRect): boolean =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

type PaddedObstacles = { beams: ObstacleRect[]; others: ObstacleRect[] };

const padObstacles = (
  beamSlices: readonly ObstacleRect[],
  obstacles: readonly ObstacleRect[]
): PaddedObstacles => ({
  beams: beamSlices.map((rect) => padRect(rect, HAIRPIN_BEAM_CLEARANCE_PX)),
  others: obstacles.map((rect) => padRect(rect, HAIRPIN_NOTE_CLEARANCE_PX)),
});

function placementCollides(
  edges: HairpinWedgeEdges,
  textBoxes: readonly ObstacleRect[],
  padded: PaddedObstacles
): boolean {
  const all = [...padded.beams, ...padded.others];
  for (const [from, to] of edges) {
    if (all.some((rect) => segmentIntersectsRect(from, to, rect))) {
      return true;
    }
  }
  return textBoxes.some((box) => all.some((rect) => rectsOverlap(box, rect)));
}

const endpointTextBoxes = (
  startText: HairpinEndpointText | null,
  endText: HairpinEndpointText | null,
  startY: number,
  endY: number
): ObstacleRect[] => {
  const boxes: ObstacleRect[] = [];
  if (startText !== null) {
    boxes.push(
      estimateDynamicTextBox(startText.marking, startText.centerX, startY)
    );
  }
  if (endText !== null) {
    boxes.push(estimateDynamicTextBox(endText.marking, endText.centerX, endY));
  }
  return boxes;
};

export type HorizontalHairpinInput = {
  kind: HairpinKind;
  startX: number;
  endX: number;
  y: number;
  openHeight: number;
  beamSlices: readonly ObstacleRect[];
  obstacles: readonly ObstacleRect[];
  startText: HairpinEndpointText | null;
  endText: HairpinEndpointText | null;
};

// Stems are expected to be left out of `obstacles`: a hairpin may cross them
// as a last resort, but never a beam.
export function isHorizontalHairpinClear(
  input: HorizontalHairpinInput
): boolean {
  return !placementCollides(
    hairpinWedgeEdges(
      input.kind,
      { x: input.startX, y: input.y },
      { x: input.endX, y: input.y },
      input.openHeight
    ),
    endpointTextBoxes(input.startText, input.endText, input.y, input.y),
    padObstacles(input.beamSlices, input.obstacles)
  );
}

export type SharedHairpinInput = Omit<HorizontalHairpinInput, 'y'> & {
  topGapEdgeY: number;
  bottomGapEdgeY: number;
};

// Dynamics for both hands are centred between the staves: candidates sweep
// outward from the middle of the gap, below before above at equal distance,
// and must keep the wedge and its endpoint text inside the gap.
export function resolveSharedHairpinY(
  input: SharedHairpinInput
): number | null {
  const halfOpening = input.openHeight / 2;
  const hasText = input.startText !== null || input.endText !== null;
  const reachUp = Math.max(
    halfOpening,
    hasText ? DYNAMICS_FONT_SIZE * DYNAMICS_TEXT_ASCENT_RATIO : 0
  );
  const reachDown = Math.max(
    halfOpening,
    hasText ? DYNAMICS_FONT_SIZE * DYNAMICS_TEXT_DESCENT_RATIO : 0
  );
  const minY = input.topGapEdgeY + reachUp + HAIRPIN_NOTE_CLEARANCE_PX;
  const maxY = input.bottomGapEdgeY - reachDown - HAIRPIN_NOTE_CLEARANCE_PX;
  if (minY > maxY) {
    return null;
  }

  const middle = (input.topGapEdgeY + input.bottomGapEdgeY) / 2;
  const candidates: number[] = [];
  for (
    let offset = 0;
    middle - offset >= minY || middle + offset <= maxY;
    offset += HAIRPIN_ROUTE_SEARCH_STEP_PX
  ) {
    for (const y of offset === 0
      ? [middle]
      : [middle + offset, middle - offset]) {
      if (y >= minY && y <= maxY) {
        candidates.push(y);
      }
    }
  }

  for (const y of candidates) {
    if (isHorizontalHairpinClear({ ...input, y })) {
      return y;
    }
  }
  return null;
}

const SLICE_DISTANCE_TOLERANCE_PX = 0.5;

export type AngledHairpinInput = {
  kind: HairpinKind;
  startX: number;
  endX: number;
  openHeight: number;
  staffRole: 'top' | 'bottom';
  staffTopLineY: number;
  staffBottomLineY: number;
  otherStaffGapEdgeY: number;
  beamSlices: readonly ObstacleRect[];
  obstacles: readonly ObstacleRect[];
  startText: HairpinEndpointText | null;
  endText: HairpinEndpointText | null;
};

export type AngledHairpinRoute = { start: HairpinPoint; end: HairpinPoint };

// A hairpin angled through its own stave: one end sits outside the stave's
// far line (the conspicuous end), the other in the gap between the staves.
// Both orientations are tried. Routes are preferred with the gap end where
// the beam leaves the stave the most room, then with the outside end as close
// to the stave as possible, then with a slant nearest the preferred one.
export function resolveAngledHairpinRoute(
  input: AngledHairpinInput
): AngledHairpinRoute | null {
  const padded = padObstacles(input.beamSlices, input.obstacles);
  const outsideDirection = input.staffRole === 'bottom' ? 1 : -1;
  const farLineY =
    input.staffRole === 'bottom' ? input.staffBottomLineY : input.staffTopLineY;
  const nearLineY =
    input.staffRole === 'bottom' ? input.staffTopLineY : input.staffBottomLineY;
  const [startSpread, endSpread] = hairpinEndSpreads(
    input.kind,
    input.openHeight
  );
  const span = input.endX - input.startX;
  if (span <= 0) {
    return null;
  }
  const minRise = span * Math.tan(HAIRPIN_MIN_ROUTE_SLANT_RADIANS);
  const maxRise = span * Math.tan(HAIRPIN_MAX_ROUTE_SLANT_RADIANS);

  // Room is read from the beam slice nearest each end within the span, so
  // an end just short of where the beam starts still sees that beam.
  const spanSlices = input.beamSlices.filter(
    (slice) => slice.right >= input.startX && slice.left <= input.endX
  );
  const gapRoomAt = (x: number): number => {
    if (spanSlices.length === 0) {
      return Math.abs(nearLineY - input.otherStaffGapEdgeY);
    }
    const distance = (slice: ObstacleRect) =>
      Math.max(slice.left - x, x - slice.right, 0);
    const nearestDistance = Math.min(...spanSlices.map(distance));
    const nearest = spanSlices.filter(
      (slice) =>
        distance(slice) <= nearestDistance + SLICE_DISTANCE_TOLERANCE_PX
    );
    return outsideDirection === 1
      ? nearLineY - Math.max(...nearest.map((slice) => slice.bottom))
      : Math.min(...nearest.map((slice) => slice.top)) - nearLineY;
  };
  const preferGapEndAtStart = gapRoomAt(input.startX) > gapRoomAt(input.endX);

  let best: {
    route: AngledHairpinRoute;
    steps: number;
    orientationPenalty: number;
    slantError: number;
  } | null = null;

  for (const gapEndAtStart of [false, true]) {
    const orientationPenalty = gapEndAtStart === preferGapEndAtStart ? 0 : 1;
    const outsideSpread = gapEndAtStart ? endSpread : startSpread;
    const gapSpread = gapEndAtStart ? startSpread : endSpread;
    const gapText = gapEndAtStart ? input.startText : input.endText;
    const gapReach = Math.max(
      gapSpread,
      gapText !== null
        ? DYNAMICS_FONT_SIZE *
            (outsideDirection === 1
              ? DYNAMICS_TEXT_ASCENT_RATIO
              : DYNAMICS_TEXT_DESCENT_RATIO)
        : 0
    );
    const gapLimitY =
      input.otherStaffGapEdgeY +
      outsideDirection * (gapReach + HAIRPIN_NOTE_CLEARANCE_PX);

    for (let steps = 0; steps <= HAIRPIN_ROUTE_MAX_SEARCH_STEPS; steps++) {
      if (
        best !== null &&
        best.orientationPenalty <= orientationPenalty &&
        best.steps < steps
      ) {
        break;
      }
      const outsideY =
        farLineY +
        outsideDirection *
          (outsideSpread +
            HAIRPIN_ROUTE_OUTSIDE_CLEARANCE_PX +
            steps * HAIRPIN_ROUTE_SEARCH_STEP_PX);

      for (
        let gapY = nearLineY - outsideDirection * HAIRPIN_ROUTE_SEARCH_STEP_PX;
        outsideDirection * (gapY - gapLimitY) >= 0;
        gapY -= outsideDirection * HAIRPIN_ROUTE_SEARCH_STEP_PX
      ) {
        const rise = Math.abs(outsideY - gapY);
        if (rise < minRise || rise > maxRise) {
          continue;
        }
        const start = { x: input.startX, y: gapEndAtStart ? gapY : outsideY };
        const end = { x: input.endX, y: gapEndAtStart ? outsideY : gapY };
        const edges = hairpinWedgeEdges(
          input.kind,
          start,
          end,
          input.openHeight
        );
        const texts = endpointTextBoxes(
          input.startText,
          input.endText,
          start.y,
          end.y
        );
        if (placementCollides(edges, texts, padded)) {
          continue;
        }
        const slantError = Math.abs(
          Math.atan(rise / span) - HAIRPIN_PREFERRED_ROUTE_SLANT_RADIANS
        );
        const candidate = {
          route: { start, end },
          steps,
          orientationPenalty,
          slantError,
        };
        if (best === null || isBetterRoute(candidate, best)) {
          best = candidate;
        }
      }
    }
  }

  return best?.route ?? null;
}

type RankedRoute = {
  orientationPenalty: number;
  steps: number;
  slantError: number;
};

const isBetterRoute = (candidate: RankedRoute, best: RankedRoute): boolean => {
  if (candidate.orientationPenalty !== best.orientationPenalty) {
    return candidate.orientationPenalty < best.orientationPenalty;
  }
  if (candidate.steps !== best.steps) {
    return candidate.steps < best.steps;
  }
  return candidate.slantError < best.slantError;
};

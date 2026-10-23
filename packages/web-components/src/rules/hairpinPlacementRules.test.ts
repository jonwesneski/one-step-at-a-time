import type { DynamicMarking, HairpinKind } from '../types/theory';
import {
  HAIRPIN_BEAM_CLEARANCE_PX,
  HAIRPIN_MAX_ROUTE_SLANT_RADIANS,
  HAIRPIN_MIN_ROUTE_SLANT_RADIANS,
  HAIRPIN_OPEN_HEIGHT,
  HAIRPIN_ROUTE_OUTSIDE_CLEARANCE_PX,
  SLUR_BEAM_SLICE_WIDTH_PX,
} from '../utils/notationDimensions';
import {
  type CurvePoint,
  type ObstacleRect,
  segmentIntersectsRect,
  sliceConvexPolygon,
} from './connectorPlacementRules';
import {
  type AngledHairpinInput,
  estimateDynamicTextBox,
  hairpinWedgeEdges,
  isHorizontalHairpinClear,
  resolveAngledHairpinRoute,
  resolveSharedHairpinY,
  type SharedHairpinInput,
} from './hairpinPlacementRules';

const TOP_STAFF_TOP_LINE_Y = 30;
const TOP_STAFF_BOTTOM_LINE_Y = 70;
const BOTTOM_STAFF_TOP_LINE_Y = 130;
const BOTTOM_STAFF_BOTTOM_LINE_Y = 170;
const GAP_MIDDLE_Y = (TOP_STAFF_BOTTOM_LINE_Y + BOTTOM_STAFF_TOP_LINE_Y) / 2;
const BEAM_THICKNESS = 8;
const CRESCENDO: HairpinKind = 'crescendo';
const FORTISSIMO: DynamicMarking = 'ff';

function beamSlices(
  x1: number,
  topY1: number,
  x2: number,
  topY2: number
): ObstacleRect[] {
  const corners: CurvePoint[] = [
    { x: x1, y: topY1 },
    { x: x1, y: topY1 + BEAM_THICKNESS },
    { x: x2, y: topY2 + BEAM_THICKNESS },
    { x: x2, y: topY2 },
  ];
  return sliceConvexPolygon(corners, SLUR_BEAM_SLICE_WIDTH_PX);
}

function headRect(centerX: number, centerY: number): ObstacleRect {
  return {
    left: centerX - 6,
    right: centerX + 6,
    top: centerY - 4.5,
    bottom: centerY + 4.5,
  };
}

function wedgeHitsAny(
  kind: HairpinKind,
  start: CurvePoint,
  end: CurvePoint,
  rects: readonly ObstacleRect[]
): boolean {
  return hairpinWedgeEdges(kind, start, end, HAIRPIN_OPEN_HEIGHT).some(
    ([from, to]) => rects.some((rect) => segmentIntersectsRect(from, to, rect))
  );
}

const overlaps = (a: ObstacleRect, b: ObstacleRect): boolean =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

describe('resolveAngledHairpinRoute', () => {
  // A rising group: low bass notes at the left climb toward a beam that rises
  // from just above the bass stave into the treble stave, with `ff` at the end.
  const risingBeam = beamSlices(20, 112, 260, 40);
  const bassHeads = [headRect(40, 180), headRect(80, 165), headRect(120, 150)];
  const baseInput: AngledHairpinInput = {
    kind: CRESCENDO,
    startX: 40,
    endX: 200,
    openHeight: HAIRPIN_OPEN_HEIGHT,
    staffRole: 'bottom',
    staffTopLineY: BOTTOM_STAFF_TOP_LINE_Y,
    staffBottomLineY: BOTTOM_STAFF_BOTTOM_LINE_Y,
    otherStaffGapEdgeY: TOP_STAFF_BOTTOM_LINE_Y,
    beamSlices: risingBeam,
    obstacles: bassHeads,
    startText: null,
    endText: { marking: FORTISSIMO, centerX: 213 },
  };

  it('starts below the stave and ends in the gap under the beam', () => {
    const route = resolveAngledHairpinRoute(baseInput);

    expect(route).not.toBeNull();
    expect(route!.start.y).toBeGreaterThanOrEqual(
      BOTTOM_STAFF_BOTTOM_LINE_Y + HAIRPIN_ROUTE_OUTSIDE_CLEARANCE_PX
    );
    expect(route!.end.y).toBeLessThan(BOTTOM_STAFF_TOP_LINE_Y);
    expect(route!.end.y).toBeGreaterThan(TOP_STAFF_BOTTOM_LINE_Y);
  });

  it('keeps a slant between the minimum and maximum', () => {
    const route = resolveAngledHairpinRoute(baseInput)!;
    const slant = Math.atan(
      Math.abs(route.end.y - route.start.y) / (route.end.x - route.start.x)
    );

    expect(slant).toBeGreaterThanOrEqual(HAIRPIN_MIN_ROUTE_SLANT_RADIANS);
    expect(slant).toBeLessThanOrEqual(HAIRPIN_MAX_ROUTE_SLANT_RADIANS);
  });

  it('never touches the beam, a notehead, or puts its end dynamic on the beam', () => {
    const route = resolveAngledHairpinRoute(baseInput)!;
    const endTextBox = estimateDynamicTextBox(FORTISSIMO, 213, route.end.y);

    expect(
      wedgeHitsAny(CRESCENDO, route.start, route.end, [
        ...risingBeam,
        ...bassHeads,
      ])
    ).toBe(false);
    expect(risingBeam.some((slice) => overlaps(endTextBox, slice))).toBe(false);
  });

  it('puts the gap end under the high end of a beam that starts after the hairpin', () => {
    const route = resolveAngledHairpinRoute({
      ...baseInput,
      obstacles: [],
      beamSlices: beamSlices(60, 118, 260, 40),
    });

    expect(route).not.toBeNull();
    expect(route!.end.y).toBeLessThan(BOTTOM_STAFF_TOP_LINE_Y);
    expect(route!.start.y).toBeGreaterThan(BOTTOM_STAFF_BOTTOM_LINE_Y);
  });

  it('returns null when the beam spans the whole hairpin just above the stave', () => {
    const route = resolveAngledHairpinRoute({
      ...baseInput,
      beamSlices: beamSlices(0, 118, 300, 118),
    });

    expect(route).toBeNull();
  });

  it('returns null when the span is too short for the slant limit', () => {
    const route = resolveAngledHairpinRoute({
      ...baseInput,
      startX: 160,
      endX: 200,
    });

    expect(route).toBeNull();
  });

  it('steps the outside end further out to clear a low note', () => {
    const unobstructed = { ...baseInput, obstacles: [] };
    const nominal = resolveAngledHairpinRoute(unobstructed)!;
    const lowHead = headRect(nominal.start.x + 6, nominal.start.y);
    const route = resolveAngledHairpinRoute({
      ...unobstructed,
      obstacles: [lowHead],
    });

    expect(nominal.start.y).toBe(
      BOTTOM_STAFF_BOTTOM_LINE_Y + HAIRPIN_ROUTE_OUTSIDE_CLEARANCE_PX
    );
    expect(route).not.toBeNull();
    expect(route!.start.y).toBeGreaterThan(nominal.start.y);
    expect(route!.end.y).toBeLessThan(BOTTOM_STAFF_TOP_LINE_Y);
    expect(wedgeHitsAny(CRESCENDO, route!.start, route!.end, [lowHead])).toBe(
      false
    );
  });

  it('mirrors for the top stave, starting above it and ending in the gap', () => {
    const fallingBeam = beamSlices(20, 80, 260, 152);
    const route = resolveAngledHairpinRoute({
      ...baseInput,
      staffRole: 'top',
      staffTopLineY: TOP_STAFF_TOP_LINE_Y,
      staffBottomLineY: TOP_STAFF_BOTTOM_LINE_Y,
      otherStaffGapEdgeY: BOTTOM_STAFF_TOP_LINE_Y,
      beamSlices: fallingBeam,
      obstacles: [],
    });

    expect(route).not.toBeNull();
    expect(route!.start.y).toBeLessThanOrEqual(
      TOP_STAFF_TOP_LINE_Y - HAIRPIN_ROUTE_OUTSIDE_CLEARANCE_PX
    );
    expect(route!.end.y).toBeGreaterThan(TOP_STAFF_BOTTOM_LINE_Y);
    expect(wedgeHitsAny(CRESCENDO, route!.start, route!.end, fallingBeam)).toBe(
      false
    );
  });
});

describe('resolveSharedHairpinY', () => {
  const baseInput: SharedHairpinInput = {
    kind: CRESCENDO,
    startX: 40,
    endX: 200,
    openHeight: HAIRPIN_OPEN_HEIGHT,
    topGapEdgeY: TOP_STAFF_BOTTOM_LINE_Y,
    bottomGapEdgeY: BOTTOM_STAFF_TOP_LINE_Y,
    beamSlices: [],
    obstacles: [],
    startText: null,
    endText: null,
  };

  it('centres the hairpin in the gap when nothing is in the way', () => {
    expect(resolveSharedHairpinY(baseInput)).toBe(GAP_MIDDLE_Y);
  });

  it('moves below a beam that sits across the middle of the gap', () => {
    const beam = beamSlices(0, GAP_MIDDLE_Y - 4, 300, GAP_MIDDLE_Y - 4);
    const y = resolveSharedHairpinY({ ...baseInput, beamSlices: beam });

    expect(y).not.toBeNull();
    expect(y!).toBeGreaterThan(GAP_MIDDLE_Y);
    expect(
      y! - HAIRPIN_OPEN_HEIGHT / 2 - HAIRPIN_BEAM_CLEARANCE_PX
    ).toBeGreaterThanOrEqual(GAP_MIDDLE_Y + 4);
  });

  it('moves above a beam that sits low in the gap', () => {
    const beam = beamSlices(0, 104, 300, 104);
    const y = resolveSharedHairpinY({ ...baseInput, beamSlices: beam });

    expect(y).not.toBeNull();
    expect(y!).toBeLessThan(GAP_MIDDLE_Y);
    expect(
      wedgeHitsAny(CRESCENDO, { x: 40, y: y! }, { x: 200, y: y! }, beam)
    ).toBe(false);
  });

  it('returns null when the beams fill the gap', () => {
    const beam = [
      ...beamSlices(0, 72, 300, 72),
      ...beamSlices(0, 80, 300, 80),
      ...beamSlices(0, 88, 300, 88),
      ...beamSlices(0, 96, 300, 96),
      ...beamSlices(0, 104, 300, 104),
      ...beamSlices(0, 112, 300, 112),
      ...beamSlices(0, 120, 300, 120),
    ];

    expect(
      resolveSharedHairpinY({ ...baseInput, beamSlices: beam })
    ).toBeNull();
  });

  it('avoids a ledger-line notehead in the middle of the gap', () => {
    const head = headRect(120, GAP_MIDDLE_Y);
    const y = resolveSharedHairpinY({ ...baseInput, obstacles: [head] });

    expect(y).not.toBeNull();
    expect(y).not.toBe(GAP_MIDDLE_Y);
    expect(
      wedgeHitsAny(CRESCENDO, { x: 40, y: y! }, { x: 200, y: y! }, [head])
    ).toBe(false);
  });

  it('keeps an endpoint dynamic clear of a beam across the middle of the gap', () => {
    const beamTopY = GAP_MIDDLE_Y - 4;
    const beam = beamSlices(0, beamTopY, 300, beamTopY);
    const endText = { marking: FORTISSIMO, centerX: 213 };
    const y = resolveSharedHairpinY({
      ...baseInput,
      beamSlices: beam,
      endText,
    });

    expect(y).not.toBeNull();
    const textBox = estimateDynamicTextBox(FORTISSIMO, 213, y!);
    const clearsAbove = textBox.bottom <= beamTopY - HAIRPIN_BEAM_CLEARANCE_PX;
    const clearsBelow =
      textBox.top >= beamTopY + BEAM_THICKNESS + HAIRPIN_BEAM_CLEARANCE_PX;
    expect(clearsAbove || clearsBelow).toBe(true);
    expect(
      isHorizontalHairpinClear({
        ...baseInput,
        y: y!,
        beamSlices: beam,
        endText,
      })
    ).toBe(true);
  });
});

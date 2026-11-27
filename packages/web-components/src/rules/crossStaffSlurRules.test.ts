import { SLUR_OBSTACLE_CLEARANCE_PX } from '../utils/notationDimensions';
import {
  type CurvePoint,
  type CurveSide,
  sampleCubicSlur,
} from './connectorPlacementRules';
import {
  type CrossStaffSlurEnd,
  resolveCrossStaffSlurShape,
  type SlurObstacle,
} from './crossStaffSlurRules';

const TREBLE = 0;
const BASS = 1;

const entry = (
  columnX: number,
  top: number,
  bottom: number,
  staffIndex: number
): SlurObstacle => ({
  rect: { left: columnX - 6, right: columnX + 6, top, bottom },
  columnX,
  staffIndex,
});

// Four bass notes, then four treble ones, each over or under a rest.
const handCrossing = (spacing: number) => {
  const x = (column: number): number => column * spacing;
  const from: CrossStaffSlurEnd = { x: x(0), y: 120, staffIndex: BASS };
  const to: CrossStaffSlurEnd = { x: x(7), y: 10, staffIndex: TREBLE };
  const rests = [0, 1, 2, 3].map((c) => entry(x(c), 30, 50, TREBLE));
  const obstacles = [
    ...rests,
    ...[1, 2, 3].map((c) => entry(x(c), 135, 165, BASS)),
    ...[4, 5, 6].map((c) => entry(x(c), 48 - (c - 4) * 10, 75, TREBLE)),
    ...[4, 5, 6, 7].map((c) => entry(x(c), 140, 160, BASS)),
  ];
  return { from, to, rests, obstacles };
};

const curve = (
  from: CurvePoint,
  to: CurvePoint,
  heights: readonly [number, number],
  side: CurveSide = 'above'
): CurvePoint[] => sampleCubicSlur(from, to, side, heights, 400);

const clearanceOf = (
  points: readonly CurvePoint[],
  { rect }: SlurObstacle
): number =>
  Math.min(
    ...points.map(({ x, y }) =>
      Math.hypot(
        Math.max(rect.left - x, 0, x - rect.right),
        Math.max(rect.top - y, 0, y - rect.bottom)
      )
    )
  );

describe('resolveCrossStaffSlurShape', () => {
  it('is a shallow symmetric arc when nothing is in the way', () => {
    const { controlHeights, overlap } = resolveCrossStaffSlurShape(
      { x: 0, y: 100, staffIndex: BASS },
      { x: 200, y: 100, staffIndex: TREBLE },
      'above',
      []
    );
    expect(overlap).toBe(0);
    expect(controlHeights[0]).toBeCloseTo(controlHeights[1], 3);
    expect(controlHeights[0]).toBeGreaterThan(10);
    expect(controlHeights[0]).toBeLessThan(25);
  });

  it('clears everything along its way', () => {
    const { from, to, obstacles } = handCrossing(60);
    const { controlHeights, overlap } = resolveCrossStaffSlurShape(
      from,
      to,
      'above',
      obstacles
    );
    expect(overlap).toBeLessThan(1);
    const points = curve(from, to, controlHeights);
    for (const obstacle of obstacles) {
      expect(clearanceOf(points, obstacle)).toBeGreaterThan(
        SLUR_OBSTACLE_CLEARANCE_PX - 1
      );
    }
  });

  it('goes the same way past every rest at any spacing, and changes shape smoothly', () => {
    const passesAbove = (spacing: number): boolean[] => {
      const { from, to, rests, obstacles } = handCrossing(spacing);
      const { controlHeights } = resolveCrossStaffSlurShape(
        from,
        to,
        'above',
        obstacles
      );
      const points = curve(from, to, controlHeights);
      return rests.slice(1).map(({ rect, columnX }) => {
        const nearest = points.reduce((best, point) =>
          Math.abs(point.x - (columnX ?? 0)) < Math.abs(best.x - (columnX ?? 0))
            ? point
            : best
        );
        return nearest.y < (rect.top + rect.bottom) / 2;
      });
    };
    const heightsAt = (spacing: number): [number, number] => {
      const { from, to, obstacles } = handCrossing(spacing);
      return resolveCrossStaffSlurShape(from, to, 'above', obstacles)
        .controlHeights;
    };
    const way = passesAbove(50);
    for (let spacing = 50; spacing < 160; spacing += 1) {
      expect(passesAbove(spacing)).toEqual(way);
      const [a, b] = [heightsAt(spacing), heightsAt(spacing + 1)];
      expect(Math.abs(b[0] - a[0])).toBeLessThan(4);
      expect(Math.abs(b[1] - a[1])).toBeLessThan(4);
    }
  });

  it('is the same curve right to left, and mirrored below', () => {
    const { from, to, obstacles } = handCrossing(60);
    const { controlHeights } = resolveCrossStaffSlurShape(
      from,
      to,
      'above',
      obstacles
    );
    const reversed = resolveCrossStaffSlurShape(to, from, 'above', obstacles);
    expect(reversed.controlHeights).toEqual([
      controlHeights[1],
      controlHeights[0],
    ]);

    const mirror = <T extends { y: number; staffIndex: number }>(
      end: T
    ): T => ({
      ...end,
      y: -end.y,
      staffIndex: 1 - end.staffIndex,
    });
    const below = resolveCrossStaffSlurShape(
      mirror(from),
      mirror(to),
      'below',
      obstacles.map(({ rect, columnX, staffIndex }) => ({
        rect: { ...rect, top: -rect.bottom, bottom: -rect.top },
        columnX,
        staffIndex: 1 - (staffIndex ?? 0),
      }))
    );
    expect(below.controlHeights[0]).toBeCloseTo(controlHeights[0], 5);
    expect(below.controlHeights[1]).toBeCloseTo(controlHeights[1], 5);
  });

  it('reports what it cannot clear', () => {
    const { from, to, obstacles } = handCrossing(60);
    const wall: SlurObstacle = {
      rect: { left: 150, right: 290, top: -400, bottom: 400 },
      columnX: null,
      staffIndex: TREBLE,
    };
    expect(
      resolveCrossStaffSlurShape(from, to, 'above', [...obstacles, wall])
        .overlap
    ).toBeGreaterThan(SLUR_OBSTACLE_CLEARANCE_PX);
  });

  it('passes over a beam its two ends share', () => {
    const from: CrossStaffSlurEnd = { x: 0, y: 40, staffIndex: TREBLE };
    const to: CrossStaffSlurEnd = { x: 160, y: 30, staffIndex: TREBLE };
    const beam: SlurObstacle = {
      rect: { left: 0, right: 160, top: 70, bottom: 76 },
      columnX: null,
      staffIndex: null,
    };
    const { controlHeights } = resolveCrossStaffSlurShape(from, to, 'above', [
      beam,
    ]);
    expect(
      Math.max(...curve(from, to, controlHeights).map(({ y }) => y))
    ).toBeLessThan(beam.rect.top);
  });
});

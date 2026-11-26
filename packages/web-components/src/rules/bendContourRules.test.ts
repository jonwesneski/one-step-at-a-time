import {
  BEND_CONTOUR_POINT_PX,
  GLISSANDO_MIN_LENGTH_PX,
} from '../utils/notationDimensions';
import {
  bendContourWarning,
  contourMinLengthPx,
  contourPath,
  contourPoints,
  contourSegments,
  contourSteps,
  contourTopUnder,
  type CubicSegment,
  parseBendContour,
} from './bendContourRules';

// y at x on a segment whose controls sit at thirds in x.
const sample = ({ from, c1, c2, to }: CubicSegment, t: number) => {
  const u = 1 - t;
  return {
    x:
      u * u * u * from.x +
      3 * u * u * t * c1.x +
      3 * u * t * t * c2.x +
      t * t * t * to.x,
    y:
      u * u * u * from.y +
      3 * u * u * t * c1.y +
      3 * u * t * t * c2.y +
      t * t * t * to.y,
  };
};

describe('parseBendContour', () => {
  it('reads pitches with octaves, ignoring accidentals', () => {
    expect(parseBendContour(' G5, Bb4 ,d#6')).toEqual([
      { letter: 'G', octave: 5 },
      { letter: 'B', octave: 4 },
      { letter: 'D', octave: 6 },
    ]);
  });

  it('skips bad entries, null when none is left', () => {
    expect(parseBendContour('G5,H4,C')).toEqual([{ letter: 'G', octave: 5 }]);
    expect(parseBendContour('H4, ,')).toBeNull();
    expect(parseBendContour(null)).toBeNull();
  });
});

describe('bendContourWarning', () => {
  it('names the entries it skips, and an empty contour', () => {
    expect(bendContourWarning('G5,H4,C')).toMatch(/"H4", "C"/);
    expect(bendContourWarning(' , ')).toMatch(/empty/);
    expect(bendContourWarning('G5,A4')).toBeNull();
    expect(bendContourWarning(null)).toBeNull();
  });
});

describe('contourSteps', () => {
  it('counts diatonic steps from the written pitch', () => {
    expect(
      contourSteps('A', 4, [
        { letter: 'G', octave: 5 },
        { letter: 'A', octave: 4 },
        { letter: 'E', octave: 4 },
      ])
    ).toEqual([6, 0, -3]);
  });
});

describe('contourMinLengthPx', () => {
  it('is the shortest bend, or 1.2 spaces a pitch', () => {
    expect(contourMinLengthPx(1)).toBe(GLISSANDO_MIN_LENGTH_PX);
    expect(contourMinLengthPx(8)).toBe(8 * BEND_CONTOUR_POINT_PX);
  });
});

describe('contourPoints', () => {
  it('spaces its pitches evenly, the last at the end', () => {
    expect(contourPoints({ x: 10, y: 50 }, 110, [40, 60, 30, 45])).toEqual([
      { x: 10, y: 50 },
      { x: 35, y: 40 },
      { x: 60, y: 60 },
      { x: 85, y: 30 },
      { x: 110, y: 45 },
    ]);
  });

  it('runs straight to a single pitch', () => {
    const points = contourPoints({ x: 0, y: 50 }, 100, [20]);
    expect(points).toEqual([
      { x: 0, y: 50 },
      { x: 100, y: 20 },
    ]);
    const [segment] = contourSegments(points);
    expect(sample(segment, 0.5).y).toBeCloseTo(35);
  });
});

describe('contourSegments', () => {
  const points = [
    { x: 0, y: 50 },
    { x: 20, y: 30 },
    { x: 40, y: 45 },
    { x: 60, y: 44 },
    { x: 80, y: 10 },
    { x: 100, y: 60 },
  ];

  it('never leaves the interval between neighbouring pitches', () => {
    for (const segment of contourSegments(points)) {
      const [low, high] = [
        Math.min(segment.from.y, segment.to.y),
        Math.max(segment.from.y, segment.to.y),
      ];
      for (let t = 0; t <= 1; t += 0.05) {
        const { y } = sample(segment, t);
        expect(y).toBeGreaterThanOrEqual(low - 1e-9);
        expect(y).toBeLessThanOrEqual(high + 1e-9);
      }
    }
  });

  it('is level at each peak and trough', () => {
    const segments = contourSegments(points);
    // The peak at x 20 and the trough at x 40.
    expect(segments[0].c2.y).toBe(30);
    expect(segments[1].c1.y).toBe(30);
    expect(segments[1].c2.y).toBe(45);
    expect(segments[2].c1.y).toBe(45);
  });

  it('draws as one path', () => {
    expect(contourPath(contourSegments(points))).toMatch(
      /^M 0 50( C [^C]+){5}$/
    );
  });
});

describe('contourTopUnder', () => {
  const segments = contourSegments([
    { x: 0, y: 50 },
    { x: 50, y: 10 },
    { x: 100, y: 50 },
  ]);

  it('is the highest point under a span only', () => {
    expect(contourTopUnder(segments, { left: 40, right: 60 })).toBe(10);
    expect(contourTopUnder(segments, { left: 0, right: 10 })).toBeGreaterThan(
      40
    );
    expect(contourTopUnder(segments, { left: 120, right: 140 })).toBeNull();
  });

  it('is the lowest point for text below', () => {
    expect(contourTopUnder(segments, { left: 40, right: 100 }, false)).toBe(50);
  });
});

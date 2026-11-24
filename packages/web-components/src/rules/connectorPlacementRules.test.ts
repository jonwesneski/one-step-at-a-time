import {
  anchorYClearOfRects,
  arcEncloses,
  arcObstacleRects,
  bulgeHeightEnclosingRects,
  computeNestingLevels,
  consecutivePhrasePairs,
  cubicSlurControlPoints,
  estimatedSlurReachY,
  inflateRect,
  isCurveObscured,
  isInnerVoicePosition,
  ObstacleRect,
  pickChordToneSide,
  pickCrossStaffSlurSide,
  pickStemSide,
  quadraticCrossesRect,
  quadraticCurveYAtX,
  resolveRectClearingBulgeHeight,
  resolveSlurCurve,
  sampleCubicSlur,
  segmentIntersectsRect,
  sliceConvexPolygon,
  slurAnchorKind,
  slurSpans,
  slurStyleWarning,
} from './connectorPlacementRules';

const rect = (
  left: number,
  top: number,
  right: number,
  bottom: number
): ObstacleRect => ({ left, top, right, bottom });

describe('pickStemSide', () => {
  it('curves away from the stem', () => {
    expect(pickStemSide({ stemUp: true, isGuitarNote: false })).toBe('below');
    expect(pickStemSide({ stemUp: false, isGuitarNote: false })).toBe('above');
  });

  it('always curves above for guitar tab', () => {
    expect(pickStemSide({ stemUp: true, isGuitarNote: true })).toBe('above');
  });
});

describe('pickChordToneSide', () => {
  it('curves outward from the chord midpoint', () => {
    const yCoords = [20, 12, 4];
    expect(pickChordToneSide(yCoords, 0, 'above')).toBe('below');
    expect(pickChordToneSide(yCoords, 2, 'below')).toBe('above');
  });

  it('falls back for the middle tone or a single tone', () => {
    expect(pickChordToneSide([20, 12, 4], 1, 'below')).toBe('below');
    expect(pickChordToneSide([12], 0, 'above')).toBe('above');
  });
});

describe('consecutivePhrasePairs', () => {
  it('pairs neighbors in x order, not input order', () => {
    expect(
      consecutivePhrasePairs([
        { item: 'c', measureIndex: 0, x: 300 },
        { item: 'a', measureIndex: 0, x: 100 },
        { item: 'b', measureIndex: 0, x: 200 },
      ])
    ).toEqual([
      ['a', 'b'],
      ['b', 'c'],
    ]);
  });

  it('orders by measure before x, so a wrapped system follows the one above', () => {
    expect(
      consecutivePhrasePairs([
        { item: 'row2', measureIndex: 1, x: 40 },
        { item: 'row1', measureIndex: 0, x: 700 },
        { item: 'row1Earlier', measureIndex: 0, x: 500 },
      ])
    ).toEqual([
      ['row1Earlier', 'row1'],
      ['row1', 'row2'],
    ]);
  });

  it('returns nothing for a single member', () => {
    expect(
      consecutivePhrasePairs([{ item: 'a', measureIndex: 0, x: 0 }])
    ).toEqual([]);
  });
});

describe('computeNestingLevels', () => {
  it('counts strictly enclosed pairs of the same kind only', () => {
    expect(
      computeNestingLevels([
        { kind: 'slur', startIndex: 0, endIndex: 5 },
        { kind: 'slur', startIndex: 1, endIndex: 2 },
        { kind: 'tie', startIndex: 3, endIndex: 4 },
      ])
    ).toEqual([1, 0, 0]);
  });
});

describe('isInnerVoicePosition', () => {
  it('treats every voice after the first as inner, only when 2+ voices exist', () => {
    expect(isInnerVoicePosition(0, 2)).toBe(false);
    expect(isInnerVoicePosition(1, 2)).toBe(true);
    expect(isInnerVoicePosition(0, 1)).toBe(false);
  });
});

describe('quadratic curve helpers', () => {
  const from = { x: 0, y: 100 };
  const to = { x: 100, y: 100 };

  it('reads the curve y inside its open span only', () => {
    expect(quadraticCurveYAtX(from, to, 'above', 10, 50)).toBeCloseTo(95);
    expect(quadraticCurveYAtX(from, to, 'above', 10, 0)).toBeNull();
    expect(quadraticCurveYAtX(from, to, 'above', 10, 120)).toBeNull();
  });

  it('flags an obstacle centre sitting on the curve', () => {
    expect(isCurveObscured(from, to, 'above', 10, [{ x: 50, y: 95 }], 3)).toBe(
      true
    );
    expect(isCurveObscured(from, to, 'above', 10, [{ x: 50, y: 60 }], 3)).toBe(
      false
    );
  });

  it('detects a rect crossing at the vertex regardless of endpoint order', () => {
    const vertexRect = rect(45, 93, 55, 97);
    expect(quadraticCrossesRect(from, to, 'above', 10, vertexRect)).toBe(true);
    // A right-to-left pair (a slur authored with `slur="start"` on the later
    // note) is the same curve.
    expect(quadraticCrossesRect(to, from, 'above', 10, vertexRect)).toBe(true);
  });

  it('pushes the bulge out only for an avoidable rect', () => {
    const vertexRect = rect(45, 90, 55, 97);
    const pushed = resolveRectClearingBulgeHeight(
      from,
      to,
      'above',
      10,
      [vertexRect],
      { step: 10, maxSteps: 6 }
    );
    expect(pushed).toBeGreaterThan(10);

    const straddling = rect(45, 50, 55, 150);
    expect(
      resolveRectClearingBulgeHeight(
        { x: 0, y: 40 },
        { x: 100, y: 160 },
        'above',
        10,
        [straddling],
        { step: 10, maxSteps: 6 }
      )
    ).toBeUndefined();
  });
});

describe('pickCrossStaffSlurSide', () => {
  it('goes to the side of the staff holding the majority of notes', () => {
    expect(pickCrossStaffSlurSide(3, 1)).toBe('above');
    expect(pickCrossStaffSlurSide(1, 3)).toBe('below');
  });

  it('prefers above on an even split', () => {
    expect(pickCrossStaffSlurSide(3, 3)).toBe('above');
  });
});

describe('slurAnchorKind', () => {
  it('anchors at the notehead when it faces the slur side', () => {
    expect(
      slurAnchorKind({
        stemUp: false,
        side: 'above',
        isInnerVoice: false,
        hasStem: true,
      })
    ).toBe('notehead');
    expect(
      slurAnchorKind({
        stemUp: true,
        side: 'below',
        isInnerVoice: false,
        hasStem: true,
      })
    ).toBe('notehead');
  });

  it('anchors past the stem when the stem points toward the slur side', () => {
    expect(
      slurAnchorKind({
        stemUp: true,
        side: 'above',
        isInnerVoice: false,
        hasStem: true,
      })
    ).toBe('beyond-stem');
    expect(
      slurAnchorKind({
        stemUp: false,
        side: 'below',
        isInnerVoice: false,
        hasStem: true,
      })
    ).toBe('beyond-stem');
  });

  it('anchors an inner voice at its stem end', () => {
    expect(
      slurAnchorKind({
        stemUp: false,
        side: 'above',
        isInnerVoice: true,
        hasStem: true,
      })
    ).toBe('stem-end');
  });

  it('anchors at the notehead when there is no stem', () => {
    expect(
      slurAnchorKind({
        stemUp: true,
        side: 'above',
        isInnerVoice: true,
        hasStem: false,
      })
    ).toBe('notehead');
  });
});

describe('cubic slur geometry', () => {
  it('raises both control points toward the chosen side', () => {
    const [c1, c2] = cubicSlurControlPoints(
      { x: 0, y: 100 },
      { x: 90, y: 100 },
      'above',
      [10, 20]
    );
    expect(c1).toEqual({ x: 30, y: 90 });
    expect(c2).toEqual({ x: 60, y: 80 });
  });

  it('samples from one endpoint to the other', () => {
    const points = sampleCubicSlur(
      { x: 0, y: 100 },
      { x: 90, y: 50 },
      'below',
      [10, 10],
      10
    );
    expect(points[0]).toEqual({ x: 0, y: 100 });
    expect(points[10].x).toBeCloseTo(90);
    expect(points[10].y).toBeCloseTo(50);
  });
});

describe('segmentIntersectsRect', () => {
  it('detects crossing, containment and misses', () => {
    const box = rect(10, 10, 20, 20);
    expect(segmentIntersectsRect({ x: 0, y: 15 }, { x: 30, y: 15 }, box)).toBe(
      true
    );
    expect(segmentIntersectsRect({ x: 12, y: 12 }, { x: 14, y: 14 }, box)).toBe(
      true
    );
    expect(segmentIntersectsRect({ x: 0, y: 0 }, { x: 30, y: 5 }, box)).toBe(
      false
    );
  });
});

describe('resolveSlurCurve', () => {
  const options = {
    minHeight: 0,
    floorHeight: 10,
    maxHeight: 200,
    step: 5,
    clearance: 4,
  };

  const clearance = (
    points: { x: number; y: number }[],
    box: ObstacleRect
  ): number =>
    Math.min(
      ...points.map((point) =>
        Math.hypot(
          Math.max(box.left - point.x, 0, point.x - box.right),
          Math.max(box.top - point.y, 0, point.y - box.bottom)
        )
      )
    );

  it('returns the flattest symmetric shape when nothing is in the way', () => {
    const result = resolveSlurCurve(
      { x: 0, y: 100 },
      { x: 300, y: 100 },
      'above',
      [],
      options
    );
    expect(result).toEqual({ controlHeights: [10, 10], collisions: 0 });
  });

  it('rises steeply when it must pass under one obstacle and over another', () => {
    const from = { x: 0, y: 100 };
    const to = { x: 300, y: 100 };
    // Low-left obstacle the curve passes under, high-right one it climbs over.
    const passUnder = rect(30, 40, 50, 75);
    const passOver = rect(240, 60, 260, 99);
    const result = resolveSlurCurve(
      from,
      to,
      'above',
      [passUnder, passOver],
      options
    );

    expect(result.collisions).toBe(0);
    expect(result.controlHeights[1]).toBeGreaterThan(result.controlHeights[0]);
    const points = sampleCubicSlur(
      from,
      to,
      'above',
      result.controlHeights,
      200
    );
    expect(clearance(points, passUnder)).toBeGreaterThan(options.clearance - 1);
    expect(clearance(points, passOver)).toBeGreaterThan(options.clearance - 1);
  });

  it('handles a right-to-left pair', () => {
    const from = { x: 300, y: 100 };
    const to = { x: 0, y: 100 };
    const obstacle = rect(140, 70, 160, 95);
    const result = resolveSlurCurve(from, to, 'above', [obstacle], options);

    expect(result.collisions).toBe(0);
    const points = sampleCubicSlur(
      from,
      to,
      'above',
      result.controlHeights,
      200
    );
    expect(clearance(points, obstacle)).toBeGreaterThan(options.clearance - 1);
  });

  it('reports collisions when boxed in on its side', () => {
    const result = resolveSlurCurve(
      { x: 0, y: 100 },
      { x: 300, y: 100 },
      'above',
      [rect(-10, -500, 310, 95)],
      options
    );
    expect(result.collisions).toBeGreaterThan(0);
  });
});

describe('sliceConvexPolygon', () => {
  it("follows a sloped beam's real outline instead of its bounding box", () => {
    const slices = sliceConvexPolygon(
      [
        { x: 0, y: 0 },
        { x: 30, y: 30 },
        { x: 30, y: 35 },
        { x: 0, y: 5 },
      ],
      3
    );
    expect(slices).toHaveLength(10);
    expect(slices[0]).toEqual({ left: 0, right: 3, top: 0, bottom: 8 });
    expect(slices[9].top).toBeCloseTo(27);
    expect(slices[9].bottom).toBeCloseTo(35);
  });

  it('returns a single rect for a polygon narrower than one slice', () => {
    expect(
      sliceConvexPolygon(
        [
          { x: 0, y: 0 },
          { x: 2, y: 0 },
          { x: 2, y: 4 },
        ],
        3
      )
    ).toEqual([{ left: 0, right: 2, top: 0, bottom: 4 }]);
  });
});

describe('anchorYClearOfRects', () => {
  it('moves a below end past a mark under it, plus clearance', () => {
    expect(
      anchorYClearOfRects({ x: 10, y: 50 }, 'below', [rect(5, 45, 15, 58)], 4)
    ).toBe(62);
  });

  it('moves an above end past a mark over it', () => {
    expect(
      anchorYClearOfRects({ x: 10, y: 50 }, 'above', [rect(5, 40, 15, 55)], 4)
    ).toBe(36);
  });

  it('takes the outermost of several marks', () => {
    expect(
      anchorYClearOfRects(
        { x: 10, y: 50 },
        'below',
        [rect(5, 45, 15, 58), rect(5, 60, 15, 70)],
        4
      )
    ).toBe(74);
  });

  it("ignores marks beside the end's x and marks on the other side", () => {
    expect(
      anchorYClearOfRects(
        { x: 10, y: 50 },
        'below',
        [rect(20, 45, 30, 70), rect(5, 20, 15, 30)],
        4
      )
    ).toBe(50);
  });
});

describe('inflateRect', () => {
  it('grows every side', () => {
    expect(inflateRect(rect(10, 20, 30, 40), 2)).toEqual(rect(8, 18, 32, 42));
  });
});

describe('bulgeHeightEnclosingRects', () => {
  const from = { x: 0, y: 50 };
  const to = { x: 100, y: 50 };

  it('is undefined when the base bulge already passes outside the marks', () => {
    expect(
      bulgeHeightEnclosingRects(
        from,
        to,
        'below',
        9,
        [rect(45, 50, 55, 52)],
        99
      )
    ).toBeUndefined();
  });

  it('deepens a below slur until it passes under a mark between its ends', () => {
    const height = bulgeHeightEnclosingRects(
      from,
      to,
      'below',
      9,
      [rect(45, 55, 55, 70)],
      99
    );
    expect(height).toBeDefined();
    // y = chord + 2t(1−t)·h; at the mark's edges (t = 0.45, 0.55), 70 needs
    // h = 20 / 0.495.
    expect(height).toBeCloseTo(20 / (2 * 0.45 * 0.55), 5);
    expect(
      quadraticCurveYAtX(from, to, 'below', height!, 45)
    ).toBeGreaterThanOrEqual(70 - 1e-9);
  });

  it('raises an above slur over a mark', () => {
    const height = bulgeHeightEnclosingRects(
      from,
      to,
      'above',
      9,
      [rect(45, 30, 55, 45)],
      99
    );
    expect(
      quadraticCurveYAtX(from, to, 'above', height!, 50)
    ).toBeLessThanOrEqual(30 + 1e-9);
  });

  it('never counts the gap between a mark and its note as clear', () => {
    // A mark well under the line between the ends: a shallow arc would pass
    // above it, between it and its note.
    expect(
      bulgeHeightEnclosingRects(
        from,
        to,
        'below',
        9,
        [rect(45, 80, 55, 90)],
        999
      )
    ).toBeGreaterThan(9);
  });

  it('caps the height', () => {
    expect(
      bulgeHeightEnclosingRects(
        from,
        to,
        'below',
        9,
        [rect(45, 80, 55, 900)],
        40
      )
    ).toBe(40);
  });

  it('skips marks outside its x-span', () => {
    expect(
      bulgeHeightEnclosingRects(
        from,
        to,
        'below',
        9,
        [rect(150, 80, 160, 90)],
        99
      )
    ).toBeUndefined();
  });
});

describe('slurSpans', () => {
  it('pairs starts and ends last in, first out, with nesting levels', () => {
    expect(slurSpans(['start', 'start', null, 'end', 'end'])).toEqual([
      { startIndex: 1, endIndex: 3, nestingLevel: 0 },
      { startIndex: 0, endIndex: 4, nestingLevel: 1 },
    ]);
  });

  it('runs an unclosed start to the last entry and an unopened end from the first', () => {
    expect(slurSpans([null, 'end', 'start', null])).toEqual([
      { startIndex: 0, endIndex: 1, nestingLevel: 0 },
      { startIndex: 2, endIndex: 3, nestingLevel: 0 },
    ]);
  });
});

describe('estimatedSlurReachY', () => {
  const constants = {
    noteheadOffsetPx: 9,
    markClearancePx: 4,
    baseBulgePx: 9,
    bulgeStepPx: 11,
  };

  it('is null with no entries', () => {
    expect(
      estimatedSlurReachY({
        entries: [],
        side: 'below',
        nestingLevel: 0,
        ...constants,
      })
    ).toBeNull();
  });

  it('reaches past the lowest head below, adding the arc', () => {
    expect(
      estimatedSlurReachY({
        entries: [
          { headCenterY: 50, markDepthPx: 0 },
          { headCenterY: 60, markDepthPx: 0 },
        ],
        side: 'below',
        nestingLevel: 0,
        ...constants,
      })
    ).toBe(60 + 9 + 9);
  });

  it('reaches past marks that go further than the head offset', () => {
    expect(
      estimatedSlurReachY({
        entries: [{ headCenterY: 50, markDepthPx: 20 }],
        side: 'below',
        nestingLevel: 0,
        ...constants,
      })
    ).toBe(50 + 20 + 4 + 9);
  });

  it('reaches up for a slur above, a step further per nesting level', () => {
    expect(
      estimatedSlurReachY({
        entries: [{ headCenterY: 50, markDepthPx: 0 }],
        side: 'above',
        nestingLevel: 1,
        ...constants,
      })
    ).toBe(50 - 9 - 9 - 11);
  });
});

describe('slurStyleWarning', () => {
  it('is silent for a solid style or a slur start', () => {
    expect(
      slurStyleWarning({ slurStyle: 'solid', slur: null, slurGroup: null })
    ).toBeNull();
    expect(
      slurStyleWarning({ slurStyle: 'dotted', slur: 'start', slurGroup: null })
    ).toBeNull();
    expect(
      slurStyleWarning({ slurStyle: 'dotted', slur: null, slurGroup: 'p' })
    ).toBeNull();
  });

  it('warns when a dotted style sits on an element that starts no slur', () => {
    expect(
      slurStyleWarning({ slurStyle: 'dotted', slur: 'end', slurGroup: null })
    ).toMatch(/starts no slur/);
  });
});

describe('arcObstacleRects', () => {
  it('samples the arc from end to end as rects around points on it', () => {
    const arc = {
      from: { x: 0, y: 50 },
      to: { x: 160, y: 50 },
      side: 'below' as const,
      bulgeHeight: 10,
    };
    const rects = arcObstacleRects(arc, 3);
    expect(rects).toHaveLength(17);
    expect(rects[0]).toEqual(rect(-3, 47, 3, 53));
    expect(rects[16]).toEqual(rect(157, 47, 163, 53));
    // The midpoint sits half the bulge height below the chord.
    expect(rects[8]).toEqual(rect(77, 52, 83, 58));
  });
});

describe('arcEncloses', () => {
  const arc = (fromX: number, toX: number, side: 'above' | 'below') => ({
    from: { x: fromX, y: 0 },
    to: { x: toX, y: 0 },
    side,
    bulgeHeight: 9,
  });

  it('holds for an arc within the x-span on the same side', () => {
    expect(arcEncloses(arc(0, 100, 'below'), arc(20, 80, 'below'))).toBe(true);
  });

  it('fails across sides or past either end', () => {
    expect(arcEncloses(arc(0, 100, 'below'), arc(20, 80, 'above'))).toBe(false);
    expect(arcEncloses(arc(0, 100, 'below'), arc(50, 150, 'below'))).toBe(
      false
    );
  });
});

describe('estimatedSlurReachY with nested slurs', () => {
  it('reaches past the slurs it encloses', () => {
    expect(
      estimatedSlurReachY({
        entries: [{ headCenterY: 50, markDepthPx: 0 }],
        side: 'below',
        nestingLevel: 1,
        noteheadOffsetPx: 9,
        markClearancePx: 4,
        baseBulgePx: 9,
        bulgeStepPx: 11,
        enclosedReachY: 100,
        nestedGapPx: 3,
      })
    ).toBe(103);
  });
});

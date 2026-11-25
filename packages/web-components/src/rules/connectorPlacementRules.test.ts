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
  pickSlurSide,
  pickStemSide,
  quadraticCrossesRect,
  quadraticCurveYAtX,
  resolveEnclosingArc,
  resolveRectClearingBulgeHeight,
  resolveSlurCurve,
  sampleCubicSlur,
  segmentIntersectsRect,
  sliceConvexPolygon,
  slurAnchorKind,
  slurSpans,
  slurStyleWarning,
  untiltedStemEndY,
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
  const options = { minHeight: 0, floorHeight: 10, maxHeight: 200, step: 5 };
  const from = { x: 0, y: 100 };
  const to = { x: 300, y: 100 };

  it('returns the shallowest convex shape when nothing is in the way', () => {
    const { controlHeights, collisions } = resolveSlurCurve(
      from,
      to,
      'above',
      [],
      options
    );
    expect(collisions).toBe(0);
    expect(Math.max(...controlHeights)).toBe(10);
    expect(Math.min(...controlHeights)).toBeGreaterThanOrEqual(5);
  });

  it('rises past an obstacle, in either direction', () => {
    const obstacle = rect(140, 70, 160, 95);
    for (const [start, end] of [
      [from, to],
      [to, from],
    ]) {
      const { controlHeights, collisions } = resolveSlurCurve(
        start,
        end,
        'above',
        [obstacle],
        options
      );
      expect(collisions).toBe(0);
      expect(Math.max(...controlHeights)).toBeGreaterThan(30);
    }
  });

  it('reports collisions when boxed in on its side', () => {
    const result = resolveSlurCurve(
      from,
      to,
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

const entryAt = (
  headCenterY: number,
  markDepthPx: number,
  index = 0,
  inkDepthPx = 4,
  stemDepthPx = 0
) => ({ headCenterY, markDepthPx, inkDepthPx, stemDepthPx, index });

const slurReachConstants = {
  noteheadOffsetPx: 9,
  markClearancePx: 4,
  noteClearancePx: 3,
  stemClearancePx: 12,
  baseBulgePx: 9,
  bulgeStepPx: 11,
  maxExtraBulgePx: 66,
};

describe('estimatedSlurReachY', () => {
  const constants = slurReachConstants;

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
        entries: [entryAt(50, 0), entryAt(60, 0, 1)],
        side: 'below',
        nestingLevel: 0,
        ...constants,
      })
    ).toBe(60 + 9 + 9);
  });

  it('reaches past marks that go further than the head offset', () => {
    expect(
      estimatedSlurReachY({
        entries: [entryAt(50, 20)],
        side: 'below',
        nestingLevel: 0,
        ...constants,
      })
    ).toBe(50 + 20 + 4 + 9);
  });

  it('reaches up for a slur above, a step further per nesting level', () => {
    expect(
      estimatedSlurReachY({
        entries: [entryAt(50, 0)],
        side: 'above',
        nestingLevel: 1,
        ...constants,
      })
    ).toBe(50 - 9 - 9 - 11);
  });
});

describe('estimatedSlurReachY over the notes inside it', () => {
  const reach = (entries: ReturnType<typeof entryAt>[]) =>
    estimatedSlurReachY({
      entries,
      side: 'below',
      nestingLevel: 0,
      ...slurReachConstants,
    }) as number;

  it('counts the arc a low inner note beside an end needs', () => {
    const withLowNoteAt = (low: number) =>
      [0, 1, 2, 3, 4, 5, 6].map((index) =>
        entryAt(index === low ? 80 : 50, 0, index)
      );
    expect(reach(withLowNoteAt(1))).toBeGreaterThan(reach(withLowNoteAt(3)));
  });

  it('clears a stem on its side, at an end and inside', () => {
    const entries = (stemDepthPx: number, at: number) =>
      [0, 1, 2].map((index) =>
        entryAt(50, 0, index, 4, index === at ? stemDepthPx : 0)
      );
    expect(reach(entries(35, 0))).toBeGreaterThanOrEqual(50 + 35);
    expect(reach(entries(35, 1))).toBeGreaterThanOrEqual(50 + 35);
  });

  it('counts an inner accidental that reaches past its head', () => {
    const entries = (inkDepthPx: number) => [
      entryAt(50, 0, 0),
      entryAt(60, 0, 1, inkDepthPx),
      entryAt(50, 0, 2),
    ];
    expect(reach(entries(40))).toBeGreaterThan(reach(entries(4)));
  });
});

describe('pickSlurSide', () => {
  const up = { stemUp: true, beamed: false };
  const down = { stemUp: false, beamed: false };
  const upBeamed = { stemUp: true, beamed: true };
  const downBeamed = { stemUp: false, beamed: true };

  it('goes opposite stems that all agree', () => {
    expect(pickSlurSide([up, upBeamed, up], false)).toBe('below');
    expect(pickSlurSide([down, downBeamed], false)).toBe('above');
  });

  it('goes above mixed stems, whichever note comes first', () => {
    expect(pickSlurSide([up, down, up], false)).toBe('above');
    expect(pickSlurSide([down, up], false)).toBe('above');
    expect(pickSlurSide([up, upBeamed, upBeamed, down, up], false)).toBe(
      'above'
    );
  });

  it('goes below when a beam is above either end', () => {
    expect(pickSlurSide([down, upBeamed, upBeamed], false)).toBe('below');
    expect(pickSlurSide([upBeamed, upBeamed, down], false)).toBe('below');
  });

  it('stays above when a beam or a slur inside it is in the way below', () => {
    expect(pickSlurSide([downBeamed, downBeamed, up, upBeamed], false)).toBe(
      'above'
    );
    expect(pickSlurSide([upBeamed, upBeamed, down], true)).toBe('above');
  });
});

describe('untiltedStemEndY', () => {
  it('drops a stem end level with a higher head at the other end', () => {
    expect(untiltedStemEndY(20, 60, 40, 'above')).toBe(40);
    expect(untiltedStemEndY(80, 40, 60, 'below')).toBe(60);
  });

  it('leaves an end that already tilts with the pitches', () => {
    expect(untiltedStemEndY(50, 60, 40, 'above')).toBe(50);
    expect(untiltedStemEndY(10, 30, 40, 'above')).toBe(10);
  });
});

describe('resolveEnclosingArc', () => {
  const from = { x: 0, y: 0 };
  const to = { x: 400, y: 0 };

  it('is undefined when the plain arc clears', () => {
    expect(resolveEnclosingArc(from, to, 'below', 20, [], 75)).toBeUndefined();
  });

  it('deepens the quadratic up to the limit', () => {
    const arc = resolveEnclosingArc(
      from,
      to,
      'below',
      9,
      [{ left: 190, right: 210, top: 0, bottom: 30 }],
      75
    );
    expect(arc?.controlHeights).toBeUndefined();
    expect(arc?.bulgeHeight).toBeGreaterThan(9);
    expect(arc?.bulgeHeight).toBeLessThanOrEqual(75);
  });

  it('turns to a convex cubic, shallower than the quadratic would be, past it', () => {
    const rect = { left: 45, right: 55, top: 0, bottom: 30 };
    const arc = resolveEnclosingArc(from, to, 'below', 9, [rect], 75);
    const [near, far] = arc?.controlHeights as readonly [number, number];
    expect(near).toBeGreaterThan(far);
    expect(near).toBeLessThanOrEqual(2 * far);
    const points = sampleCubicSlur(from, to, 'below', [near, far], 100);
    for (const { x, y } of points) {
      if (x >= rect.left && x <= rect.right) {
        expect(y).toBeGreaterThanOrEqual(rect.bottom);
      }
    }
    const quadratic = bulgeHeightEnclosingRects(
      from,
      to,
      'below',
      9,
      [rect],
      Infinity
    ) as number;
    expect(Math.max(...points.map(({ y }) => y))).toBeLessThan(quadratic / 2);
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

  it('follows a cubic arc', () => {
    const rects = arcObstacleRects(
      {
        from: { x: 0, y: 50 },
        to: { x: 160, y: 50 },
        side: 'below',
        bulgeHeight: 10,
        controlHeights: [80, 40],
      },
      3
    );
    // Midway, 3/8 of each control height below the chord.
    expect(rects[8]).toEqual(rect(77, 92, 83, 98));
    expect(rects[4].bottom).toBeGreaterThan(rects[12].bottom);
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
        entries: [entryAt(50, 0)],
        side: 'below',
        nestingLevel: 1,
        ...slurReachConstants,
        enclosedReachY: 100,
        nestedGapPx: 3,
      })
    ).toBe(103);
  });
});

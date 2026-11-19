/**
 * @jest-environment jsdom
 */
import type { ArticulationType } from '../../types/theory';
import {
  articulationStackDepth,
  createArticulationMarks,
} from './articulations';

const ANCHOR_Y = 1000;

// Distance from the anchor, toward the notehead, of a lone stem-anchored
// fermata's ink edge nearest the anchor.
function fermataNearInkOffset(stemUp: boolean): number {
  const group = createArticulationMarks({
    articulation: 'fermata',
    stemUp,
    noteHeadCenterX: 300,
    noteHeadCenterY: 0,
    stemAnchor: { x: 400, y: ANCHOR_Y },
  });
  const arc = group?.querySelector('.fermata path');
  const [, , cyText] = arc?.getAttribute('d')?.split(/[ ,]/) ?? [];
  const cy = Number(cyText);
  const radius = 100;
  const halfStroke = 8;
  const stackDir = stemUp ? 1 : -1;
  // A stem-anchored dome bulges back toward the anchor.
  return stackDir * (cy - ANCHOR_Y) - radius - halfStroke;
}

function centerOffsets(
  articulation: ArticulationType,
  stemAnchored: boolean
): number[] {
  const group = createArticulationMarks({
    articulation,
    stemUp: true,
    noteHeadCenterX: 300,
    noteHeadCenterY: 0,
    stemAnchor: stemAnchored ? { x: 400, y: ANCHOR_Y } : null,
  });
  return Array.from(group?.children ?? []).map((mark) => {
    // An accent's middle polyline point sits on its center line.
    const accentMiddleY = mark
      .getAttribute('points')
      ?.split(' ')[1]
      ?.split(',')[1];
    const cy =
      mark.getAttribute('cy') ??
      mark.getAttribute('y1') ??
      accentMiddleY ??
      mark.querySelector('path')?.getAttribute('d')?.split(/[ ,]/)[2] ??
      null;
    return Number(cy) - (stemAnchored ? ANCHOR_Y : 0);
  });
}

describe('createArticulationMarks — stem-anchored', () => {
  it.each([true, false])(
    "keeps a fermata's dome clear of the beam surface (stemUp=%s)",
    (stemUp) => {
      expect(fermataNearInkOffset(stemUp)).toBeGreaterThan(0);
    }
  );

  it('keeps the staccato at its stem-anchored offset', () => {
    expect(centerOffsets('staccato', true)).toEqual([70]);
  });

  it("spreads an accent and fermata so the fermata's dome clears the accent", () => {
    const [accentCenter, fermataCenter] = centerOffsets('accent-fermata', true);
    const accentFarEdge = accentCenter + 52;
    const fermataNearEdge = fermataCenter - 108;
    expect(fermataNearEdge).toBeGreaterThan(accentFarEdge);
  });
});

describe('createArticulationMarks — notehead-anchored', () => {
  it('keeps the fixed spacing for ordinary marks', () => {
    expect(centerOffsets('portato', false)).toEqual([150, 300]);
  });
});

describe('repeated length marks', () => {
  const marks = (
    articulation: ArticulationType,
    repeatCount: number,
    stemAnchor: { x: number; y: number } | null = null
  ) =>
    createArticulationMarks({
      articulation,
      stemUp: true,
      noteHeadCenterX: 300,
      noteHeadCenterY: 0,
      stemAnchor,
      repeatCount,
    });

  it('draws the length mark once per repetition, centred on the head', () => {
    const dots = Array.from(
      marks('staccato', 4)?.querySelectorAll('.staccato') ?? []
    );
    expect(dots).toHaveLength(4);
    const xs = dots.map((dot) => Number(dot.getAttribute('cx')));
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(300);
    expect(new Set(dots.map((dot) => dot.getAttribute('cy'))).size).toBe(1);
  });

  it('keeps each portato dot under its line', () => {
    const group = marks('portato', 3);
    const dotXs = Array.from(group?.querySelectorAll('.staccato') ?? []).map(
      (dot) => Number(dot.getAttribute('cx'))
    );
    const lineXs = Array.from(group?.querySelectorAll('.tenuto') ?? []).map(
      (line) =>
        (Number(line.getAttribute('x1')) + Number(line.getAttribute('x2'))) / 2
    );
    expect(dotXs).toHaveLength(3);
    dotXs.forEach((x, i) => expect(x).toBeCloseTo(lineXs[i]));
  });

  it('draws an accent once', () => {
    const group = marks('accent-staccato', 4);
    expect(group?.querySelectorAll('.staccato')).toHaveLength(4);
    expect(group?.querySelectorAll('.accent')).toHaveLength(1);
  });

  it('keeps a stem-anchored mark single', () => {
    expect(
      marks('staccato', 4, { x: 400, y: ANCHOR_Y })?.querySelectorAll(
        '.staccato'
      )
    ).toHaveLength(1);
  });
});

describe('articulationStackDepth', () => {
  it('is 0 without marks', () => {
    expect(articulationStackDepth(null, null)).toBe(0);
  });

  it('reaches as far as the outermost mark', () => {
    const group = createArticulationMarks({
      articulation: 'accent-staccato',
      stemUp: true,
      noteHeadCenterX: 300,
      noteHeadCenterY: 0,
    });
    const accentPoints = (
      group?.querySelector('.accent')?.getAttribute('points') ?? ''
    )
      .split(' ')
      .map((point) => Number(point.split(',')[1]));
    expect(articulationStackDepth('accent-staccato', null)).toBeGreaterThan(
      Math.max(...accentPoints)
    );
    expect(articulationStackDepth('accent-staccato', null)).toBeGreaterThan(
      articulationStackDepth('staccato', null)
    );
  });
});

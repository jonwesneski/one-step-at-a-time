/**
 * @jest-environment jsdom
 */
import type { ArticulationType } from '../../types/theory';
import { createArticulationMarks } from './articulations';

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

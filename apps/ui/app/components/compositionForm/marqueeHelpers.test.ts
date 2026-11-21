import { describe, expect, it } from 'vitest';
import {
  AUTO_SCROLL_EDGE_PX,
  AUTO_SCROLL_MAX_PX,
  MARQUEE_IGNORE_ATTRIBUTE,
  autoScrollDelta,
  pageToClientRect,
  rectFromPoints,
  shouldArmMarquee,
} from './marqueeHelpers';

function box(r: DOMRect) {
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

describe('rectFromPoints', () => {
  it('normalizes a drag in any direction', () => {
    const expected = { x: 10, y: 20, width: 30, height: 40 };
    expect(box(rectFromPoints({ x: 10, y: 20 }, { x: 40, y: 60 }))).toEqual(
      expected
    );
    expect(box(rectFromPoints({ x: 40, y: 60 }, { x: 10, y: 20 }))).toEqual(
      expected
    );
    expect(box(rectFromPoints({ x: 40, y: 20 }, { x: 10, y: 60 }))).toEqual(
      expected
    );
  });

  it('gives a zero-size rect for a single point', () => {
    expect(box(rectFromPoints({ x: 5, y: 5 }, { x: 5, y: 5 }))).toEqual({
      x: 5,
      y: 5,
      width: 0,
      height: 0,
    });
  });
});

describe('pageToClientRect', () => {
  it('subtracts the scroll offset and keeps the size', () => {
    const page = new DOMRect(100, 900, 50, 60);
    expect(box(pageToClientRect(page, { x: 20, y: 800 }))).toEqual({
      x: 80,
      y: 100,
      width: 50,
      height: 60,
    });
  });
});

describe('autoScrollDelta', () => {
  const viewport = 1000;

  it('is zero away from the edges', () => {
    expect(autoScrollDelta(AUTO_SCROLL_EDGE_PX, viewport)).toBe(0);
    expect(autoScrollDelta(500, viewport)).toBe(0);
    expect(autoScrollDelta(viewport - AUTO_SCROLL_EDGE_PX, viewport)).toBe(0);
  });

  it('scrolls up near the top and down near the bottom', () => {
    expect(autoScrollDelta(AUTO_SCROLL_EDGE_PX - 1, viewport)).toBeLessThan(0);
    expect(
      autoScrollDelta(viewport - AUTO_SCROLL_EDGE_PX + 1, viewport)
    ).toBeGreaterThan(0);
  });

  it('speeds up deeper into the band', () => {
    const shallow = autoScrollDelta(
      viewport - AUTO_SCROLL_EDGE_PX + AUTO_SCROLL_EDGE_PX / 4,
      viewport
    );
    const deep = autoScrollDelta(viewport - 1, viewport);
    expect(deep).toBeGreaterThan(shallow);
  });

  it('caps the speed, even past the viewport edge', () => {
    expect(autoScrollDelta(0, viewport)).toBe(-AUTO_SCROLL_MAX_PX);
    expect(autoScrollDelta(-500, viewport)).toBe(-AUTO_SCROLL_MAX_PX);
    expect(autoScrollDelta(viewport + 500, viewport)).toBe(AUTO_SCROLL_MAX_PX);
  });
});

describe('shouldArmMarquee', () => {
  it('arms on plain elements', () => {
    const div = document.createElement('div');
    expect(shouldArmMarquee(div)).toBe(true);
  });

  it('does not arm on form controls or their descendants', () => {
    const button = document.createElement('button');
    const span = document.createElement('span');
    button.appendChild(span);
    expect(shouldArmMarquee(button)).toBe(false);
    expect(shouldArmMarquee(span)).toBe(false);
    expect(shouldArmMarquee(document.createElement('select'))).toBe(false);
  });

  it('does not arm inside an ignored region', () => {
    const panel = document.createElement('div');
    panel.setAttribute(MARQUEE_IGNORE_ATTRIBUTE, '');
    const child = document.createElement('div');
    panel.appendChild(child);
    expect(shouldArmMarquee(child)).toBe(false);
  });

  it('does not arm without an element target', () => {
    expect(shouldArmMarquee(null)).toBe(false);
  });
});

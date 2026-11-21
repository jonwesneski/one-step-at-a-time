export const LONG_PRESS_MS = 400;
export const LONG_PRESS_JITTER_PX = 8;
/** Height of the band at the viewport's top/bottom edge that auto-scrolls. */
export const AUTO_SCROLL_EDGE_PX = 48;
/** Per-frame scroll at the very edge; ~1200px/s at 60fps. */
export const AUTO_SCROLL_MAX_PX = 20;

export const MARQUEE_IGNORE_ATTRIBUTE = 'data-marquee-ignore';

export type Point = { x: number; y: number };

export function rectFromPoints(a: Point, b: Point): DOMRect {
  return new DOMRect(
    Math.min(a.x, b.x),
    Math.min(a.y, b.y),
    Math.abs(b.x - a.x),
    Math.abs(b.y - a.y)
  );
}

export function pageToClientRect(rect: DOMRect, scroll: Point): DOMRect {
  return new DOMRect(
    rect.x - scroll.x,
    rect.y - scroll.y,
    rect.width,
    rect.height
  );
}

// Negative scrolls up, positive scrolls down; speed grows with how deep the
// pointer is into the edge band, including past the viewport edge.
export function autoScrollDelta(
  clientY: number,
  viewportHeight: number
): number {
  const fromTop = AUTO_SCROLL_EDGE_PX - clientY;
  if (fromTop > 0) {
    return -Math.min(
      AUTO_SCROLL_MAX_PX,
      Math.ceil((fromTop / AUTO_SCROLL_EDGE_PX) * AUTO_SCROLL_MAX_PX)
    );
  }
  const fromBottom = clientY - (viewportHeight - AUTO_SCROLL_EDGE_PX);
  if (fromBottom > 0) {
    return Math.min(
      AUTO_SCROLL_MAX_PX,
      Math.ceil((fromBottom / AUTO_SCROLL_EDGE_PX) * AUTO_SCROLL_MAX_PX)
    );
  }
  return 0;
}

export function shouldArmMarquee(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return !target.closest(
    `button, select, input, textarea, [contenteditable="true"], [${MARQUEE_IGNORE_ATTRIBUTE}]`
  );
}

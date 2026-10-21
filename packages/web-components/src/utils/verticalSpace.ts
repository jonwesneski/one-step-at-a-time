import {
  maxVerticalBand,
  VerticalBand,
  VerticalExtent,
} from '../rules/verticalSpaceRules';

/**
 * Screen-space vertical extent of every element matching `selector` in
 * `container`, anchored at the start of a path (or the element's centre when
 * it has no path geometry).
 */
export const measureVerticalExtents = (
  container: ParentNode,
  selector: string
): VerticalExtent[] =>
  Array.from(container.querySelectorAll<SVGGraphicsElement>(selector)).flatMap(
    (element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        return [];
      }
      let anchorY = rect.top + rect.height / 2;
      const path = element as SVGPathElement;
      const matrix =
        typeof path.getScreenCTM === 'function' ? path.getScreenCTM() : null;
      if (matrix !== null && typeof path.getPointAtLength === 'function') {
        const start = path.getPointAtLength(0);
        anchorY = new DOMPoint(start.x, start.y).matrixTransform(matrix).y;
      }
      return [{ anchorY, top: rect.top, bottom: rect.bottom }];
    }
  );

/**
 * Sole owner of a host's vertical margin. Independent sources each reserve the
 * space their current content needs; the largest per side becomes the margin.
 * A source's reservation replaces its previous one, so the margin always
 * reflects current content, never a past maximum.
 */
export class VerticalSpaceReservations {
  readonly #host: HTMLElement;
  readonly #bySource = new Map<string, VerticalBand>();

  constructor(host: HTMLElement) {
    this.#host = host;
  }

  /** Returns whether the host's margin changed. A zero band releases `source`. */
  reserve(source: string, space: VerticalBand): boolean {
    if (space.top > 0 || space.bottom > 0) {
      this.#bySource.set(source, { top: space.top, bottom: space.bottom });
    } else {
      this.#bySource.delete(source);
    }
    return this.#applyMargin();
  }

  release(source: string): boolean {
    return this.reserve(source, { top: 0, bottom: 0 });
  }

  #applyMargin(): boolean {
    const margin = maxVerticalBand(this.#bySource.values());
    const top = margin.top > 0 ? `${margin.top}px` : '';
    const bottom = margin.bottom > 0 ? `${margin.bottom}px` : '';
    const style = this.#host.style;
    if (style.marginTop === top && style.marginBottom === bottom) {
      return false;
    }
    style.marginTop = top;
    style.marginBottom = bottom;
    return true;
  }
}

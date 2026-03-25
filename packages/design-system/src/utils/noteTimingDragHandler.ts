type DragState = {
  sourceIndex: number;
  sourceElement: HTMLElement;
  clone: HTMLElement;
  offsetX: number;
  offsetY: number;
  currentDropIndex: number;
};

export type NoteTimingChangeDetail = {
  fromIndex: number;
  toIndex: number;
};

/**
 * Handles drag-and-drop reordering of note/chord elements within a staff.
 *
 * Designed for the self-rendering architecture where each <music-note> and
 * <music-chord> renders its own SVG in its shadow DOM, positioned absolutely
 * via inline styles by the parent staff.
 *
 * On drop the handler either reorders the light DOM (unmanaged) or only
 * dispatches a `note-reorder` event (managed) so a framework can update state.
 */
export class NoteTimingDragHandler {
  #hostElement: HTMLElement;
  #wrapperElement: HTMLElement;
  #getSlottedElements: () => HTMLElement[];
  #managed: boolean;
  #dragState: DragState | null = null;
  #dropIndicator: HTMLDivElement;
  #bound: {
    pointerdown: (e: PointerEvent) => void;
    pointermove: (e: PointerEvent) => void;
    pointerup: (e: PointerEvent) => void;
    pointercancel: (e: PointerEvent) => void;
    keydown: (e: KeyboardEvent) => void;
  };

  constructor(
    hostElement: HTMLElement,
    wrapperElement: HTMLElement,
    getSlottedElements: () => HTMLElement[],
    managed = false
  ) {
    this.#hostElement = hostElement;
    this.#wrapperElement = wrapperElement;
    this.#getSlottedElements = getSlottedElements;
    this.#managed = managed;

    this.#dropIndicator = document.createElement('div');
    this.#dropIndicator.style.cssText = `
      position: absolute;
      top: 25px;
      height: 50px;
      width: 0;
      border-left: 2px dashed var(--drop-indicator-color, #4a90d9);
      display: none;
      pointer-events: none;
      z-index: 1;
    `;

    this.#bound = {
      pointerdown: this.#onPointerDown.bind(this),
      pointermove: this.#onPointerMove.bind(this),
      pointerup: this.#onPointerUp.bind(this),
      pointercancel: this.#onPointerCancel.bind(this),
      keydown: this.#onKeyDown.bind(this),
    };
  }

  attach(): void {
    this.#hostElement.addEventListener('pointerdown', this.#bound.pointerdown);
  }

  detach(): void {
    this.cancelDrag();
    this.#hostElement.removeEventListener(
      'pointerdown',
      this.#bound.pointerdown
    );
  }

  cancelDrag(): void {
    if (!this.#dragState) return;
    this.#cleanup();
  }

  #onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;

    const elements = this.#getSlottedElements();
    if (elements.length <= 1) return;

    const target = this.#findSlottedElement(e.target as Element, elements);
    if (!target) return;

    const sourceIndex = elements.indexOf(target);
    if (sourceIndex === -1) return;

    // Dispatch cancelable event
    const dragStartEvent = new CustomEvent('note-drag-start', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: { element: target, index: sourceIndex },
    });
    if (!this.#hostElement.dispatchEvent(dragStartEvent)) return;

    e.preventDefault();

    // Create visual clone
    const rect = target.getBoundingClientRect();
    const clone = this.#createClone(target);
    document.body.appendChild(clone);

    // Dim original
    target.style.opacity = '0.3';

    // Prepare drop indicator
    this.#wrapperElement.appendChild(this.#dropIndicator);
    this.#dropIndicator.style.display = 'none';

    this.#dragState = {
      sourceIndex,
      sourceElement: target,
      clone,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      currentDropIndex: sourceIndex,
    };

    this.#hostElement.setPointerCapture(e.pointerId);
    this.#hostElement.addEventListener('pointermove', this.#bound.pointermove);
    this.#hostElement.addEventListener('pointerup', this.#bound.pointerup);
    this.#hostElement.addEventListener(
      'pointercancel',
      this.#bound.pointercancel
    );
    document.addEventListener('keydown', this.#bound.keydown);
  }

  #onPointerMove(e: PointerEvent) {
    if (!this.#dragState) return;

    const { clone, offsetX, offsetY } = this.#dragState;

    // Move clone to follow pointer
    clone.style.left = `${e.clientX - offsetX}px`;
    clone.style.top = `${e.clientY - offsetY}px`;

    // Compute drop index in wrapper-relative coordinates
    const wrapperRect = this.#wrapperElement.getBoundingClientRect();
    const pointerXInWrapper = e.clientX - wrapperRect.left;
    const dropIndex = this.#computeDropIndex(pointerXInWrapper);
    this.#dragState.currentDropIndex = dropIndex;

    this.#updateDropIndicator(dropIndex);
  }

  #onPointerUp() {
    if (!this.#dragState) return;

    const { sourceIndex, currentDropIndex } = this.#dragState;

    this.#cleanup();

    if (
      sourceIndex !== currentDropIndex &&
      currentDropIndex !== sourceIndex + 1
    ) {
      if (!this.#managed) {
        this.#reorderLightDom(sourceIndex, currentDropIndex);
      }

      this.#hostElement.dispatchEvent(
        new CustomEvent('note-reorder', {
          bubbles: true,
          composed: true,
          detail: {
            fromIndex: sourceIndex,
            toIndex: currentDropIndex,
          } satisfies NoteTimingChangeDetail,
        })
      );
    }

    this.#hostElement.dispatchEvent(
      new CustomEvent('note-drag-end', {
        bubbles: true,
        composed: true,
        detail: { fromIndex: sourceIndex, toIndex: currentDropIndex },
      })
    );
  }

  #onPointerCancel() {
    this.cancelDrag();
  }

  #onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.cancelDrag();
    }
  }

  #cleanup() {
    if (!this.#dragState) return;

    // Restore original opacity
    this.#dragState.sourceElement.style.opacity = '';

    // Remove clone
    this.#dragState.clone.remove();

    // Hide drop indicator
    this.#dropIndicator.style.display = 'none';
    this.#dropIndicator.remove();

    // Remove event listeners
    this.#hostElement.removeEventListener(
      'pointermove',
      this.#bound.pointermove
    );
    this.#hostElement.removeEventListener('pointerup', this.#bound.pointerup);
    this.#hostElement.removeEventListener(
      'pointercancel',
      this.#bound.pointercancel
    );
    document.removeEventListener('keydown', this.#bound.keydown);

    this.#dragState = null;
  }

  /**
   * Walk up from the event target to find the slotted music-note or
   * music-chord element that was clicked.
   */
  #findSlottedElement(
    target: Element,
    elements: HTMLElement[]
  ): HTMLElement | null {
    let current: Element | null = target;
    while (current && current !== this.#hostElement) {
      if (elements.includes(current as HTMLElement)) {
        return current as HTMLElement;
      }
      // Cross shadow DOM boundaries when walking up
      current =
        current.parentElement ??
        (current.getRootNode() as ShadowRoot).host ??
        null;
    }
    return null;
  }

  #createClone(element: HTMLElement): HTMLElement {
    const rect = element.getBoundingClientRect();
    const clone = document.createElement('div');
    clone.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      pointer-events: none;
      opacity: 0.7;
      z-index: 10000;
      cursor: grabbing;
    `;

    // Copy the rendered SVG from the element's shadow DOM
    const svg = element.shadowRoot?.querySelector('svg');
    if (svg) {
      const svgClone = svg.cloneNode(true) as SVGElement;
      svgClone.style.overflow = 'visible';
      clone.appendChild(svgClone);
    }

    return clone;
  }

  #computeDropIndex(pointerXInWrapper: number): number {
    const elements = this.#getSlottedElements();

    for (let i = 0; i < elements.length; i++) {
      const left = parseFloat(elements[i].style.left) || 0;
      const width = elements[i].getBoundingClientRect().width || 32;
      const midpoint = left + width / 2;
      if (pointerXInWrapper < midpoint) return i;
    }

    return elements.length;
  }

  #updateDropIndicator(dropIndex: number) {
    const elements = this.#getSlottedElements();

    // Don't show indicator at the source position (no-op drop)
    if (
      this.#dragState &&
      (dropIndex === this.#dragState.sourceIndex ||
        dropIndex === this.#dragState.sourceIndex + 1)
    ) {
      this.#dropIndicator.style.display = 'none';
      return;
    }

    let indicatorX: number;
    if (dropIndex === 0) {
      indicatorX = parseFloat(elements[0].style.left) - 4;
    } else if (dropIndex >= elements.length) {
      const last = elements[elements.length - 1];
      const lastLeft = parseFloat(last.style.left) || 0;
      const lastWidth = last.getBoundingClientRect().width || 32;
      indicatorX = lastLeft + lastWidth + 4;
    } else {
      const before = elements[dropIndex - 1];
      const after = elements[dropIndex];
      const beforeRight =
        (parseFloat(before.style.left) || 0) +
        (before.getBoundingClientRect().width || 32);
      const afterLeft = parseFloat(after.style.left) || 0;
      indicatorX = (beforeRight + afterLeft) / 2;
    }

    this.#dropIndicator.style.left = `${indicatorX}px`;
    this.#dropIndicator.style.display = '';
  }

  #reorderLightDom(fromIndex: number, toIndex: number) {
    const elements = this.#getSlottedElements();
    const dragged = elements[fromIndex];
    if (!dragged) return;

    const parent = dragged.parentElement;
    if (!parent) return;

    const adjustedToIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
    const remaining = elements.filter((_, i) => i !== fromIndex);

    if (adjustedToIndex >= remaining.length) {
      remaining[remaining.length - 1].after(dragged);
    } else {
      parent.insertBefore(dragged, remaining[adjustedToIndex]);
    }
  }
}

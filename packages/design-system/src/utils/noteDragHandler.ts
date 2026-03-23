import { SVG_NS } from './consts';

type DragState = {
  sourceIndex: number;
  sourceElement: Element; // light DOM <music-note> or <music-chord>
  sourceSvg: SVGElement; // rendered SVG being dragged
  clone: SVGElement;
  startX: number;
  currentDropIndex: number;
};

/**
 * Handles drag-and-drop reordering of note/chord SVGs within a staff's
 * `#notesContainer`. On drop, reorders the corresponding light DOM elements
 * which triggers `slotchange` → re-render.
 */
export class NoteDragHandler {
  #notesContainer: SVGSVGElement;
  #hostElement: HTMLElement;
  #getSlottedElements: () => Element[];
  #managed: boolean;
  #dragState: DragState | null = null;
  #dropIndicator: SVGLineElement;
  #bound: {
    pointerdown: (e: PointerEvent) => void;
    pointermove: (e: PointerEvent) => void;
    pointerup: (e: PointerEvent) => void;
    pointercancel: (e: PointerEvent) => void;
    keydown: (e: KeyboardEvent) => void;
  };

  constructor(
    notesContainer: SVGSVGElement,
    hostElement: HTMLElement,
    getSlottedElements: () => Element[],
    managed = false
  ) {
    this.#notesContainer = notesContainer;
    this.#hostElement = hostElement;
    this.#getSlottedElements = getSlottedElements;
    this.#managed = managed;

    this.#dropIndicator = document.createElementNS(SVG_NS, 'line');
    this.#dropIndicator.setAttribute(
      'stroke',
      'var(--drop-indicator-color, #4a90d9)'
    );
    this.#dropIndicator.setAttribute('stroke-width', '2');
    this.#dropIndicator.setAttribute('stroke-dasharray', '4,3');
    this.#dropIndicator.setAttribute('y1', '25');
    this.#dropIndicator.setAttribute('y2', '75');
    this.#dropIndicator.style.display = 'none';

    this.#bound = {
      pointerdown: this.#onPointerDown.bind(this),
      pointermove: this.#onPointerMove.bind(this),
      pointerup: this.#onPointerUp.bind(this),
      pointercancel: this.#onPointerCancel.bind(this),
      keydown: this.#onKeyDown.bind(this),
    };
  }

  attach(): void {
    this.#notesContainer.style.pointerEvents = 'auto';
    this.#notesContainer.style.cursor = 'grab';
    this.#notesContainer.addEventListener(
      'pointerdown',
      this.#bound.pointerdown
    );
  }

  detach(): void {
    this.cancelDrag();
    this.#notesContainer.style.pointerEvents = '';
    this.#notesContainer.style.cursor = '';
    this.#notesContainer.removeEventListener(
      'pointerdown',
      this.#bound.pointerdown
    );
  }

  cancelDrag(): void {
    if (!this.#dragState) return;
    this.#cleanup();
  }

  #onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return; // left click only

    const target = (e.target as Element).closest?.('[data-slot-index]');
    if (!target) return;

    const slotIndex = parseInt(
      (target as SVGElement).dataset.slotIndex ?? '',
      10
    );
    if (isNaN(slotIndex)) return;

    const elements = this.#getSlottedElements();
    if (elements.length <= 1) return; // nothing to reorder

    const sourceElement = elements[slotIndex];
    if (!sourceElement) return;

    // Dispatch cancelable event
    const dragStartEvent = new CustomEvent('note-drag-start', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: { element: sourceElement, index: slotIndex },
    });
    if (!this.#hostElement.dispatchEvent(dragStartEvent)) return;

    e.preventDefault();

    // Create clone for drag visual
    const sourceSvg = target as SVGElement;
    const clone = sourceSvg.cloneNode(true) as SVGElement;
    delete clone.dataset.slotIndex; // exclude clone from drop index queries
    clone.style.pointerEvents = 'none';
    clone.style.opacity = '0.7';
    this.#notesContainer.appendChild(clone);

    // Dim original
    sourceSvg.style.opacity = '0.3';

    // Add drop indicator
    this.#notesContainer.appendChild(this.#dropIndicator);
    this.#dropIndicator.style.display = 'none';

    this.#dragState = {
      sourceIndex: slotIndex,
      sourceElement,
      sourceSvg,
      clone,
      startX: e.clientX,
      currentDropIndex: slotIndex,
    };

    this.#notesContainer.setPointerCapture(e.pointerId);
    this.#notesContainer.addEventListener(
      'pointermove',
      this.#bound.pointermove
    );
    this.#notesContainer.addEventListener('pointerup', this.#bound.pointerup);
    this.#notesContainer.addEventListener(
      'pointercancel',
      this.#bound.pointercancel
    );
    document.addEventListener('keydown', this.#bound.keydown);

    this.#notesContainer.style.cursor = 'grabbing';
  }

  #onPointerMove(e: PointerEvent) {
    if (!this.#dragState) return;

    const svgPoint = this.#clientToNotesContainerCoords(e.clientX, e.clientY);
    if (!svgPoint) return;

    // Move clone to follow pointer
    const origX = parseFloat(
      this.#dragState.sourceSvg.getAttribute('x') ?? '0'
    );
    const deltaX =
      svgPoint.x - this.#clientToNotesContainerX(this.#dragState.startX);
    this.#dragState.clone.setAttribute('x', (origX + deltaX).toString());

    // Compute drop index
    const dropIndex = this.#computeDropIndex(svgPoint.x);
    this.#dragState.currentDropIndex = dropIndex;

    // Update drop indicator
    this.#updateDropIndicator(dropIndex);
  }

  #onPointerUp(e: PointerEvent) {
    if (!this.#dragState) return;

    const { sourceIndex, currentDropIndex } = this.#dragState;

    this.#cleanup();

    if (sourceIndex !== currentDropIndex) {
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
          },
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

  #onPointerCancel(_e: PointerEvent) {
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
    this.#dragState.sourceSvg.style.opacity = '';

    // Remove clone
    this.#dragState.clone.remove();

    // Hide drop indicator
    this.#dropIndicator.style.display = 'none';
    this.#dropIndicator.remove();

    // Remove event listeners
    this.#notesContainer.removeEventListener(
      'pointermove',
      this.#bound.pointermove
    );
    this.#notesContainer.removeEventListener(
      'pointerup',
      this.#bound.pointerup
    );
    this.#notesContainer.removeEventListener(
      'pointercancel',
      this.#bound.pointercancel
    );
    document.removeEventListener('keydown', this.#bound.keydown);

    this.#notesContainer.style.cursor = 'grab';

    this.#dragState = null;
  }

  #clientToNotesContainerCoords(
    clientX: number,
    clientY: number
  ): { x: number; y: number } | null {
    const ctm = this.#notesContainer.getScreenCTM();
    if (!ctm) return null;
    const inverse = ctm.inverse();
    return {
      x: inverse.a * clientX + inverse.c * clientY + inverse.e,
      y: inverse.b * clientX + inverse.d * clientY + inverse.f,
    };
  }

  #clientToNotesContainerX(clientX: number): number {
    const ctm = this.#notesContainer.getScreenCTM();
    if (!ctm) return clientX;
    return ctm.inverse().a * clientX + ctm.inverse().e;
  }

  #computeDropIndex(pointerX: number): number {
    const noteSvgs = this.#notesContainer.querySelectorAll('[data-slot-index]');
    const positions: { index: number; x: number; width: number }[] = [];

    for (const svg of noteSvgs) {
      const idx = parseInt((svg as SVGElement).dataset.slotIndex ?? '', 10);
      const x = parseFloat(svg.getAttribute('x') ?? '0');
      const width = parseFloat(svg.getAttribute('width') ?? '32');
      positions.push({ index: idx, x, width });
    }

    positions.sort((a, b) => a.x - b.x);

    if (positions.length === 0) return 0;

    // Check if pointer is before the first note
    if (pointerX < positions[0].x + positions[0].width / 2) {
      return 0;
    }

    // Check gaps between notes
    for (let i = 0; i < positions.length - 1; i++) {
      const midpoint =
        (positions[i].x + positions[i].width + positions[i + 1].x) / 2;
      if (pointerX < midpoint) {
        return positions[i].index + 1;
      }
    }

    // After last note
    return positions[positions.length - 1].index + 1;
  }

  #updateDropIndicator(dropIndex: number) {
    const noteSvgs = this.#notesContainer.querySelectorAll('[data-slot-index]');
    const positions: { index: number; x: number; width: number }[] = [];

    for (const svg of noteSvgs) {
      const idx = parseInt((svg as SVGElement).dataset.slotIndex ?? '', 10);
      const x = parseFloat(svg.getAttribute('x') ?? '0');
      const width = parseFloat(svg.getAttribute('width') ?? '32');
      positions.push({ index: idx, x, width });
    }

    positions.sort((a, b) => a.x - b.x);

    if (positions.length === 0) {
      this.#dropIndicator.style.display = 'none';
      return;
    }

    // Don't show indicator at the source position (no-op drop)
    if (this.#dragState && dropIndex === this.#dragState.sourceIndex) {
      this.#dropIndicator.style.display = 'none';
      return;
    }

    let indicatorX: number;
    if (dropIndex === 0) {
      indicatorX = positions[0].x - 4;
    } else if (dropIndex > positions[positions.length - 1].index) {
      const last = positions[positions.length - 1];
      indicatorX = last.x + last.width + 4;
    } else {
      // Between notes: find the position just before dropIndex
      const beforePos = positions.find((p) => p.index === dropIndex - 1);
      const afterPos = positions.find((p) => p.index === dropIndex);
      if (beforePos && afterPos) {
        indicatorX = (beforePos.x + beforePos.width + afterPos.x) / 2;
      } else {
        this.#dropIndicator.style.display = 'none';
        return;
      }
    }

    this.#dropIndicator.setAttribute('x1', indicatorX.toString());
    this.#dropIndicator.setAttribute('x2', indicatorX.toString());
    this.#dropIndicator.style.display = '';
  }

  #reorderLightDom(fromIndex: number, toIndex: number) {
    const children = this.#getSlottedElements();
    const draggedEl = children[fromIndex];
    if (!draggedEl) return;

    // Adjust toIndex for the removal of the dragged element
    const adjustedToIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;

    // Remove from current position (parent keeps reference)
    const parent = draggedEl.parentElement;
    if (!parent) return;

    // Get remaining children after conceptual removal
    const remaining = children.filter((_, i) => i !== fromIndex);

    if (adjustedToIndex >= remaining.length) {
      // Append after the last note/chord element
      const lastEl = remaining[remaining.length - 1];
      lastEl.after(draggedEl);
    } else {
      parent.insertBefore(draggedEl, remaining[adjustedToIndex]);
    }
  }
}
